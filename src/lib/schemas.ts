import { z } from "zod";

const EXERCISES = ["Squat", "Push-up", "Lunge", "Jumping jack", "High knees", "Mountain climber", "Plank"] as const;

const routineExerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(200),
  restSeconds: z.number().int().min(0).max(600),
}).strict();

export const planFields = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  goal: z.string().trim().min(2).max(60),
  daysPerWeek: z.number().int().min(1).max(7),
  durationMinutes: z.number().int().min(5).max(180),
  exercises: z.array(routineExerciseSchema).max(16).optional(),
}).strict();

export const planCreateSchema = planFields;
export const planUpdateSchema = planFields.partial().refine((value) => Object.keys(value).length > 0);



export const routineFields = z.object({
  title: z.string().trim().min(2).max(80),
  category: z.enum(["Strength", "Cardio", "Mobility", "Recovery"]),
  focus: z.string().trim().min(2).max(60),
  durationMinutes: z.number().int().min(5).max(180),
  exercises: z.array(routineExerciseSchema).min(1).max(16),
}).strict();

export const routineCreateSchema = routineFields;
export const routineUpdateSchema = routineFields.partial().refine((value) => Object.keys(value).length > 0);

export const sessionCreateSchema = z.object({
  exercise: z.string().trim().min(2).max(80),
  reps: z.number().int().min(1).max(1000),
  durationSeconds: z.number().int().min(1).max(86_400),
  formScore: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(1000).optional().default(""),
  source: z.enum(["camera", "manual"]).default("manual"),
  planId: z.string().uuid().nullable().optional(),
  routineId: z.string().uuid().nullable().optional(),
}).strict().refine((value) => value.source !== "camera" || (EXERCISES as readonly string[]).includes(value.exercise), { message: "Camera sessions must use a trackable exercise." });

export const sessionUpdateSchema = z.object({
  exercise: z.string().trim().min(2).max(80).optional(),
  reps: z.number().int().min(1).max(1000).optional(),
  durationSeconds: z.number().int().min(1).max(86_400).optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const preferencesUpdateSchema = z.object({
  weeklyGoal: z.number().int().min(1).max(7).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  cameraTips: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60),
}).strict();

export const goalCreateSchema = z.object({
  title: z.string().trim().min(2).max(80),
  exercise: z.enum(EXERCISES).nullable(),
  metric: z.enum(["reps", "sessions"]),
  target: z.number().int().min(1).max(100000),
}).strict();

export const goalUpdateSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  target: z.number().int().min(1).max(100000).optional(),
  achieved: z.literal(true).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
