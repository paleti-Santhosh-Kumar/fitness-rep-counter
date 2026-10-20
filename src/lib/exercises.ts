import type { ExerciseType } from "./pose-logic";

export type ExerciseInfo = {
  id: ExerciseType;
  label: string;
  image: string;
  focus: string;
  unit: "reps" | "sec";
  angleLabel: string;
  camera: string;
  steps: string[];
};

export const EXERCISE_CATALOG: ExerciseInfo[] = [
  { id: "Squat", label: "Squats", image: "/exercises/squat.jpg", focus: "Legs & glutes", unit: "reps", angleLabel: "knee angle", camera: "Face the camera or stand at 45°, full body in frame.", steps: ["Feet shoulder-width apart", "Sit hips back and down", "Thighs to parallel, chest up", "Drive up to standing"] },
  { id: "Push-up", label: "Push-ups", image: "/exercises/pushup.jpg", focus: "Chest & arms", unit: "reps", angleLabel: "elbow angle", camera: "Side-on to the camera, head to heels in frame.", steps: ["Hands under shoulders", "Body in one straight line", "Lower chest toward floor", "Press back to the top"] },
  { id: "Lunge", label: "Lunges", image: "/exercises/lunge.jpg", focus: "Legs & balance", unit: "reps", angleLabel: "front knee", camera: "Side-on or 45°, hips, knees and feet visible.", steps: ["Stand tall", "Step forward or back", "Lower both knees to ~90°", "Push back to standing"] },
  { id: "Jumping jack", label: "Jumping jacks", image: "/exercises/jumping-jack.jpg", focus: "Cardio", unit: "reps", angleLabel: "arm angle", camera: "Face the camera, hands and feet in frame.", steps: ["Feet together, arms down", "Jump feet wide", "Raise arms overhead", "Jump back together"] },
  { id: "High knees", label: "High knees", image: "/exercises/high-knees.jpg", focus: "Cardio & core", unit: "reps", angleLabel: "hip angle", camera: "Face the camera, hips to feet visible.", steps: ["Stand tall", "Drive one knee to hip height", "Switch legs quickly", "Each knee lift counts"] },
  { id: "Mountain climber", label: "Mountain climbers", image: "/exercises/mountain-climber.jpg", focus: "Core & cardio", unit: "reps", angleLabel: "hip angle", camera: "Side-on in a high plank, whole body visible.", steps: ["Start in a high plank", "Drive one knee to chest", "Return and switch", "Each knee drive counts"] },
  { id: "Plank", label: "Plank", image: "/exercises/plank.jpg", focus: "Core stability", unit: "sec", angleLabel: "body line", camera: "Side-on, shoulder, hip and ankle visible.", steps: ["Forearms under shoulders", "Body in a straight line", "Brace core and glutes", "Timer runs only while held"] },
];

export function exerciseInfo(id: string): ExerciseInfo {
  return EXERCISE_CATALOG.find((item) => item.id === id) ?? EXERCISE_CATALOG[0]!;
}

export function unitLabel(exercise: string, value: number): string {
  const info = exerciseInfo(exercise);
  return info.unit === "sec" ? `${value}s held` : `${value} ${value === 1 ? "rep" : "reps"}`;
}
