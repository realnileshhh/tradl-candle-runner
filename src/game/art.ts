// The game's characters, drawn on the canvas: no images. Every colour comes from
// the palette (src/game/palette.ts). Coordinates are in px with the feet at (0, 0).

import type { Palette } from "./palette";
import type { Pose } from "./types";

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

/** The bull: charging posture, feet at (0, 0), facing right. */
export function drawBull(
  ctx: Ctx,
  P: Palette,
  x: number,
  y: number,
  pose: Pose,
  a: number,
  tilt: number,
  alpha?: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  if (tilt) ctx.rotate(tilt);
  const ph = a * 0.3;
  const run = pose === "run";
  const bob = run ? Math.abs(Math.sin(ph)) * 1.5 : 0;
  ctx.translate(0, -bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  function leg(bx: number, swing: number, lift: number, colr: string) {
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(bx, -13);
    ctx.lineTo(bx + swing, -lift);
    ctx.stroke();
    ctx.strokeStyle = colr;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(bx, -13);
    ctx.lineTo(bx + swing, -lift);
    ctx.stroke();
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    roundRect(ctx, bx + swing - 3.6, -lift - 2.4, 7.2, 3.4, 1.4);
    ctx.fill();
  }
  const s1 = Math.sin(ph);
  const s2 = Math.sin(ph + Math.PI);
  const l1 = Math.max(0, Math.cos(ph)) * 3;
  const l2 = Math.max(0, Math.cos(ph + Math.PI)) * 3;
  if (run) {
    leg(-13, s2 * 6, l2, P.bullShade);
    leg(5, s1 * 6, l1, P.bullShade);
    leg(-8, s1 * 6, l1, P.bull);
    leg(10, s2 * 6, l2, P.bull);
  } else if (pose === "jump") {
    leg(-13, -5, 5, P.bullShade);
    leg(5, 6, 4, P.bullShade);
    leg(-8, -4, 4, P.bull);
    leg(10, 7, 3, P.bull);
  } else {
    leg(-13, 0, 0, P.bullShade);
    leg(5, 0, 0, P.bullShade);
    leg(-8, 0, 0, P.bull);
    leg(10, 0, 0, P.bull);
  }

  // tail, raised
  const wag = Math.sin(a * 0.2) * 2;
  function tailPath() {
    ctx.beginPath();
    ctx.moveTo(-20, -24);
    ctx.quadraticCurveTo(-27, -29 + wag, -24, -36 + wag);
  }
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 4.4;
  tailPath();
  ctx.stroke();
  ctx.strokeStyle = P.bullShade;
  ctx.lineWidth = 2.2;
  tailPath();
  ctx.stroke();
  ctx.fillStyle = P.ink;
  ctx.beginPath();
  ctx.arc(-24, -37 + wag, 2.8, 0, 6.3);
  ctx.fill();

  function horn(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    ctx.strokeStyle = P.horn;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
  // body with shoulder hump
  ctx.fillStyle = P.bull;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -10);
  ctx.quadraticCurveTo(-24, -12, -23, -21);
  ctx.quadraticCurveTo(-22, -29, -13, -30);
  ctx.quadraticCurveTo(-5, -31, 1, -34);
  ctx.quadraticCurveTo(10, -38, 16, -31);
  ctx.quadraticCurveTo(19, -26, 17, -17);
  ctx.quadraticCurveTo(15, -9, 6, -9);
  ctx.lineTo(-9, -9);
  ctx.quadraticCurveTo(-14, -9, -16, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.bullShade;
  ctx.beginPath();
  ctx.ellipse(-4, -12, 10, 2.8, 0, 0, 6.3);
  ctx.fill();
  horn(17, -28, 11, -33, 13, -40);

  // head, low and forward
  ctx.fillStyle = P.bull;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, 13, -27, 19, 17, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.bullShade;
  ctx.beginPath();
  roundRect(ctx, 22, -19, 11.5, 9.5, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.ink;
  ctx.beginPath();
  ctx.arc(29.5, -14.5, 1.2, 0, 6.3);
  ctx.fill();
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(32, -10, 2.4, -0.3, 3.4);
  ctx.stroke();
  horn(23, -27, 29, -29, 29, -37);
  ctx.fillStyle = P.bullShade;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(16, -25, 3.4, 2.1, -0.6, 0, 6.3);
  ctx.fill();
  ctx.stroke();
  const wide = pose === "crash";
  ctx.fillStyle = P.eye;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(21, -20.5, wide ? 3.3 : 2.6, 0, 6.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.ink;
  ctx.beginPath();
  ctx.arc(21.9, -20.2, wide ? 1 : 1.4, 0, 6.3);
  ctx.fill();
  if (!wide) {
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(18, -24.5);
    ctx.lineTo(24, -23.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** The bear: round, brown, facing the bull, feet at (0, 0). `still` stops its breathing (reduced motion). */
export function drawBear(
  ctx: Ctx,
  P: Palette,
  x: number,
  y: number,
  t: number,
  alpha: number | undefined,
  still: boolean,
) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.translate(x, y);
  ctx.scale(1.1, 1.1);
  const breathe = still ? 0 : Math.sin(t) * 0.6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = P.bearInk;
  // feet
  ctx.fillStyle = P.bearInk;
  ctx.beginPath();
  roundRect(ctx, -10, -3.5, 8, 4, 1.5);
  roundRect(ctx, 1, -3.5, 8, 4, 1.5);
  ctx.fill();
  // body
  ctx.fillStyle = P.bear;
  ctx.beginPath();
  roundRect(ctx, -12, -23 - breathe, 24, 22 + breathe, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.bearLight;
  ctx.globalAlpha *= 0.85;
  ctx.beginPath();
  ctx.ellipse(1, -11, 6, 7, 0, 0, 6.3);
  ctx.fill();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  // arm reaching forward (left)
  ctx.strokeStyle = P.bearInk;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-14, -8);
  ctx.stroke();
  ctx.strokeStyle = P.bear;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.lineTo(-14, -8);
  ctx.stroke();
  // ears
  ctx.strokeStyle = P.bearInk;
  ctx.lineWidth = 2;
  ctx.fillStyle = P.bear;
  ctx.beginPath();
  ctx.arc(-13, -33 - breathe, 3.6, 0, 6.3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-1, -34 - breathe, 3.6, 0, 6.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.bearLight;
  ctx.beginPath();
  ctx.arc(-13, -33 - breathe, 1.6, 0, 6.3);
  ctx.arc(-1, -34 - breathe, 1.6, 0, 6.3);
  ctx.fill();
  // head
  ctx.fillStyle = P.bear;
  ctx.beginPath();
  ctx.arc(-6, -26 - breathe, 9.5, 0, 6.3);
  ctx.fill();
  ctx.stroke();
  // muzzle
  ctx.fillStyle = P.bearLight;
  ctx.beginPath();
  ctx.ellipse(-11, -24 - breathe, 5.2, 4, 0, 0, 6.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.bearInk;
  ctx.beginPath();
  ctx.arc(-14.5, -25.5 - breathe, 1.7, 0, 6.3);
  ctx.fill();
  // eye
  ctx.beginPath();
  ctx.arc(-8, -28.5 - breathe, 1.4, 0, 6.3);
  ctx.fill();
  ctx.fillStyle = P.eye;
  ctx.beginPath();
  ctx.arc(-7.6, -28.9 - breathe, 0.5, 0, 6.3);
  ctx.fill();
  ctx.restore();
}
