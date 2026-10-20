"use client";

import { useEffect } from "react";
import { Trophy } from "lucide-react";

const COLORS = ["#c9f45b", "#e6ff9e", "#ffffff", "#8fd14f", "#ffd84d"];

export default function Celebration({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    navigator.vibrate?.([80, 40, 120]);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="celebration-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 60 }, (_, index) => (
          <span key={index} style={{
            left: `${(index * 37) % 100}%`,
            background: COLORS[index % COLORS.length],
            animationDelay: `${(index % 12) * 0.12}s`,
            animationDuration: `${2.4 + (index % 5) * 0.35}s`,
            transform: `rotate(${index * 29}deg)`,
          }} />
        ))}
      </div>
      <div className="celebration-card" onClick={(event) => event.stopPropagation()}>
        <div className="celebration-trophy"><Trophy size={38} /></div>
        <div className="eyebrow" style={{ justifyContent: "center" }}><span className="eyebrow-dot" /> GOAL CRUSHED</div>
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="button" onClick={onClose} autoFocus>Keep going 💪</button>
      </div>
    </div>
  );
}
