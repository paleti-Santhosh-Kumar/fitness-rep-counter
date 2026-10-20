import test from "node:test";
import assert from "node:assert/strict";
import { analyzePose, createCounter } from "../src/lib/pose-logic.ts";

function landmarks() {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
}

function squatPose(kneeAngle) {
  const points = landmarks();
  points[11] = { x: 0.42, y: 0.16, visibility: 0.99 };
  points[12] = { x: 0.58, y: 0.16, visibility: 0.99 };
  const setLeg = (hipIndex, kneeIndex, ankleIndex, center) => {
    const hip = { x: center, y: 0.37, visibility: 0.99 };
    const knee = { x: center, y: 0.55, visibility: 0.99 };
    const direction = (kneeAngle - 90) * Math.PI / 180;
    const ankle = { x: center + 0.18 * Math.cos(direction), y: 0.55 + 0.18 * Math.sin(direction), visibility: 0.99 };
    points[hipIndex] = hip;
    points[kneeIndex] = knee;
    points[ankleIndex] = ankle;
  };
  setLeg(23, 25, 27, 0.40);
  setLeg(24, 26, 28, 0.60);
  return points;
}

function pushupPose(elbowAngle) {
  const points = landmarks();
  points[11] = { x: 0.30, y: 0.36, visibility: 0.99 };
  points[12] = { x: 0.70, y: 0.36, visibility: 0.99 };
  points[23] = { x: 0.38, y: 0.52, visibility: 0.99 };
  points[24] = { x: 0.62, y: 0.52, visibility: 0.99 };
  points[25] = { x: 0.38, y: 0.65, visibility: 0.99 };
  points[26] = { x: 0.62, y: 0.65, visibility: 0.99 };
  points[27] = { x: 0.38, y: 0.80, visibility: 0.99 };
  points[28] = { x: 0.62, y: 0.80, visibility: 0.99 };
  const makeArm = (shoulder, elbow, wrist, mirror = false) => {
    const startX = mirror ? 0.70 : 0.30;
    const centerX = mirror ? 0.55 : 0.45;
    const length = 0.15;
    const direction = (180 - elbowAngle) * Math.PI / 180;
    const directionX = mirror ? -Math.cos(direction) : Math.cos(direction);
    const elbowPoint = { x: centerX, y: 0.44, visibility: 0.99 };
    const shoulderPoint = { x: elbowPoint.x + (mirror ? length : -length), y: elbowPoint.y, visibility: 0.99 };
    const wristPoint = { x: elbowPoint.x + directionX * length, y: elbowPoint.y + Math.sin(direction) * length, visibility: 0.99 };
    points[shoulder] = shoulderPoint;
    points[elbow] = elbowPoint;
    points[wrist] = wristPoint;
    if (startX < 0) throw new Error("unreachable");
  };
  makeArm(11, 13, 15, false);
  makeArm(12, 14, 16, true);
  return points;
}

function cycleSquat(counter, startTime = 1000) {
  let time = startTime;
  analyzePose(counter, squatPose(178), time); time += 100;
  analyzePose(counter, squatPose(130), time); time += 100;
  analyzePose(counter, squatPose(90), time); time += 100;
  analyzePose(counter, squatPose(130), time); time += 100;
  return analyzePose(counter, squatPose(178), time);
}

test("squat repetitions require an upright start and full completed return", () => {
  const counter = createCounter("Squat");
  const startsLow = analyzePose(counter, squatPose(90), 100);
  assert.equal(startsLow.reps, 0);
  assert.equal(startsLow.phase, "waiting");
  const completed = cycleSquat(counter, 1000);
  assert.equal(completed.reps, 1);
  assert.equal(completed.phase, "top");
});

test("a shallow squat and an unfinished descent do not count", () => {
  const counter = createCounter("Squat");
  analyzePose(counter, squatPose(178), 1000);
  analyzePose(counter, squatPose(140), 1100);
  analyzePose(counter, squatPose(178), 1200);
  assert.equal(counter.reps, 0);
  analyzePose(counter, squatPose(130), 1300);
  analyzePose(counter, squatPose(95), 1400);
  assert.equal(counter.reps, 0);
  assert.equal(counter.phase, "bottom");
});

test("jitter near the top and visibility dropouts never invent a rep", () => {
  const counter = createCounter("Squat");
  analyzePose(counter, squatPose(178), 1000);
  analyzePose(counter, squatPose(161), 1100);
  analyzePose(counter, squatPose(156), 1200);
  const hidden = squatPose(90);
  hidden[27].visibility = 0.2;
  const missed = analyzePose(counter, hidden, 1300);
  assert.equal(missed.visible, false);
  assert.equal(missed.reps, 0);
  assert.equal(counter.phase, "top");
  assert.equal(counter.reps, 0);
});

test("the cooldown rejects rapid duplicate cycles but accepts a later complete cycle", () => {
  const counter = createCounter("Squat");
  cycleSquat(counter, 1000);
  assert.equal(counter.reps, 1);
  cycleSquat(counter, 1500);
  assert.equal(counter.reps, 1);
  cycleSquat(counter, 2400);
  assert.equal(counter.reps, 2);
});

test("push-up repetitions use a complete elbow-angle cycle", () => {
  const counter = createCounter("Push-up");
  analyzePose(counter, pushupPose(178), 1000);
  analyzePose(counter, pushupPose(130), 1100);
  analyzePose(counter, pushupPose(95), 1200);
  analyzePose(counter, pushupPose(130), 1300);
  const completed = analyzePose(counter, pushupPose(178), 1400);
  assert.equal(completed.visible, true);
  assert.equal(completed.reps, 1);
  assert.equal(completed.phase, "top");
});
