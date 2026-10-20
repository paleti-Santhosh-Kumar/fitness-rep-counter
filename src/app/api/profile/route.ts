import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const parsed = profileUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Your name must be between 2 and 60 characters.");
  const [profile] = await db.update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, user.id))
    .returning({ id: users.id, email: users.email, name: users.name });
  if (!profile) return jsonError("Profile not found.", 404);
  return Response.json({ user: profile });
}
