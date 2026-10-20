import type { Goal, WorkoutSession } from "@/components/types";

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatDateTime(value: string): string {
  return formatDate(value, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return minutes > 0 ? `${minutes}m ${remainder.toString().padStart(2, "0")}s` : `${remainder}s`;
}

export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function currentWeekSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  const start = weekStart(new Date());
  return sessions.filter((session) => {
    if (session.isSample) return false;
    const completed = new Date(session.completedAt);
    return completed >= start && completed <= new Date();
  });
}

export function workoutStreak(sessions: WorkoutSession[]): number {
  const days = [...new Set(sessions
    .filter((session) => !session.isSample)
    .map((session) => {
      const date = new Date(session.completedAt);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }))]
    .map((key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Date(year, month, day).getTime();
    })
    .sort((a, b) => b - a);
  if (days.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(days[0]!);
  const dayGap = Math.floor((today.getTime() - latest.getTime()) / 86_400_000);
  if (dayGap > 1) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const gap = Math.round((days[index - 1]! - days[index]!) / 86_400_000);
    if (gap === 1) streak += 1;
    else break;
  }
  return streak;
}

export function goalProgress(goal: Goal, sessions: WorkoutSession[]): number {
  const since = new Date(goal.createdAt).getTime();
  const relevant = sessions.filter((session) => !session.isSample
    && new Date(session.completedAt).getTime() >= since
    && (!goal.exercise || session.exercise === goal.exercise));
  return goal.metric === "sessions" ? relevant.length : relevant.reduce((sum, session) => sum + session.reps, 0);
}

/** Distinct days this week (Mon–Sun) with at least one real (non-sample) workout. */
export function weekActiveDays(sessions: WorkoutSession[]): boolean[] {
  const start = weekStart(new Date());
  const days = Array.from({ length: 7 }, () => false);
  for (const session of currentWeekSessions(sessions)) {
    const index = Math.floor((new Date(session.completedAt).getTime() - start.getTime()) / 86_400_000);
    if (index >= 0 && index < 7) days[index] = true;
  }
  return days;
}

export function goalSummary(sessions: WorkoutSession[], weeklyGoal: number) {
  const days = weekActiveDays(sessions);
  const done = days.filter(Boolean).length;
  const goal = Math.max(1, weeklyGoal);
  const left = Math.max(0, goal - done);
  const today = (new Date().getDay() + 6) % 7;
  const daysLeftInWeek = 7 - today;
  const message = done >= goal
    ? "Weekly goal reached — great work!"
    : done === 0
      ? `Work out on ${goal} different days this week to hit your goal.`
      : `${left} more workout ${left === 1 ? "day" : "days"} to hit your goal.`;
  return { days, done, goal, left, percent: Math.min(100, Math.round((done / goal) * 100)), message, onTrack: left <= daysLeftInWeek, today };
}
