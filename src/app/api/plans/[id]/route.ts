import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workoutPlans } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { planUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedPlanId(context: RouteContext, userId: string) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return null;
  return { id, userId };
}

export async function PATCH(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const scope = await ownedPlanId(context, user.id);
  if (!scope) return jsonError("Plan not found.", 404);
  const parsed = planUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the plan details and try again.");

  const [plan] = await db
    .update(workoutPlans)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workoutPlans.id, scope.id), eq(workoutPlans.userId, scope.userId)))
    .returning();
  if (!plan) return jsonError("Plan not found.", 404);
  return Response.json({ plan });
}

export async function DELETE(request: Request, context: RouteContext) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const scope = await ownedPlanId(context, user.id);
  if (!scope) return jsonError("Plan not found.", 404);
  const [deleted] = await db
    .delete(workoutPlans)
    .where(and(eq(workoutPlans.id, scope.id), eq(workoutPlans.userId, scope.userId)))
    .returning({ id: workoutPlans.id });
  if (!deleted) return jsonError("Plan not found.", 404);
  return Response.json({ ok: true });
}
