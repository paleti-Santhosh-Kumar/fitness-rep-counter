import type { ProgramStep } from "./programs";

export type TrackId = "male-hard" | "female-beginner" | "female-intermediate";

export const TRACKS: { id: TrackId; label: string; short: string; description: string; sets: number; reps: number; hold: number; rest: number }[] = [
  { id: "male-hard", label: "Male — Hard", short: "Hard", description: "Explosive, advanced bodyweight variations.", sets: 4, reps: 15, hold: 45, rest: 45 },
  { id: "female-beginner", label: "Female — Beginner", short: "Beginner", description: "Gentle, supported movements to build a base.", sets: 2, reps: 8, hold: 20, rest: 60 },
  { id: "female-intermediate", label: "Female — Intermediate", short: "Intermediate", description: "Standard variations with steady volume.", sets: 3, reps: 12, hold: 30, rest: 45 },
];

export type BodyPart = { id: string; name: string; exercises: Record<TrackId, string[]> };

export const BODY_PARTS: BodyPart[] = [
  { id: "chest", name: "Chest", exercises: {
    "male-hard": ["Decline Push-ups", "Diamond Push-ups", "Archer Push-ups"],
    "female-beginner": ["Wall Push-ups", "Incline Push-ups", "Knee Push-ups"],
    "female-intermediate": ["Standard Push-ups", "Wide Push-ups", "Decline Push-ups"] } },
  { id: "arms", name: "Arms", exercises: {
    "male-hard": ["Diamond Push-ups", "Triceps Dips", "Close-Grip Push-ups"],
    "female-beginner": ["Arm Circles", "Wall Push-ups", "Knee Push-ups"],
    "female-intermediate": ["Triceps Dips", "Diamond Push-ups", "Close-Grip Push-ups"] } },
  { id: "shoulders", name: "Shoulders", exercises: {
    "male-hard": ["Pike Push-ups", "Elevated Pike Push-ups", "Shoulder Taps"],
    "female-beginner": ["Wall Shoulder Taps", "Arm Circles", "Incline Shoulder Taps"],
    "female-intermediate": ["Pike Push-ups", "Shoulder Taps", "Plank-to-Pike"] } },
  { id: "back", name: "Back", exercises: {
    "male-hard": ["Superman Holds", "Reverse Snow Angels", "Swimmers"],
    "female-beginner": ["Superman Raises", "Standing Arm Raises"],
    "female-intermediate": ["Reverse Snow Angels", "Superman Holds", "Swimmers"] } },
  { id: "core", name: "Abs & Core", exercises: {
    "male-hard": ["V-Ups", "Hollow Body Holds", "Bicycle Crunches"],
    "female-beginner": ["Basic Crunches", "Bent-Knee Leg Raises", "Knee Planks"],
    "female-intermediate": ["Bicycle Crunches", "Leg Raises", "Forearm Planks"] } },
  { id: "legs", name: "Legs", exercises: {
    "male-hard": ["Jump Squats", "Pistol Squat Progressions", "Bulgarian Split Squats"],
    "female-beginner": ["Supported Squats", "Calf Raises", "Assisted Lunges"],
    "female-intermediate": ["Bodyweight Squats", "Reverse Lunges", "Wall Sits"] } },
  { id: "full-body", name: "Full Body", exercises: {
    "male-hard": ["Burpees", "Explosive Mountain Climbers", "Jump Squats"],
    "female-beginner": ["Marching in Place", "Step Jacks", "Wall Push-ups"],
    "female-intermediate": ["Burpees", "Mountain Climbers", "Jumping Jacks"] } },
  { id: "warmup", name: "Warm-up & Flexibility", exercises: {
    "male-hard": ["High Knees", "Dynamic Lunges", "Inchworms"],
    "female-beginner": ["Marching", "Hip Circles", "Gentle Hamstring Stretches"],
    "female-intermediate": ["High Knees", "Inchworms", "Dynamic Lunges"] } },
  { id: "beginner-friendly", name: "Beginner-Friendly", exercises: {
    "male-hard": ["Decline Push-ups", "Jump Squats", "Plank-to-Push-ups"],
    "female-beginner": ["Wall Push-ups", "Knee Push-ups", "Supported Squats"],
    "female-intermediate": ["Standard Push-ups", "Bodyweight Squats", "Forearm Planks"] } },
];

/** Static holds measured in seconds rather than reps. */
export function isHoldName(name: string): boolean {
  return /plank|hold|wall sit/i.test(name) && !/to-|to push|to pike/i.test(name);
}

export function stepsFor(part: BodyPart, trackId: TrackId): ProgramStep[] {
  const track = TRACKS.find((item) => item.id === trackId)!;
  return part.exercises[trackId].map((name) => ({
    name,
    sets: track.sets,
    reps: isHoldName(name) ? track.hold : /stretch|circles/i.test(name) ? Math.max(8, Math.round(track.reps * 0.8)) : track.reps,
    restSeconds: track.rest,
  }));
}
