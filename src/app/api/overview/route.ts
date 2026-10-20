import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exerciseRoutines, goals, userPreferences, workoutPlans, workoutSessions } from "@/db/schema";
import { ensureUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await ensureUser();
    if (!user) return jsonError("Please sign in to continue.", 401);

    let [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);
    if (!preferences) {
      await db.insert(userPreferences).values({ userId: user.id }).onConflictDoNothing();
      [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, user.id))
        .limit(1);
    }

    const [plans, routines, sessions, goalRows] = await Promise.all([
      db.select().from(workoutPlans).where(eq(workoutPlans.userId, user.id)).orderBy(desc(workoutPlans.updatedAt)),
      db.select().from(exerciseRoutines).where(eq(exerciseRoutines.userId, user.id)).orderBy(desc(exerciseRoutines.updatedAt)),
      db.select().from(workoutSessions).where(and(eq(workoutSessions.userId, user.id), eq(workoutSessions.isSample, false))).orderBy(desc(workoutSessions.completedAt)),
      db.select().from(goals).where(eq(goals.userId, user.id)).orderBy(desc(goals.createdAt)),
    ]);

    return Response.json(
      { user, preferences: preferences ?? { weeklyGoal: 4, units: "metric", cameraTips: true }, plans, routines, sessions, goals: goalRows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Dashboard data failed", error);
    return jsonError("We couldn't load your training data. Please refresh.", 500);
  }
}
