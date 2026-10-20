import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { goals, workoutSessions } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { goalUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Goal not found.", 404);
  const parsed = goalUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the goal details.");

  const [goal] = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, user.id))).limit(1);
  if (!goal) return jsonError("Goal not found.", 404);

  const { achieved, ...fields } = parsed.data;
  const updates: Partial<typeof goals.$inferInsert> = { ...fields };

  if (achieved) {
    // Verify against real saved sessions only.
    const sessions = await db.select({ exercise: workoutSessions.exercise, reps: workoutSessions.reps })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, user.id), eq(workoutSessions.isSample, false), gte(workoutSessions.completedAt, goal.createdAt)));
    const relevant = sessions.filter((session) => !goal.exercise || session.exercise === goal.exercise);
    const progress = goal.metric === "sessions" ? relevant.length : relevant.reduce((sum, session) => sum + session.reps, 0);
    const target = fields.target ?? goal.target;
    if (progress < target) return jsonError("This goal hasn't been reached yet.", 409);
    updates.achievedAt = goal.achievedAt ?? new Date();
  } else if (fields.target !== undefined && fields.target !== goal.target) {
    updates.achievedAt = null; // new target — chase it again
  }

  const [updated] = await db.update(goals).set(updates).where(and(eq(goals.id, id), eq(goals.userId, user.id))).returning();
  return Response.json({ goal: updated });
}

export async function DELETE(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Goal not found.", 404);
  const [deleted] = await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, user.id))).returning({ id: goals.id });
  if (!deleted) return jsonError("Goal not found.", 404);
  return Response.json({ ok: true });
}
