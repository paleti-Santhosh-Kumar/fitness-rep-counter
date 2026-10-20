import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workoutSessions } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { sessionUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Session not found.", 404);
  const parsed = sessionUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the workout details and try again.");

  const [session] = await db
    .update(workoutSessions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, user.id)))
    .returning();
  if (!session) return jsonError("Session not found.", 404);
  return Response.json({ session });
}

export async function DELETE(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Session not found.", 404);
  const [deleted] = await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, user.id)))
    .returning({ id: workoutSessions.id });
  if (!deleted) return jsonError("Session not found.", 404);
  return Response.json({ ok: true });
}
