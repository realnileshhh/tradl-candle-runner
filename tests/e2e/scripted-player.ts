import type { Page } from "@playwright/test";
import { AIR_FRAMES, BOX_R, MAX_RISE_U } from "../../src/game/constants";

export type Input = "space" | "arrow" | "pointer";

export interface BotReport {
  deaths: number;
  /** For each death: its cause, the time and speed, and the longest frame just before it. */
  deathLog: string[];
  presses: number;
  maxSpeed: number;
  jumps: number;
  dodged: number;
}

interface AuditCandle {
  id: number;
  o: number;
  c: number;
  kind: "up" | "red" | "wall";
  gapAfter: number;
  bear: boolean;
}

/**
 * A player that jumps from the physics window, running inside the page on every
 * frame. It reads window.__crDebug.next (the nearest hazard) and presses once the
 * jump would be centred over it; for a gap, at the edge. It never looks ahead
 * further than the game shows, so a death means the spawner made something
 * unwinnable or the physics changed.
 */
/**
 * `walkIntoGapsFrom`: from this speed on, the player stops jumping gaps (the pit check).
 * `walkIntoBears`: the player never jumps a bear (the bear's swat check).
 */
export async function startScriptedPlayer(
  page: Page,
  input: Input,
  opts: { walkIntoGapsFrom?: number; walkIntoBears?: boolean } = {},
) {
  await page.evaluate(
    ({ input, air, boxR, walkFrom, walkIntoBears }) => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const bot = { deaths: 0, deathLog: [] as string[], presses: 0, maxSpeed: 0, lastPhase: "", lastPressAt: -1e9 };
      let lastTick = performance.now();
      let longestFrame = 0;
      (window as unknown as { __crBot: typeof bot }).__crBot = bot;

      const press = () => {
        if (input === "pointer") {
          canvas.dispatchEvent(new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true }));
        } else {
          const space = input === "space";
          canvas.dispatchEvent(
            new KeyboardEvent("keydown", {
              code: space ? "Space" : "ArrowUp",
              key: space ? " " : "ArrowUp",
              bubbles: true,
              cancelable: true,
            }),
          );
        }
        bot.presses++;
        bot.lastPressAt = performance.now();
      };

      const tick = () => {
        const now = performance.now();
        // frames this tick covered: under load a tick can carry two, so the bull moves twice as far
        const frames = Math.min(2, (now - lastTick) / 16.667);
        lastTick = now;
        longestFrame = Math.max(longestFrame * 0.9, frames);
        const d = window.__crDebug;
        if (d) {
          if (d.phase === "over" && bot.lastPhase !== "over") {
            bot.deaths++;
            bot.deathLog.push(
              `${d.cause} at ${d.t} s, speed ${d.speed}, longest recent frame ${longestFrame.toFixed(2)}`,
            );
          }
          bot.lastPhase = d.phase;
          bot.maxSpeed = Math.max(bot.maxSpeed, d.speed);
          const n = d.next;
          // A press counts on the ground and just off an edge (coyote time), as for a person: a small
          // step down right before a gap edge leaves the bull briefly airborne through the whole
          // gap window. The original has no canJump, so there it falls back to grounded.
          const canJump = d.canJump ?? d.grounded;
          if (d.phase === "play" && canJump && n && performance.now() - bot.lastPressAt > 120) {
            let want: boolean;
            if (n.kind === "gap") {
              want = n.dist > 0 && n.dist <= d.speed * Math.max(2.5, frames * 2.5) + 2 && d.speed < walkFrom;
            } else {
              // distance from the hit box's centre to the hazard's centre
              const half = n.kind === "bear" ? 13 : n.width / 2;
              const centre = n.dist + (boxR - 4) + half;
              const passed = n.dist + n.width + 40 < 0;
              want = !passed && centre <= (air * d.speed) / 2 && !(n.kind === "bear" && walkIntoBears);
            }
            if (want) press();
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    {
      input,
      air: AIR_FRAMES,
      boxR: BOX_R,
      walkFrom: opts.walkIntoGapsFrom ?? Infinity,
      walkIntoBears: opts.walkIntoBears ?? false,
    },
  );
}

export async function readBot(page: Page): Promise<BotReport> {
  return page.evaluate(() => {
    const bot = (
      window as unknown as { __crBot: { deaths: number; deathLog: string[]; presses: number; maxSpeed: number } }
    ).__crBot;
    const d = window.__crDebug!;
    return {
      deaths: bot.deaths,
      deathLog: bot.deathLog,
      presses: bot.presses,
      maxSpeed: bot.maxSpeed,
      jumps: d.jumps,
      dodged: d.dodged,
    };
  });
}

/** Samples the chart while the player runs, keyed by candle id (ids are in spawn order within a run). */
export function startSpawnAudit(page: Page) {
  const seen = new Map<number, AuditCandle>();
  const timer = setInterval(async () => {
    try {
      const candles = await page.evaluate(() => window.candleRunner?._debugCandles() ?? []);
      for (const c of candles)
        seen.set(c.id, { id: c.id, o: c.o, c: c.c, kind: c.kind, gapAfter: c.gapAfter, bear: c.bear });
    } catch {
      // the page closed at the end of the test
    }
  }, 200);
  return {
    stop: () => clearInterval(timer),
    report: () => audit([...seen.values()].sort((a, b) => a.id - b.id)),
  };
}

function audit(candles: AuditCandle[]) {
  const top = (c: AuditCandle) => Math.max(c.o, c.c);
  let maxStep = 0;
  for (let i = 1; i < candles.length; i++) {
    const a = candles[i - 1];
    const b = candles[i];
    if (b.id !== a.id + 1) continue;
    const plain = (c: AuditCandle) => c.kind === "up" && !c.bear;
    if (plain(a) && plain(b) && !a.gapAfter) maxStep = Math.max(maxStep, top(b) - top(a));
  }

  // hazards, a red streak counted once; a gap is the candle after it
  const hazards: { kind: string; start: number; end: number }[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    let kind: string | null = null;
    if (c.kind === "red") kind = "red";
    else if (c.kind === "wall") kind = "wall";
    else if (c.bear) kind = "bear";
    else if (prev && prev.gapAfter && prev.id === c.id - 1) kind = "gap";
    if (!kind) continue;
    const last = hazards[hazards.length - 1];
    if (kind === "red" && last?.kind === "red" && last.end === c.id - 1) last.end = c.id;
    else hazards.push({ kind, start: c.id, end: c.id });
  }
  // the smallest green body: a plain or bear candle, its body from open to close
  const greens = candles.filter((c) => c.kind === "up");
  const minGreenBody = greens.length ? Math.min(...greens.map((c) => Math.abs(c.c - c.o))) : null;
  let minBetween = Infinity;
  for (let i = 1; i < hazards.length; i++) minBetween = Math.min(minBetween, hazards[i].start - hazards[i - 1].end - 1);
  const kinds = hazards.reduce<Record<string, number>>((acc, h) => ({ ...acc, [h.kind]: (acc[h.kind] ?? 0) + 1 }), {});
  const streaks = hazards.filter((h) => h.end > h.start).length;
  return {
    candles: candles.length,
    maxStep: +maxStep.toFixed(2),
    minGreenBody: minGreenBody === null ? null : +minGreenBody.toFixed(3),
    minBetween,
    kinds,
    streaks,
    cap: MAX_RISE_U,
  };
}
