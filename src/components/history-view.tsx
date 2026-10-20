"use client";

import { useState, type FormEvent } from "react";
import { Activity, CalendarDays, Edit3, Plus, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/client-api";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { WorkoutSession } from "./types";
import type { ExerciseType } from "@/lib/pose-logic";
import { EXERCISE_CATALOG, unitLabel } from "@/lib/exercises";

type Props = { sessions: WorkoutSession[]; onRefresh: () => Promise<void>; onNotify: (message: string, error?: boolean) => void };
type Filter = "all" | "camera" | "manual";
type SessionDraft = { exercise: ExerciseType; reps: number; durationSeconds: number; notes: string };

export default function HistoryView({ sessions, onRefresh, onNotify }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  const [modal, setModal] = useState(false);
  const [newSession, setNewSession] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const available = sessions.filter((session) => !hidden.has(session.id));
  const filtered = available.filter((session) => filter === "all" || (!session.isSample && session.source === filter));

  async function remove(session: WorkoutSession) {
    if (!window.confirm(`Delete this ${session.isSample ? "sample " : ""}${session.exercise.toLowerCase()} session?`)) return;
    setHidden((items) => new Set(items).add(session.id));
    try {
      await apiRequest(`/api/sessions/${session.id}`, { method: "DELETE" });
      await onRefresh();
      onNotify("Workout removed from your history.");
    } catch (error) {
      setHidden((items) => { const next = new Set(items); next.delete(session.id); return next; });
      onNotify(error instanceof Error ? error.message : "Unable to delete this workout.", true);
    }
  }

  async function save(data: SessionDraft) {
    if (newSession) {
      await apiRequest("/api/sessions", { method: "POST", body: JSON.stringify({ ...data, source: "manual" }) });
    } else if (editing) {
      await apiRequest(`/api/sessions/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) });
    }
    await onRefresh();
    setModal(false); setEditing(null); setNewSession(false);
    onNotify(newSession ? "Manual workout added. It is not a camera measurement." : "Workout details updated.");
  }

  function openCreate() { setEditing(null); setNewSession(true); setModal(true); }
  function openEdit(session: WorkoutSession) { setEditing(session); setNewSession(false); setModal(true); }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> THE WORK YOU PUT IN</div><h1 className="page-title">Your workout history.</h1><p className="page-description">Everything in one place, with camera tracking, manual logs, and sample records clearly separated.</p></div>
        <button className="button" onClick={openCreate}><Plus size={15} /> Log a workout</button>
      </div>
      <div className="history-toolbar"><div className="segment-tabs" role="tablist" aria-label="Filter workouts">
        {(["all", "camera", "manual"] as Filter[]).map((option) => <button key={option} role="tab" aria-selected={filter === option} className={`segment-tab ${filter === option ? "selected" : ""}`} onClick={() => setFilter(option)}>{option === "all" ? "All activity" : option === "camera" ? "Camera tracked" : option === "manual" ? "Manual logs" : "Sample records"}</button>)}
      </div><span className="form-hint">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span></div>
      {filtered.length ? <div className="history-list">
        {filtered.map((session) => <article className="history-row" key={session.id}>
          <div className="history-cell date-cell"><span className="history-cell-label">Session</span><div style={{ display: "flex", alignItems: "center", gap: 7 }}><span className="exercise-mark" style={{ width: 29, height: 29 }}><Activity size={14} /></span><div><div className="history-date">{session.exercise}</div><div className="history-small">{formatDateTime(session.completedAt)}</div></div></div></div>
          <div className="history-cell source-cell"><span className="history-cell-label">Source</span>{session.isSample ? <span className="sample-badge">Sample · illustrative</span> : <span className={`source-badge ${session.source === "manual" ? "source-manual" : ""}`}>{session.source === "camera" ? "Camera tracked" : "Manual log"}</span>}</div>
          <div className="history-cell stat-cell"><span className="history-cell-label">Repetitions</span><div className="history-stat">{unitLabel(session.exercise, session.reps)}</div><div className="history-small">{session.formScore !== null && !session.isSample ? `Form feedback ${session.formScore}%` : session.isSample ? "Not camera-measured" : "No form score saved"}</div></div>
          <div className="history-cell stat-cell"><span className="history-cell-label">Duration</span><div className="history-stat">{formatDuration(session.durationSeconds)}</div>{session.notes && <div className="history-small" title={session.notes}>{session.notes.length > 38 ? `${session.notes.slice(0, 38)}…` : session.notes}</div>}</div>
          <div className="history-actions"><button className="icon-button" onClick={() => openEdit(session)} aria-label={`Edit ${session.exercise} session`}><Edit3 size={14} /></button><button className="icon-button" onClick={() => remove(session)} aria-label={`Delete ${session.exercise} session`}><Trash2 size={14} /></button></div>
        </article>)}
      </div> : <div className="empty-state" style={{ minHeight: 280, border: "1px dashed #343b30", borderRadius: 15, background: "#10130f" }}><div className="empty-icon"><CalendarDays size={19} /></div><div className="empty-title">{filter === "all" ? "No sessions in this log yet" : `No ${filter} sessions here`}</div><p className="empty-copy">{filter === "all" ? "Your camera-tracked sessions, sample history, and manual logs will appear here." : "Try another filter, or add a workout to your history."}</p>{filter === "all" && <button className="button button-small" onClick={openCreate}><Plus size={12} /> Log a workout</button>}</div>}
      <div className="progress-note" style={{ marginTop: 15 }}><Activity size={15} /><span>Manual logs are self-reported and never presented as live camera readings.</span></div>
      {modal && <SessionModal initial={editing} isNew={newSession} onClose={() => { setModal(false); setEditing(null); setNewSession(false); }} onSave={save} />}
    </div>
  );
}

function SessionModal({ initial, isNew, onClose, onSave }: { initial: WorkoutSession | null; isNew: boolean; onClose: () => void; onSave: (data: SessionDraft) => Promise<void> }) {
  const [form, setForm] = useState<SessionDraft>({
    exercise: initial?.exercise ?? "Squat",
    reps: initial?.reps ?? 12,
    durationSeconds: initial?.durationSeconds ?? 300,
    notes: initial?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(form); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the session."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={isNew ? "Log a workout" : "Edit session"}>
    <header className="modal-header"><div><h2 className="modal-title">{isNew ? "Log a workout" : "Edit session details"}</h2><p className="modal-subtitle">{isNew ? "A manual entry is self-reported, not webcam-measured." : initial?.isSample ? "Changes keep this record labeled as an illustrative sample." : "Update the details you want to keep in your history."}</p></div><button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
    <div className="modal-body"><form onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field"><span className="form-label">Exercise</span><select className="form-control" value={form.exercise} onChange={(event) => setForm((current) => ({ ...current, exercise: event.target.value as SessionDraft["exercise"] }))}>{EXERCISE_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="form-field"><span className="form-label">{form.exercise === "Plank" ? "Seconds held" : "Repetitions"}</span><input className="form-control" type="number" min={1} max={1000} value={form.reps} onChange={(event) => setForm((current) => ({ ...current, reps: Number(event.target.value) }))} required /></label>
        <label className="form-field full"><span className="form-label">Duration (seconds)</span><input className="form-control" type="number" min={1} max={86400} value={form.durationSeconds} onChange={(event) => setForm((current) => ({ ...current, durationSeconds: Number(event.target.value) }))} required /></label>
        <label className="form-field full"><span className="form-label">Notes (optional)</span><textarea className="form-control" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} maxLength={1000} placeholder="How did it feel?" /></label>
      </div>
      {error && <p className="modal-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button" disabled={busy}>{busy ? "Saving…" : isNew ? "Add manual log" : "Save changes"}</button></div>
    </form></div>
  </section></div>;
}
