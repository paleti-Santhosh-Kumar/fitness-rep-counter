import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type RoutineExercise = {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  weeklyGoal: integer("weekly_goal").notNull().default(4),
  units: text("units").notNull().default("metric"),
  cameraTips: boolean("camera_tips").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workoutPlans = pgTable("workout_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  level: text("level").notNull().default("Beginner"),
  goal: text("goal").notNull().default("Build strength"),
  daysPerWeek: integer("days_per_week").notNull().default(3),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  exercises: jsonb("exercises").$type<RoutineExercise[]>().notNull().default([]),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exerciseRoutines = pgTable("exercise_routines", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull().default("Strength"),
  focus: text("focus").notNull().default("Full body"),
  durationMinutes: integer("duration_minutes").notNull().default(20),
  exercises: jsonb("exercises").$type<RoutineExercise[]>().notNull().default([]),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => workoutPlans.id, { onDelete: "set null" }),
  routineId: uuid("routine_id").references(() => exerciseRoutines.id, { onDelete: "set null" }),
  exercise: text("exercise").notNull(),
  reps: integer("reps").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  formScore: integer("form_score"),
  notes: text("notes").notNull().default(""),
  source: text("source").notNull().default("camera"),
  isSample: boolean("is_sample").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  exercise: text("exercise"),
  metric: text("metric").notNull().default("reps"),
  target: integer("target").notNull(),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
