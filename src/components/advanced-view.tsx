"use client";

import { useState } from "react";
import { Camera, Clock3, Flame, Hand, Play, Save, Table2 } from "lucide-react";
import { apiRequest } from "@/lib/client-api";
import { BODY_PARTS, TRACKS, isHoldName, stepsFor, type TrackId } from "@/lib/body-part-library";
import { matchExercise, totalSets, type Program } from "@/lib/programs";

type Props = {
  onStartProgram: (program: Program) => void;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, error?: boolean) => void;
};

export default function AdvancedView({ onStartProgram, onRefresh, onNotify }: Props) {
  const [trackId, setTrackId] = useState<TrackId>("male-hard");
  const [showTable, setShowTable] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const track = TRACKS.find((item) => item.id === trackId)!;

  async function saveAsRoutine(partId: string) {
    const part = BODY_PARTS.find((item) => item.id === partId)!;
    const steps = stepsFor(part, trackId);
    setSavingId(partId);
    try {
      await apiRequest("/api/routines", {
        method: "POST",
        body: JSON.stringify({
          title: `${part.name} · ${track.label}`.slice(0, 80),
          category: /warm-up/i.test(part.name) ? "Mobility" : "Strength",
          focus: part.name.slice(0, 60),
          durationMinutes: Math.min(180, Math.max(5, Math.round(steps.reduce((sum, step) => sum + step.sets * (step.reps * 3 + step.restSeconds), 0) / 60))),
          exercises: steps,
        }),
      });
      await onRefresh();
      onNotify(`Saved “${part.name} · ${track.short}” to Plans & routines.`);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Could not save this routine.", true);
    } finally { setSavingId(null); }
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> ADVANCED & CORE TRAINING</div><h1 className="page-title">Train by body part.</h1><p className="page-description">Pick your level, choose a body part, and start a guided session. No equipment needed.</p></div>
        <button className="button button-secondary" onClick={() => setShowTable((value) => !value)}><Table2 size={15} /> {showTable ? "Show cards" : "Full table"}</button>
      </div>

      <div className="track-tabs" role="tablist" aria-label="Training level">
        {TRACKS.map((item) => (
          <button key={item.id} role="tab" aria-selected={trackId === item.id} className={`track-tab ${trackId === item.id ? "selected" : ""}`} onClick={() => setTrackId(item.id)}>
            <strong>{item.label}</strong>
            <small>{item.sets} sets · {item.reps} reps · {item.hold}s holds · {item.rest}s rest</small>
          </button>
        ))}
      </div>
      <p className="form-hint" style={{ margin: "10px 0 18px" }}>{track.description} <Camera size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> = counted by camera · <Hand size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> = log your reps manually.</p>

      {showTable ? (
        <div className="library-table-wrap">
          <table className="library-table">
            <thead><tr><th>#</th><th>Body part</th>{TRACKS.map((item) => <th key={item.id} className={item.id === trackId ? "active" : ""}>{item.label}</th>)}</tr></thead>
            <tbody>{BODY_PARTS.map((part, index) => (
              <tr key={part.id}><td>{index + 1}</td><td><strong>{part.name}</strong></td>{TRACKS.map((item) => <td key={item.id} className={item.id === trackId ? "active" : ""}>{part.exercises[item.id].join(", ")}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="library-grid">
          {BODY_PARTS.map((part, index) => {
            const steps = stepsFor(part, trackId);
            const minutes = Math.max(5, Math.round(steps.reduce((sum, step) => sum + step.sets * (step.reps * 3 + step.restSeconds), 0) / 60));
            const cameraCount = steps.filter((step) => matchExercise(step.name)).length;
            return (
              <article className="library-card" key={part.id}>
                <div className="plan-card-top"><span className="library-number">{String(index + 1).padStart(2, "0")}</span><span className="meta-pill"><Clock3 size={10} /> ~{minutes} min</span></div>
                <h3 className="plan-title" style={{ marginTop: 10 }}>{part.name}</h3>
                <ul className="library-exercises">{steps.map((step) => {
                  const tracked = matchExercise(step.name);
                  return <li key={step.name}>{tracked ? <Camera size={11} className="lib-icon cam" /> : <Hand size={11} className="lib-icon" />}<span>{step.name}</span><em>{step.sets}×{isHoldName(step.name) ? `${step.reps}s` : step.reps}</em></li>;
                })}</ul>
                <div className="form-hint" style={{ marginTop: 8 }}><Flame size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> {totalSets(steps)} sets · {cameraCount}/{steps.length} camera-tracked</div>
                <div className="library-actions">
                  <button className="button button-small" onClick={() => onStartProgram({ kind: "library", id: `${part.id}-${trackId}`, title: `${part.name} · ${track.short}`, steps })}><Play size={12} fill="currentColor" /> Start</button>
                  <button className="button button-secondary button-small" disabled={savingId === part.id} onClick={() => saveAsRoutine(part.id)}><Save size={12} /> {savingId === part.id ? "Saving…" : "Save as routine"}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="progress-note" style={{ marginTop: 16 }}><Flame size={15} /><span>Every set you finish is saved to your workout history and counts toward your weekly goal. Move with control and stop if anything hurts.</span></div>
    </div>
  );
}
