// Turns the locked bull and bear from the Candle Runner Figma file into the game's
// canvas paths.
//
//   node scripts/characters.mjs    characters/figma/*  ->  src/game/characters.ts
//
// characters/figma holds each drawing the game uses, as Figma exports it (one SVG
// per drawing, its parts named), and manifest.json says where each drawing's feet
// stand. This script places every drawing on its feet, scales it to the game, and
// redraws each outline as a polygon true to the vector within a fraction of a pixel
// at that size, so the art stays small enough for the one-file build. The result is
// generated: never edit src/game/characters.ts, change Figma and run this again.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "characters", "figma");
const out = join(root, "src", "game", "characters.ts");
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));

// Game pixels per sheet pixel. The bull runs as tall as the classic bull did, horns
// included, so its hit box (constants.ts) still covers its body; the bear is as tall
// as the bull, as its character sheet asks.
const SCALE = { bull: 0.205, bear: 0.137 };
// The panel whose size SCALE sets; every other panel is matched to it.
const REFERENCE = { bull: "run", bear: "breathe" };
// Characters whose holes are drawn dark rather than left open (see the bear below).
const BACKED = { bull: false, bear: true };
// How far a simplified outline may stray from the vector, in game pixels.
const TOLERANCE = 0.1;
// Coordinates are kept to a tenth of a game pixel.
const Q = 10;

// The part names in Figma, and the palette ink each one takes.
const INK = [
  [/^body/, "body"],
  [/^(ear|ear-far|leg-far)/, "shade"],
  [/^(horn|tail-tuft|claws|tail)/, "accent"],
];

function parsePath(d) {
  const tokens = d.match(/[MLHVCQZmlhvcqz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  const rings = [];
  let ring = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") {
      if (ring) rings.push(ring);
      ring = null;
      x = sx;
      y = sy;
      continue;
    }
    if (C === "M") {
      if (ring) rings.push(ring);
      x = (rel ? x : 0) + num();
      y = (rel ? y : 0) + num();
      sx = x;
      sy = y;
      ring = [{ t: "M", p: [x, y] }];
      cmd = rel ? "l" : "L";
    } else if (C === "L") {
      x = (rel ? x : 0) + num();
      y = (rel ? y : 0) + num();
      ring.push({ t: "L", p: [x, y] });
    } else if (C === "H") {
      x = (rel ? x : 0) + num();
      ring.push({ t: "L", p: [x, y] });
    } else if (C === "V") {
      y = (rel ? y : 0) + num();
      ring.push({ t: "L", p: [x, y] });
    } else if (C === "C") {
      const a = [num(), num(), num(), num(), num(), num()].map((v, k) => v + (rel ? (k % 2 ? y : x) : 0));
      ring.push({ t: "C", p: a });
      x = a[4];
      y = a[5];
    } else if (C === "Q") {
      const a = [num(), num(), num(), num()].map((v, k) => v + (rel ? (k % 2 ? y : x) : 0));
      // a quadratic as a cubic
      const [qx, qy, ex, ey] = a;
      ring.push({ t: "C", p: [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey] });
      x = ex;
      y = ey;
    } else throw new Error(`path command ${cmd} not handled`);
  }
  if (ring) rings.push(ring);
  return rings;
}

// Each ring as points in game pixels, curves cut finely enough to follow the vector.
function flatten(ring, tf) {
  const pts = [];
  let [x, y] = ring[0].p;
  pts.push(tf(x, y));
  for (const seg of ring.slice(1)) {
    if (seg.t === "L") {
      [x, y] = seg.p;
      pts.push(tf(x, y));
      continue;
    }
    const [x1, y1, x2, y2, x3, y3] = seg.p;
    const a = tf(x, y);
    const b = tf(x1, y1);
    const c = tf(x2, y2);
    const e = tf(x3, y3);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]) + Math.hypot(e[0] - c[0], e[1] - c[1]);
    const n = Math.max(2, Math.ceil(len / 0.25));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      pts.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1],
      ]);
    }
    x = x3;
    y = y3;
  }
  return pts;
}

// Ramer-Douglas-Peucker on a closed ring: split it at the point furthest from the first.
function simplify(pts, tol) {
  const segDist = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const rdp = (s, e, keep) => {
    let best = -1;
    let at = -1;
    for (let k = s + 1; k < e; k++) {
      const d = segDist(pts[k], pts[s], pts[e]);
      if (d > best) {
        best = d;
        at = k;
      }
    }
    if (best > tol) {
      keep[at] = 1;
      rdp(s, at, keep);
      rdp(at, e, keep);
    }
  };
  let far = 0;
  let fd = -1;
  for (let k = 1; k < pts.length; k++) {
    const d = Math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]);
    if (d > fd) {
      fd = d;
      far = k;
    }
  }
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[far] = 1;
  rdp(0, far, keep);
  rdp(far, pts.length - 1, keep);
  return pts.filter((_, k) => keep[k]);
}

function ringsArea(rings) {
  let A = 0;
  for (const r of rings) for (let k = 0; k < r.length; k++) A += r[k][0] * r[(k + 1) % r.length][1] - r[(k + 1) % r.length][0] * r[k][1];
  return A / 2;
}

// Signed area and centroid of a set of rings: holes run the other way, so they subtract.
function centroid(rings) {
  let A = 0;
  let cx = 0;
  let cy = 0;
  for (const r of rings) {
    for (let k = 0; k < r.length; k++) {
      const [x0, y0] = r[k];
      const [x1, y1] = r[(k + 1) % r.length];
      const f = x0 * y1 - x1 * y0;
      A += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
  }
  return [cx / (3 * A), cy / (3 * A)];
}

// A part's outline as text: every ring is its point count, then its first point and
// the steps between points, on a 0.1 px grid. A step from -31 to 31 is one character
// of the base64 alphabet; a larger one is "/" and two characters (12 bits). Two
// characters a point instead of about eight as path text. decodeOutline() in
// src/game/art.ts reads it back into a Path2D.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const big = (v) => {
  if (v < -2048 || v > 2047) throw new Error(`step ${v} out of range`);
  return B64[(v + 2048) >> 6] + B64[(v + 2048) & 63];
};
const step = (v) => (v >= -31 && v <= 31 ? B64[v + 31] : "/" + big(v));
function encode(rings) {
  let d = "";
  for (const r of rings) {
    const q = r.map(([x, y]) => [Math.round(x * Q), Math.round(y * Q)]);
    const pts = q.filter((p, k) => k === 0 || p[0] !== q[k - 1][0] || p[1] !== q[k - 1][1]);
    if (pts.length < 3) continue;
    d += big(pts.length) + step(pts[0][0]) + step(pts[0][1]);
    for (let k = 1; k < pts.length; k++) d += step(pts[k][0] - pts[k - 1][0]) + step(pts[k][1] - pts[k - 1][1]);
  }
  return d;
}

function readDrawing(char, name) {
  const svg = readFileSync(join(dir, char, `${name}.svg`), "utf8");
  return [...svg.matchAll(/<path ([^>]*?)\/?>/g)].map((m) => {
    const attr = (a) => (m[1].match(new RegExp(`(?:^|\\s)${a}="([^"]*)"`)) || [])[1];
    const id = attr("id");
    const ink = INK.find(([re]) => re.test(id));
    if (!ink) throw new Error(`${char}/${name}: part ${id} has no ink`);
    return { part: id, ink: ink[1], rule: attr("fill-rule") || "nonzero", rings: parsePath(attr("d")) };
  });
}

const stats = [];
const frames = {};
for (const char of ["bull", "bear"]) {
  frames[char] = {};
  // The sheets draw the character at a different size in each panel (the run cycle
  // small, the crash large), so each panel is scaled to the reference panel by the
  // area of the body: the same animal covers the same area in any pose.
  const drawings = Object.entries(manifest[char].drawings).map(([name, info]) => {
    const parts = readDrawing(char, name);
    const body = parts.find((p) => p.part === "body");
    const area = Math.abs(ringsArea(body.rings.map((r) => flatten(r, (x, y) => [x, y]))));
    return { name, info, parts, panel: name.replace(/-[^-]+$/, ""), area };
  });
  const median = (v) => [...v].sort((a, b) => a - b)[v.length >> 1];
  const panelArea = (panel) => median(drawings.filter((d) => d.panel === panel).map((d) => d.area));
  const refArea = panelArea(REFERENCE[char]);
  // the bear's hind foot, from the middle of its feet in its first breath (px)
  let hind;
  for (const { name, info, parts, panel } of drawings) {
    const k = SCALE[char] * Math.sqrt(refArea / panelArea(panel));
    const [bx, by] = info.box;
    // feet on the panel's ground; across, the bull centres its body on its hit box
    // and the bear stands with its feet on the middle of its candle
    const raw = (x, y) => [(x + bx) * k, (y + by - info.ground) * k];
    const flat = parts.map((p) => ({ ...p, pts: p.rings.map((r) => flatten(r, raw)) }));
    let ax;
    if (char === "bull") {
      ax = centroid(flat.find((p) => p.part === "body").pts)[0] - 4;
    } else {
      const all = flat.filter((p) => p.ink !== "accent").flatMap((p) => p.pts.flat());
      const bottom = Math.max(...all.map((p) => p[1]));
      const feet = all.filter((p) => p[1] > bottom - 2);
      const right = Math.max(...feet.map((p) => p[0]));
      // Breathing, it stands on the middle of its feet. In any other pose (the swipe,
      // the growl) its hind foot stays where the first breath has it, so only its
      // front moves: the hind foot is the rightmost point on the ground, as the bear
      // faces left.
      if (panel === REFERENCE.bear) {
        ax = (Math.min(...feet.map((p) => p[0])) + right) / 2;
        hind ??= right - ax;
      } else {
        if (hind === undefined) throw new Error(`bear/${name}: list the breathing drawings first in manifest.json`);
        ax = right - hind;
      }
    }
    const placed = flat.map((p) => ({ ...p, pts: p.pts.map((r) => simplify(r.map(([x, y]) => [x - ax, y]), TOLERANCE)) }));
    const xs = placed.flatMap((p) => p.pts.flat().map((q) => q[0]));
    const ys = placed.flatMap((p) => p.pts.flat().map((q) => q[1]));
    const box = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys))];
    const out = [];
    for (const p of placed) {
      // The bear's eyes, brow, nose and cut lines are holes in its body. Its sheet
      // draws them dark in both modes (the panel colour on Dark, black on Light), so
      // its body gets a dark backing: the body's outline without the holes.
      if (BACKED[char] && p.part === "body") {
        const areas = p.pts.map(ringsArea);
        const outer = Math.sign(areas[areas.reduce((m, a, k) => (Math.abs(a) > Math.abs(areas[m]) ? k : m), 0)]);
        out.push({ ink: "ink", evenodd: false, d: encode(p.pts.filter((_, k) => Math.sign(areas[k]) === outer)) });
      }
      out.push({ ink: p.ink, evenodd: p.rule === "evenodd", d: encode(p.pts) });
    }
    frames[char][name] = { box, parts: out };
    stats.push(`${char}/${name}: box x ${box[0]}..${box[2]}, y ${box[1]}..${box[3]}, ${placed.reduce((s, p) => s + p.pts.reduce((t, r) => t + r.length, 0), 0)} points`);
  }
}

const lines = [
  "// GENERATED by `npm run characters:sync` from characters/figma: the bull and the bear",
  "// locked in the Candle Runner Figma file (bull-sheet-v1 and bear-sheet-v1). Never edit.",
  "//",
  "// Each frame is a drawing from a character sheet, in game pixels with the feet at (0, 0):",
  "// the bull faces right, the bear left. Its parts are listed back to front; each takes",
  "// a palette ink (ink, body, shade or accent) and fills its outline, holes included. An outline",
  "// is encoded text (scripts/characters.mjs, encode()); art.ts decodes it once.",
  "",
  'export type CharacterInk = "ink" | "body" | "shade" | "accent";',
  "export interface CharacterPart {",
  "  readonly ink: CharacterInk;",
  "  readonly evenodd: boolean;",
  "  readonly d: string;",
  "}",
  "export interface CharacterFrame {",
  "  /** left, top, right, bottom, px */",
  "  readonly box: readonly [number, number, number, number];",
  "  readonly parts: readonly CharacterPart[];",
  "}",
  "",
];
for (const char of ["bull", "bear"]) {
  const names = Object.keys(frames[char]);
  const T = char === "bull" ? "BullFrame" : "BearFrame";
  lines.push(`export type ${T} = ${names.map((n) => JSON.stringify(n)).join(" | ")};`);
  lines.push(`export const ${char}Frames: Record<${T}, CharacterFrame> = {`);
  for (const n of names) {
    const f = frames[char][n];
    lines.push(`  ${JSON.stringify(n)}: {`);
    lines.push(`    box: [${f.box.join(", ")}],`);
    lines.push("    parts: [");
    for (const p of f.parts) lines.push(`      { ink: "${p.ink}", evenodd: ${p.evenodd}, d: "${p.d}" },`);
    lines.push("    ],");
    lines.push("  },");
  }
  lines.push("};", "");
}
writeFileSync(out, lines.join("\n"));
const bytes = Buffer.byteLength(lines.join("\n"));
console.log(stats.join("\n"));
console.log(`Wrote src/game/characters.ts: ${(bytes / 1024).toFixed(1)} KB.`);
