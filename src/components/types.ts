import type { ExerciseType } from "@/lib/pose-logic";

export type User = { id: string; name: string; email: string };

export type Preferences = {
  weeklyGoal: number;
  units: "metric" | "imperial";
  cameraTips: boolean;
};

export type Plan = {
  id: string;
  userId: string;
  title: string;
  description: string;
  level: string;
  goal: string;
  daysPerWeek: number;
  durationMinutes: number;
  exercises: RoutineExercise[];
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoutineExercise = { name: string; sets: number; reps: number; restSeconds: number };

export type Routine = {
  id: string;
  userId: string;
  title: string;
  category: string;
  focus: string;
  durationMinutes: number;
  exercises: RoutineExercise[];
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSession = {
  id: string;
  userId: string;
  planId: string | null;
  routineId: string | null;
  exercise: ExerciseType;
  reps: number;
  durationSeconds: number;
  formScore: number | null;
  notes: string;
  source: "camera" | "manual" | "sample";
  isSample: boolean;
  completedAt: string;
  updatedAt: string;
};

export type Overview = {
  user: User;
  preferences: Preferences;
  plans: Plan[];
  routines: Routine[];
  sessions: WorkoutSession[];
  goals: Goal[];
};

export type Goal = {
  id: string;
  userId: string;
  title: string;
  exercise: ExerciseType | null;
  metric: "reps" | "sessions";
  target: number;
  achievedAt: string | null;
  createdAt: string;
};
