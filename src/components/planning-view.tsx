"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Activity, Camera, CalendarDays, Clock3, Dumbbell, Edit3, Play, Plus, Trash2, X } from "lucide-react";
import { matchExercise, planSteps, presetForPlan, totalSets, type Program } from "@/lib/programs";
import { apiRequest } from "@/lib/client-api";
import type { Plan, Routine, RoutineExercise } from "./types";

type Props = { plans: Plan[]; routines: Routine[]; onRefresh: () => Promise<void>; onNotify: (message: string, error?: boolean) => void; onStartProgram: (program: Program) => void };
type PlanDraft = { title: string; description: string; level: string; goal: string; daysPerWeek: number; durationMinutes: number; exerciseText: string };
type RoutineDraft = { title: string; category: string; focus: string; durationMinutes: number; exerciseText: string };

const blankPlan: PlanDraft = { title: "", description: "", level: "Beginner", goal: "Build strength", daysPerWeek: 3, durationMinutes: 25, exerciseText: "" };
const blankRoutine: RoutineDraft = { title: "", category: "Strength", focus: "Full body", durationMinutes: 20, exerciseText: "Bodyweight squat | 3 | 10 | 60" };

export default function PlanningView({ plans, routines, onRefresh, onNotify, onStartProgram }: Props) {
  const [tab, setTab] = useState<"plans" | "routines">("plans");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [routineModal, setRoutineModal] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visiblePlans = plans.filter((plan) => !hidden.has(plan.id));
  const visibleRoutines = routines.filter((routine) => !hidden.has(routine.id));

  async function remove(kind: "plans" | "routines", id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? This can’t be undone.`)) return;
    setHidden((items) => new Set(items).add(id));
    try {
      await apiRequest(`/api/${kind}/${id}`, { method: "DELETE" });
      await onRefresh();
      onNotify(kind === "plans" ? "Plan deleted." : "Routine deleted.");
    } catch (error) {
      setHidden((items) => { const next = new Set(items); next.delete(id); return next; });
      onNotify(error instanceof Error ? error.message : "Unable to delete this item.", true);
    }
  }

  async function savePlan(data: Omit<PlanDraft, "exerciseText"> & { exercises: RoutineExercise[] }, id?: string) {
    await apiRequest(id ? `/api/plans/${id}` : "/api/plans", { method: id ? "PATCH" : "POST", body: JSON.stringify(data) });
    await onRefresh();
    setPlanModal(false);
    setEditingPlan(null);
    onNotify(id ? "Plan updated." : "Plan created.");
  }

  async function saveRoutine(data: { title: string; category: string; focus: string; durationMinutes: number; exercises: RoutineExercise[] }, id?: string) {
    await apiRequest(id ? `/api/routines/${id}` : "/api/routines", { method: id ? "PATCH" : "POST", body: JSON.stringify(data) });
    await onRefresh();
    setRoutineModal(false);
    setEditingRoutine(null);
    onNotify(id ? "Routine updated." : "Routine created.");
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> THE PLAN IS YOURS</div><h1 className="page-title">Make a plan. Make it happen.</h1><p className="page-description">Build a routine that fits your room, your schedule, and your starting point.</p></div>
        <button className="button" onClick={() => tab === "plans" ? setPlanModal(true) : setRoutineModal(true)}><Plus size={15} /> New {tab === "plans" ? "plan" : "routine"}</button>
      </div>
      <div className="section-heading" style={{ marginTop: 0 }}>
        <div><h2 className="section-title">Your training library</h2><p className="section-subtitle">Edit, reuse, or delete any plan and exercise routine.</p></div>
        <div className="segment-tabs" role="tablist" aria-label="Training library">
          <button className={`segment-tab ${tab === "plans" ? "selected" : ""}`} role="tab" aria-selected={tab === "plans"} onClick={() => setTab("plans")}>Plans <span className="nav-count">{visiblePlans.length}</span></button>
          <button className={`segment-tab ${tab === "routines" ? "selected" : ""}`} role="tab" aria-selected={tab === "routines"} onClick={() => setTab("routines")}>Routines <span className="nav-count">{visibleRoutines.length}</span></button>
        </div>
      </div>

      {tab === "plans" ? (
        <div className="plan-grid">
          {visiblePlans.map((plan) => <article className="plan-card" key={plan.id}>
            <div className="plan-card-top"><span className={plan.isSample ? "sample-badge" : "source-badge"}>{plan.isSample ? "Sample plan" : "Your plan"}</span><div className="card-actions"><button className="icon-button" aria-label={`Edit ${plan.title}`} onClick={() => { setEditingPlan(plan); setPlanModal(true); }}><Edit3 size={14} /></button><button className="icon-button" aria-label={`Delete ${plan.title}`} onClick={() => remove("plans", plan.id, plan.title)}><Trash2 size={14} /></button></div></div>
            <h3 className="plan-title">{plan.title}</h3><p className="plan-desc">{plan.description || "A plan you created for your training."}</p>
            <div className="plan-meta"><span className="meta-pill"><CalendarDays size={11} /> {plan.daysPerWeek} days / week</span><span className="meta-pill"><Clock3 size={11} /> {plan.durationMinutes} min</span><span className="meta-pill"><Activity size={11} /> {plan.level}</span></div>
            <div className="routine-exercises" style={{ marginTop: 12 }}>{planSteps(plan).map((step, index) => <span className="exercise-chip" key={`${step.name}-${index}`}>{step.name} · {step.sets}×{matchExercise(step.name) === "Plank" ? `${step.reps}s` : step.reps}</span>)}</div>
            <button className="button button-small" style={{ marginTop: 12 }} onClick={() => onStartProgram({ kind: "plan", id: plan.id, title: plan.title, steps: planSteps(plan) })}><Play size={12} fill="currentColor" /> Start plan · {totalSets(planSteps(plan))} sets</button>
            <div className="plan-card-footer"><span className="form-hint">{plan.goal}</span><span className="form-hint">Created {new Date(plan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
          </article>)}
          {visiblePlans.length === 0 && <div className="empty-state plan-empty"><div className="empty-icon"><Dumbbell size={18} /></div><div className="empty-title">No plans yet</div><p className="empty-copy">Start with a simple goal and shape a plan around your week.</p><button className="button button-small" onClick={() => setPlanModal(true)}><Plus size={13} /> Create a plan</button></div>}
        </div>
      ) : (
        <div className="routine-list">
          {visibleRoutines.map((routine) => <article className="routine-card" key={routine.id}>
            <div><div className="plan-card-top"><span className={routine.isSample ? "sample-badge" : "source-badge"}>{routine.isSample ? "Sample routine" : routine.category}</span><span className="meta-pill"><Clock3 size={10} /> {routine.durationMinutes} min</span></div><h3 className="routine-title" style={{ marginTop: 11 }}>{routine.title}</h3><div className="routine-focus">{routine.focus} · {routine.exercises.length} exercises</div></div>
            <div className="routine-exercises">{routine.exercises.map((exercise, index) => <span className="exercise-chip" key={`${exercise.name}-${index}`}>{matchExercise(exercise.name) && <Camera size={9} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />}{exercise.name} · {exercise.sets}×{exercise.reps}</span>)}</div>
            <div className="routine-actions"><button className="button button-small" onClick={() => onStartProgram({ kind: "routine", id: routine.id, title: routine.title, steps: routine.exercises })}><Play size={12} fill="currentColor" /> Start</button><button className="icon-button" aria-label={`Edit ${routine.title}`} onClick={() => { setEditingRoutine(routine); setRoutineModal(true); }}><Edit3 size={14} /></button><button className="icon-button" aria-label={`Delete ${routine.title}`} onClick={() => remove("routines", routine.id, routine.title)}><Trash2 size={14} /></button></div>
          </article>)}
          {visibleRoutines.length === 0 && <div className="empty-state" style={{ border: "1px dashed #343b30", borderRadius: 14 }}><div className="empty-icon"><Activity size={18} /></div><div className="empty-title">Your routine library is clear</div><p className="empty-copy">Add exercises and organize them into a session that works for you.</p><button className="button button-small" onClick={() => setRoutineModal(true)}><Plus size={13} /> Create a routine</button></div>}
        </div>
      )}

      {plans.some((plan) => plan.isSample) && <div className="progress-note" style={{ marginTop: 17 }}><Activity size={15} /><span>Sample plans and routines are starter examples only. They’re labeled as samples and can be edited or removed like your own items.</span></div>}
      {planModal && <PlanModal initial={editingPlan} onClose={() => { setPlanModal(false); setEditingPlan(null); }} onSave={savePlan} />}
      {routineModal && <RoutineModal initial={editingRoutine} onClose={() => { setRoutineModal(false); setEditingRoutine(null); }} onSave={saveRoutine} />}
    </div>
  );
}

function PlanModal({ initial, onClose, onSave }: { initial: Plan | null; onClose: () => void; onSave: (data: Omit<PlanDraft, "exerciseText"> & { exercises: RoutineExercise[] }, id?: string) => Promise<void> }) {
  const [form, setForm] = useState<PlanDraft>(initial ? { title: initial.title, description: initial.description, level: initial.level, goal: initial.goal, daysPerWeek: initial.daysPerWeek, durationMinutes: initial.durationMinutes, exerciseText: planSteps(initial).map(toExerciseLine).join("\n") } : blankPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setForm(initial ? { title: initial.title, description: initial.description, level: initial.level, goal: initial.goal, daysPerWeek: initial.daysPerWeek, durationMinutes: initial.durationMinutes, exerciseText: planSteps(initial).map(toExerciseLine).join("\n") } : blankPlan), [initial]);
  const update = (key: keyof PlanDraft, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const text = form.exerciseText.trim();
    const exercises = text ? parseExercises(text) : presetForPlan(form.title, form.goal, form.level);
    if (!exercises) { setBusy(false); setError("Use one exercise per line: name | sets | reps | rest seconds."); return; }
    const { exerciseText: _ignored, ...rest } = form;
    void _ignored;
    try { await onSave({ ...rest, exercises }, initial?.id); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the plan."); }
    finally { setBusy(false); }
  }
  return <Modal title={initial ? "Edit your plan" : "Create a workout plan"} subtitle="Keep it realistic. Consistency beats intensity." onClose={onClose}>
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field full"><span className="form-label">Plan name</span><input className="form-control" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Stronger at home" minLength={2} maxLength={80} required /></label>
        <label className="form-field full"><span className="form-label">What’s the plan about?</span><textarea className="form-control" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="A few words to keep you focused" maxLength={500} /></label>
        <label className="form-field"><span className="form-label">Experience level</span><select className="form-control" value={form.level} onChange={(event) => update("level", event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label className="form-field"><span className="form-label">Main goal</span><input className="form-control" value={form.goal} onChange={(event) => update("goal", event.target.value)} maxLength={60} minLength={2} required /></label>
        <label className="form-field"><span className="form-label">Days per week</span><input className="form-control" type="number" min={1} max={7} value={form.daysPerWeek} onChange={(event) => update("daysPerWeek", Number(event.target.value))} required /></label>
        <label className="form-field"><span className="form-label">Minutes per workout</span><input className="form-control" type="number" min={5} max={180} value={form.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value))} required /></label>
        <label className="form-field full"><span className="form-label">Exercise set</span><textarea className="form-control" style={{ minHeight: 110, fontFamily: "monospace", lineHeight: 1.7 }} value={form.exerciseText} onChange={(event) => update("exerciseText", event.target.value)} placeholder={presetForPlan(form.title, form.goal, form.level).map(toExerciseLine).join("\n")} /><span className="form-hint">One per line: name | sets | reps (seconds for plank) | rest. Leave empty to use the preset based on the plan name. <button type="button" className="text-button" onClick={() => update("exerciseText", presetForPlan(form.title, form.goal, form.level).map(toExerciseLine).join("\n"))}>Fill preset</button></span></label>
      </div>
      {error && <p className="modal-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Create plan"}</button></div>
    </form>
  </Modal>;
}

function RoutineModal({ initial, onClose, onSave }: { initial: Routine | null; onClose: () => void; onSave: (data: { title: string; category: string; focus: string; durationMinutes: number; exercises: RoutineExercise[] }, id?: string) => Promise<void> }) {
  const [form, setForm] = useState<RoutineDraft>(initial ? { title: initial.title, category: initial.category, focus: initial.focus, durationMinutes: initial.durationMinutes, exerciseText: initial.exercises.map(toExerciseLine).join("\n") } : blankRoutine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setForm(initial ? { title: initial.title, category: initial.category, focus: initial.focus, durationMinutes: initial.durationMinutes, exerciseText: initial.exercises.map(toExerciseLine).join("\n") } : blankRoutine), [initial]);
  const update = (key: keyof RoutineDraft, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const parsed = parseExercises(form.exerciseText);
    if (!parsed) { setBusy(false); setError("Use one exercise per line: name | sets | reps | rest seconds."); return; }
    try { await onSave({ title: form.title, category: form.category, focus: form.focus, durationMinutes: form.durationMinutes, exercises: parsed }, initial?.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save this routine."); }
    finally { setBusy(false); }
  }
  return <Modal title={initial ? "Edit your routine" : "Create an exercise routine"} subtitle="Add exercises in the order you want to complete them." onClose={onClose}>
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field full"><span className="form-label">Routine name</span><input className="form-control" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Quick full-body reset" minLength={2} maxLength={80} required /></label>
        <label className="form-field"><span className="form-label">Category</span><select className="form-control" value={form.category} onChange={(event) => update("category", event.target.value)}><option>Strength</option><option>Cardio</option><option>Mobility</option><option>Recovery</option></select></label>
        <label className="form-field"><span className="form-label">Focus</span><input className="form-control" value={form.focus} onChange={(event) => update("focus", event.target.value)} placeholder="Full body" minLength={2} maxLength={60} required /></label>
        <label className="form-field"><span className="form-label">Estimated minutes</span><input className="form-control" type="number" min={5} max={180} value={form.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value))} required /></label>
        <label className="form-field full"><span className="form-label">Exercises</span><textarea className="form-control" style={{ minHeight: 120, fontFamily: "monospace", lineHeight: 1.7 }} value={form.exerciseText} onChange={(event) => update("exerciseText", event.target.value)} placeholder="Bodyweight squat | 3 | 10 | 60" required /><span className="form-hint">One per line: exercise name | sets | reps | rest in seconds. Camera-tracked: squat, push-up, lunge, jumping jack, high knees, mountain climber, plank. Any other name is logged manually.</span></label>
      </div>
      {error && <p className="modal-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Create routine"}</button></div>
    </form>
  </Modal>;
}

function toExerciseLine(exercise: RoutineExercise): string { return `${exercise.name} | ${exercise.sets} | ${exercise.reps} | ${exercise.restSeconds}`; }
function parseExercises(value: string): RoutineExercise[] | null {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 1 || lines.length > 16) return null;
  const output: RoutineExercise[] = [];
  for (const line of lines) {
    const [name, setsText, repsText, restText] = line.split("|").map((part) => part.trim());
    const sets = Number(setsText); const reps = Number(repsText); const restSeconds = Number(restText);
    if (!name || name.length > 80 || !Number.isInteger(sets) || !Number.isInteger(reps) || !Number.isInteger(restSeconds) || sets < 1 || sets > 20 || reps < 1 || reps > 200 || restSeconds < 0 || restSeconds > 600) return null;
    output.push({ name, sets, reps, restSeconds });
  }
  return output;
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><header className="modal-header"><div><h2 className="modal-title">{title}</h2><p className="modal-subtitle">{subtitle}</p></div><button className="icon-button modal-close" onClick={onClose} type="button" aria-label="Close"><X size={16} /></button></header><div className="modal-body">{children}</div></section></div>;
}
