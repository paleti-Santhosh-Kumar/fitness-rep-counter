import { db } from "@/db";
import { presetForPlan } from "@/lib/programs";
import { exerciseRoutines, workoutPlans } from "@/db/schema";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function seedStarterData(tx: DbTransaction, userId: string): Promise<void> {
    await tx
      .insert(workoutPlans)
      .values([
        {
          userId,
          title: "Foundations at home",
          description: "A calm, repeatable introduction to bodyweight training and good movement habits.",
          level: "Beginner",
          goal: "Build strength",
          daysPerWeek: 3,
          durationMinutes: 25,
          exercises: presetForPlan("Foundations at home", "Build strength", "Beginner"),
          isSample: true,
        },
        {
          userId,
          title: "Move more, feel better",
          description: "Short sessions that fit around classes, work, and the rest of your day.",
          level: "Beginner",
          goal: "Build consistency",
          daysPerWeek: 4,
          durationMinutes: 20,
          exercises: presetForPlan("Move more, feel better", "Build consistency", "Beginner"),
          isSample: true,
        },
        {
          userId,
          title: "Strong in 30",
          description: "A balanced home plan pairing controlled strength work with recovery days.",
          level: "Intermediate",
          goal: "Improve endurance",
          daysPerWeek: 4,
          durationMinutes: 30,
          exercises: presetForPlan("Strong in 30", "Improve endurance", "Intermediate"),
          isSample: true,
        },
      ])
      ;

    await tx
      .insert(exerciseRoutines)
      .values([
        {
          userId,
          title: "Lower-body foundations",
          category: "Strength",
          focus: "Legs & glutes",
          durationMinutes: 24,
          exercises: [
            { name: "Bodyweight squat", sets: 3, reps: 10, restSeconds: 60 },
            { name: "Reverse lunge", sets: 2, reps: 8, restSeconds: 60 },
            { name: "Plank hold", sets: 2, reps: 30, restSeconds: 45 },
          ],
          isSample: true,
        },
        {
          userId,
          title: "Push-up progression",
          category: "Strength",
          focus: "Chest & arms",
          durationMinutes: 18,
          exercises: [
            { name: "Push-up", sets: 3, reps: 8, restSeconds: 60 },
            { name: "Mountain climber", sets: 2, reps: 16, restSeconds: 45 },
            { name: "Plank hold", sets: 2, reps: 30, restSeconds: 45 },
          ],
          isSample: true,
        },
        {
          userId,
          title: "Full-body reset",
          category: "Mobility",
          focus: "Move & recover",
          durationMinutes: 15,
          exercises: [
            { name: "Jumping jack", sets: 2, reps: 20, restSeconds: 30 },
            { name: "High knees", sets: 2, reps: 20, restSeconds: 30 },
            { name: "Bodyweight squat", sets: 2, reps: 12, restSeconds: 45 },
          ],
          isSample: true,
        },
      ])
      ;

}
