import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, users } from "@/db/schema";

const COOKIE_NAME = "noescape_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;
  try {
    const expected = Buffer.from(keyHex, "hex");
    const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({
    userId,
    tokenHash: digestToken(token),
    expiresAt,
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [record] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, digestToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  return record ?? null;
}

/**
 * Open-access mode: no login or signup. Each browser automatically gets a
 * private anonymous workspace tied to an HttpOnly session cookie.
 */
export async function ensureUser() {
  const existing = await getCurrentUser();
  if (existing) return existing;
  const { userPreferences } = await import("@/db/schema");
  const { seedStarterData } = await import("@/lib/seed");
  const id = randomBytes(12).toString("hex");
  const created = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name: "Athlete",
      email: `workspace-${id}@anonymous.local`,
      passwordHash: "disabled",
    }).returning({ id: users.id, email: users.email, name: users.name });
    if (!user) throw new Error("Workspace creation failed");
    await tx.insert(userPreferences).values({ userId: user.id });
    await seedStarterData(tx, user.id);
    return user;
  });
  await createUserSession(created.id);
  return created;
}

export async function destroyUserSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, digestToken(token)));
  }
  jar.delete(COOKIE_NAME);
}
