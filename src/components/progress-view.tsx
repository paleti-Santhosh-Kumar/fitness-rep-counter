"use client";

import { Activity, BarChart3, Camera, Clock3, Dumbbell, Flame, Info, TrendingUp } from "lucide-react";
import type { Preferences, WorkoutSession } from "./types";
import { currentWeekSessions, formatDuration, goalSummary, workoutStreak } from "@/lib/format";
import WeekDots from "./week-dots";

type Props = { sessions: WorkoutSession[]; preferences: Preferences };

export default function ProgressView({ sessions, preferences }: Props) {
  const real = sessions.filter((session) => !session.isSample);
  const camera = real.filter((session) => session.source === "camera");
  const week = currentWeekSessions(sessions);
  const totalReps = real.reduce((total, session) => total + session.reps, 0);
  const totalSeconds = real.reduce((total, session) => total + session.durationSeconds, 0);
  const scores = camera.map((session) => session.formScore).filter((score): score is number => score !== null);
  const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const samples = sessions.filter((session) => session.isSample).length;
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const dailyCounts = days.map((day) => real.filter((session) => {
    const completed = new Date(session.completedAt);
    return completed.getFullYear() === day.getFullYear() && completed.getMonth() === day.getMonth() && completed.getDate() === day.getDate();
  }).length);
  const maxCount = Math.max(...dailyCounts, 1);
  const goal = goalSummary(sessions, preferences.weeklyGoal);

  return (
    <div className="content-wrap">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> SHOW UP, ADD UP</div><h1 className="page-title">Progress, without the noise.</h1><p className="page-description">A clear picture of workouts you’ve actually logged. Sample history is always left out.</p></div><span className="source-badge"><Activity size={10} /> Real sessions only</span></div>
      <section className="stat-grid" aria-label="Workout progress">
        <Stat icon={<Dumbbell size={15} />} title="Logged sessions" value={real.length.toLocaleString()} detail={`${camera.length} camera tracked · ${real.filter((session) => session.source === "manual").length} manual`} />
        <Stat icon={<Activity size={15} />} title="Total repetitions" value={totalReps.toLocaleString()} detail="from your own session log" />
        <Stat icon={<Clock3 size={15} />} title="Time moving" value={totalSeconds ? `${Math.floor(totalSeconds / 60)} min` : "0 min"} detail={totalSeconds ? `${formatDuration(totalSeconds)} total` : "from your own sessions"} />
        <Stat icon={<Camera size={15} />} title="Camera form trend" value={averageScore === null ? "—" : `${averageScore}%`} detail={averageScore === null ? "appears after camera sessions" : `from ${scores.length} measured sessions`} />
      </section>
      <section className="analytics-grid" style={{ marginTop: 17 }}>
        <article className="panel chart-panel">
          <div className="panel-header"><div><h2 className="section-title">Sessions, last 7 days</h2><p className="section-subtitle">One bar for each real workout day</p></div><span className="chart-legend"><span className="legend-dot" /> Your logged sessions</span></div>
          <div className="bar-chart" role="img" aria-label={`Real workouts this week: ${dailyCounts.join(", ")} sessions across the last seven days`}>
            {days.map((day, index) => <div className="bar-column" key={day.toISOString()}><span className="bar-value">{dailyCounts[index]}</span><div className="bar-track"><div className="bar-fill" style={{ height: `${dailyCounts[index] === 0 ? 0 : Math.max(8, dailyCounts[index]! / maxCount * 100)}%` }} /></div><span className="bar-day">{day.toLocaleDateString(undefined, { weekday: "short" })}</span></div>)}
          </div>
          <p className="chart-note">Sample sessions are excluded. A zero-height bar means no real session was saved for that day; records are never inferred or generated.</p>
        </article>
        <div className="analytics-side">
          <article className="analytics-highlight"><div className="card-topline"><span className="card-label">Weekly goal</span><span className="small-icon-box"><TargetIcon /></span></div><div className="stat-value">{goal.done}<span style={{ color: "#7d8875", fontSize: 15, fontWeight: 550 }}> / {goal.goal} days</span></div><WeekDots days={goal.days} today={goal.today} /><p>{goal.message}</p></article>
          <article className="analytics-highlight"><div className="card-topline"><span className="card-label">Current streak</span><span className="small-icon-box"><Flame size={15} /></span></div><div className="stat-value">{workoutStreak(sessions)}<span style={{ color: "#7d8875", fontSize: 15, fontWeight: 550 }}> days</span></div><p>consecutive days with a real logged workout</p></article>
          <div className="progress-note"><Info size={15} /><span>Form averages include camera-tracked sessions only. Rep totals include your camera and manual logs.</span></div>
        </div>
      </section>
      {real.length === 0 ? <div className="empty-state" style={{ marginTop: 16, minHeight: 165, border: "1px dashed #343b30", borderRadius: 14, background: "#10130f" }}><div className="empty-icon"><TrendingUp size={18} /></div><div className="empty-title">Your real progress starts with your first session</div><p className="empty-copy">Your starter sample history ({samples} {samples === 1 ? "record" : "records"}) is illustrative only. Camera and manual sessions will appear in these stats as you log them.</p></div> : <div className="progress-note" style={{ marginTop: 16 }}><Info size={15} /><span>{samples ? `${samples} illustrative sample ${samples === 1 ? "record is" : "records are"} excluded from all stats above. ` : ""}Analytics use only workout sessions stored in your account. No wearable or video uploads are used.</span></div>}
    </div>
  );
}

function Stat({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-title">{title}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></article>;
}

function TargetIcon() { return <BarChart3 size={15} />; }
