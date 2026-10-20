export type ExerciseType =
  | "Squat"
  | "Push-up"
  | "Lunge"
  | "Jumping jack"
  | "High knees"
  | "Mountain climber"
  | "Plank";

export const EXERCISE_TYPES: ExerciseType[] = ["Squat", "Push-up", "Lunge", "Jumping jack", "High knees", "Mountain climber", "Plank"];

export function isTimedExercise(exercise: string): boolean {
  return exercise === "Plank";
}

export type PoseLandmark = { x: number; y: number; z?: number; visibility?: number };

export type RepPhase = "waiting" | "top" | "descending" | "bottom" | "ascending";

export type CounterState = {
  exercise: ExerciseType;
  reps: number;
  phase: RepPhase;
  lastRepAt: number;
  holdMs: number;
  lastFrameAt: number;
};

export type PoseReading = {
  visible: boolean;
  reps: number;
  phase: RepPhase;
  angle: number | null;
  formScore: number | null;
  feedback: string;
};

const CONFIDENCE_THRESHOLD = 0.55;
const REP_COOLDOWN_MS = 650;

export function createCounter(exercise: ExerciseType): CounterState {
  return { exercise, reps: 0, phase: "waiting", lastRepAt: Number.NEGATIVE_INFINITY, holdMs: 0, lastFrameAt: -1 };
}

function midpoint(a: PoseLandmark, b: PoseLandmark): PoseLandmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function angleAt(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const baX = a.x - b.x, baY = a.y - b.y, bcX = c.x - b.x, bcY = c.y - b.y;
  const denominator = Math.hypot(baX, baY) * Math.hypot(bcX, bcY);
  if (denominator === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, (baX * bcX + baY * bcY) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function dist(a: PoseLandmark, b: PoseLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function visible(landmarks: PoseLandmark[], indices: number[]): boolean {
  return indices.every((index) => {
    const point = landmarks[index];
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && (point.visibility ?? 0) >= CONFIDENCE_THRESHOLD);
  });
}

/** For side-on exercises, use the body side that faces the camera. */
const LEFT_SIDE = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 };
const RIGHT_SIDE = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };
function bestSide(landmarks: PoseLandmark[]) {
  const score = (side: typeof LEFT_SIDE) => mean(Object.values(side).map((index) => landmarks[index]?.visibility ?? 0));
  return score(LEFT_SIDE) >= score(RIGHT_SIDE) ? LEFT_SIDE : RIGHT_SIDE;
}

/** Angle-threshold state machine (squat, push-up, lunge). */
function advanceAngleCounter(state: CounterState, angle: number, now: number, t: { top: number; descend: number; bottom: number; ret: number }): void {
  switch (state.phase) {
    case "waiting": if (angle >= t.top) state.phase = "top"; break;
    case "top": if (angle <= t.descend) state.phase = "descending"; break;
    case "descending":
      if (angle <= t.bottom) state.phase = "bottom";
      else if (angle >= t.top) state.phase = "top";
      break;
    case "bottom": if (angle >= t.ret) state.phase = "ascending"; break;
    case "ascending":
      if (angle <= t.bottom + 7) state.phase = "bottom";
      else if (angle >= t.top) {
        if (now - state.lastRepAt >= REP_COOLDOWN_MS) { state.reps += 1; state.lastRepAt = now; }
        state.phase = "top";
      }
      break;
  }
}

/** Two-position state machine: start position -> end position -> start position = 1 rep. */
function advanceToggleCounter(state: CounterState, atStart: boolean, atEnd: boolean, now: number, cooldownMs: number): void {
  if (state.phase === "waiting") { if (atStart) state.phase = "top"; return; }
  if (state.phase === "top") { if (atEnd) state.phase = "bottom"; return; }
  if (state.phase === "bottom" && atStart) {
    if (now - state.lastRepAt >= cooldownMs) { state.reps += 1; state.lastRepAt = now; }
    state.phase = "top";
  }
}

const REQUIRED: Record<ExerciseType, number[]> = {
  "Squat": [11, 12, 23, 24, 25, 26, 27, 28],
  "Push-up": [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
  "Lunge": [11, 12, 23, 24, 25, 26, 27, 28],
  "Jumping jack": [11, 12, 15, 16, 23, 24, 27, 28],
  "High knees": [11, 12, 23, 24, 25, 26, 27, 28],
  "Mountain climber": [],
  "Plank": [],
};

const HIDDEN_MESSAGE: Record<ExerciseType, string> = {
  "Squat": "Step back so your shoulders, hips, knees and feet are visible.",
  "Push-up": "Turn side-on and step back so your whole body is in frame.",
  "Lunge": "Step back so your hips, knees and feet are visible.",
  "Jumping jack": "Face the camera and step back so your hands and feet are in frame.",
  "High knees": "Face the camera with your hips, knees and feet visible.",
  "Mountain climber": "Turn side-on in a high plank so your shoulder, hip, knee and ankle are visible.",
  "Plank": "Turn side-on so your shoulder, hip and ankle are clearly visible.",
};

export function analyzePose(state: CounterState, landmarks: PoseLandmark[], now: number): PoseReading {
  const exercise = state.exercise;
  const side = bestSide(landmarks);
  const sideIdx = [side.shoulder, side.hip, side.knee, side.ankle];
  const required = REQUIRED[exercise].length ? REQUIRED[exercise] : sideIdx;

  if (!visible(landmarks, required)) {
    state.lastFrameAt = -1;
    return { visible: false, reps: state.reps, phase: state.phase, angle: null, formScore: null, feedback: HIDDEN_MESSAGE[exercise] };
  }

  const L = (index: number) => landmarks[index]!;
  let angle: number;
  let formScore: number;
  let feedback: string;

  switch (exercise) {
    case "Squat": {
      angle = mean([angleAt(L(23), L(25), L(27)), angleAt(L(24), L(26), L(28))]);
      const shoulder = midpoint(L(11), L(12));
      const hip = midpoint(L(23), L(24));
      const lean = Math.atan2(Math.abs(shoulder.x - hip.x), Math.abs(shoulder.y - hip.y)) * 180 / Math.PI;
      formScore = Math.round(Math.max(45, Math.min(98, 96 - Math.max(0, lean - 34) * 0.8)));
      feedback = lean > 53 ? "Keep your chest lifted and brace your core."
        : angle < 125 && angle > 103 ? "A little deeper if it feels comfortable — stay in control."
        : angle <= 103 ? "Good depth. Drive through your feet to stand tall."
        : "Hinge at your hips, then bend your knees with control.";
      advanceAngleCounter(state, angle, now, { top: 158, descend: 132, bottom: 103, ret: 122 });
      break;
    }
    case "Push-up": {
      angle = mean([angleAt(L(11), L(13), L(15)), angleAt(L(12), L(14), L(16))]);
      const bodyLine = angleAt(midpoint(L(11), L(12)), midpoint(L(23), L(24)), midpoint(L(27), L(28)));
      formScore = Math.round(Math.max(40, Math.min(98, 98 - Math.max(0, 165 - bodyLine) * 1.7)));
      feedback = bodyLine < 148 ? "Brace your core and keep a straight line from head to heels."
        : angle < 118 && angle > 104 ? "Lower a little further if comfortable, then press away."
        : angle <= 104 ? "Nice control. Press the floor away and return to the top."
        : "Keep your body long and lower with control.";
      advanceAngleCounter(state, angle, now, { top: 157, descend: 136, bottom: 104, ret: 124 });
      break;
    }
    case "Lunge": {
      angle = Math.min(angleAt(L(23), L(25), L(27)), angleAt(L(24), L(26), L(28)));
      const shoulder = midpoint(L(11), L(12));
      const hip = midpoint(L(23), L(24));
      const lean = Math.atan2(Math.abs(shoulder.x - hip.x), Math.abs(shoulder.y - hip.y)) * 180 / Math.PI;
      formScore = Math.round(Math.max(45, Math.min(98, 97 - Math.max(0, lean - 18) * 1.2)));
      feedback = lean > 32 ? "Keep your torso tall over your hips."
        : angle <= 105 ? "Great depth. Push through your front heel to stand."
        : angle < 130 ? "Lower your back knee a little further toward the floor."
        : "Step and lower with control, both knees bending.";
      advanceAngleCounter(state, angle, now, { top: 155, descend: 132, bottom: 105, ret: 125 });
      break;
    }
    case "Jumping jack": {
      const shoulderY = (L(11).y + L(12).y) / 2;
      const hipWidth = Math.max(0.02, dist(L(23), L(24)));
      const ankleSpread = dist(L(27), L(28));
      const torso = Math.max(0.05, Math.abs((L(23).y + L(24).y) / 2 - shoulderY));
      const armsUp = L(15).y < shoulderY - torso * 0.25 && L(16).y < shoulderY - torso * 0.25;
      const armsDown = L(15).y > shoulderY + torso * 0.15 && L(16).y > shoulderY + torso * 0.15;
      const legsOpen = ankleSpread > hipWidth * 1.7;
      const legsClosed = ankleSpread < hipWidth * 1.35;
      const leftArm = angleAt(L(23), L(11), L(15));
      const rightArm = angleAt(L(24), L(12), L(16));
      angle = mean([leftArm, rightArm]);
      formScore = Math.round(Math.max(45, Math.min(98, 98 - Math.abs(leftArm - rightArm) * 0.6)));
      advanceToggleCounter(state, armsDown && legsClosed, armsUp && legsOpen, now, 350);
      feedback = state.phase === "bottom" ? "Arms up, feet wide — now bring it back together."
        : armsUp && !legsOpen ? "Jump your feet wider as your arms go up."
        : Math.abs(leftArm - rightArm) > 30 ? "Raise both arms evenly."
        : "Jump out wide with your arms overhead.";
      break;
    }
    case "High knees": {
      const ratio = (hip: PoseLandmark, knee: PoseLandmark, ankle: PoseLandmark) =>
        (knee.y - hip.y) / Math.max(0.02, dist(hip, knee) + dist(knee, ankle));
      const left = ratio(L(23), L(25), L(27));
      const right = ratio(L(24), L(26), L(28));
      const lifted = Math.min(left, right) < 0.2;
      const bothDown = left > 0.33 && right > 0.33;
      angle = Math.min(angleAt(L(11), L(23), L(25)), angleAt(L(12), L(24), L(26)));
      formScore = Math.round(Math.max(45, Math.min(98, 60 + (0.45 - Math.min(left, right)) * 90)));
      advanceToggleCounter(state, bothDown, lifted, now, 180);
      feedback = lifted ? "Nice lift! Switch legs quickly."
        : Math.min(left, right) < 0.3 ? "Drive your knee higher — aim for hip height."
        : "Run in place and drive each knee up to hip height.";
      break;
    }
    case "Mountain climber": {
      const shoulder = L(side.shoulder), hip = L(side.hip), ankle = L(side.ankle);
      const horizontal = Math.abs(shoulder.y - ankle.y) < Math.abs(shoulder.x - ankle.x) * 0.75;
      const kneeL = landmarks[25], kneeR = landmarks[26];
      const hipAngle = (knee: PoseLandmark | undefined) => knee && (knee.visibility ?? 0) >= 0.4 ? angleAt(shoulder, hip, knee) : 180;
      angle = Math.min(hipAngle(kneeL), hipAngle(kneeR));
      const bodyLine = angleAt(shoulder, hip, ankle);
      formScore = Math.round(Math.max(40, Math.min(98, 98 - Math.max(0, 150 - bodyLine) * 1.2)));
      if (horizontal) advanceToggleCounter(state, angle > 145, angle < 115, now, 220);
      feedback = !horizontal ? "Get into a high plank, side-on to the camera."
        : angle < 115 ? "Good drive! Switch legs."
        : bodyLine < 140 ? "Lower your hips into a straight plank line."
        : "Drive one knee toward your chest, then switch.";
      break;
    }
    case "Plank": {
      const shoulder = L(side.shoulder), hip = L(side.hip), ankle = L(side.ankle);
      angle = angleAt(shoulder, hip, ankle);
      const horizontal = Math.abs(shoulder.y - ankle.y) < Math.abs(shoulder.x - ankle.x) * 0.6;
      const held = horizontal && angle >= 160;
      if (held && state.lastFrameAt >= 0) {
        const dt = now - state.lastFrameAt;
        if (dt > 0 && dt < 500) state.holdMs += dt;
      }
      state.lastFrameAt = held ? now : -1;
      state.phase = held ? "top" : "waiting";
      state.reps = Math.floor(state.holdMs / 1000);
      formScore = Math.round(Math.max(40, Math.min(98, 98 - Math.max(0, 172 - angle) * 1.6)));
      feedback = !horizontal ? "Get into a plank, side-on to the camera. The timer runs while you hold."
        : angle < 160 ? (hip.y < Math.min(shoulder.y, ankle.y) ? "Lower your hips to make a straight line." : "Lift your hips — don't let them sag.")
        : "Strong plank! Keep breathing and hold it.";
      break;
    }
  }

  return {
    visible: true,
    reps: state.reps,
    phase: state.phase,
    angle: Math.round(angle),
    formScore,
    feedback: state.phase === "waiting" && exercise !== "Plank" ? startHint(exercise) : feedback,
  };
}

function startHint(exercise: ExerciseType): string {
  switch (exercise) {
    case "Squat": case "Lunge": return "Stand tall to begin";
    case "Push-up": return "Start at the top of your push-up";
    case "Jumping jack": return "Stand with feet together and arms down to begin";
    case "High knees": return "Stand tall with both feet down to begin";
    case "Mountain climber": return "Hold a high plank with legs straight to begin";
    default: return "Get into position to begin";
  }
}
