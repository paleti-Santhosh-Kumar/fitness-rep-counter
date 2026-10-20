import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exerciseRoutines, workoutPlans, workoutSessions } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError, originError, readJson } from "@/lib/http";
import { sessionCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const sessions = await db.select().from(workoutSessions).where(eq(workoutSessions.userId, user.id)).orderBy(desc(workoutSessions.completedAt));
  return Response.json({ sessions }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const blocked = originError(request);
  if (blocked) return blocked;
  const user = await ensureUser();
  if (!user) return jsonError("Please sign in to continue.", 401);
  const parsed = sessionCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the workout details and try again.");

  const { planId, routineId, ...workout } = parsed.data;
  if (planId) {
    const [plan] = await db.select({ id: workoutPlans.id }).from(workoutPlans)
      .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, user.id))).limit(1);
    if (!plan) return jsonError("The selected plan could not be found.", 404);
  }
  if (routineId) {
    const [routine] = await db.select({ id: exerciseRoutines.id }).from(exerciseRoutines)
      .where(and(eq(exerciseRoutines.id, routineId), eq(exerciseRoutines.userId, user.id))).limit(1);
    if (!routine) return jsonError("The selected routine could not be found.", 404);
  }

  const [session] = await db.insert(workoutSessions).values({
    ...workout,
    userId: user.id,
    planId: planId ?? null,
    routineId: routineId ?? null,
    formScore: workout.source === "camera" ? workout.formScore ?? null : null,
    isSample: false,
  }).returning();
  return Response.json({ session }, { status: 201 });
}
