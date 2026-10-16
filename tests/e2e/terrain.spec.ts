// The chart runs on NIFTY 50's daily candles (the user, 2026-10-16; docs/decisions.md):
// every candle is one day, in order, from a random day, looping from the last day back
// to the first. The candle tops follow NIFTY's closes as far as the fairness rules
// allow (the rising cap, its mirror for steps down, flat runways and approaches), and
// the price axis and tag read NIFTY's level.

import type { Page } from "@playwright/test";
import { DROP_MAX_U, MARKET_PCT, MAX_RISE_U } from "../../src/game/constants";
import { DAYS, dayMove } from "../../src/game/market";
import type { DebugCandle } from "../../src/game/types";
import { debug, expect, test, waitForPhase } from "./fixtures";

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "reference", "the original's candles are generated (PRD section 3, non goal 1, until 16 October 2026)");
});

const N = DAYS.length;
/** Price units per log return: one unit is MARKET_PCT percent of the price. */
const K = 1 / Math.log(1 + MARKET_PCT / 100);

/** A chart laid from a start day, out to n candles, without playing it. */
const chartFrom = (page: Page, start: number, n: number) =>
  page.evaluate(([s, k]) => window.candleRunner!._debugChart(s, k), [start, n] as const);

/** Where NIFTY closed on each candle's day, in price units, from 100 on the first candle's day. */
function levels(chart: DebugCandle[]) {
  let level = 100;
  return chart.map((c, i) => (i === 0 ? level : (level += K * dayMove(c.day))));
}

const top = (c: DebugCandle) => Math.max(c.o, c.c);
const walkable = (c: DebugCandle) => c.kind === "up" && !c.bear;

test("every candle is a NIFTY day, in order, from a random day", async ({ page, openGame }) => {
  await openGame();
  const runs = await page.evaluate(() =>
    Array.from({ length: 30 }, () => {
      window.candleRunner!.restart();
      return window.candleRunner!._debugCandles().map((c) => c.day);
    }),
  );
  const starts = new Set<number>();
  for (const days of runs) {
    for (const d of days) expect(Number.isInteger(d) && d >= 0 && d < N, `day ${d}`).toBe(true);
    for (let i = 1; i < days.length; i++) expect(days[i], `candle ${i}`).toBe((days[i - 1] + 1) % N);
    starts.add(days[0]);
  }
  // 30 starts drawn from 566 days: 11 or more repeats would happen about once in 1.5 billion.
  expect(starts.size).toBeGreaterThanOrEqual(20);
});

test("the candle tops follow NIFTY's closes, within the fairness caps", async ({ page, openGame }) => {
  await openGame();
  const errors: number[] = [];
  let worst = 0;
  for (const start of [0, 37, 140, 211, 305, 388, 450, 512]) {
    const chart = await chartFrom(page, start, 300);
    const want = levels(chart);
    for (let i = 1; i < chart.length; i++) {
      const a = chart[i - 1];
      const b = chart[i];
      if (walkable(a) && walkable(b) && !a.gapAfter) {
        expect(top(b) - top(a), `step up on day ${b.day}`).toBeLessThanOrEqual(MAX_RISE_U + 1e-9);
        expect(top(a) - top(b), `step down on day ${b.day}`).toBeLessThanOrEqual(DROP_MAX_U + 1e-9);
      }
      if (walkable(b)) {
        errors.push(Math.abs(top(b) - want[i]));
        worst = Math.max(worst, Math.abs(top(b) - want[i]));
      }
    }
  }
  errors.sort((x, y) => x - y);
  const median = errors[errors.length >> 1];
  const p99 = errors[Math.floor(errors.length * 0.99)];
  console.log(`tracking: median ${median.toFixed(2)} units, 99th ${p99.toFixed(2)}, worst ${worst.toFixed(2)} over ${errors.length} candles`);
  // The chart holds NIFTY's level: a capped day, a hazard or a runway only delays a
  // move, and the next free candles catch up. Measured over 189 charts from every
  // ninth day (55,000 candles, 16 October 2026): median 0.65 units (0.5%), 99th
  // percentile 6.5, worst 11.4, in NIFTY's sharpest weeks. Bounds: 0.8, 8 and 14 units.
  expect(median).toBeLessThan(0.8);
  expect(p99).toBeLessThan(8);
  expect(worst).toBeLessThan(14);
});

test("the loop from the last day back to the first is seamless", async ({ page, openGame }) => {
  await openGame();
  const chart = await chartFrom(page, N - 12, 40);
  const seam = chart.findIndex((c) => c.day === 0);
  expect(seam).toBeGreaterThan(0);
  expect(chart[seam - 1].day).toBe(N - 1);
  // The first day moves from its own open, not from the last day's close: the 5% gap
  // between 16 October 2026 and 8 July 2024 never reaches the chart.
  const want = levels(chart);
  for (let i = seam; i < chart.length; i++) if (walkable(chart[i])) expect(Math.abs(top(chart[i]) - want[i]), `day ${chart[i].day}`).toBeLessThan(8);
});

test("the price tag reads NIFTY's level", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "play");
  const d = await debug(page);
  expect(d.day, "the day under the bull").toBeDefined();
  const close = DAYS[d.day!].close;
  // The tag is the bull's height on NIFTY's scale: the day's close, give or take what
  // the caps hold a candle off it at the start of a run, before any hazard. Over every
  // start day and its first 7 candles the worst is 2.6% (March 2026). Bound: 3%.
  expect(Math.abs(d.price! / close - 1)).toBeLessThan(0.03);
});
