import test from "node:test";
import assert from "node:assert/strict";
import { analyzePose, createCounter } from "../src/lib/pose-logic.ts";

const P = (x, y, v = 0.99) => ({ x, y, visibility: v });
function base() { return Array.from({ length: 33 }, () => P(0.5, 0.5)); }

function jack(open) {
  const p = base();
  p[11] = P(0.44, 0.3); p[12] = P(0.56, 0.3); p[23] = P(0.46, 0.55); p[24] = P(0.54, 0.55);
  p[15] = open ? P(0.4, 0.1) : P(0.42, 0.6); p[16] = open ? P(0.6, 0.1) : P(0.58, 0.6);
  p[27] = open ? P(0.36, 0.9) : P(0.47, 0.9); p[28] = open ? P(0.64, 0.9) : P(0.53, 0.9);
  return p;
}
function standing(liftLeft) {
  const p = base();
  p[11] = P(0.44, 0.3); p[12] = P(0.56, 0.3); p[23] = P(0.46, 0.55); p[24] = P(0.54, 0.55);
  p[25] = liftLeft ? P(0.42, 0.57) : P(0.46, 0.72); p[26] = P(0.54, 0.72);
  p[27] = liftLeft ? P(0.44, 0.72) : P(0.46, 0.9); p[28] = P(0.54, 0.9);
  return p;
}
function plank(sag) {
  const p = base();
  p[11] = P(0.2, 0.5); p[23] = P(0.5, sag ? 0.62 : 0.5); p[25] = P(0.65, 0.5); p[27] = P(0.8, 0.5);
  for (const i of [12, 24, 26, 28]) p[i] = P(0.5, 0.5, 0.1);
  return p;
}

test("jumping jack counts closed -> open -> closed", () => {
  const c = createCounter("Jumping jack");
  analyzePose(c, jack(false), 0); analyzePose(c, jack(true), 200);
  assert.equal(c.reps, 0);
  assert.equal(analyzePose(c, jack(false), 600).reps, 1);
});

test("high knees counts each knee lift once", () => {
  const c = createCounter("High knees");
  analyzePose(c, standing(false), 0); analyzePose(c, standing(true), 200);
  analyzePose(c, standing(true), 260);
  assert.equal(analyzePose(c, standing(false), 500).reps, 1);
});

test("plank timer accrues only while a straight line is held", () => {
  const c = createCounter("Plank");
  for (let t = 0; t <= 3000; t += 100) analyzePose(c, plank(false), t);
  assert.equal(c.reps, 3);
  for (let t = 3100; t <= 5000; t += 100) analyzePose(c, plank(true), t);
  assert.equal(c.reps, 3);
});
