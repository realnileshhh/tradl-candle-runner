// The game's characters: the bull and the bear the user locked in the Candle Runner
// Figma file (16 October 2026), drawn on the canvas as vector outlines, no images.
// The outlines are generated (characters.ts, from characters/figma); the colours
// come from the palette. Coordinates are in px with the feet at (0, 0).
// The classic characters these replaced are kept in characters/classic.

import { bearFrames, bullFrames, type BearFrame, type BullFrame, type CharacterFrame, type CharacterInk } from "./characters";
import type { Palette } from "./palette";

type Ctx = CanvasRenderingContext2D;

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  if ("roundRect" in ctx) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const k = Math.min(r, w / 2, h / 2);
  const c = ctx as Ctx;
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

/* ---------- which drawing to show ---------- */

/** Pixels of running per drawing of the run cycle: a stride of 60 px, about a bull and a half. */
const RUN_STEP = 10;
const RUN: BullFrame[] = ["run-01", "run-02", "run-03", "run-04", "run-05", "run-06"];
const BREATH: BearFrame[] = ["breathe-01", "breathe-02", "breathe-03", "breathe-04"];

/** The run cycle frame for a distance run, in px. */
export const runFrame = (distance: number): BullFrame => RUN[Math.floor(distance / RUN_STEP) % RUN.length];

/** In the air: springing up, at the top of the arc, reaching down to land (velocity in px per frame). */
export const jumpFrame = (velY: number): BullFrame => (velY < -4 ? "jump-takeoff" : velY < 3 ? "jump-apex" : "jump-land");

/** The crash, from 0 (the hit) to 1: it stumbles, then lies down. */
export const crashFrame = (k: number): BullFrame => (k < 0.5 ? "crash-stumble" : "crash-down");

/**
 * The bear's swat when the bull runs into it, by milliseconds since the hit (the
 * user, 2026-10-16; Figma: bear-hit-v1): a beat of stillness, the paw up, the swat,
 * the follow-through, then a growl it holds. About 400 ms, one shot.
 */
export const SWAT_LANDS_MS = 140;
export const SWAT_DOWN_MS = 240;
export const swatFrame = (ms: number): BearFrame =>
  ms < 60 ? "breathe-01" : ms < SWAT_LANDS_MS ? "swipe-raise" : ms < SWAT_DOWN_MS ? "swipe-swipe" : ms < 400 ? "swipe-down" : "react-growl";

/** The bear's breath: four drawings over one cycle of t (radians). */
export const breathFrame = (t: number): BearFrame => {
  const turn = t / (2 * Math.PI);
  return BREATH[Math.floor((turn - Math.floor(turn)) * BREATH.length) % BREATH.length];
};

/* ---------- outlines ---------- */

// The inverse of encode() in scripts/characters.mjs: rings of points on a 0.1 px grid.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decodeOutline(d: string): Path2D {
  const path = new Path2D();
  let i = 0;
  const digit = () => B64.indexOf(d[i++]);
  const big = () => digit() * 64 + digit() - 2048;
  const step = () => {
    const c = digit();
    return c === 63 ? big() : c - 31;
  };
  while (i < d.length) {
    const n = big();
    let x = step();
    let y = step();
    path.moveTo(x / 10, y / 10);
    for (let k = 1; k < n; k++) {
      x += step();
      y += step();
      path.lineTo(x / 10, y / 10);
    }
    path.closePath();
  }
  return path;
}

interface Built {
  box: CharacterFrame["box"];
  parts: { ink: CharacterInk; rule: CanvasFillRule; path: Path2D }[];
}
// Built on first use, once: the frames never change while the page lives.
const built = new Map<CharacterFrame, Built>();
function build(frame: CharacterFrame): Built {
  let b = built.get(frame);
  if (!b) {
    b = {
      box: frame.box,
      parts: frame.parts.map((p) => ({ ink: p.ink, rule: p.evenodd ? "evenodd" : "nonzero", path: decodeOutline(p.d) })),
    };
    built.set(frame, b);
  }
  return b;
}

function fillParts(ctx: Ctx, b: Built, inks: Record<CharacterInk, string>) {
  for (const p of b.parts) {
    ctx.fillStyle = inks[p.ink];
    ctx.fill(p.path, p.rule);
  }
}

// A faded character is drawn whole on a scratch canvas first, then faded in one
// step: faded part by part, the legs behind the body would show through it.
let scratch: HTMLCanvasElement | null = null;
function drawFaded(ctx: Ctx, b: Built, inks: Record<CharacterInk, string>, alpha: number) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  const [x0, y0, x1, y1] = b.box;
  const w = Math.ceil((x1 - x0 + 2) * s);
  const h = Math.ceil((y1 - y0 + 2) * s);
  if (!scratch) scratch = ctx.canvas.ownerDocument.createElement("canvas");
  if (scratch.width < w) scratch.width = w;
  if (scratch.height < h) scratch.height = h;
  const sc = scratch.getContext("2d");
  if (!sc) return;
  sc.setTransform(1, 0, 0, 1, 0, 0);
  sc.clearRect(0, 0, w, h);
  sc.setTransform(s, 0, 0, s, (1 - x0) * s, (1 - y0) * s);
  fillParts(sc, b, inks);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(scratch, 0, 0, w, h, x0 - 1, y0 - 1, w / s, h / s);
}

function drawFrame(ctx: Ctx, frame: CharacterFrame, inks: Record<CharacterInk, string>, x: number, y: number, tilt: number, alpha: number, settle: boolean) {
  const b = build(frame);
  ctx.save();
  // settled: the drawing's lowest point on the feet line, for frames drawn in mid-stride
  ctx.translate(x, settle ? y - b.box[3] : y);
  if (tilt) ctx.rotate(tilt);
  if (alpha >= 1) fillParts(ctx, b, inks);
  else if (alpha > 0) drawFaded(ctx, b, inks, alpha);
  ctx.restore();
}

/**
 * The bull, facing right, feet at (x, y). `settle` puts the drawing's lowest hoof on
 * the feet line, so a run cycle doesn't bounce (reduced motion).
 */
export function drawBull(ctx: Ctx, P: Palette, x: number, y: number, frame: BullFrame, tilt = 0, alpha = 1, settle = false) {
  drawFrame(ctx, bullFrames[frame], { ink: P.bull, body: P.bull, shade: P.bullShade, accent: P.horn }, x, y, tilt, alpha, settle);
}

/**
 * The bear, facing left toward the bull, feet at (x, y) on the middle of its candle.
 * Its eyes, brow, nose and cut lines show its ink, as its character sheet draws them.
 */
export function drawBear(ctx: Ctx, P: Palette, x: number, y: number, frame: BearFrame, alpha = 1) {
  drawFrame(ctx, bearFrames[frame], { ink: P.bearInk, body: P.bear, shade: P.bearShade, accent: P.bearClaw }, x, y, 0, alpha, false);
}
