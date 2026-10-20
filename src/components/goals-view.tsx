"use client";

import { useState, type FormEvent } from "react";
import { Check, Edit3, Plus, Target, Trash2, Trophy, X } from "lucide-react";
import { apiRequest } from "@/lib/client-api";
import { EXERCISE_CATALOG, exerciseInfo } from "@/lib/exercises";
import { formatDate, goalProgress } from "@/lib/format";
import type { ExerciseType } from "@/lib/pose-logic";
import type { Goal, WorkoutSession } from "./types";

type Props = { goals: Goal[]; sessions: WorkoutSession[]; onRefresh: () => Promise<void>; onNotify: (message: string, error?: boolean) => void };
type Draft = { title: string; exercise: ExerciseType | ""; metric: "reps" | "sessions"; target: number };

export default function GoalsView({ goals, sessions, onRefresh, onNotify }: Props) {
  const [modal, setModal] = useState<Goal | "new" | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = goals.filter((goal) => !hidden.has(goal.id));
  const active = visible.filter((goal) => !goal.achievedAt);
  const done = visible.filter((goal) => goal.achievedAt);

  async function remove(goal: Goal) {
    if (!window.confirm(`Delete the goal “${goal.title}”?`)) return;
    setHidden((set) => new Set(set).add(goal.id));
    try { await apiRequest(`/api/goals/${goal.id}`, { method: "DELETE" }); await onRefresh(); onNotify("Goal deleted."); }
    catch (error) { setHidden((set) => { const next = new Set(set); next.delete(goal.id); return next; }); onNotify(error instanceof Error ? error.message : "Unable to delete goal.", true); }
  }

  async function save(draft: Draft, goal?: Goal) {
    if (goal) await apiRequest(`/api/goals/${goal.id}`, { method: "PATCH", body: JSON.stringify({ title: draft.title, target: draft.target }) });
    else await apiRequest("/api/goals", { method: "POST", body: JSON.stringify({ ...draft, exercise: draft.exercise || null }) });
    await onRefresh();
    setModal(null);
    onNotify(goal ? "Goal updated." : "New goal set. Go get it!");
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> AIM. MOVE. HIT IT.</div><h1 className="page-title">Your goals.</h1><p className="page-description">Set a target. Progress counts only real workouts you log after the goal is created.</p></div>
        <button className="button" onClick={() => setModal("new")}><Plus size={15} /> New goal</button>
      </div>

      <div className="section-heading" style={{ marginTop: 0 }}><div><h2 className="section-title">In progress</h2><p className="section-subtitle">{active.length} active {active.length === 1 ? "goal" : "goals"}</p></div></div>
      {active.length ? <div className="goal-grid">{active.map((goal) => <GoalCard key={goal.id} goal={goal} progress={goalProgress(goal, sessions)} onEdit={() => setModal(goal)} onDelete={() => remove(goal)} />)}</div>
        : <div className="empty-state" style={{ border: "1px dashed #343b30", borderRadius: 14 }}><div className="empty-icon"><Target size={18} /></div><div className="empty-title">No active goals</div><p className="empty-copy">Set a target like “200 squats” or “10 workouts” and we’ll celebrate when you hit it.</p><button className="button button-small" onClick={() => setModal("new")}><Plus size={13} /> Set a goal</button></div>}

      {done.length > 0 && <>
        <div className="section-heading"><div><h2 className="section-title">Achieved</h2><p className="section-subtitle">Earned, not given.</p></div><span className="sample-badge"><Trophy size={10} /> {done.length}</span></div>
        <div className="goal-grid">{done.map((goal) => <GoalCard key={goal.id} goal={goal} progress={goalProgress(goal, sessions)} onEdit={() => setModal(goal)} onDelete={() => remove(goal)} />)}</div>
      </>}

      {modal && <GoalModal goal={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={save} />}
    </div>
  );
}

function GoalCard({ goal, progress, onEdit, onDelete }: { goal: Goal; progress: number; onEdit: () => void; onDelete: () => void }) {
  const pct = Math.min(100, Math.round(progress / goal.target * 100));
  const unit = goal.metric === "sessions" ? "workouts" : goal.exercise && exerciseInfo(goal.exercise).unit === "sec" ? "sec" : "reps";
  return <article className={`goal-card ${goal.achievedAt ? "achieved" : ""}`}>
    <div className="plan-card-top"><span className={goal.achievedAt ? "sample-badge" : "source-badge"}>{goal.achievedAt ? <><Trophy size={10} /> Achieved {formatDate(goal.achievedAt)}</> : goal.exercise ? exerciseInfo(goal.exercise).label : "Any exercise"}</span>
      <div className="card-actions"><button className="icon-button" aria-label={`Edit ${goal.title}`} onClick={onEdit}><Edit3 size={14} /></button><button className="icon-button" aria-label={`Delete ${goal.title}`} onClick={onDelete}><Trash2 size={14} /></button></div></div>
    <h3 className="plan-title">{goal.title}</h3>
    <div className="goal-numbers"><strong>{Math.min(progress, goal.target).toLocaleString()}</strong><span>/ {goal.target.toLocaleString()} {unit}</span></div>
    <div className="goal-progress goal-bar"><span style={{ width: `${pct}%` }} /></div>
    <div className="plan-card-footer"><span className="form-hint">{goal.achievedAt ? <><Check size={11} style={{ display: "inline", verticalAlign: "-2px" }} /> Target reached</> : `${Math.max(0, goal.target - progress).toLocaleString()} ${unit} to go`}</span><span className="form-hint">{pct}%</span></div>
  </article>;
}

function GoalModal({ goal, onClose, onSave }: { goal: Goal | null; onClose: () => void; onSave: (draft: Draft, goal?: Goal) => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>(goal ? { title: goal.title, exercise: goal.exercise ?? "", metric: goal.metric, target: goal.target } : { title: "", exercise: "Squat", metric: "reps", target: 100 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave({ ...draft, title: draft.title.trim() || defaultTitle(draft) }, goal ?? undefined); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save goal."); }
    finally { setBusy(false); }
  }
  const timed = draft.exercise && exerciseInfo(draft.exercise).unit === "sec";
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label="Goal">
    <header className="modal-header"><div><h2 className="modal-title">{goal ? "Edit goal" : "Set a new goal"}</h2><p className="modal-subtitle">{goal ? "Changing the target re-opens the goal if it was achieved." : "Pick something challenging but doable."}</p></div><button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
    <div className="modal-body"><form onSubmit={submit}><div className="form-grid">
      <label className="form-field full"><span className="form-label">Goal name</span><input className="form-control" value={draft.title} placeholder={defaultTitle(draft)} maxLength={80} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="form-field"><span className="form-label">Exercise</span><select className="form-control" value={draft.exercise} disabled={Boolean(goal)} onChange={(event) => setDraft({ ...draft, exercise: event.target.value as Draft["exercise"] })}><option value="">Any exercise</option>{EXERCISE_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="form-field"><span className="form-label">Measure</span><select className="form-control" value={draft.metric} disabled={Boolean(goal)} onChange={(event) => setDraft({ ...draft, metric: event.target.value as Draft["metric"] })}><option value="reps">{timed ? "Total seconds held" : "Total reps"}</option><option value="sessions">Number of workouts</option></select></label>
      <label className="form-field full"><span className="form-label">Target</span><input className="form-control" type="number" min={1} max={100000} value={draft.target} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) })} required /></label>
    </div>
    {error && <p className="modal-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
    <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={busy}>{busy ? "Saving…" : goal ? "Save goal" : "Set goal"}</button></div></form></div>
  </section></div>;
}

function defaultTitle(draft: Draft): string {
  const name = draft.exercise ? exerciseInfo(draft.exercise).label.toLowerCase() : "workout";
  if (draft.metric === "sessions") return `${draft.target} ${name} sessions`;
  return draft.exercise && exerciseInfo(draft.exercise).unit === "sec" ? `${draft.target}s of ${name}` : `${draft.target} ${name}`;
}
