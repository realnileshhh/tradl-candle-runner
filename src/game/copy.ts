// Every word the game shows or announces (PRD section 6, "Screen copy").
// Copy changes are product calls: change them here and in the PRD together.

import type { DeathCause } from "./types";

/** One shown at a time, rotating every 14 seconds. Signed "tl/." in green. */
export const WIT = [
  "Replaying four years of candles. Jump the red ones.",
  "The backtest is running. So is the bull.",
  "Wicks never hurt anyone. Bodies do.",
  "Patience is also a position.",
  "Every red candle you clear is one your strategy did not have to.",
] as const;

export const WIT_ROTATE_MS = 14000;

/** One line is picked at random for the cause of death. */
export const OVER: Record<DeathCause, readonly string[]> = {
  red: ["Stop-loss hit. Ego intact.", "Red candle one, bull nil."],
  gap: ["Gap got you. Mind the gap.", "Fell through the gap. Indices do it too."],
  fall: ["Ran out of chart.", "No candle under you. Happens."],
  wall: ["Doji wall. Indecision kills.", "Walked straight into indecision."],
  bear: ["A bear? In this market?", "The bear was not a drill."],
};

/** Timer chip suffixes, from the given second; the first match wins. */
export const TIMER_WIT: readonly (readonly [number, string])[] = [
  [90, "thick order book, this one"],
  [30, "still cheaper than a brokerage call"],
];

/** From this second the timer chip turns amber. */
export const TIMER_HOT_S = 30;

export const COPY = {
  signature: "tl/.",
  skip: "Skip the game",
  hi: "Hi",
  score: "Score",
  canvasLabel:
    "Candle Runner. A bull runs along a candlestick chart while your backtest loads. Tap, click, or press space to jump over red candles, gaps, doji walls and bears.",
  hintTouch: "Tap to jump",
  hintMouse: "Tap or press space to jump",
  flag: "↑ jump",
  gameOver: "GAME OVER",
  newBest: "NEW BEST",
  again: (secondsLeft: string) => `Again  ·  ${secondsLeft}s`,
  restartTouch: "tap to restart now",
  restartMouse: "tap to restart now  ·  press C to copy your score",
  announceOver: (score: number, line: string) => `Game over. Score ${score}. ${line}`,
  share: (dodged: number, score: string) =>
    `I dodged ${dodged} candle${dodged === 1 ? "" : "s"} and scored ${score} waiting for my backtest. Candle Runner on Tradl.`,
} as const;
