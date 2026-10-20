import test from "node:test";
import assert from "node:assert/strict";
import { planCreateSchema, routineCreateSchema, sessionCreateSchema, preferencesUpdateSchema } from "../src/lib/schemas.ts";

test("plans trim names and enforce day and duration bounds", () => {
  const parsed = planCreateSchema.safeParse({
    title: "  At home strength  ", description: "Start simple", level: "Beginner", goal: "Build strength", daysPerWeek: 3, durationMinutes: 25,
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.title, "At home strength");
  assert.equal(planCreateSchema.safeParse({ title: "X", description: "", level: "Beginner", goal: "Strength", daysPerWeek: 8, durationMinutes: 25 }).success, false);
});

test("routines validate bounded exercise details", () => {
  const base = { title: "Simple set", category: "Strength", focus: "Legs", durationMinutes: 20, exercises: [{ name: "Squat", sets: 3, reps: 10, restSeconds: 45 }] };
  assert.equal(routineCreateSchema.safeParse(base).success, true);
  assert.equal(routineCreateSchema.safeParse({ ...base, exercises: [{ name: "Squat", sets: 0, reps: 10, restSeconds: 45 }] }).success, false);
});

test("session creation rejects fabricated sample flags and out-of-range reps", () => {
  const session = { exercise: "Squat", reps: 12, durationSeconds: 240, source: "manual" };
  assert.equal(sessionCreateSchema.safeParse(session).success, true);
  assert.equal(sessionCreateSchema.safeParse({ ...session, isSample: true }).success, false);
  assert.equal(sessionCreateSchema.safeParse({ ...session, reps: 1001 }).success, false);
});

test("preferences accept bounded goals and strict units", () => {
  assert.equal(preferencesUpdateSchema.safeParse({ weeklyGoal: 4, units: "metric", cameraTips: true }).success, true);
  assert.equal(preferencesUpdateSchema.safeParse({ weeklyGoal: 0 }).success, false);
  assert.equal(preferencesUpdateSchema.safeParse({ units: "cubits" }).success, false);
});
