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
  wall: ["Big red day. Should have jumped it.", "One long red candle. Sessions end like that."],
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
  hi: "Personal best",
  score: "Score",
  canvasLabel:
    "Candle Runner. A bull runs along a candlestick chart while your backtest loads. Tap, click, or press space to jump over red candles, gaps and bears.",
  hintTouch: "Tap to jump",
  hintMouse: "Tap or press space to jump",
  flag: "jump", // led by the design system's icon-arrow--point-up on the canvas
  gameOver: "Game over",
  newBest: "New personal best",
  // "Re-enter": a trader gets back in after a stop-loss, as the death lines speak
  // (the user, 2026-10-16). Space re-enters too; touch screens show only the button.
  again: "Re-enter",
  restartLead: "Hit",
  restartKey: "space", // in a keycap, lowercase as a Mac keyboard labels its keys
  restartTail: "to re-enter",
  announceOver: (score: number, line: string) => `Game over. Score ${score}. ${line}`,
  share: (dodged: number, score: string) =>
    `I dodged ${dodged} candle${dodged === 1 ? "" : "s"} and scored ${score} waiting for my backtest. Candle Runner on Tradl.`,
} as const;
