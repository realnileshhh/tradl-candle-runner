// The market the chart runs on: NIFTY 50's daily candles (the user, 2026-10-16),
// read once from the generated data. Every candle of the game is one of these days,
// in order; the run loops from the last day back to the first.

import { NIFTY } from "./nifty-data";

export interface Day {
  open: number;
  high: number;
  low: number;
  close: number;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const digit = (ch: string) => B64.indexOf(ch);

// The inverse of scripts/market.mjs: four numbers a day, three characters each.
function decode(): Day[] {
  const d = NIFTY.data;
  const num = (i: number) => (digit(d[i]) << 12) + (digit(d[i + 1]) << 6) + digit(d[i + 2]) - (1 << 17);
  const out: Day[] = [];
  let close: number = NIFTY.open;
  for (let i = 0; i < d.length; i += 12) {
    const open = close + num(i);
    const day = { open, high: open + num(i + 3), low: open + num(i + 6), close: open + num(i + 9) };
    close = day.close;
    out.push(day);
  }
  return out.map((t) => ({ open: t.open * NIFTY.tick, high: t.high * NIFTY.tick, low: t.low * NIFTY.tick, close: t.close * NIFTY.tick }));
}

export const MARKET_NAME = NIFTY.name;
export const DAYS: readonly Day[] = decode();

/**
 * A day's move as a log return: its close against the day before's. The loop's
 * first day has no day before it in the run, so it moves from its own open: the
 * wrap from the last day back to the first is seamless, with no jump between them.
 */
export function dayMove(i: number): number {
  const d = DAYS[i];
  return Math.log(d.close / (i > 0 ? DAYS[i - 1].close : d.open));
}
