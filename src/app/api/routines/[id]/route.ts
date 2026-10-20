import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { exerciseRoutines } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { routineUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Routine not found.", 404);
  const parsed = routineUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the routine and exercise details.");

  const [routine] = await db
    .update(exerciseRoutines)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(exerciseRoutines.id, id), eq(exerciseRoutines.userId, user.id)))
    .returning();
  if (!routine) return jsonError("Routine not found.", 404);
  return Response.json({ routine });
}

export async function DELETE(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Routine not found.", 404);
  const [deleted] = await db
    .delete(exerciseRoutines)
    .where(and(eq(exerciseRoutines.id, id), eq(exerciseRoutines.userId, user.id)))
    .returning({ id: exerciseRoutines.id });
  if (!deleted) return jsonError("Routine not found.", 404);
  return Response.json({ ok: true });
}
