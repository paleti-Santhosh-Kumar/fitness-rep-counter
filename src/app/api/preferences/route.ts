import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { preferencesUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  let [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
  if (!preferences) {
    await db.insert(userPreferences).values({ userId: user.id }).onConflictDoNothing();
    [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
  }
  return Response.json({ preferences: preferences ?? { weeklyGoal: 4, units: "metric", cameraTips: true } }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function PUT(request: Request) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const parsed = preferencesUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check your preference settings.");

  await db.insert(userPreferences).values({ userId: user.id }).onConflictDoNothing();
  const [preferences] = await db
    .update(userPreferences)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userPreferences.userId, user.id))
    .returning();
  return Response.json({ preferences });
}
