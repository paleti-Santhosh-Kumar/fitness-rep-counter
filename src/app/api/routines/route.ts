import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exerciseRoutines } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { routineCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const routines = await db.select().from(exerciseRoutines).where(eq(exerciseRoutines.userId, user.id)).orderBy(desc(exerciseRoutines.updatedAt));
  return Response.json({ routines }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const parsed = routineCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the routine and exercise details.");
  const [routine] = await db.insert(exerciseRoutines).values({
    ...parsed.data,
    userId: user.id,
    isSample: false,
  }).returning();
  return Response.json({ routine }, { status: 201 });
}
