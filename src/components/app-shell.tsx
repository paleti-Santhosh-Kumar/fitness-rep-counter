"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, CalendarDays, Camera, Dumbbell, Flame, Images, LayoutDashboard, Menu, Settings2, Sparkles, Target, TrendingUp, UserRound, X } from "lucide-react";
import { goalSummary } from "@/lib/format";
import WeekDots from "@/components/week-dots";
import { apiRequest } from "@/lib/client-api";
import { currentWeekSessions, goalProgress, weekStart } from "@/lib/format";
import GoalsView from "@/components/goals-view";
import ExercisesView from "@/components/exercises-view";
import Celebration from "@/components/celebration";
import type { ExerciseType } from "@/lib/pose-logic";
import DashboardView from "@/components/dashboard-view";
import HistoryView from "@/components/history-view";
import PlanningView from "@/components/planning-view";
import ProfileView from "@/components/profile-view";
import ProgressView from "@/components/progress-view";
import AdvancedView from "@/components/advanced-view";
import WorkoutStudio, { type SessionSave } from "@/components/workout-studio";
import type { Program } from "@/lib/programs";
import type { Overview, Preferences, User, WorkoutSession } from "./types";

type ViewId = "dashboard" | "train" | "exercises" | "advanced" | "goals" | "plans" | "progress" | "history" | "profile";
const VIEW_IDS: ViewId[] = ["dashboard", "train", "exercises", "advanced", "goals", "plans", "progress", "history", "profile"];
type Toast = { message: string; error: boolean };

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "train", label: "Start a workout", icon: Camera },
  { id: "exercises", label: "Exercise library", icon: Images },
  { id: "goals", label: "Goals", icon: Target },
  { id: "advanced", label: "Advanced training", icon: Flame },
  { id: "plans", label: "Plans & routines", icon: Dumbbell },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "history", label: "Workout history", icon: CalendarDays },
  { id: "profile", label: "Profile & settings", icon: Settings2 },
];

const TITLES: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: { title: "Your training space", subtitle: "A little stronger, one session at a time" },
  train: { title: "Camera workout", subtitle: "Local pose tracking · no wearable required" },
  exercises: { title: "Exercise library", subtitle: "Seven camera-tracked moves" },
  goals: { title: "Goals", subtitle: "Set targets and celebrate real wins" },
  advanced: { title: "Advanced training", subtitle: "Body-part workouts for every level" },
  plans: { title: "Training library", subtitle: "Build workouts that fit your life" },
  progress: { title: "Your progress", subtitle: "Only the workouts you actually log" },
  history: { title: "Workout history", subtitle: "Camera, manual, and sample records clearly labeled" },
  profile: { title: "Account settings", subtitle: "Your profile and training preferences" },
};

export default function AppShell() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [view, setView] = useState<ViewId>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [studioExercise, setStudioExercise] = useState<ExerciseType>("Squat");
  const [program, setProgram] = useState<Program | null>(null);
  const [studioTarget, setStudioTarget] = useState(10);
  const [studioRun, setStudioRun] = useState(0);
  const [celebration, setCelebration] = useState<{ title: string; message: string } | null>(null);
  const attemptedGoals = useRef<Set<string>>(new Set());

  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error });
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const refreshOverview = useCallback(async () => {
    setDataLoading(true);
    try {
      const result = await apiRequest<Overview>("/api/overview");
      setOverview(result);
      setUser(result.user);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function checkSession() {
      try {
        const data = await apiRequest<Overview>("/api/overview");
        if (!alive) return;
        setOverview(data);
        setUser(data.user);
      } catch (error) {
        console.error("App startup failed", error);
      } finally {
        if (alive) setAuthChecked(true);
      }
    }
    void checkSession();
    return () => { alive = false; if (toastTimer.current !== null) window.clearTimeout(toastTimer.current); };
  }, []);

  function navigate(next: string) {
    if ((VIEW_IDS as string[]).includes(next)) {
      setView(next as ViewId);
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  useEffect(() => {
    if (!overview) return;
    // Goal celebrations — verified by the server against real sessions.
    for (const goal of overview.goals) {
      if (goal.achievedAt || attemptedGoals.current.has(goal.id)) continue;
      if (goalProgress(goal, overview.sessions) < goal.target) continue;
      attemptedGoals.current.add(goal.id);
      void apiRequest(`/api/goals/${goal.id}`, { method: "PATCH", body: JSON.stringify({ achieved: true }) })
        .then(() => { setCelebration({ title: goal.title, message: `You hit your target of ${goal.target.toLocaleString()}. That's real work, and it's yours.` }); return refreshOverview(); })
        .catch(() => attemptedGoals.current.delete(goal.id));
      return;
    }
    // Weekly goal celebration, once per week per browser.
    const goal = overview.preferences.weeklyGoal;
    const count = currentWeekSessions(overview.sessions).length;
    const key = `noescape-week-${weekStart(new Date()).toISOString().slice(0, 10)}-${goal}`;
    if (count >= goal && count > 0 && typeof window !== "undefined" && !window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, "1");
      setCelebration({ title: "Weekly goal reached!", message: `${count} real workouts this week — you hit your target of ${goal}. No escape, no excuses.` });
    }
  }, [overview, refreshOverview]);

  if (!authChecked) return <div className="loading-screen"><div className="loading-card"><span className="spinner" /><span>Loading your training space…</span></div></div>;
  if (!user || !overview) return <div className="loading-screen"><div className="loading-card"><span>We could not open your workspace. Check the database connection and refresh.</span><button className="button button-small" onClick={() => window.location.reload()}>Retry</button></div></div>;

  const title = TITLES[view];
  const goal = goalSummary(overview.sessions, overview.preferences.weeklyGoal);
  const weeklyGoal = Math.max(1, overview.preferences.weeklyGoal);
  const avatar = user.name.trim().slice(0, 1).toUpperCase() || "A";

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand-lockup"><div className="brand-mark"><Activity size={18} strokeWidth={2.7} /></div><div><div className="brand-name">NO ESCAPE</div><div className="brand-tag">MOVE WITH INTENT</div></div><button className="icon-button mobile-menu-button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} style={{ marginLeft: "auto" }}><X size={17} /></button></div>
        <div className="nav-caption">Workspace</div>
        <nav className="nav-stack">
          {NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}><Icon /><span>{item.label}</span>{item.id === "history" && overview.sessions.length > 0 && <span className="nav-count">{overview.sessions.length}</span>}</button>; })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-goal"><div className="goal-head"><span>Weekly goal</span><Sparkles size={14} /></div><div className="goal-big"><strong>{goal.done}</strong> / {goal.goal} <span>workout days</span></div><WeekDots days={goal.days} today={goal.today} /><div className="goal-sub">{goal.message}</div></div>
      </aside>

      <main className="workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
            <div><div className="topbar-title">{title.title}</div><div className="topbar-subtitle">{title.subtitle}</div></div>
          </div>
          <div className="topbar-actions"><span className="source-badge"><span className="status-dot" style={{ width: 5, height: 5 }} /> Private workspace</span><span className="topbar-separator" /><span className="sidebar-user-name top-user-name">{user.name.split(" ")[0]}</span><div className="avatar top-avatar">{avatar}</div><button className="icon-button" onClick={() => navigate("profile")} title="Profile settings" aria-label="Profile settings"><UserRound size={15} /></button></div>
        </header>

        {dataLoading && <div style={{ height: 2, background: "linear-gradient(90deg,transparent,var(--lime),transparent)" }} />}
        {view === "dashboard" && <DashboardView user={user} preferences={overview.preferences} plans={overview.plans} routines={overview.routines} sessions={overview.sessions} onNavigate={navigate} />}
        {view === "train" && <WorkoutStudio key={program ? `program-${program.kind}-${program.id}` : `solo-${studioExercise}-${studioRun}`} initialExercise={studioExercise} initialTarget={studioTarget} program={program} onExitProgram={() => setProgram(null)} plans={overview.plans} routines={overview.routines} cameraTips={overview.preferences.cameraTips} onNotify={notify} onSaveSession={async (data: SessionSave) => {
          // Optimistic: show the session in history/progress instantly.
          const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const now = new Date().toISOString();
          const source = data.source ?? "camera";
          const optimistic: WorkoutSession = { id: tempId, userId: user.id, planId: data.planId ?? null, routineId: data.routineId ?? null, exercise: data.exercise as ExerciseType, reps: data.reps, durationSeconds: data.durationSeconds, formScore: source === "camera" ? data.formScore : null, notes: data.notes ?? "", source, isSample: false, completedAt: now, updatedAt: now };
          setOverview((current) => current ? { ...current, sessions: [optimistic, ...current.sessions] } : current);
          try {
            const result = await apiRequest<{ session: WorkoutSession }>("/api/sessions", { method: "POST", body: JSON.stringify({ ...data, source }) });
            setOverview((current) => current ? { ...current, sessions: current.sessions.map((item) => item.id === tempId ? result.session : item) } : current);
            notify(data.notes ? `Saved: ${data.notes}` : "Workout saved automatically — history and progress updated.");
            void refreshOverview().catch(() => undefined);
          } catch (error) {
            setOverview((current) => current ? { ...current, sessions: current.sessions.filter((item) => item.id !== tempId) } : current);
            notify(error instanceof Error ? error.message : "Workout could not be saved.", true);
            throw error;
          }
        }} />}
        {view === "exercises" && <ExercisesView onStart={(exercise, target) => { setProgram(null); setStudioExercise(exercise); setStudioTarget(target); setStudioRun((value) => value + 1); navigate("train"); }} />}
        {view === "goals" && <GoalsView goals={overview.goals} sessions={overview.sessions} onRefresh={refreshOverview} onNotify={notify} />}
        {view === "advanced" && <AdvancedView onStartProgram={(next) => { setProgram(next); navigate("train"); }} onRefresh={refreshOverview} onNotify={notify} />}
        {view === "plans" && <PlanningView onStartProgram={(next) => { setProgram(next); navigate("train"); }} plans={overview.plans} routines={overview.routines} onRefresh={refreshOverview} onNotify={notify} />}
        {view === "progress" && <ProgressView sessions={overview.sessions} preferences={overview.preferences} />}
        {view === "history" && <HistoryView sessions={overview.sessions} onRefresh={refreshOverview} onNotify={notify} />}
        {view === "profile" && <ProfileView user={user} preferences={overview.preferences} onNotify={notify} onProfileUpdate={(nextUser) => { setUser(nextUser); setOverview((current) => current ? { ...current, user: nextUser } : current); }} onPreferencesUpdate={(preferences: Preferences) => { setOverview((current) => current ? { ...current, preferences } : current); }} />}
      </main>

      {celebration && <Celebration title={celebration.title} message={celebration.message} onClose={() => setCelebration(null)} />}
      {toast && <div className={`toast ${toast.error ? "error" : ""}`} role={toast.error ? "alert" : "status"}><Activity size={15} />{toast.message}</div>}
    </div>
  );
}
