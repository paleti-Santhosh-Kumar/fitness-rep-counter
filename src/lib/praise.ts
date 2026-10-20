export const PRAISE_TITLES = [
  "Great work!", "Well done!", "Target smashed!", "You crushed it!", "Awesome effort!",
  "Strong finish!", "That's how it's done!", "Nailed it!", "Beast mode!", "Proud of you!",
];

export const PRAISE_LINES = [
  "Every rep counts — and you made them all count.",
  "Consistency beats perfection. Keep showing up.",
  "Your body is your gym, and today you owned it.",
  "No weights, no excuses — just results.",
  "That's another step closer to your goal.",
  "Strong today, stronger tomorrow.",
  "You set the target. You hit the target.",
  "Small wins like this build big change.",
];

const EMOJIS = ["🔥", "💪", "🏆", "⚡", "🙌", "🎉"];

/** Pick a random praise message, avoiding an immediate repeat of the previous title. */
export function randomPraise(previousTitle?: string, random: () => number = Math.random) {
  const pool = PRAISE_TITLES.filter((title) => title !== previousTitle);
  const title = pool[Math.floor(random() * pool.length)] ?? PRAISE_TITLES[0]!;
  const line = PRAISE_LINES[Math.floor(random() * PRAISE_LINES.length)] ?? PRAISE_LINES[0]!;
  const emoji = EMOJIS[Math.floor(random() * EMOJIS.length)] ?? "🔥";
  return { title, line, emoji };
}
