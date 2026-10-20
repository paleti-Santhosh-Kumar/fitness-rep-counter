"use client";

import { Activity, ArrowRight, CalendarDays, Check, Clock3, Dumbbell, Flame, Footprints, Target, TrendingUp, Zap } from "lucide-react";
import type { Plan, Preferences, Routine, User, WorkoutSession } from "./types";
import { currentWeekSessions, formatDate, formatDuration, goalSummary, workoutStreak } from "@/lib/format";
import WeekDots from "./week-dots";
import { unitLabel } from "@/lib/exercises";

type Props = {
  user: User;
  preferences: Preferences;
  plans: Plan[];
  routines: Routine[];
  sessions: WorkoutSession[];
  onNavigate: (view: string) => void;
};

export default function DashboardView({ user, preferences, plans, routines, sessions, onNavigate }: Props) {
  const realSessions = sessions.filter((session) => !session.isSample);
  const thisWeek = currentWeekSessions(sessions);
  const totalReps = realSessions.reduce((total, session) => total + session.reps, 0);
  const formScores = realSessions.map((session) => session.formScore).filter((score): score is number => score !== null);
  const averageForm = formScores.length ? Math.round(formScores.reduce((sum, score) => sum + score, 0) / formScores.length) : null;
  const streak = workoutStreak(sessions);
  const weeklyGoal = Math.max(1, preferences.weeklyGoal);
  const goal = goalSummary(sessions, preferences.weeklyGoal);
  const recent = sessions.slice(0, 4);
  const nextPlan = plans[0];
  const nextRoutine = routines[0];
  const firstName = user.name.trim().split(/\s+/)[0] || "athlete";

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR SPACE, YOUR PACE</div><h1 className="page-title">Good to see you, {firstName}.</h1><p className="page-description">A little better than yesterday. That’s the whole plan.</p></div>
        <button className="button button-secondary" onClick={() => onNavigate("progress")}><TrendingUp size={15} /> View progress</button>
      </div>

      <section className="dashboard-hero">
        <div className="hero-card">
          <div className="hero-orbit"><Activity strokeWidth={1.6} /></div>
          <div className="hero-content">
            <div className="hero-kicker"><Zap size={13} fill="currentColor" /> SMART TRACKING · BETTER FORM</div>
            <h2 className="hero-title">Every Rep <span>Counts.</span></h2>
            <p className="hero-copy"><strong className="hero-tagline">Smart tracking. Better form. Stronger you.</strong> Turn on your camera and let your movement lead the way.</p>
            <button className="button" onClick={() => onNavigate("train")}><Activity size={15} /> Start a workout <ArrowRight size={14} /></button>
          </div>
        </div>
        <div className="daily-card">
          <div>
            <div className="card-topline"><span className="card-label">Weekly goal</span><span className="small-icon-box"><Target size={16} /></span></div>
            <div className="daily-number">{goal.done}<span>/ {goal.goal} workout days</span></div>
            <div className="daily-caption">Days this week with at least one saved workout</div>
            <WeekDots days={goal.days} today={goal.today} />
          </div>
          <div className="daily-footer"><span>{goal.message}</span><strong>{goal.percent}%</strong></div>
        </div>
      </section>

      <div className="section-heading"><div><h2 className="section-title">Your numbers, your work</h2><p className="section-subtitle">Only your own camera-tracked and manually logged workouts count here.</p></div><span className="source-badge"><Activity size={10} /> Live account data</span></div>
      <section className="stat-grid" aria-label="Your workout statistics">
        <StatCard icon={<CalendarDays size={15} />} title="Workouts this week" value={String(thisWeek.length)} detail={`sets saved · ${goal.done}/${goal.goal} goal days`} />
        <StatCard icon={<Dumbbell size={15} />} title="Total reps" value={totalReps.toLocaleString()} detail="from your logged sessions" />
        <StatCard icon={<Flame size={15} />} title="Day streak" value={String(streak)} detail={streak === 1 ? "one day in a row" : "consecutive active days"} />
        <StatCard icon={<TrendingUp size={15} />} title="Average form" value={averageForm === null ? "—" : `${averageForm}%`} detail={averageForm === null ? "from camera-tracked sessions" : `across ${formScores.length} camera sessions`} />
      </section>

      <section className="dashboard-lower">
        <div className="panel">
          <div className="panel-header"><div><h2 className="section-title">Recent activity</h2><p className="section-subtitle">A look at your workout log</p></div><button className="text-button" onClick={() => onNavigate("history")}>Full history <ArrowRight size={13} /></button></div>
          <div className="panel-body">
            {recent.length ? recent.map((session) => <SessionLine key={session.id} session={session} />) : (
              <div className="empty-state"><div className="empty-icon"><Footprints size={18} /></div><div className="empty-title">Your first session is waiting</div><p className="empty-copy">Start a camera-tracked set or log a workout from your history page. Your real progress will show up here.</p><button className="button button-small" onClick={() => onNavigate("train")}>Start training <ArrowRight size={12} /></button></div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div><h2 className="section-title">Something to try</h2><p className="section-subtitle">A starting point, not a prescription</p></div><span className="small-icon-box"><Dumbbell size={15} /></span></div>
          <div style={{ padding: "18px 19px 19px" }}>
            {nextPlan ? <>
              <div className="plan-card-top"><span className="sample-badge">Sample plan</span><span className="meta-pill"><Clock3 size={11} /> {nextPlan.durationMinutes} min</span></div>
              <h3 className="plan-title" style={{ marginTop: 14 }}>{nextPlan.title}</h3>
              <p className="plan-desc">{nextPlan.description}</p>
              <div className="plan-meta"><span className="meta-pill"><CalendarDays size={11} /> {nextPlan.daysPerWeek} days / week</span><span className="meta-pill"><Activity size={11} /> {nextPlan.level}</span></div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}><button className="button button-small" onClick={() => onNavigate("plans")}>Explore plans <ArrowRight size={12} /></button><button className="button button-secondary button-small" onClick={() => onNavigate("train")}>Try a rep</button></div>
              {nextRoutine && <p className="form-hint" style={{ marginTop: 12 }}>Starter routine: {nextRoutine.title} · {nextRoutine.exercises.length} exercises</p>}
            </> : <div className="empty-state"><div className="empty-icon"><Dumbbell size={17} /></div><div className="empty-title">Add your first plan</div><p className="empty-copy">Make a routine that fits your time, space, and goals.</p><button className="button button-small" onClick={() => onNavigate("plans")}>Create a plan</button></div>}
          </div>
        </div>
      </section>
      {sessions.some((session) => session.isSample) && <p className="form-hint" style={{ marginTop: 15, textAlign: "center" }}>Starter records are labeled “Sample” and excluded from your live statistics and progress chart.</p>}
    </div>
  );
}

function StatCard({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <article className="stat-card"><div className="stat-top"><span className="stat-title">{title}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-detail"><Check size={11} /> {detail}</div></article>;
}

export function SessionLine({ session }: { session: WorkoutSession }) {
  const meta = `${formatDate(session.completedAt, { month: "short", day: "numeric" })} · ${formatDuration(session.durationSeconds)}`;
  return <div className="recent-row">
    <div className="exercise-mark"><Activity size={16} /></div>
    <div className="recent-main"><div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><span className="recent-name">{session.exercise}</span>{session.isSample ? <span className="sample-badge">Sample · illustrative</span> : <span className={`source-badge ${session.source === "manual" ? "source-manual" : ""}`}>{session.source === "camera" ? "Camera tracked" : "Manual log"}</span>}</div><div className="recent-meta">{meta}</div></div>
    <div className="recent-value">{unitLabel(session.exercise, session.reps)}<small>{session.formScore !== null ? `${session.formScore}% form` : "logged"}</small></div>
  </div>;
}
