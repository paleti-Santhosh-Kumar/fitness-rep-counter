"use client";

import { useState } from "react";
import { Camera, Play, Target } from "lucide-react";
import { EXERCISE_CATALOG } from "@/lib/exercises";
import type { ExerciseType } from "@/lib/pose-logic";

const REP_TARGETS = [5, 10, 15, 20, 30];
const HOLD_TARGETS = [20, 30, 45, 60, 90];

export default function ExercisesView({ onStart }: { onStart: (exercise: ExerciseType, target: number) => void }) {
  const [targets, setTargets] = useState<Record<string, number>>({});
  const targetFor = (id: string, sec: boolean) => targets[id] ?? (sec ? 30 : 10);
  const setTarget = (id: string, value: number) => setTargets((current) => ({ ...current, [id]: Math.max(1, Math.min(sec(id) ? 600 : 500, Math.round(value) || 1)) }));
  const sec = (id: string) => EXERCISE_CATALOG.find((item) => item.id === id)?.unit === "sec";
  return (
    <div className="content-wrap">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> 7 MOVES, ZERO EQUIPMENT</div><h1 className="page-title">Exercise library.</h1><p className="page-description">Pick a move, set your own target, and start. Quick solo sets — separate from your plans and routines.</p></div></div>
      <div className="exercise-library">
        {EXERCISE_CATALOG.map((item) => (
          <article className="exercise-card" key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={`${item.label} demonstration`} loading="lazy" />
            <div className="exercise-card-body">
              <div className="plan-card-top"><span className="source-badge">{item.focus}</span><span className="meta-pill">{item.unit === "sec" ? "Timed hold" : "Rep counter"}</span></div>
              <h3 className="plan-title" style={{ margin: "11px 0 8px" }}>{item.label}</h3>
              <ol className="exercise-steps">{item.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              <p className="form-hint" style={{ margin: "10px 0 0" }}><Camera size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />{item.camera}</p>
              <div className="lib-target">
                <span className="form-label"><Target size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />Your target</span>
                <div className="lib-target-row">
                  {(item.unit === "sec" ? HOLD_TARGETS : REP_TARGETS).map((value) => <button key={value} type="button" className={`segment-tab ${targetFor(item.id, item.unit === "sec") === value ? "selected" : ""}`} onClick={() => setTarget(item.id, value)}>{value}{item.unit === "sec" ? "s" : ""}</button>)}
                  <input className="form-control lib-target-input" type="number" min={1} max={item.unit === "sec" ? 600 : 500} value={targetFor(item.id, item.unit === "sec")} onChange={(event) => setTarget(item.id, Number(event.target.value))} aria-label={`Custom ${item.label} target`} />
                </div>
              </div>
              <button className="button button-small button-wide" style={{ marginTop: 11 }} onClick={() => onStart(item.id, targetFor(item.id, item.unit === "sec"))}><Play size={13} /> Start · {targetFor(item.id, item.unit === "sec")}{item.unit === "sec" ? "s hold" : " reps"}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
