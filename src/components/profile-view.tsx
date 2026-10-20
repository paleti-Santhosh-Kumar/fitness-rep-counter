"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Camera, Check, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/client-api";
import type { Preferences, User } from "./types";

type Props = {
  user: User;
  preferences: Preferences;
  onProfileUpdate: (user: User) => void;
  onPreferencesUpdate: (preferences: Preferences) => void;
  onNotify: (message: string, error?: boolean) => void;
};

export default function ProfileView({ user, preferences, onProfileUpdate, onPreferencesUpdate, onNotify }: Props) {
  const [name, setName] = useState(user.name);
  const [profileBusy, setProfileBusy] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(preferences.weeklyGoal);
  const [units, setUnits] = useState<Preferences["units"]>(preferences.units);
  const [cameraTips, setCameraTips] = useState(preferences.cameraTips);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setName(user.name); }, [user.name]);
  useEffect(() => {
    setWeeklyGoal(preferences.weeklyGoal);
    setUnits(preferences.units);
    setCameraTips(preferences.cameraTips);
  }, [preferences]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProfileBusy(true); setError("");
    try {
      const result = await apiRequest<{ user: User }>("/api/profile", { method: "PATCH", body: JSON.stringify({ name }) });
      onProfileUpdate(result.user);
      onNotify("Profile name updated.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to save your profile.";
      setError(message); onNotify(message, true);
    } finally { setProfileBusy(false); }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPreferenceBusy(true); setError("");
    try {
      const result = await apiRequest<{ preferences: Preferences }>("/api/preferences", { method: "PUT", body: JSON.stringify({ weeklyGoal, units, cameraTips }) });
      onPreferencesUpdate(result.preferences);
      onNotify("Training preferences saved.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to save your preferences.";
      setError(message); onNotify(message, true);
    } finally { setPreferenceBusy(false); }
  }

  return (
    <div className="content-wrap">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR ACCOUNT, YOUR RULES</div><h1 className="page-title">Profile & settings.</h1><p className="page-description">Make the app fit you. Your training preferences are saved to your account.</p></div><span className="source-badge"><ShieldCheck size={11} /> Private account</span></div>
      <div className="profile-layout">
        <div style={{ display: "grid", gap: 14 }}>
          <section className="settings-card">
            <div className="card-topline" style={{ marginBottom: 17 }}><div><h2 className="settings-title">Personal details</h2><p className="settings-description" style={{ marginBottom: 0 }}>Your account details are never shown to other users.</p></div><span className="small-icon-box"><UserRound size={15} /></span></div>
            <form onSubmit={saveProfile}>
              <div className="form-grid">
                <label className="form-field"><span className="form-label">Display name</span><input className="form-control" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required /></label>
                <div className="form-field"><span className="form-label">Workspace</span><input className="form-control" value="Anonymous · no account required" disabled readOnly /><span className="form-hint">Data is tied to this browser via a private cookie. Clearing cookies starts a fresh workspace.</span></div>
              </div>
              {error && <p className="modal-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
              <div className="settings-actions"><button className="button" disabled={profileBusy}><Save size={14} /> {profileBusy ? "Saving…" : "Save profile"}</button></div>
            </form>
          </section>

          <section className="settings-card">
            <div className="card-topline" style={{ marginBottom: 17 }}><div><h2 className="settings-title">Training preferences</h2><p className="settings-description" style={{ marginBottom: 0 }}>Small settings to make your weekly plan feel like yours.</p></div><span className="small-icon-box"><Check size={15} /></span></div>
            <form onSubmit={savePreferences}>
              <div className="form-grid">
                <label className="form-field"><span className="form-label">Weekly goal (workout days)</span><select className="form-control" value={weeklyGoal} onChange={(event) => setWeeklyGoal(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option value={value} key={value}>{value} {value === 1 ? "day" : "days"} per week</option>)}</select></label>
                <label className="form-field"><span className="form-label">Units</span><select className="form-control" value={units} onChange={(event) => setUnits(event.target.value as Preferences["units"])}><option value="metric">Metric</option><option value="imperial">Imperial</option></select><span className="form-hint">Used for workout display. Rep and time tracking is unchanged.</span></label>
              </div>
              <div className="setting-row" style={{ marginTop: 16 }}><div><div className="setting-name">Camera setup tips</div><div className="setting-copy">Show reminders about lighting, distance, and keeping your full body in frame.</div></div><button type="button" role="switch" aria-checked={cameraTips} className={`toggle ${cameraTips ? "on" : ""}`} onClick={() => setCameraTips((value) => !value)} aria-label="Toggle camera setup tips"><span /></button></div>
              <div className="settings-actions"><button className="button" disabled={preferenceBusy}><Save size={14} /> {preferenceBusy ? "Saving…" : "Save preferences"}</button></div>
            </form>
          </section>
        </div>
        <aside style={{ display: "grid", gap: 12 }}>
          <div className="privacy-card"><LockKeyhole size={17} /><div><div className="privacy-title">Camera stays yours</div><div className="privacy-copy">When you start pose tracking, video frames are processed in your browser only. The app does not upload or save camera footage—only workout summaries you choose to save.</div></div></div>
          <div className="privacy-card"><Camera size={17} /><div><div className="privacy-title">Pose estimation is local</div><div className="privacy-copy">MediaPipe runs on this device. Its model and browser runtime are downloaded from a public CDN; your video frames are never sent to that service or NO ESCAPE servers.</div></div></div>
          <div className="settings-card"><h2 className="settings-title">A note on sample data</h2><p className="privacy-copy">Starter plans, routines, and historical sessions are clearly marked as illustrative. They never count toward your real statistics, and they are not workout measurements.</p></div>
          <div className="progress-note"><ShieldCheck size={15} /><span>No login, email, or password is collected. Your workspace cookie is HttpOnly and SameSite protected.</span></div>
        </aside>
      </div>
    </div>
  );
}
