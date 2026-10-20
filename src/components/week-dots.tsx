const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function WeekDots({ days, today }: { days: boolean[]; today: number }) {
  return (
    <div className="week-dots" aria-label={`Workout days this week: ${days.filter(Boolean).length}`}>
      {days.map((active, index) => (
        <span key={index} className={`week-dot ${active ? "on" : ""} ${index === today ? "today" : ""} ${index > today ? "future" : ""}`} title={active ? "Worked out" : index > today ? "Upcoming" : "No workout"}>
          <i>{active ? "✓" : ""}</i>
          <small>{LABELS[index]}</small>
        </span>
      ))}
    </div>
  );
}
