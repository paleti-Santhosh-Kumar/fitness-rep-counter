"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, ChevronRight, ListChecks, SkipForward, Trophy, X, CircleHelp, Clock3, Eye, Info, RotateCcw, ShieldCheck, Sparkles, Square } from "lucide-react";
import { analyzePose, createCounter, type CounterState, type ExerciseType, type PoseLandmark, type PoseReading } from "@/lib/pose-logic";
import type { Plan, Routine } from "./types";
import { EXERCISE_CATALOG, exerciseInfo } from "@/lib/exercises";
import { matchExercise, totalSets, type Program } from "@/lib/programs";
import { isHoldName } from "@/lib/body-part-library";
import { randomPraise } from "@/lib/praise";

export type SessionSave = { exercise: string; reps: number; durationSeconds: number; formScore: number | null; source?: "camera" | "manual"; planId?: string | null; routineId?: string | null; notes?: string };

type Props = {
  plans: Plan[];
  routines: Routine[];
  cameraTips: boolean;
  initialExercise?: ExerciseType;
  initialTarget?: number;
  program?: Program | null;
  onExitProgram?: () => void;
  onSaveSession: (data: SessionSave) => Promise<void>;
  onNotify: (message: string, error?: boolean) => void;
};
type Detector = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => { landmarks?: PoseLandmark[][] };
  close: () => void;
};
type CameraState = "idle" | "loading" | "running" | "stopped";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31], [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];

export default function WorkoutStudio({ plans, routines, cameraTips, initialExercise, initialTarget, program, onExitProgram, onSaveSession }: Props) {
  const [progress, setProgress] = useState({ step: 0, set: 1, done: false, completedSets: 0 });
  const [manualReps, setManualReps] = useState(0);
  const [manualBusy, setManualBusy] = useState(false);
  const [freeTarget, setFreeTarget] = useState(initialTarget ?? 10);
  const [praise, setPraise] = useState<{ title: string; line: string; emoji: string; reps: number; target: number } | null>(null);
  const praiseTitleRef = useRef<string | undefined>(undefined);
  const [autoFinish, setAutoFinish] = useState(true);
  const [restLeft, setRestLeft] = useState(0);
  const [autoNext, setAutoNext] = useState(true);
  const [targetHit, setTargetHit] = useState(false);
  const targetRef = useRef(0);
  const autoFinishRef = useRef(true);
  const finishTimerRef = useRef<number | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const currentStep = program && !progress.done ? program.steps[progress.step] ?? null : null;
  const stepTrack = currentStep ? matchExercise(currentStep.name) : null;
  const programTotal = program ? totalSets(program.steps) : 0;
  const firstTracked = program ? program.steps.map((step) => matchExercise(step.name)).find(Boolean) ?? null : null;
  const [exercise, setExercise] = useState<ExerciseType>((program && program.steps[0] ? matchExercise(program.steps[0].name) : null) ?? firstTracked ?? initialExercise ?? "Squat");
  const info = exerciseInfo(exercise);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [reading, setReading] = useState<PoseReading | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedSummary, setSavedSummary] = useState<{ reps: number; durationSeconds: number; formScore: number | null } | null>(null);
  const [finished, setFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const animationRef = useRef<number | null>(null);
  const counterRef = useRef<CounterState>(createCounter(exercise));
  const readingRef = useRef<PoseReading | null>(null);
  const runningRef = useRef(false);
  const startTimeRef = useRef(0);
  const scoreSumRef = useRef(0);
  const scoreCountRef = useRef(0);
  const savedRef = useRef(false);
  const exerciseRef = useRef<ExerciseType>(exercise);
  const contextRef = useRef<{ planId: string | null; routineId: string | null; notes: string }>({ planId: null, routineId: null, notes: "" });
  contextRef.current = program && currentStep
    ? { planId: program.kind === "plan" ? program.id : null, routineId: program.kind === "routine" ? program.id : null, notes: `${program.title} · ${currentStep.name} · set ${progress.set}/${currentStep.sets}` }
    : { planId: null, routineId: null, notes: "" };
  const programRef = useRef(program);
  programRef.current = program;

  /** Advance the guided program after a set is saved. */
  function advanceProgram() {
    const active = programRef.current;
    if (!active) return;
    const restFor = active.steps[progressRef.current.step]?.restSeconds ?? 0;
    const isLast = progressRef.current.step >= active.steps.length - 1 && progressRef.current.set >= (active.steps[progressRef.current.step]?.sets ?? 1);
    if (!isLast && restFor > 0) setRestLeft(restFor);
    setProgress((current) => {
      if (current.done) return current;
      const step = active.steps[current.step];
      const completedSets = current.completedSets + 1;
      if (step && current.set < step.sets) return { ...current, set: current.set + 1, completedSets };
      const next = current.step + 1;
      if (next >= active.steps.length) return { ...current, done: true, completedSets };
      return { step: next, set: 1, done: false, completedSets };
    });
  }

  // When the program moves to a new trackable exercise, switch the tracker to it.
  useEffect(() => {
    if (!program || progress.done) return;
    const step = program.steps[progress.step];
    const type = step ? matchExercise(step.name) : null;
    setManualReps(step?.reps ?? 0);
    if (type && !runningRef.current) {
      setExercise(type);
      exerciseRef.current = type;
      counterRef.current = createCounter(type);
      setReading(null);
      readingRef.current = null;
    }
  }, [program, progress.step, progress.done]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const timer = window.setTimeout(() => setRestLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [restLeft]);
  const saveRef = useRef(onSaveSession);
  const pendingRef = useRef<SessionSave | null>(null);
  useEffect(() => { saveRef.current = onSaveSession; }, [onSaveSession]);
  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);

  /** Build the summary from live refs (works even during unmount). */
  function captureSummary() {
    const reps = readingRef.current?.reps ?? counterRef.current.reps;
    if (reps < 1) return null;
    return {
      exercise: exerciseRef.current,
      reps,
      durationSeconds: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
      formScore: scoreCountRef.current ? Math.round(scoreSumRef.current / scoreCountRef.current) : null,
      source: "camera" as const,
      ...contextRef.current,
    };
  }

  /** Auto-save a finished set exactly once. */
  async function persist(summary: SessionSave, mounted = true) {
    pendingRef.current = summary;
    if (mounted) { setSaveStatus("saving"); setSavedSummary(summary); setCameraError(""); }
    try {
      await saveRef.current(summary);
      pendingRef.current = null;
      if (mounted) {
        setSaveStatus("saved");
        if (programRef.current) advanceProgram();
        else if (summary.reps >= targetRef.current && targetRef.current > 0) {
          const next = randomPraise(praiseTitleRef.current);
          praiseTitleRef.current = next.title;
          setPraise({ ...next, reps: summary.reps, target: targetRef.current });
          navigator.vibrate?.([60, 40, 90]);
        }
      }
    } catch (error) {
      if (mounted) {
        setSaveStatus("error");
        setCameraError(error instanceof Error ? `Auto-save failed: ${error.message}` : "Auto-save failed. Tap retry.");
      }
    }
  }

  useEffect(() => {
    if (cameraState !== "running") return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [cameraState]);

  useEffect(() => () => {
    if (runningRef.current && !savedRef.current) {
      const summary = captureSummary();
      savedRef.current = true;
      if (summary) void persist(summary, false);
    }
    runningRef.current = false;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    detectorRef.current?.close();
  }, []);

  function drawPose(landmarks: PoseLandmark[] | undefined) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (!landmarks?.length) return;
    context.lineWidth = Math.max(2, width / 430);
    context.strokeStyle = "rgba(201,244,91,.9)";
    context.fillStyle = "#d5ff79";
    for (const [from, to] of CONNECTIONS) {
      const first = landmarks[from]; const second = landmarks[to];
      if (!first || !second || (first.visibility ?? 0) < 0.35 || (second.visibility ?? 0) < 0.35) continue;
      context.beginPath(); context.moveTo(first.x * width, first.y * height); context.lineTo(second.x * width, second.y * height); context.stroke();
    }
    for (const point of landmarks) {
      if ((point.visibility ?? 0) < 0.5) continue;
      context.beginPath(); context.arc(point.x * width, point.y * height, Math.max(2.4, width / 170), 0, Math.PI * 2); context.fill();
    }
  }

  function stopCamera() {
    const wasRunning = runningRef.current;
    runningRef.current = false;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current?.close();
    detectorRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    if (wasRunning) {
      setFinished(true);
      if (!savedRef.current) {
        savedRef.current = true;
        const summary = captureSummary();
        if (summary) void persist(summary);
      }
    }
    setCameraState((current) => current === "loading" ? "idle" : current === "idle" ? "idle" : "stopped");
  }

  async function startCamera() {
    setCameraError("");
    setFinished(false);
    setElapsedSeconds(0);
    setReading(null);
    readingRef.current = null;
    counterRef.current = createCounter(exercise);
    scoreSumRef.current = 0;
    scoreCountRef.current = 0;
    savedRef.current = false;
    setTargetHit(false);
    setPraise(null);
    setRestLeft(0);
    if (finishTimerRef.current !== null) { window.clearTimeout(finishTimerRef.current); finishTimerRef.current = null; }
    setSaveStatus("idle");
    setSavedSummary(null);
    setCameraState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera access. Try a recent version of Chrome, Safari, or Firefox over HTTPS.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("The camera preview is unavailable.");
      video.srcObject = stream;
      if (video.readyState < 1) await new Promise<void>((resolve, reject) => {
        video.addEventListener("loadedmetadata", () => resolve(), { once: true });
        video.addEventListener("error", () => reject(new Error("The camera stream could not be opened.")), { once: true });
      });
      await video.play();

      const vision = await import("@mediapipe/tasks-vision");
      const files = await vision.FilesetResolver.forVisionTasks(WASM_ROOT);
      const options = {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" as const },
        runningMode: "VIDEO" as const,
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      };
      let detector: Detector;
      try {
        detector = await vision.PoseLandmarker.createFromOptions(files, options) as unknown as Detector;
      } catch {
        detector = await vision.PoseLandmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: "CPU" } }) as unknown as Detector;
      }
      detectorRef.current = detector;
      runningRef.current = true;
      startTimeRef.current = Date.now();
      setCameraState("running");
      let lastInference = 0;
      let lastUiUpdate = 0;
      const loop = (timestamp: number) => {
        if (!runningRef.current) return;
        const currentVideo = videoRef.current;
        const activeDetector = detectorRef.current;
        if (currentVideo && activeDetector && currentVideo.readyState >= 2 && timestamp - lastInference >= 65) {
          lastInference = timestamp;
          try {
            const result = activeDetector.detectForVideo(currentVideo, timestamp);
            const pose = result.landmarks?.[0];
            drawPose(pose);
            const nextReading = pose ? analyzePose(counterRef.current, pose, timestamp) : analyzePose(counterRef.current, [], timestamp);
            readingRef.current = nextReading;
            if (autoFinishRef.current && targetRef.current > 0 && nextReading.reps >= targetRef.current && finishTimerRef.current === null) {
              setTargetHit(true);
              setReading(nextReading);
              finishTimerRef.current = window.setTimeout(() => { finishTimerRef.current = null; stopCamera(); }, 900);
            }
            if (nextReading.visible && nextReading.formScore !== null) {
              scoreSumRef.current += nextReading.formScore;
              scoreCountRef.current += 1;
            }
            if (timestamp - lastUiUpdate > 115) {
              lastUiUpdate = timestamp;
              setReading(nextReading);
            }
          } catch (error) {
            console.error("Pose frame processing failed", error);
            setCameraError("Pose detection paused unexpectedly. Finish the workout and try again.");
            stopCamera();
            return;
          }
        }
        animationRef.current = requestAnimationFrame(loop);
      };
      animationRef.current = requestAnimationFrame(loop);
    } catch (error) {
      stopCamera();
      setCameraState("idle");
      const message = error instanceof Error ? error.message : "Unable to start the camera-based pose tracker.";
      if (error instanceof DOMException && error.name === "NotAllowedError") setCameraError("Camera access was blocked. Allow camera access in your browser’s address-bar settings, then try again.");
      else if (error instanceof DOMException && error.name === "NotFoundError") setCameraError("No camera was found on this device.");
      else setCameraError(message.includes("Failed to fetch") || message.includes("fetch") ? "The MediaPipe runtime or pose model could not be reached. Check your internet connection and try again." : message);
    }
  }

  const restWasRunning = useRef(false);
  useEffect(() => {
    if (restLeft > 0) { restWasRunning.current = true; return; }
    if (restWasRunning.current) {
      restWasRunning.current = false;
      if (autoNext && program && !progress.done && stepTrack && cameraState === "stopped") void startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft]);

  function chooseExercise(next: ExerciseType) {
    if (cameraState === "running" || cameraState === "loading") return;
    setExercise(next);
    counterRef.current = createCounter(next);
    setReading(null);
    setElapsedSeconds(0);
    setFinished(false);
    setCameraError("");
  }

  async function logManualSet() {
    if (!program || !currentStep || manualReps < 1) return;
    setManualBusy(true);
    setCameraError("");
    try {
      await onSaveSession({ exercise: currentStep.name, reps: manualReps, durationSeconds: Math.max(1, currentStep.reps * 3), formScore: null, source: "manual", ...contextRef.current });
      advanceProgram();
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Could not log this set.");
    } finally { setManualBusy(false); }
  }

  function skipStep() {
    if (!program) return;
    setProgress((current) => {
      const next = current.step + 1;
      return next >= program.steps.length ? { ...current, done: true } : { ...current, step: next, set: 1 };
    });
  }

  async function retrySave() {
    if (pendingRef.current) await persist(pendingRef.current);
  }

  function resetWorkout() {
    if (cameraState === "running" || cameraState === "loading") stopCamera();
    setCameraState("idle");
    setFinished(false);
    setReading(null);
    readingRef.current = null;
    setElapsedSeconds(0);
    setCameraError("");
    setSaveStatus("idle");
    counterRef.current = createCounter(exercise);
  }

  const repetitions = reading?.reps ?? 0;
  const guidedTarget = program && currentStep && stepTrack === exercise ? currentStep.reps : null;
  const target = guidedTarget ?? freeTarget;
  targetRef.current = target;
  autoFinishRef.current = autoFinish;
  const targetPct = Math.min(100, target ? (repetitions / target) * 100 : 0);
  const unitShort = info.unit === "sec" ? "s" : "";
  const setLabel = program && currentStep && guidedTarget !== null ? `${currentStep.name} · set ${progress.set}/${currentStep.sets}` : info.label;
  const pendingFeedback = cameraState === "loading" ? "Loading the pose model into your browser…" : "Live pose feedback appears after your camera and model are ready.";

  return (
    <div className="content-wrap">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> SMART TRACKING · BETTER FORM · STRONGER YOU</div><h1 className="page-title">Every Rep <span className="title-accent">Counts.</span></h1><p className="page-description"><strong className="title-tagline">Smart tracking. Better form. Stronger you.</strong> Pick a movement, frame your body, and let the camera count every completed rep.</p></div><span className="source-badge"><ShieldCheck size={11} /> Browser-only video</span></div>
      <div className="workout-layout">
        <section className="camera-card" aria-label="Local webcam pose tracking">
          <div className="camera-stage">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview analyzed locally" style={{ display: cameraState === "running" ? "block" : "none" }} />
            <canvas ref={canvasRef} className="camera-overlay" aria-hidden="true" />
            {cameraState !== "running" && <div className="camera-placeholder"><div className="empty-icon"><Camera size={21} /></div><div className="empty-title">{cameraState === "loading" ? "Preparing your camera" : cameraState === "stopped" ? "Session paused" : "Your camera stays yours"}</div><p>{cameraState === "loading" ? "Requesting camera access and loading the pose model in this browser." : cameraState === "stopped" && reading ? info.unit === "sec" ? `${reading.reps}s of plank hold detected during this camera session.` : `${reading.reps} completed ${reading.reps === 1 ? "rep" : "reps"} detected during this camera session.` : "When you press Start, live video appears here and is analyzed only on this device."}</p></div>}
            {praise && <div className="praise-overlay" role="status" aria-live="polite" onClick={() => setPraise(null)}>
              <div className="praise-card">
                <div className="praise-emoji">{praise.emoji}</div>
                <h3>{praise.title}</h3>
                <p className="praise-score">{praise.reps}{unitShort} / {praise.target}{unitShort} · target reached</p>
                <p>{praise.line}</p>
                <div className="praise-actions"><button className="button button-small" onClick={(event) => { event.stopPropagation(); setPraise(null); void startCamera(); }}>Go again</button><button className="button button-secondary button-small" onClick={(event) => { event.stopPropagation(); setPraise(null); }}>Close</button></div>
              </div>
            </div>}
            <div className="camera-status"><span className={`status-dot ${cameraState === "running" ? "live" : ""}`} />{cameraState === "running" ? "CAMERA LIVE · LOCAL PROCESSING" : cameraState === "loading" ? "LOADING MEDIAPIPE" : "CAMERA OFF"}</div>
            {cameraState === "running" && <div className={`camera-counter target-counter ${targetHit ? "hit" : ""}`}>
              <span className="target-set-label">{setLabel}</span>
              <div className="target-numbers"><strong>{repetitions}{unitShort}</strong><em>/ {target}{unitShort}</em></div>
              <div className="target-bar"><span style={{ width: `${targetPct}%` }} /></div>
              <span>{targetHit ? "Target reached! Saving…" : info.unit === "sec" ? `${Math.max(0, target - repetitions)}s to go` : `${Math.max(0, target - repetitions)} ${target - repetitions === 1 ? "rep" : "reps"} to go`}</span>
            </div>}
          </div>
          <div className="camera-footer">
            <div className="camera-footer-copy">{cameraState === "running" ? "Only complete return-to-start cycles count. Pausing or losing landmarks doesn’t add reps." : "Camera access is off until you choose to start. Nothing is captured in this preview state."}</div>
            <div className="camera-footer-actions">
              {cameraState === "running" ? <button className="button button-danger button-small" onClick={stopCamera}><Square size={12} fill="currentColor" /> Finish set</button> : cameraState === "loading" ? <button className="button button-secondary button-small" disabled><span className="spinner" style={{ width: 13, height: 13 }} /> Starting…</button> : <button className="button button-small" onClick={startCamera}><Camera size={13} /> {program && currentStep && stepTrack ? (restLeft > 0 ? `Skip rest · start ${currentStep.name} ${progress.set}/${currentStep.sets}` : `Start ${currentStep.name} · set ${progress.set}/${currentStep.sets}`) : cameraState === "stopped" ? "Start another set" : "Enable camera & start"}</button>}
              {cameraState === "stopped" && <button className="button button-quiet button-small" onClick={resetWorkout}><RotateCcw size={12} /> Reset</button>}
            </div>
          </div>
        </section>

        <aside className="workout-side">
          {program && <section className="workout-box program-box">
            <div className="card-topline"><h2 className="workout-box-title" style={{ margin: 0 }}><ListChecks size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />{program.title}</h2><button className="icon-button" onClick={onExitProgram} aria-label="Exit guided session" title="Exit guided session"><X size={14} /></button></div>
            <div className="goal-progress"><span style={{ width: `${programTotal ? (progress.completedSets / programTotal) * 100 : 0}%` }} /></div>
            <p className="form-hint" style={{ margin: "0 0 10px" }}>{progress.completedSets} of {programTotal} sets complete · each set saves to history automatically</p>
            <ol className="program-steps">{program.steps.map((step, index) => {
              const state = progress.done || index < progress.step ? "done" : index === progress.step ? "active" : "todo";
              const trackable = matchExercise(step.name);
              return <li key={`${step.name}-${index}`} className={`program-step ${state}`}><span className="program-step-dot">{state === "done" ? <Check size={11} /> : index + 1}</span><span className="program-step-main"><strong>{step.name}</strong><small>{step.sets} × {trackable === "Plank" || isHoldName(step.name) ? `${step.reps}s` : `${step.reps} reps`}{state === "active" ? ` · set ${progress.set}/${step.sets}` : ""}{trackable ? " · camera" : " · manual"}</small></span></li>;
            })}</ol>
            {progress.done ? <div className="workout-finished" style={{ marginTop: 10 }}><strong><Trophy size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />Program complete!</strong><p>All {progress.completedSets} completed sets are saved in your workout history and progress.</p><button className="button button-small button-wide" onClick={onExitProgram}>Done</button></div>
              : restLeft > 0 && currentStep ? <div className="rest-banner"><span className="rest-time">{formatTimer(restLeft)}</span><span><strong>Rest</strong><small>Next: {currentStep.name} · set {progress.set}/{currentStep.sets} · {matchExercise(currentStep.name) === "Plank" ? `${currentStep.reps}s` : `${currentStep.reps} reps`}{autoNext && stepTrack ? " · starts automatically" : ""}</small></span><button className="text-button" onClick={() => setRestLeft(0)}>Skip</button></div>
              : currentStep && (stepTrack ? <div className="program-current"><span className="form-hint">Up next: <strong style={{ color: "#e3ead9" }}>{currentStep.name}</strong> — target {stepTrack === "Plank" ? `${currentStep.reps}s` : `${currentStep.reps} reps`}. Start the camera, then press Finish set.</span><button className="text-button" onClick={skipStep}><SkipForward size={12} /> Skip exercise</button></div>
              : <div className="program-current"><span className="form-hint"><strong style={{ color: "#e3ead9" }}>{currentStep.name}</strong> cannot be tracked by the camera. Do the set, then log what you completed (saved as a manual log).</span><div style={{ display: "flex", gap: 6, marginTop: 8 }}><input className="form-control" type="number" min={1} max={1000} value={manualReps} onChange={(event) => setManualReps(Number(event.target.value))} aria-label="Reps completed" style={{ maxWidth: 90 }} /><button className="button button-small" onClick={logManualSet} disabled={manualBusy || manualReps < 1}>{manualBusy ? "Saving…" : <>Log set <ChevronRight size={12} /></>}</button><button className="button button-quiet button-small" onClick={skipStep}><SkipForward size={12} /></button></div></div>)}
          </section>}
          <section className="workout-box"><h2 className="workout-box-title">Choose an exercise</h2><div className="exercise-picker">
            {EXERCISE_CATALOG.map((item) => <button key={item.id} className={`exercise-thumb ${exercise === item.id ? "selected" : ""}`} onClick={() => chooseExercise(item.id)} disabled={cameraState === "running" || cameraState === "loading" || Boolean(program)} aria-pressed={exercise === item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" /><span>{item.label}</span></button>)}
          </div>
          <div className="exercise-demo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={info.image} alt={`${info.label} demonstration`} />
            <div><strong>{info.label}</strong><span className="form-hint">{info.focus} · {info.unit === "sec" ? "timed hold" : "rep counter"}</span>
              <ol className="exercise-steps">{info.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
          </div>
          <p className="form-hint" style={{ margin: "10px 0 0" }}><Camera size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />{info.camera}</p></section>

          <section className="workout-box"><h2 className="workout-box-title">Live session</h2><div className="metric-row">
            <div className="metric-tile"><div className="metric-value">{repetitions}<span className="metric-target">/{target}{unitShort}</span></div><div className="metric-label">{info.unit === "sec" ? "held / target" : "reps / target"}</div></div>
            <div className="metric-tile"><div className="metric-value">{reading?.visible && reading.angle !== null ? `${reading.angle}°` : "—"}</div><div className="metric-label">{info.angleLabel}</div></div>
            <div className="metric-tile"><div className="metric-value">{reading?.formScore !== null && reading?.formScore !== undefined ? `${reading.formScore}%` : "—"}</div><div className="metric-label">visible-pose score</div></div>
          </div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, color: "#818b7b", fontSize: 9 }}><span><Clock3 size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />Elapsed</span><strong style={{ color: "#dfe7d5", fontSize: 12 }}>{formatTimer(elapsedSeconds)}</strong></div>
            <div className="target-bar large"><span style={{ width: `${targetPct}%` }} /></div>
            {guidedTarget === null ? <div className="target-picker"><span className="form-label">Target</span>{(info.unit === "sec" ? [20, 30, 45, 60] : [5, 10, 15, 20]).map((value) => <button key={value} className={`segment-tab ${target === value ? "selected" : ""}`} disabled={cameraState === "running"} onClick={() => setFreeTarget(value)}>{value}{unitShort}</button>)}<input className="form-control lib-target-input" type="number" min={1} max={info.unit === "sec" ? 600 : 500} value={freeTarget} disabled={cameraState === "running"} onChange={(event) => setFreeTarget(Math.max(1, Math.min(600, Math.round(Number(event.target.value)) || 1)))} aria-label="Custom target" /></div>
              : <p className="form-hint" style={{ margin: "10px 0 0" }}>Target set by your {program?.kind}: {currentStep?.reps}{unitShort} for {setLabel}.</p>}
            <label className="target-toggle"><input type="checkbox" checked={autoFinish} onChange={(event) => setAutoFinish(event.target.checked)} /> Finish &amp; save automatically when the target is reached</label>
            {program && <label className="target-toggle"><input type="checkbox" checked={autoNext} onChange={(event) => setAutoNext(event.target.checked)} /> Start the next set automatically after rest</label>}</section>

          <section className="workout-box"><h2 className="workout-box-title">Form feedback</h2><div className="form-feedback"><span className="feedback-icon">{cameraState === "running" ? reading?.visible ? <Sparkles size={13} /> : <Eye size={13} /> : <CircleHelp size={13} />}</span><div className="feedback-copy"><span className="feedback-label">{cameraState === "running" ? reading?.visible ? "From your current pose" : "Landmarks not clear yet" : "Ready when you are"}</span>{cameraState === "running" ? reading?.feedback ?? "Waiting for the first camera frame…" : pendingFeedback}</div></div>
            {cameraTips && <p className="form-hint" style={{ margin: "10px 0 0" }}>Tip: keep your full body in frame with even light. For best joint visibility, place your camera around hip height.</p>}
          </section>

          {cameraError && <div className="camera-error" role="alert"><AlertTriangle size={14} />{cameraError}</div>}
          {finished && <div className="workout-finished"><strong>Set complete · {info.unit === "sec" ? `${repetitions}s held` : `${repetitions} ${repetitions === 1 ? "rep" : "reps"}`}</strong>{repetitions > 0 ? <p>{saveStatus === "saving" ? "Saving to your history…" : saveStatus === "saved" ? `Saved automatically${savedSummary ? ` · ${Math.floor(savedSummary.durationSeconds / 60)}m ${savedSummary.durationSeconds % 60}s` : ""}${savedSummary?.formScore != null ? ` · ${savedSummary.formScore}% form` : ""}. History and progress are updated.` : saveStatus === "error" ? "This set couldn't be saved yet. Your counts are kept here—retry below." : "Measured from complete movement cycles seen by your camera."}</p> : <p>{info.unit === "sec" ? "No steady plank hold was detected. Nothing was added to your history." : "No complete movement cycles were detected. Nothing was added to your history."}</p>}{saveStatus === "saved" && <span className="source-badge"><Check size={10} /> Saved to history</span>}{saveStatus === "error" && <button className="button button-small button-wide" onClick={retrySave}><RotateCcw size={13} /> Retry save</button>}</div>}

          <section className="workout-box"><h2 className="workout-box-title">Workout guidance</h2><div className="camera-disclaimer"><Info size={14} /><span>Move at a comfortable pace. This is form guidance, not medical advice. Stop if you feel pain or dizziness.</span></div>{plans.length > 0 && <p className="form-hint" style={{ margin: "10px 0 0" }}>Your plans: {plans.slice(0, 2).map((plan) => plan.title).join(" · ")}{routines.length > 0 ? ` · ${routines.length} routines saved` : ""}</p>}</section>
        </aside>
      </div>
      <div className="progress-note" style={{ marginTop: 14 }}><ShieldCheck size={15} /><span>Camera video is processed locally and never stored or uploaded. Only the workout summary is saved if you choose to save it. MediaPipe’s runtime and model are downloaded from their public hosts.</span></div>
    </div>
  );
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
