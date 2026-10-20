import type { ExerciseType } from "./pose-logic";

export type ProgramStep = { name: string; sets: number; reps: number; restSeconds: number };

export type Program = {
  kind: "plan" | "routine" | "library";
  id: string;
  title: string;
  steps: ProgramStep[];
};

const MATCHERS: [RegExp, ExerciseType][] = [
  [/push[\s-]?up|press[\s-]?up/i, "Push-up"],
  [/lunge|split squat/i, "Lunge"],
  [/squat/i, "Squat"],
  [/jumping[\s-]?jack|star jump/i, "Jumping jack"],
  [/high[\s-]?knee|march/i, "High knees"],
  [/mountain[\s-]?climb/i, "Mountain climber"],
  [/plank/i, "Plank"],
];

/** Map a free-text exercise name to a camera-trackable movement, or null if it can't be tracked. */
const NOT_TRACKABLE = /pike|pistol|plank[\s-]?to|archer|wall sit|step jack|burpee|inchworm/i;

export function matchExercise(name: string): ExerciseType | null {
  if (NOT_TRACKABLE.test(name)) return null;
  for (const [pattern, type] of MATCHERS) if (pattern.test(name)) return type;
  return null;
}

const PRESETS: { test: RegExp; steps: ProgramStep[] }[] = [
  {
    test: /foundation|beginner|basic|start/i,
    steps: [
      { name: "Squat", sets: 3, reps: 10, restSeconds: 60 },
      { name: "Push-up", sets: 3, reps: 8, restSeconds: 60 },
      { name: "Lunge", sets: 2, reps: 8, restSeconds: 60 },
      { name: "Plank", sets: 2, reps: 30, restSeconds: 45 },
    ],
  },
  {
    test: /move|consisten|feel|cardio|energy/i,
    steps: [
      { name: "Jumping jack", sets: 3, reps: 20, restSeconds: 30 },
      { name: "High knees", sets: 3, reps: 20, restSeconds: 30 },
      { name: "Squat", sets: 2, reps: 12, restSeconds: 45 },
      { name: "Mountain climber", sets: 2, reps: 16, restSeconds: 45 },
    ],
  },
  {
    test: /strong|strength|endurance|30|power/i,
    steps: [
      { name: "Push-up", sets: 4, reps: 10, restSeconds: 60 },
      { name: "Squat", sets: 4, reps: 15, restSeconds: 60 },
      { name: "Lunge", sets: 3, reps: 10, restSeconds: 60 },
      { name: "Mountain climber", sets: 3, reps: 20, restSeconds: 45 },
      { name: "Plank", sets: 3, reps: 45, restSeconds: 45 },
    ],
  },
];

const FALLBACK: ProgramStep[] = [
  { name: "Squat", sets: 3, reps: 10, restSeconds: 60 },
  { name: "Push-up", sets: 3, reps: 8, restSeconds: 60 },
  { name: "Plank", sets: 2, reps: 30, restSeconds: 45 },
];

/** Predefined exercise set for a plan, chosen from its name, then its goal. */
export function presetForPlan(title: string, goal = "", level = ""): ProgramStep[] {
  const preset = PRESETS.find((item) => item.test.test(title)) ?? PRESETS.find((item) => item.test.test(goal));
  const steps = (preset?.steps ?? FALLBACK).map((step) => ({ ...step }));
  if (/advanced/i.test(level)) return steps.map((step) => ({ ...step, sets: step.sets + 1 }));
  return steps;
}

export function planSteps(plan: { title: string; goal: string; level: string; exercises?: ProgramStep[] | null }): ProgramStep[] {
  return plan.exercises && plan.exercises.length > 0 ? plan.exercises : presetForPlan(plan.title, plan.goal, plan.level);
}

export function totalSets(steps: ProgramStep[]): number {
  return steps.reduce((sum, step) => sum + step.sets, 0);
}
