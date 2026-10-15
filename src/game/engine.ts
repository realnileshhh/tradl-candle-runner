// Candle Runner: the waiting-screen game for a running backtest (PRD sections 6 and 7).
// Framework-free: the React component and the one-file build both call mount().
//
// Ported from reference/candle-runner-loading.html (the build verified on
// 13 October 2026) without changing behaviour. The verification suite runs
// against both, so a change here that changes play shows up as a failing check.

import { drawBear, drawBull, roundRect } from "./art";
import {
  AIR_FRAMES,
  APEX,
  BOX_H,
  BOX_L,
  BOX_R,
  BUFFER_MS,
  BULL_X,
  BULL_X_NARROW,
  CANDLE_W,
  COYOTE_MS,
  DOUBLE_MIN_SPEED,
  FIRST_HAZARD_SLOTS,
  GRAV,
  JUMP_V,
  LOOKAHEAD,
  MAX_RISE_U,
  NARROW_W,
  PPU,
  RESTART_MS,
  SLOT,
  SPEED0,
  SPEED_MAX,
  ACCEL,
  STEP_MAX_PX,
  TRIPLE_MIN_SPEED,
  WALL_MIN_SPEED,
} from "./constants";
import { COPY, OVER, TIMER_HOT_S, TIMER_WIT, WIT, WIT_ROTATE_MS } from "./copy";
import { readPalette, rgba } from "./palette";
import type {
  Candle,
  CandleRunnerEvent,
  CandleRunnerHandle,
  DeathCause,
  EventData,
  MountOptions,
  NextHazard,
  Phase,
  Pose,
} from "./types";
import { createView } from "./view";

type Mood = "up" | "down" | "chop";

interface Generator {
  price: number;
  mood: Mood;
  moodLeft: number;
  anchor: number;
  debt: number;
  hold: number;
  sinceHazard: number;
  hazardCount: number;
  firstRed: boolean;
  extra: number;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const pad5 = (n: number) => {
  n = Math.max(0, Math.floor(n));
  return n < 100000 ? `0000${n}`.slice(-5) : String(n);
};
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const topU = (c: Candle) => Math.max(c.o, c.c);
const botU = (c: Candle) => Math.min(c.o, c.c);

export function mount(host: HTMLElement, opts: MountOptions): CandleRunnerHandle {
  const doc = host.ownerDocument;
  const win = doc.defaultView as Window;
  const inFrame = (() => {
    try {
      return win.self !== win.top;
    } catch {
      return true;
    }
  })();
  const params = new URLSearchParams(win.location.search);
  const showTimer = opts.timer !== false && params.get("timer") !== "0";
  const keyScope = opts.keys ?? (inFrame ? "window" : "canvas");
  const RM = !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const storageKey = opts.storageKey ?? "cr-hi";
  const coarse = !!win.matchMedia?.("(pointer: coarse)").matches;
  const cls = opts.classes;

  /* ---------- DOM ---------- */
  const view = createView(host, cls, showTimer);
  const { root, canvas } = view;
  const ctx = canvas.getContext("2d", { alpha: true }) as CanvasRenderingContext2D;

  /* ---------- palette from CSS tokens, so the host can theme it ---------- */
  const P = readPalette(root, win);
  const font = (w: number, px: number) => `${w} ${px}px ${P.font}`;

  /* ---------- canvas size (DPR crisp, fluid width) ---------- */
  let W = 720;
  let H = 380;
  let DPR = 1;
  let BULL_CX = BULL_X;
  function resize() {
    const cw = canvas.clientWidth || 720;
    const ch = canvas.clientHeight || 380;
    DPR = Math.min(2, win.devicePixelRatio || 1);
    W = cw;
    H = ch;
    canvas.width = Math.round(cw * DPR);
    canvas.height = Math.round(ch * DPR);
    BULL_CX = cw < NARROW_W ? BULL_X_NARROW : BULL_X;
    if (hasBull) camHi = camTarget();
  }

  /* ---------- state ---------- */
  let seed = 1;
  function rnd() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rb = (a: number, b: number) => a + rnd() * (b - a);

  let candles: Candle[] = [];
  let gen: Generator;
  let speed = SPEED0;
  let distance = 0;
  let score = 0;
  let hi = 0;
  let hiAtStart = 0;
  let bullP = 0;
  let hasBull = false;
  let velY = 0;
  let grounded = true;
  let canCoyote = false;
  let lastGroundedAt = 0;
  let bufferedAt = -1e9;
  let fellFrom: Candle | null = null;
  let lastSupRef: Candle | null = null;
  let anim = 0;
  let lean = 0;
  let camHi = 0;
  let phase: Phase = "intro";
  let introT = 0;
  let startedAt = 0;
  let overAt = 0;
  let overCause: DeathCause = "red";
  let overLine = "";
  let overScore = 0;
  let isNewBest = false;
  let puffs: { x: number; y: number; t: number }[] = [];
  let dodged = 0;
  let jumps = 0;
  let runs = 0;
  let flagShown = false;
  let dismissed = false;
  let destroyed = false;
  let restartTimer = 0;
  let witTimer = 0;
  let clockTimer = 0;
  let timerTier = -1;
  const waitStart = performance.now();
  try {
    hi = +(win.localStorage.getItem(storageKey) ?? 0) || 0;
  } catch {
    hi = 0;
  }

  const yOf = (p: number) => (camHi - p) * PPU;
  const camTarget = () => bullP + (0.6 * H) / PPU;
  const jumpRangePx = () => AIR_FRAMES * speed;
  const runwayCount = () => Math.max(3, Math.ceil((jumpRangePx() + 40) / SLOT));

  /* ---------- spawner: the chart is the level ---------- */
  let uid = 0;
  function greenAt(x: number, topTarget: number, body: number, jitter: number): Candle {
    const c = topTarget + (jitter ? rb(-jitter, jitter) : 0);
    const o = c - body;
    return {
      x,
      o,
      c,
      h: c + rb(0.15, 0.7),
      l: o - rb(0.15, 0.7),
      kind: "up",
      gapAfter: 0,
      bear: false,
      scored: false,
      id: ++uid,
    };
  }
  function pickMood() {
    const r = rnd();
    let m: Mood = r < 0.34 ? "up" : r < 0.62 ? "down" : "chop";
    if (m === gen.mood && rnd() < 0.7) m = m === "chop" ? (rnd() < 0.5 ? "up" : "down") : "chop";
    gen.mood = m;
    gen.moodLeft = m === "chop" ? 4 + Math.floor(rnd() * 5) : 3 + Math.floor(rnd() * 4);
    gen.anchor = gen.price;
  }
  function spawnGreen(x: number): Candle {
    const p = gen.price;
    let c: Candle;
    if (gen.mood === "up") {
      const body = rb(0.8, 1.5);
      const gapDown = rb(0, 0.2);
      const o = p - gapDown;
      const cl = Math.min(o + body, p + MAX_RISE_U);
      c = {
        x,
        o,
        c: cl,
        h: cl + rb(0.1, 0.5),
        l: o - rb(0.2, 0.8),
        kind: "up",
        gapAfter: 0,
        bear: false,
        scored: false,
        id: ++uid,
      };
    } else if (gen.mood === "down") {
      const o2 = p - rb(1.0, 1.7);
      const b2 = rb(0.3, 0.7);
      c = {
        x,
        o: o2,
        c: o2 + b2,
        h: o2 + b2 + rb(0.2, 0.8),
        l: o2 - rb(0.2, 0.9),
        kind: "up",
        gapAfter: 0,
        bear: false,
        scored: false,
        id: ++uid,
      };
    } else {
      c = greenAt(x, gen.anchor, rb(0.3, 0.8), 0.45);
    }
    gen.price = c.c;
    gen.moodLeft--;
    return c;
  }
  function hazardRoll(x: number) {
    if (gen.hazardCount === 0) {
      const minX = BULL_CX + FIRST_HAZARD_SLOTS * SLOT;
      if (x < minX) return false;
      return x >= minX + 2 * SLOT || rnd() < 0.5;
    }
    if (gen.sinceHazard < gen.extra) return false;
    const ramp = clamp((speed - SPEED0) / (SPEED_MAX - SPEED0), 0, 1);
    return rnd() < 0.5 + 0.3 * ramp;
  }
  function spawnHazard(x: number, last: Candle | null) {
    const T = gen.price;
    let kind: "red" | "gap" | "wall" | "bear";
    let c: Candle;
    if (!gen.firstRed) kind = "red";
    else {
      const ramp0 = clamp((speed - SPEED0) / (SPEED_MAX - SPEED0), 0, 1);
      let r = rnd();
      const wWall = speed >= WALL_MIN_SPEED && gen.mood !== "up" ? 0.14 + 0.1 * ramp0 : 0;
      const wGap = last ? 0.22 : 0;
      const wBear = 0.18;
      const wRed = 0.44;
      const tot = wRed + wGap + wWall + wBear;
      r *= tot;
      kind = r < wRed ? "red" : r < wRed + wGap ? "gap" : r < wRed + wGap + wWall ? "wall" : "bear";
    }
    if (kind === "red") {
      let n = 1;
      if (gen.firstRed) {
        if (speed >= TRIPLE_MIN_SPEED && rnd() < 0.3) n = 3;
        else if (speed >= DOUBLE_MIN_SPEED && rnd() < 0.42) n = 2;
      }
      // A streak is one hazard: all but the last red are pushed here, the last below.
      const reds: Candle[] = [];
      for (let k = 0; k < n; k++) {
        const o = T + rb(1.0, 1.6) - k * 0.15;
        const cl = T - rb(0.2, 0.5);
        reds.push({
          x: x + k * SLOT,
          o,
          c: cl,
          h: o + rb(0.3, 0.8),
          l: cl - rb(0.2, 0.6),
          kind: "red",
          gapAfter: 0,
          bear: false,
          scored: false,
          id: ++uid,
          first: !gen.firstRed && k === 0,
          streak: n,
        });
      }
      c = reds[n - 1];
      candles.push(...reds.slice(0, -1));
      gen.firstRed = true;
    } else if (kind === "wall") {
      const top = T + rb(1.8, 2.4);
      const bot = T - 0.1;
      c = {
        x,
        o: top,
        c: bot,
        h: top + rb(0.4, 0.9),
        l: bot - rb(0.3, 0.6),
        kind: "wall",
        gapAfter: 0,
        bear: false,
        scored: false,
        id: ++uid,
      };
    } else if (kind === "bear") {
      c = greenAt(x, T, rb(0.4, 0.8), 0.15);
      c.bear = true;
      c.bearPhase = rnd() * 6.28;
    } else {
      const gapLast = last as Candle;
      gapLast.gapAfter = Math.round(rb(36, clamp(jumpRangePx() - 70, 56, 104)));
      c = greenAt(x + gapLast.gapAfter, T, rb(0.3, 0.6), 0.15);
    }
    gen.hold = T;
    gen.debt = runwayCount();
    gen.sinceHazard = 0;
    gen.extra = Math.floor(rnd() * 3);
    gen.hazardCount++;
    gen.price = c.c;
    gen.anchor = c.c;
    gen.mood = "chop";
    gen.moodLeft = 2;
    candles.push(c);
    return c;
  }
  function approachIsFlat() {
    const need = speed > 4.5 ? 3 : 2;
    const n = candles.length;
    if (n < need) return true;
    const ref = topU(candles[n - 1]);
    for (let i = n - need; i < n; i++) {
      const c = candles[i];
      if (c.kind !== "up" || c.bear || c.gapAfter || Math.abs(topU(c) - ref) > 0.35) return false;
    }
    return true;
  }
  function spawnNext() {
    const last = candles.length ? candles[candles.length - 1] : null;
    const x = last ? last.x + SLOT + last.gapAfter : BULL_CX - 2 * SLOT;
    let c: Candle;
    if (gen.debt > 0) {
      c = greenAt(x, gen.hold, rb(0.25, 0.6), 0.2);
      gen.debt--;
      gen.sinceHazard++;
      gen.price = c.c;
      gen.anchor = c.c;
    } else if (hazardRoll(x)) {
      if (approachIsFlat()) {
        spawnHazard(x, last);
        return candles[candles.length - 1];
      }
      c = greenAt(x, topU(last as Candle), rb(0.3, 0.6), 0.1);
      gen.price = c.c;
      gen.anchor = c.c;
      gen.sinceHazard++;
      gen.mood = "chop";
      if (gen.moodLeft < 1) gen.moodLeft = 1;
    } else {
      if (gen.moodLeft <= 0) pickMood();
      c = spawnGreen(x);
      gen.sinceHazard++;
    }
    candles.push(c);
    return c;
  }

  function reset() {
    seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0;
    candles = [];
    uid = 0;
    gen = {
      price: 100,
      mood: "chop",
      moodLeft: 3,
      anchor: 100,
      debt: 0,
      hold: 100,
      sinceHazard: 0,
      hazardCount: 0,
      firstRed: false,
      extra: 2,
    };
    speed = SPEED0;
    distance = 0;
    score = 0;
    anim = 0;
    lean = 0;
    velY = 0;
    grounded = true;
    canCoyote = false;
    bufferedAt = -1e9;
    fellFrom = null;
    puffs = [];
    dodged = 0;
    flagShown = false;
    startedAt = performance.now();
    lastGroundedAt = startedAt;
    while (candles.length < 3 || candles[candles.length - 1].x < W + 3 * SLOT) spawnNext();
    bullP = topU(supportAt(BULL_CX) ?? candles[2]);
    hasBull = true;
    camHi = camTarget();
    hiAtStart = hi;
    paintScore(true);
  }
  let paintedScore = -1;
  let paintedHi = -1;
  function paintScore(force: boolean) {
    if (force || paintedScore !== score) {
      view.score.textContent = pad5(score);
      paintedScore = score;
    }
    if (force || paintedHi !== hi) {
      view.hi.textContent = pad5(hi);
      paintedHi = hi;
    }
  }

  /* ---------- support and collisions ---------- */
  function supportAt(cx: number): Candle | null {
    for (const c of candles) {
      if (cx >= c.x - SLOT / 2 && cx < c.x + SLOT / 2) return c.kind === "up" ? c : null;
    }
    return null;
  }
  function nextHazard(): NextHazard | null {
    const fx = BULL_CX + BOX_R;
    let best: NextHazard | null = null;
    let bd = 1e9;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      let d: number;
      let k: NextHazard["kind"];
      let wdt = CANDLE_W;
      if (c.kind === "red" || c.kind === "wall") {
        d = c.x - CANDLE_W / 2 - fx;
        k = c.kind;
        if (c.kind === "red") {
          let j = i;
          while (candles[j + 1] && candles[j + 1].kind === "red") j++;
          wdt = CANDLE_W + (j - i) * SLOT;
          d = candles[i].x - CANDLE_W / 2 - fx;
          if (i > 0 && candles[i - 1].kind === "red") continue;
        }
      } else if (c.bear) {
        d = c.x - 13 - fx;
        k = "bear";
      } else if (c.gapAfter) {
        d = c.x + SLOT / 2 - BULL_CX;
        k = "gap";
      } else continue;
      if (d > -SLOT && d < bd) {
        bd = d;
        best = { kind: k, dist: Math.round(d), x: c.x, width: wdt, topPx: Math.round(yOf(topU(c))) };
      }
    }
    return best;
  }

  /* ---------- the step ---------- */
  function step(now: number, dt: number) {
    speed = Math.min(SPEED_MAX, speed + ACCEL * dt);
    const dx = speed * dt;
    distance += dx;
    anim += dx;
    for (const c of candles) c.x -= dx;
    while (candles.length > 2 && candles[0].x < -3 * SLOT - candles[0].gapAfter) candles.shift();
    while (candles[candles.length - 1].x < W + 3 * SLOT) spawnNext();

    const s2 = Math.floor(distance / 12);
    if (s2 !== score) {
      score = s2;
      if (score > hi) {
        const wasBest = hi > hiAtStart;
        hi = score;
        try {
          win.localStorage.setItem(storageKey, String(hi));
        } catch {}
        if (!wasBest && hiAtStart > 0) {
          pulseNote();
          emit("new-best", { score });
        }
      }
      paintScore(false);
    }

    const sup = supportAt(BULL_CX);
    if (now - bufferedAt <= BUFFER_MS && (grounded || (canCoyote && now - lastGroundedAt <= COYOTE_MS))) {
      velY = JUMP_V;
      grounded = false;
      canCoyote = false;
      bufferedAt = -1e9;
      jumps++;
      if (jumps === 1) emit("first-jump", {});
    }
    if (grounded) {
      if (!sup) {
        grounded = false;
        velY = 0;
        canCoyote = true;
        fellFrom = lastSupRef;
      } else {
        const t = topU(sup);
        if (t > bullP + 0.02)
          bullP = t; // step up: climb
        else if (t < bullP - 0.02) {
          // step down: short drop
          grounded = false;
          velY = 0;
          canCoyote = true;
          fellFrom = sup;
        }
        lastGroundedAt = now;
      }
    }
    if (!grounded) {
      const prevP = bullP;
      bullP -= (velY * dt) / PPU;
      velY += GRAV * dt;
      if (sup) {
        const tt = topU(sup);
        if (velY >= 0 && bullP <= tt && prevP >= tt - 1e-6) land(sup, now);
        else if (velY >= 0 && bullP < tt && (tt - bullP) * PPU <= STEP_MAX_PX) land(sup, now);
      }
      if (yOf(bullP) - BOX_H > H + 24) return die(fellFrom && fellFrom.gapAfter ? "gap" : "fall");
    }
    if (sup) lastSupRef = sup;

    // hazards: body contact kills, wicks are harmless
    const fy = yOf(bullP);
    const bl = BULL_CX + BOX_L;
    const br = BULL_CX + BOX_R;
    const bt = fy - BOX_H;
    const bb = fy - 1;
    for (const c of candles) {
      if (!c.scored && (c.kind !== "up" || c.bear || c.gapAfter) && c.x + SLOT / 2 + c.gapAfter < BULL_CX + BOX_L) {
        c.scored = true;
        dodged++;
        puffs.push({ x: BULL_CX + 4, y: fy - BOX_H - 6, t: 0 });
      }
      if (c.x < BULL_CX - 90 || c.x > BULL_CX + 90) continue;
      if (c.kind === "red" || c.kind === "wall") {
        const hl = c.x - CANDLE_W / 2 + 2;
        const hr = c.x + CANDLE_W / 2 - 2;
        const ht = yOf(topU(c)) + 1;
        const hb = yOf(botU(c));
        if (br > hl && bl < hr && bb > ht && bt < hb) return die(c.kind);
      } else if (c.bear) {
        const gy = yOf(topU(c));
        if (br > c.x - 13 && bl < c.x + 13 && bb > gy - 30 && bt < gy) return die("bear");
      }
    }
    if (!flagShown) {
      for (const c of candles) {
        if (c.first && c.x < W - 60) {
          flagShown = true;
          break;
        }
      }
    }

    if (grounded) camHi += (camTarget() - camHi) * Math.min(1, 0.08 * dt);
    const tl = speed > 4.5 ? 0.08 : 0;
    lean += (tl - lean) * Math.min(1, 0.1 * dt);

    for (let i = puffs.length - 1; i >= 0; i--) {
      puffs[i].t += dt / 60;
      puffs[i].y -= 0.7 * dt;
      if (puffs[i].t > 0.8) puffs.splice(i, 1);
    }
  }
  function land(c: Candle, now: number) {
    bullP = topU(c);
    grounded = true;
    velY = 0;
    canCoyote = false;
    lastGroundedAt = now;
  }

  function die(cause: DeathCause) {
    phase = "over";
    overAt = performance.now();
    overCause = cause;
    overScore = score;
    isNewBest = hiAtStart > 0 && overScore > hiAtStart;
    overLine = pick(OVER[cause] ?? OVER.red);
    view.live.textContent = COPY.announceOver(overScore, overLine);
    emit("game-over", { score: overScore, cause, hazards: dodged, seconds: Math.round((overAt - startedAt) / 1000) });
    win.clearTimeout(restartTimer);
    restartTimer = win.setTimeout(() => {
      if (!dismissed && !destroyed && phase === "over") restart();
    }, RESTART_MS);
  }
  function restart() {
    win.clearTimeout(restartTimer);
    runs++;
    phase = "intro";
    introT = RM ? 99 : 0.35;
    reset();
    emit("start", { run: runs });
  }

  /* ---------- drawing ---------- */
  function drawCandle(c: Candle, inkK: number) {
    const xi = Math.round(c.x);
    let col: string;
    let edge: string;
    if (c.kind === "red") {
      col = P.red;
      edge = P.redEdge;
    } else if (c.kind === "wall") {
      col = P.neutral;
      edge = P.neutralEdge;
    } else {
      col = P.green;
      edge = P.greenEdge;
    }
    const yH = Math.round(yOf(c.h));
    const yL = Math.round(yOf(c.l));
    const yT = Math.round(yOf(topU(c)));
    const yB = Math.round(yOf(botU(c)));
    const bh = Math.max(3, yB - yT);
    const ghost = 1 - inkK;
    if (ghost > 0) {
      ctx.globalAlpha = 0.26 * ghost;
      ctx.fillStyle = col;
      ctx.fillRect(xi - 1, yH, 2, Math.max(1, yL - yH));
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.strokeRect(xi - CANDLE_W / 2 + 0.5, yT + 0.5, CANDLE_W - 1, bh - 1);
    }
    if (inkK > 0) {
      ctx.globalAlpha = inkK;
      ctx.fillStyle = edge;
      ctx.fillRect(xi - 1, yH, 2, Math.max(1, yL - yH));
      ctx.fillStyle = col;
      ctx.fillRect(xi - CANDLE_W / 2, yT, CANDLE_W, bh);
      if (c.kind === "wall") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(xi - CANDLE_W / 2, yT, CANDLE_W, bh);
        ctx.clip();
        ctx.strokeStyle = rgba(P.hatchRGB, 0.16);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = -bh; k < CANDLE_W + 2; k += 6) {
          ctx.moveTo(xi - CANDLE_W / 2 + k, yT + bh);
          ctx.lineTo(xi - CANDLE_W / 2 + k + bh, yT);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.globalAlpha = inkK * 0.9;
      ctx.strokeRect(xi - CANDLE_W / 2 + 0.5, yT + 0.5, CANDLE_W - 1, bh - 1);
    }
    ctx.globalAlpha = 1;
  }
  function drawGapMarker(c: Candle, next: Candle, inkK: number) {
    const y = Math.round(yOf(topU(c))) + 0.5;
    const x0 = Math.round(c.x + CANDLE_W / 2) + 3;
    const x1 = Math.round(next.x - CANDLE_W / 2) - 3;
    ctx.globalAlpha = 0.25 + 0.3 * inkK;
    ctx.strokeStyle = rgba(P.grid, 1);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, y - 4);
    ctx.lineTo(x0 + 0.5, y + 4);
    ctx.moveTo(x1 - 0.5, y - 4);
    ctx.lineTo(x1 - 0.5, y + 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const bull = (x: number, y: number, pose: Pose, a: number, tilt: number, alpha?: number) =>
    drawBull(ctx, P, x, y, pose, a, tilt, alpha);
  const bear = (x: number, y: number, t: number, alpha?: number) => drawBear(ctx, P, x, y, t, alpha, RM);

  function drawBrand() {
    ctx.font = font(600, 13);
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = rgba(P.greenRGB, 0.6);
    ctx.fillText("/.", W - 12, H - 10);
    const w = ctx.measureText("/.").width;
    ctx.fillStyle = rgba(P.brandInkRGB, 0.38);
    ctx.fillText("tl", W - 12 - w, H - 10);
    ctx.textAlign = "left";
  }

  function drawScene(now: number, introK: number | null) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // gridlines with price labels
    const stepU = 4;
    const p0 = Math.floor((camHi - H / PPU) / stepU) * stepU;
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(P.grid, 0.1);
    ctx.font = font(500, 11);
    ctx.fillStyle = rgba(P.grid, 0.42);
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    for (let p = p0; p < camHi + stepU; p += stepU) {
      const gy = Math.round(yOf(p)) + 0.5;
      if (gy < -4 || gy > H + 4) continue;
      ctx.beginPath();
      ctx.moveTo(8, gy);
      ctx.lineTo(W - 8, gy);
      ctx.stroke();
      if (gy > 16 && gy < H - 22) ctx.fillText(String(p), W - 10, gy - 4);
    }
    ctx.setLineDash([]);
    ctx.textAlign = "left";

    // candles, inked near the bull and pencilled further out
    const inkEdge = BULL_CX + LOOKAHEAD * SLOT;
    let firstRed: Candle | null = null;
    const bearList: [Candle, number][] = [];
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.x < -SLOT || c.x > W + SLOT) continue;
      let inkK = clamp(1 - (c.x - inkEdge) / (2 * SLOT), 0, 1);
      if (introK != null) {
        const ck = clamp((introK - i * 0.045) / 0.3, 0, 1);
        if (ck <= 0) continue;
        inkK *= ck;
      }
      drawCandle(c, inkK);
      if (c.gapAfter && candles[i + 1]) drawGapMarker(c, candles[i + 1], inkK);
      if (c.bear) bearList.push([c, inkK]);
      if (c.first && !c.scored && c.x > BULL_CX) firstRed = c;
    }
    for (const [c, inkK] of bearList) {
      bear(Math.round(c.x), Math.round(yOf(topU(c))), now * 0.004 + (c.bearPhase ?? 0), 0.3 + 0.7 * inkK);
    }

    // coached first hazard
    if (firstRed && flagShown && phase === "play") {
      const fx = Math.round(firstRed.x);
      const fy = Math.round(yOf(firstRed.h)) - 16 + (RM ? 0 : Math.sin(now * 0.006) * 2);
      ctx.font = font(600, 11);
      const tw = ctx.measureText("jump").width + 22;
      ctx.fillStyle = P.gold;
      ctx.beginPath();
      roundRect(ctx, fx - tw / 2, fy - 16, tw, 18, 9);
      ctx.fill();
      ctx.fillStyle = P.chipInk;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(COPY.flag, fx, fy - 6.5);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = P.gold;
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy + 2);
      ctx.lineTo(fx + 4, fy + 2);
      ctx.lineTo(fx, fy + 7);
      ctx.closePath();
      ctx.fill();
    }

    // dodge puffs
    for (const puff of puffs) {
      ctx.globalAlpha = clamp(1 - puff.t / 0.8, 0, 1);
      ctx.fillStyle = P.mint;
      ctx.font = font(600, 12);
      ctx.fillText("+1", puff.x, puff.y);
    }
    ctx.globalAlpha = 1;

    // ground shadow then the bull
    const feetY = yOf(bullP);
    const supC = supportAt(BULL_CX) ?? lastSupRef;
    if (supC && phase !== "over") {
      const shY = yOf(topU(supC));
      const hgt = clamp((shY - feetY) / APEX, 0, 1);
      ctx.fillStyle = rgba(P.shadowRGB, 0.28 * (1 - hgt * 0.7));
      ctx.beginPath();
      ctx.ellipse(BULL_CX + 3, shY + 1.5, 23 * (1 - hgt * 0.35), 3.2, 0, 0, 6.3);
      ctx.fill();
    }
    if (phase === "over") {
      const k = clamp((now - overAt) / 260, 0, 1);
      const e = 1 - (1 - k) * (1 - k);
      bull(BULL_CX, feetY + e * 5, "crash", anim, e * 1.0, 1);
    } else if (introK != null) {
      const bk = clamp((introK - 0.45) / 0.3, 0, 1);
      if (bk > 0) bull(BULL_CX, feetY - (1 - bk) * 8, "idle", 0, 0, bk);
    } else {
      bull(BULL_CX, feetY, grounded ? "run" : "jump", anim, grounded ? -lean : -0.12 - lean, 1);
    }

    // early hint, once per session
    if (phase === "play" && runs === 0 && jumps === 0) {
      const age = now - startedAt;
      if (age < 6000) {
        ctx.globalAlpha = clamp(1 - (age - 4500) / 1500, 0, 1) * 0.8;
        ctx.font = font(500, 12);
        ctx.fillStyle = P.fg3;
        ctx.fillText(coarse ? COPY.hintTouch : COPY.hintMouse, 14, H - 12);
        ctx.globalAlpha = 1;
      }
    }
    drawBrand();

    if (phase === "over") drawOver(now);
  }

  function drawOver(now: number) {
    const k = clamp((now - overAt - 120) / 220, 0, 1);
    if (k <= 0) return;
    ctx.globalAlpha = k;
    ctx.fillStyle = rgba(P.bgRGB, 0.74);
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const scale = H < 260 ? 0.8 : 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = font(600, Math.round(16 * scale));
    ctx.fillStyle = P.fg2;
    ctx.letterSpacing = "0.18em";
    ctx.fillText(COPY.gameOver, cx, cy - 46 * scale);
    ctx.letterSpacing = "0px";
    ctx.font = font(600, Math.round(40 * scale));
    ctx.fillStyle = P.fg;
    ctx.fillText(pad5(overScore), cx, cy - 4 * scale);
    if (isNewBest) {
      ctx.font = font(600, 11);
      const tw = ctx.measureText(COPY.newBest).width + 24;
      ctx.fillStyle = P.gold;
      ctx.beginPath();
      roundRect(ctx, cx - tw / 2, cy + 6 * scale, tw, 18, 9);
      ctx.fill();
      ctx.fillStyle = P.chipInk;
      ctx.letterSpacing = "0.1em";
      ctx.fillText(COPY.newBest, cx + 1, cy + 6 * scale + 13);
      ctx.letterSpacing = "0px";
    }
    ctx.font = font(400, Math.round(14 * scale));
    ctx.fillStyle = P.fg3;
    ctx.fillText(overLine, cx, cy + (isNewBest ? 44 : 30) * scale);
    const left = Math.max(0, (RESTART_MS - (now - overAt)) / 1000);
    const by = cy + (isNewBest ? 60 : 46) * scale;
    const bw = 150;
    const bh = 32;
    ctx.strokeStyle = rgba(P.greenRGB, 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundRect(ctx, cx - bw / 2, by, bw, bh, 16);
    ctx.stroke();
    ctx.fillStyle = rgba(P.greenRGB, 0.12);
    ctx.fill();
    ctx.font = font(600, 13);
    ctx.fillStyle = P.mint;
    ctx.fillText(COPY.again(left.toFixed(1)), cx, by + 20.5);
    if (H >= 260) {
      ctx.font = font(400, 12);
      ctx.fillStyle = P.fg4;
      ctx.fillText(coarse ? COPY.restartTouch : COPY.restartMouse, cx, by + bh + 20);
    }
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD text ---------- */
  function setWit(txt: string) {
    view.wit.classList.remove(cls.show);
    win.setTimeout(() => {
      if (destroyed) return;
      view.witText.textContent = txt;
      view.wit.classList.add(cls.show);
    }, 420);
  }
  let witIdx = Math.floor(Math.random() * WIT.length);
  function rotateWit() {
    witIdx = (witIdx + 1) % WIT.length;
    setWit(WIT[witIdx]);
  }
  function tickClock() {
    const s = Math.floor((performance.now() - waitStart) / 1000);
    view.clock.textContent = `${Math.floor(s / 60)}:${`0${s % 60}`.slice(-2)}`;
    let tier = -1;
    for (let i = 0; i < TIMER_WIT.length; i++) {
      if (s >= TIMER_WIT[i][0]) {
        tier = i;
        break;
      }
    }
    if (tier !== timerTier) {
      timerTier = tier;
      view.timerWit.textContent = tier >= 0 ? `· ${TIMER_WIT[tier][1]}` : "";
      view.timer.classList.toggle(cls.hot, s >= TIMER_HOT_S);
    }
  }
  function pulseNote() {
    view.note.classList.remove(cls.pulse);
    void view.note.offsetWidth;
    view.note.classList.add(cls.pulse);
  }

  /* ---------- input ---------- */
  function act() {
    if (dismissed) return;
    if (phase === "play") bufferedAt = performance.now();
    else if (phase === "over" && performance.now() - overAt > 250) restart();
  }
  function onKey(e: Event) {
    const ev = e as KeyboardEvent;
    if (ev.repeat) return;
    const t = ev.target as HTMLElement | null;
    const tag = t?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
    if (keyScope === "canvas" && t !== canvas && t !== root) return;
    if (ev.code === "Space" || ev.code === "ArrowUp" || ev.key === " ") {
      ev.preventDefault();
      act();
    } else if (ev.code === "KeyC" && phase === "over") copyScore();
  }
  function copyScore() {
    const txt = COPY.share(dodged, pad5(overScore));
    try {
      const pr = win.navigator.clipboard?.writeText(txt);
      pr?.then(
        () => emit("copied", { score: overScore }),
        () => {},
      );
    } catch {}
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    try {
      canvas.focus({ preventScroll: true });
    } catch {}
    act();
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  const keyTarget: EventTarget = keyScope === "window" ? win : canvas;
  keyTarget.addEventListener("keydown", onKey);
  view.skip.addEventListener("click", (e) => {
    e.preventDefault();
    void dismiss();
  });

  function onMessage(e: MessageEvent) {
    const d = e.data as unknown;
    const name = typeof d === "string" ? d : (d as { type?: string } | null)?.type;
    if (name === "cr:dismiss" || name === "cr:done" || name === "cr:results") void dismiss();
  }
  win.addEventListener("message", onMessage);

  /* ---------- events out ---------- */
  function emit(name: CandleRunnerEvent, data: EventData = {}) {
    const msg = { source: "candle-runner", event: name, data };
    try {
      opts.onEvent?.(name, msg.data);
    } catch {}
    if (inFrame) {
      try {
        win.parent.postMessage(msg, "*");
      } catch {}
    }
  }
  let ro: ResizeObserver | null = null;
  function announceSize() {
    const h = root.getBoundingClientRect().height;
    emit("size", { height: Math.ceil(h) });
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  let rafId = 0;
  function loop(now: number) {
    rafId = win.requestAnimationFrame(loop);
    const dt = Math.min(32, now - last) / 16.667;
    last = now;
    if (phase === "intro") {
      introT += dt / 60;
      const k = clamp(introT / 0.9, 0, 1);
      drawScene(now, k);
      if (k >= 1) {
        phase = "play";
        startedAt = now;
        lastGroundedAt = now;
      }
    } else if (phase === "exit") {
      drawScene(now, null);
    } else {
      if (phase === "play") step(now, dt);
      drawScene(now, null);
    }
    win.__crDebug = {
      t: +((now - startedAt) / 1000).toFixed(2),
      phase,
      score,
      hi,
      speed: +speed.toFixed(2),
      grounded,
      feetY: Math.round(yOf(bullP)),
      next: nextHazard(),
      cause: phase === "over" ? overCause : null,
      dodged,
      jumps,
      runs,
      W,
      H,
    };
  }
  function onVis() {
    if (doc.hidden) {
      if (rafId) win.cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!rafId && !destroyed) {
      last = performance.now();
      rafId = win.requestAnimationFrame(loop);
    }
  }
  doc.addEventListener("visibilitychange", onVis);

  /* ---------- lifecycle ---------- */
  let dismissResolve: (() => void) | null = null;
  const dismissPromise = new Promise<void>((res) => {
    dismissResolve = res;
  });
  function dismiss() {
    if (dismissed) return dismissPromise;
    dismissed = true;
    phase = "exit";
    win.clearTimeout(restartTimer);
    root.classList.add(cls.exit);
    emit("dismissed", { score, hi, runs: runs + 1, jumps });
    win.setTimeout(() => dismissResolve?.(), RM ? 220 : 470);
    return dismissPromise;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (rafId) win.cancelAnimationFrame(rafId);
    win.clearInterval(clockTimer);
    win.clearInterval(witTimer);
    win.clearTimeout(restartTimer);
    keyTarget.removeEventListener("keydown", onKey);
    win.removeEventListener("message", onMessage);
    win.removeEventListener("resize", resize);
    doc.removeEventListener("visibilitychange", onVis);
    ro?.disconnect();
    host.innerHTML = "";
  }

  /* ---------- boot ---------- */
  if ("ResizeObserver" in win) {
    ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w !== W || h !== H) resize();
      announceSize();
    });
    ro.observe(canvas);
    ro.observe(root);
  } else (win as Window).addEventListener("resize", resize);
  try {
    void doc.fonts?.load(font(600, 14));
    void doc.fonts?.load(font(400, 14));
  } catch {}
  resize();
  reset();
  phase = "intro";
  introT = RM ? 99 : 0;
  setWit(WIT[witIdx]);
  witTimer = win.setInterval(rotateWit, WIT_ROTATE_MS);
  if (showTimer) {
    tickClock();
    clockTimer = win.setInterval(tickClock, 1000);
  }
  rafId = win.requestAnimationFrame(loop);
  emit("ready", {});
  announceSize();

  return {
    dismiss,
    destroy,
    restart,
    element: root,
    _debugCandles: () =>
      candles.map((c) => ({
        x: c.x,
        o: c.o,
        c: c.c,
        h: c.h,
        l: c.l,
        kind: c.kind,
        gapAfter: c.gapAfter,
        bear: c.bear,
        id: c.id,
      })),
  };
}
