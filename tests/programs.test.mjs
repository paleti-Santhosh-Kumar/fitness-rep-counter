import test from "node:test";
import assert from "node:assert/strict";
import { matchExercise, planSteps, presetForPlan, totalSets } from "../src/lib/programs.ts";
import { sessionCreateSchema } from "../src/lib/schemas.ts";

test("exercise names map to camera-trackable movements", () => {
  assert.equal(matchExercise("Bodyweight squat"), "Squat");
  assert.equal(matchExercise("Incline push-up"), "Push-up");
  assert.equal(matchExercise("Reverse lunge"), "Lunge");
  assert.equal(matchExercise("Plank hold"), "Plank");
  assert.equal(matchExercise("Glute bridge"), null);
});

test("plans get a predefined exercise set from their name", () => {
  const foundations = presetForPlan("Foundations at home");
  assert.deepEqual(foundations.map((step) => step.name), ["Squat", "Push-up", "Lunge", "Plank"]);
  assert.equal(totalSets(foundations), 10);
  assert.equal(presetForPlan("Move more, feel better")[0].name, "Jumping jack");
  assert.ok(presetForPlan("My plan", "", "Advanced")[0].sets > presetForPlan("My plan")[0].sets);
});

test("stored plan exercises override the preset", () => {
  const custom = [{ name: "Push-up", sets: 1, reps: 5, restSeconds: 30 }];
  assert.deepEqual(planSteps({ title: "Foundations", goal: "", level: "", exercises: custom }), custom);
  assert.equal(planSteps({ title: "Foundations", goal: "", level: "", exercises: [] }).length, 4);
});

test("manual logs allow custom names but camera sessions must be trackable", () => {
  const base = { reps: 10, durationSeconds: 60 };
  assert.equal(sessionCreateSchema.safeParse({ ...base, exercise: "Glute bridge", source: "manual" }).success, true);
  assert.equal(sessionCreateSchema.safeParse({ ...base, exercise: "Glute bridge", source: "camera" }).success, false);
  assert.equal(sessionCreateSchema.safeParse({ ...base, exercise: "Squat", source: "camera", planId: "6f1c2c8e-8a3e-4c55-9f43-1b2a3c4d5e6f" }).success, true);
});

import { BODY_PARTS, TRACKS, stepsFor, isHoldName } from "../src/lib/body-part-library.ts";

test("body-part library covers 9 parts × 3 levels with sensible targets", () => {
  assert.equal(BODY_PARTS.length, 9);
  for (const part of BODY_PARTS) for (const track of TRACKS) assert.ok(stepsFor(part, track.id).length >= 2);
  const chestHard = stepsFor(BODY_PARTS[0], "male-hard");
  assert.equal(chestHard[0].sets, 4);
  assert.equal(matchExercise("Decline Push-ups"), "Push-up");
  assert.equal(matchExercise("Pike Push-ups"), null);
  assert.equal(matchExercise("Plank-to-Pike"), null);
  assert.equal(matchExercise("Forearm Planks"), "Plank");
  assert.ok(isHoldName("Wall Sits") && !isHoldName("Plank-to-Push-ups"));
});
