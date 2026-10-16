// Candle Runner: the waiting-screen game for a running backtest (PRD sections 6 and 7).
// Framework-free: the React component and the one-file build both call mount().
//
// Ported from reference/candle-runner-loading.html (the build verified on
// 13 October 2026) without changing behaviour. The verification suite runs
// against both, so a change here that changes play shows up as a failing check.

import { dsIcons, type DsIconName } from "@/design-system/icons";
import { dsLogos } from "@/design-system/logos";
import {
  breathFrame,
  crashFrame,
  drawBear,
  drawBull,
  jumpFrame,
  roundRect,
  runFrame,
  SWAT_DOWN_MS,
  SWAT_LANDS_MS,
  swatFrame,
} from "./art";
import type { BearFrame } from "./characters";
import { DAYS, dayMove } from "./market";
import {
  AIR_FRAMES,
  BOX_H,
  BOX_L,
  BOX_R,
  BUFFER_MS,
  BULL_X,
  BULL_X_NARROW,
  CANDLE_W,
  GREEN_BODY_MIN_U,
  COYOTE_MS,
  DOUBLE_MIN_SPEED,
  DROP_MAX_U,
  FLAT_STEP_U,
  FIRST_HAZARD_SLOTS,
  GRAV,
  JUMP_V,
  LEG_MAX,
  LOOKAHEAD,
  MARKET_PCT,
  MAX_RISE_U,
  NARROW_W,
  PPU,
  RUNWAY_STEP_U,
  SLOT,
  SPEED0,
  SPEED_MAX,
  levelAt,
  levelSpeed,
  speedAt,
  STEP_MAX_PX,
  TRIPLE_MIN_SPEED,
  WALL_MIN_SPEED,
} from "./constants";
import { COPY, OVER, TIMER_HOT_S, TIMER_WIT, WIT, WIT_ROTATE_MS } from "./copy";
import { readPalette, rgba, type Font, type RGBA } from "./palette";
import type {
  Candle,
  CandleRunnerEvent,
  CoachKind,
  CandleRunnerHandle,
  DeathCause,
  EventData,
  MountOptions,
  NextHazard,
  Phase,
  Theme,
} from "./types";
import { createView } from "./view";

interface Generator {
  /** The last candle's close, in price units. */
  price: number;
  /** The next NIFTY day to lay. */
  day: number;
  /** Where NIFTY closed on the last day laid, in price units: the chart catches up to it. */
  level: number;
  /** The close of the run's first day, NIFTY points: price unit 100 on the axis. */
  base: number;
  /** Steps down in a row, for the pause after a leg. */
  falls: number;
  debt: number;
  hold: number;
  sinceHazard: number;
  hazardCount: number;
  firstRed: boolean;
  extra: number;
}

// Canvas chips and the price tag take their height from their text style's line
// height: Label/MD (16) with 2 px above and below, and Caption (14) as the
// product's last-price tag is.
const CHIP_H = 20;
// The game over card fades in this long after a death; after a bear, once its swat
// has landed and the paw is coming down (Figma: bear-hit-v1).
const CARD_AFTER_MS = 120;
const CARD_AFTER_SWAT_MS = 340;
const TAG_H = 14;
const ICON = 12;
// The card's button and keycap, as the Figma frame draws them: the library's primary
// button (30 tall, 148 wide here, a 14 px icon) and a keycap of Label/MD with 2 px
// above and below and its 1 px lip.
const BUTTON_H = 30;
const BUTTON_W = 148;
const BUTTON_ICON = 14;
const KEY_H = 21;
// The bear's height at game size, for the flag over its head.
const BEAR_H = 42;

/** A design system icon's path data, for the canvas (src/design-system/icons.ts). */
const iconPath = (name: DsIconName) => [...dsIcons[name].matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" ");

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
// Figures as the product writes numbers, grouped and without leading zeros:
// "3,351" (the user, 2026-10-16).
const figures = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
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
  // Read again whenever the mode may have changed: the tokens resolve per mode
  // (src/game/tokens.css), the canvas only sees them through this read.
  if (opts.theme) root.dataset.theme = opts.theme;
  let P = readPalette(root, win);
  const themeOf = (): Theme => (win.getComputedStyle(root).colorScheme.includes("light") ? "light" : "dark");
  let theme = themeOf();
  function refreshPalette() {
    P = readPalette(root, win);
    theme = themeOf();
  }
  function setTheme(next?: Theme) {
    if (next) root.dataset.theme = next;
    else delete root.dataset.theme;
    refreshPalette();
  }

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
  // Seconds of play, counted in frame time like every motion: the pace levels run on it.
  let clock = 0;
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
  // Off the ground by a jump (not by walking or stepping off an edge), until it lands.
  let jumped = false;
  // Went over a gap's edge without jumping: it falls, and only a jump can save it.
  let inPit = false;
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
  let dodged = 0;
  let jumps = 0;
  let runs = 0;
  // The jump flag coaches each hazard kind once a page (the user, 2026-10-16): the
  // kinds coached so far outlive restarts, the flag's hazard belongs to the run.
  const coached = new Set<CoachKind>();
  let coach: { kind: CoachKind; id: number } | null = null;
  /** The bear that ended the run, for its swat. */
  let hitBear: Candle | null = null;
  /** How far the game over card has faded in, 0 to 1. */
  let cardK = 0;
  /** The drawing the hitting bear is in this frame. */
  let bearPose: BearFrame | null = null;
  let dismissed = false;
  let destroyed = false;
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
  // A runway is sized for the next level's pace: the bull may level up before it gets
  // there, and a faster jump lands further on (PRD section 6, fairness rule 1).
  const runwayCount = () => Math.max(3, Math.ceil((AIR_FRAMES * levelSpeed(levelAt(clock) + 1) + 40) / SLOT));

  /* ---------- spawner: the chart is the level ---------- */
  // The chart is NIFTY 50, a day a candle (the user, 2026-10-16): a run starts on a
  // random day and goes forward, from the last day back to the first. Each candle's
  // close follows NIFTY's, as far as the fairness rules allow: a step is at most the
  // rising cap up or down, a runway after a hazard is near flat, and a hazard waits
  // for a flat approach. A move held back is caught up by the next free candles.
  // Every walkable candle is green, whichever way its day went: the game's reds are
  // its hazards (the user's call: NIFTY's path, the game's rules).
  let uid = 0;
  const K = 1 / Math.log(1 + MARKET_PCT / 100);
  const priceAt = (u: number) => gen.base * Math.exp((u - 100) / K);
  const unitsAt = (p: number) => 100 + K * Math.log(p / gen.base);
  /** Lays the next day: NIFTY's level moves by the day's move. */
  function nextDay() {
    const i = gen.day;
    gen.level += K * dayMove(i);
    gen.day = (i + 1) % DAYS.length;
    return i;
  }
  /** A green candle for a day, its close at `top`: the day's own body and wicks, in units. */
  function dayCandle(x: number, day: number, top: number): Candle {
    const d = DAYS[day];
    const body = clamp(K * Math.abs(Math.log(d.close / d.open)), GREEN_BODY_MIN_U, 2.5);
    const wickUp = clamp(K * Math.log(d.high / Math.max(d.open, d.close)), 0.1, 1.5);
    const wickDown = clamp(K * Math.log(Math.min(d.open, d.close) / d.low), 0.1, 1.5);
    return {
      x,
      o: top - body,
      c: top,
      h: top + wickUp,
      l: top - body - wickDown,
      kind: "up",
      gapAfter: 0,
      bear: false,
      scored: false,
      id: ++uid,
      day,
    };
  }
  /** A free candle: as close to NIFTY's level as one step allows, with a pause after a long fall. */
  function spawnDay(x: number): Candle {
    const day = nextDay();
    const p = gen.price;
    let t = clamp(gen.level, p - DROP_MAX_U, p + MAX_RISE_U);
    if (p - t > 0.35) {
      // a run of steps down pauses after the longest leg, so the bull lands and the
      // camera catches up before the next drop (docs/decisions.md, 2026-10-16)
      if (++gen.falls > LEG_MAX) {
        t = p;
        gen.falls = 0;
      }
    } else gen.falls = 0;
    const c = dayCandle(x, day, t);
    gen.price = t;
    return c;
  }
  function hazardRoll(x: number) {
    if (gen.hazardCount === 0) {
      // Measured along the run, not on screen: new candles appear just past the right
      // edge, which on a narrow canvas is never 20 slots ahead of the bull.
      const runX = x + distance;
      const minX = BULL_CX + FIRST_HAZARD_SLOTS * SLOT;
      if (runX < minX) return false;
      return runX >= minX + 2 * SLOT || rnd() < 0.5;
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
      // never while the market is climbing away from the bull (the PRD's "up mood")
      const rising = gen.level - gen.price > 0.35;
      const wWall = speed >= WALL_MIN_SPEED && !rising ? 0.14 + 0.1 * ramp0 : 0;
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
          day: nextDay(),
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
        day: nextDay(),
      };
    } else if (kind === "bear") {
      c = dayCandle(x, nextDay(), T);
      c.bear = true;
      c.bearPhase = rnd() * 6.28;
    } else {
      // the gap is the space between two days; the day after it sits at the same price
      const gapLast = last as Candle;
      gapLast.gapAfter = Math.round(rb(36, clamp(jumpRangePx() - 70, 56, 104)));
      c = dayCandle(x + gapLast.gapAfter, nextDay(), T);
    }
    gen.hold = T;
    gen.debt = runwayCount();
    gen.sinceHazard = 0;
    gen.extra = Math.floor(rnd() * 3);
    gen.hazardCount++;
    gen.price = c.c;
    gen.falls = 0;
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
      // The runway follows NIFTY by at most 0.35 units a candle, as the generated
      // runway drifted: a safe landing that keeps the bull on the ground (PRD
      // section 6, fairness rule 1). Hazards still wait for a flat approach.
      gen.hold = clamp(gen.level, gen.hold - RUNWAY_STEP_U, gen.hold + RUNWAY_STEP_U);
      c = dayCandle(x, nextDay(), gen.hold);
      gen.debt--;
      gen.sinceHazard++;
      gen.price = c.c;
      gen.falls = 0;
    } else if (hazardRoll(x)) {
      if (approachIsFlat()) {
        spawnHazard(x, last);
        return candles[candles.length - 1];
      }
      // not flat yet: a day held level makes the approach (three in a row stay
      // within the 0.35 that counts as flat)
      const p = topU(last as Candle);
      c = dayCandle(x, nextDay(), clamp(gen.level, p - FLAT_STEP_U, p + FLAT_STEP_U));
      gen.price = c.c;
      gen.falls = 0;
      gen.sinceHazard++;
    } else {
      c = spawnDay(x);
      gen.sinceHazard++;
    }
    candles.push(c);
    return c;
  }

  function reset(startDay?: number) {
    seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0;
    candles = [];
    uid = 0;
    // The run starts on a random NIFTY day, its close at price unit 100.
    const day = startDay ?? Math.floor(rnd() * DAYS.length);
    gen = {
      price: 100,
      day,
      level: 100 - K * dayMove(day),
      base: DAYS[day].close,
      falls: 0,
      debt: 0,
      hold: 100,
      sinceHazard: 0,
      hazardCount: 0,
      firstRed: false,
      extra: 2,
    };
    speed = SPEED0;
    clock = 0;
    distance = 0;
    score = 0;
    anim = 0;
    lean = 0;
    velY = 0;
    grounded = true;
    canCoyote = false;
    bufferedAt = -1e9;
    fellFrom = null;
    jumped = false;
    inPit = false;
    dodged = 0;
    coach = null;
    hitBear = null;
    cardK = 0;
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
      view.score.textContent = figures.format(score);
      paintedScore = score;
    }
    if (force || paintedHi !== hi) {
      view.hi.textContent = figures.format(hi);
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
    // the pace steps up a level every 5 s of play, to the top speed at 25 s
    clock += dt / 60;
    speed = speedAt(clock);
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
      jumped = true;
      inPit = false;
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
      // Every gap is a fall unless jumped (the user, 2026-10-16). Without this, at speed the
      // step-up landing below lifted the bull out of a narrow gap before it had dropped 36 px.
      if (!sup && !jumped && lastSupRef?.gapAfter) inPit = true;
      if (sup && !inPit) {
        const tt = topU(sup);
        if (velY >= 0 && bullP <= tt && prevP >= tt - 1e-6) land(sup, now);
        else if (velY >= 0 && bullP < tt && (tt - bullP) * PPU <= STEP_MAX_PX) land(sup, now);
      }
      if (yOf(bullP) - BOX_H > H + 24) return die(inPit || fellFrom?.gapAfter ? "gap" : "fall");
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
        if (coach?.id === c.id) coach = null;
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
        if (br > c.x - 13 && bl < c.x + 13 && bb > gy - 30 && bt < gy) {
          hitBear = c;
          return die("bear");
        }
      }
    }
    // The jump flag coaches the first red, the first gap and the first bear of the
    // page: each kind once, on the nearest hazard ahead as it comes into view, and
    // never again after a restart (the user, 2026-10-16). It goes once that hazard
    // is behind the bull.
    if (!coach) {
      for (const c of candles) {
        if (c.scored || c.x <= BULL_CX || c.x > W - 60) continue;
        const kind: CoachKind | null = c.kind === "red" ? "red" : c.gapAfter ? "gap" : c.bear ? "bear" : null;
        if (!kind) continue;
        if (!coached.has(kind)) {
          coached.add(kind);
          coach = { kind, id: c.id };
        }
        break;
      }
    }

    if (grounded) camHi += (camTarget() - camHi) * Math.min(1, 0.08 * dt);
    const tl = speed > 4.5 ? 0.08 : 0;
    lean += (tl - lean) * Math.min(1, 0.1 * dt);
  }
  function land(c: Candle, now: number) {
    bullP = topU(c);
    grounded = true;
    velY = 0;
    canCoyote = false;
    jumped = false;
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
    // No automatic restart: the card waits for a tap or a key (the user, 2026-10-16).
  }
  function restart(startDay?: number) {
    runs++;
    phase = "intro";
    introT = RM ? 99 : 0.35;
    reset(startDay);
    emit("start", { run: runs });
  }

  /* ---------- drawing ---------- */
  // Candles as the product's chart draws them (Stock page, 8164:2356 and
  // 8500:69476): a solid body, the wick in the body's colour and stopping at its
  // edges, no outline, square corners. Candles beyond the ink line are pencilled,
  // outline and wick only, faint (PRD section 6, "Candles and terrain", rule 8).
  function drawCandle(c: Candle, inkK: number) {
    const xi = Math.round(c.x);
    // The wall is a tall red candle (the user, 2026-10-16): drawn as every red is.
    const red = c.kind === "red" || c.kind === "wall";
    const body = red ? P.down : P.up;
    const edge = red ? P.downEdge : P.upEdge;
    const yH = Math.round(yOf(c.h));
    const yL = Math.round(yOf(c.l));
    const yT = Math.round(yOf(topU(c)));
    const bh = Math.max(3, Math.round(yOf(botU(c))) - yT);
    const x0 = xi - CANDLE_W / 2;
    const ghost = 1 - inkK;
    if (ghost > 0) {
      const pencil = rgba(edge, 0.26 * ghost);
      ctx.fillStyle = pencil;
      ctx.fillRect(xi - 1, yH, 2, Math.max(0, yT - yH));
      ctx.fillRect(xi - 1, yT + bh, 2, Math.max(0, yL - yT - bh));
      ctx.strokeStyle = pencil;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, yT + 0.5, CANDLE_W - 1, bh - 1);
    }
    if (inkK > 0) {
      ctx.fillStyle = rgba(edge, inkK);
      ctx.fillRect(xi - 1, yH, 2, Math.max(0, yT - yH));
      ctx.fillRect(xi - 1, yT + bh, 2, Math.max(0, yL - yT - bh));
      ctx.fillStyle = rgba(body, inkK);
      ctx.fillRect(x0, yT, CANDLE_W, bh);
    }
  }
  function drawGapMarker(c: Candle, next: Candle, inkK: number) {
    const y = Math.round(yOf(topU(c))) + 0.5;
    const x0 = Math.round(c.x + CANDLE_W / 2) + 3;
    const x1 = Math.round(next.x - CANDLE_W / 2) - 3;
    // The product's dashed chart line (3 on, 4 off), in the tertiary text colour.
    ctx.strokeStyle = rgba(P.fg4, 0.35 + 0.4 * inkK);
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
  }
  // The design system's icon-arrow--point-up (44:171) leads the jump flag. It is
  // drawn at its own size, 12 px, from its own path.
  const arrowUp = new Path2D(iconPath("icon-arrow--point-up"));
  // The design system's icon-refresh (1583:1177) leads "Re-enter".
  const refresh = new Path2D(iconPath("icon-refresh"));
  /** A design system text style on the canvas: its font and its letter spacing. */
  function setType(f: Font, small = false) {
    ctx.font = small ? f.small : f.css;
    ctx.letterSpacing = f.tracking;
  }
  /**
   * A pill in the design system's chip shape: the jump flag, "New best". An icon,
   * when given, leads the label as the product's buttons carry theirs.
   */
  function drawChip(label: string, cx: number, top: number, fill: RGBA, ink: RGBA, icon?: Path2D) {
    setType(P.type.chip);
    const iconW = icon ? ICON + 4 : 0;
    const w = ctx.measureText(label).width + iconW + 16;
    const left = cx - w / 2;
    ctx.fillStyle = rgba(fill);
    ctx.beginPath();
    roundRect(ctx, left, top, w, CHIP_H, Math.min(P.radius.chip, CHIP_H / 2));
    ctx.fill();
    ctx.fillStyle = rgba(ink);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, left + 8 + iconW, top + CHIP_H / 2 + 0.5);
    ctx.textBaseline = "alphabetic";
    if (icon) {
      ctx.save();
      ctx.translate(left + 8, top + (CHIP_H - ICON) / 2);
      ctx.strokeStyle = rgba(ink);
      ctx.lineWidth = 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(icon);
      ctx.restore();
    }
  }
  // The price axis, as the product's chart has it: prices with two decimals at
  // the right, in a column of their own whose edge is a subtle line, and no
  // gridlines. Below NARROW_W the column would hide a seventh of the chart ahead
  // of the bull, so there the labels sit over the chart's right edge instead.
  // The prices are NIFTY's, in points, grouped as the product writes rupees.
  const priceText = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const NICE = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
  function axisWidth() {
    setType(P.type.axis);
    return Math.ceil(ctx.measureText("00,000.00").width) + 16;
  }
  function drawAxis(axisW: number, column: boolean) {
    // a label about every 4 price units, on a round number of points
    const pLow = priceAt(camHi - H / PPU);
    const pHigh = priceAt(camHi);
    const want = pLow * (Math.exp(4 / K) - 1);
    const stepP = NICE.find((n) => n >= want) ?? NICE[NICE.length - 1];
    if (column) {
      ctx.fillStyle = rgba(P.grid);
      ctx.fillRect(W - axisW, 0, 1, H);
    }
    const tagY = clamp(Math.round(yOf(bullP)), TAG_H / 2, H - TAG_H / 2);
    const showTag = phase !== "intro";
    setType(P.type.axis);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgba(P.axis);
    for (let p = Math.ceil(pLow / stepP) * stepP; p <= pHigh; p += stepP) {
      const gy = Math.round(yOf(unitsAt(p)));
      if (gy < 10 || gy > H - 28) continue;
      if (showTag && Math.abs(gy - tagY) < TAG_H) continue;
      ctx.fillText(priceText.format(p), W - 8, gy);
    }
    // The last-price tag marks the bull's own price, the chart's "now".
    if (showTag) {
      ctx.fillStyle = rgba(P.tag);
      ctx.fillRect(W - axisW + (column ? 1 : 0), tagY - TAG_H / 2, axisW, TAG_H);
      ctx.fillStyle = rgba(P.tagInk);
      ctx.fillText(priceText.format(priceAt(bullP)), W - 8, tagY + 0.5);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // The design system's logo mark (Logos page: 1415:24 on dark, 1507:7279 on light).
  // Both variants share their paths and only the "t" changes colour, so the "t" takes
  // the mode's brand ink and the "/." keep the logo's own green.
  const MARK_H = 12;
  const mark = dsLogos["logomark-dark"];
  const markScale = MARK_H / mark.height;
  const markW = mark.width * markScale;
  const markPaths = mark.paths.map((p, i) => ({
    path: new Path2D(p.d),
    fill: p.fill,
    ink: p.fill !== dsLogos["logomark-light"].paths[i].fill,
  }));
  function drawBrand() {
    ctx.save();
    ctx.translate(W - 12 - markW, H - 10 - MARK_H);
    ctx.scale(markScale, markScale);
    // A faint corner mark, as the type was: the ink at 38%, the green at 60%.
    for (const m of markPaths) {
      ctx.globalAlpha = m.ink ? 1 : 0.6;
      ctx.fillStyle = m.ink ? rgba(P.brandInk, 0.38) : m.fill;
      ctx.fill(m.path);
    }
    ctx.restore();
  }

  function drawScene(now: number, introK: number | null) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // the chart stops at the price axis, as the product's does
    const axisW = axisWidth();
    const column = W >= NARROW_W;
    ctx.save();
    if (column) {
      ctx.beginPath();
      ctx.rect(0, 0, W - axisW, H);
      ctx.clip();
    }

    // candles, inked near the bull and pencilled further out
    const inkEdge = BULL_CX + LOOKAHEAD * SLOT;
    let flagged: Candle | null = null;
    let flaggedNext: Candle | null = null;
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
      if (coach?.id === c.id && phase === "play") {
        flagged = c;
        flaggedNext = candles[i + 1] ?? null;
      }
    }
    // The bear breathes through its four drawings; with reduced motion it holds the first.
    // The bear that ended the run swats back (Figma: bear-hit-v1); from the raise on
    // it stands in front of the bull, drawn after it below. Reduced motion: the growl alone.
    const hitMs = phase === "over" && hitBear ? now - overAt : -1;
    bearPose = hitMs < 0 ? null : RM ? "react-growl" : swatFrame(hitMs);
    for (const [c, inkK] of bearList) {
      if (c === hitBear && bearPose && bearPose !== "breathe-01") continue;
      const frame = RM ? "breathe-01" : c === hitBear && bearPose ? "breathe-01" : breathFrame(now * 0.004 + (c.bearPhase ?? 0));
      drawBear(ctx, P, Math.round(c.x), Math.round(yOf(topU(c))), frame, 0.3 + 0.7 * inkK);
    }

    // the jump flag over the coached hazard: above a red's wick, the middle of a
    // gap, or the bear's head
    if (flagged) {
      const top = Math.round(yOf(topU(flagged)));
      const fx = Math.round(
        flagged.gapAfter && flaggedNext ? (flagged.x + flaggedNext.x) / 2 : flagged.x,
      );
      const anchor = flagged.kind === "red" ? Math.round(yOf(flagged.h)) : flagged.bear ? top - BEAR_H : top;
      const fy = anchor - 16 + (RM ? 0 : Math.sin(now * 0.006) * 2);
      drawChip(COPY.flag, fx, fy - CHIP_H + 2, P.gold, P.chipInk, arrowUp);
      ctx.fillStyle = rgba(P.gold);
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy + 2);
      ctx.lineTo(fx + 4, fy + 2);
      ctx.lineTo(fx, fy + 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    drawAxis(axisW, column);


    // the bull, with no ground shadow (the user, 2026-10-16)
    const feetY = yOf(bullP);
    // The drawings come from the bull's character sheet: it stumbles, then lies down;
    // it stands ready in the intro; it gallops on the ground and springs, tops out and
    // reaches down in the air. With reduced motion the gallop keeps its hooves down.
    if (phase === "over" && hitBear && !RM) {
      // Struck by the bear: a beat of stillness, knocked back and up as the swat
      // lands, then down a little further back (Figma: bear-hit-v1).
      const frame = hitMs < 60 ? runFrame(anim) : hitMs < SWAT_DOWN_MS ? "crash-stumble" : "crash-down";
      const back = hitMs < SWAT_LANDS_MS ? 0 : hitMs < SWAT_DOWN_MS ? 6 : 10;
      const up = hitMs >= SWAT_LANDS_MS && hitMs < SWAT_DOWN_MS ? 4 : 0;
      drawBull(ctx, P, BULL_CX - back, feetY - up, frame);
    } else if (phase === "over") {
      drawBull(ctx, P, BULL_CX, feetY, crashFrame(clamp((now - overAt) / 260, 0, 1)));
    } else if (introK != null) {
      const bk = clamp((introK - 0.45) / 0.3, 0, 1);
      if (bk > 0) drawBull(ctx, P, BULL_CX, feetY - (1 - bk) * 8, "idle-ready", 0, bk);
    } else if (grounded) {
      drawBull(ctx, P, BULL_CX, feetY, runFrame(anim), -lean, 1, RM);
    } else {
      drawBull(ctx, P, BULL_CX, feetY, jumpFrame(velY), -lean);
    }

    if (hitBear && bearPose && bearPose !== "breathe-01") {
      drawBear(ctx, P, Math.round(hitBear.x), Math.round(yOf(topU(hitBear))), bearPose);
    }

    // early hint, once per session
    if (phase === "play" && runs === 0 && jumps === 0) {
      const age = now - startedAt;
      if (age < 6000) {
        setType(P.type.hint);
        ctx.fillStyle = rgba(P.fg3, clamp(1 - (age - 4500) / 1500, 0, 1));
        ctx.fillText(coarse ? COPY.hintTouch : COPY.hintMouse, 14, H - 12);
      }
    }
    drawBrand();

    if (phase === "over") drawOver(now);
  }

  // The game over card (the user, 2026-10-16; Figma: game-over-v1). The score leads,
  // the personal best sits under it, then the cause line, the design system's
  // primary button, and with a keyboard the space keycap. On the short phone canvas
  // the score steps down to Display/LG and the keycap line goes. Rows are the line
  // heights of their text styles, stacked with the frame's gaps.
  function drawOver(now: number) {
    const delay = overCause === "bear" && !RM ? CARD_AFTER_SWAT_MS : CARD_AFTER_MS;
    cardK = clamp((now - overAt - delay) / 220, 0, 1);
    if (cardK <= 0) return;
    ctx.globalAlpha = cardK;
    ctx.fillStyle = rgba(P.overlay);
    ctx.fillRect(0, 0, W, H);
    const T = P.type;
    const phone = H < 260;
    const keys = !phone && !coarse;
    const row = { title: 22, score: phone ? 34 : 51, best: CHIP_H, cause: 20, button: BUTTON_H, keys: KEY_H };
    const gap = { score: 4, cause: phone ? 12 : 16, actions: phone ? 16 : 24, keys: 12 };
    const height =
      row.title + gap.score + row.score + gap.score + row.best + gap.cause + row.cause + gap.actions + row.button +
      (keys ? gap.keys + row.keys : 0);
    // a few px above the true centre, as the eye places a centred block
    let y = Math.round((H - height) / 2) - (phone ? 2 : 4);
    const cx = Math.round(W / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    setType(T.overTitle);
    ctx.fillStyle = rgba(P.fg2);
    ctx.fillText(COPY.gameOver, cx, y + row.title / 2);
    y += row.title + gap.score;

    setType(phone ? T.overScoreCompact : T.overScore);
    ctx.fillStyle = rgba(P.fg);
    ctx.fillText(figures.format(overScore), cx, y + row.score / 2);
    y += row.score + gap.score;

    if (isNewBest) drawChip(COPY.newBest, cx, y, P.gold, P.chipInk);
    else {
      // "Personal best" and its figure, centred together on one baseline
      setType(T.hint);
      const label = ctx.measureText(COPY.hi).width;
      setType(T.figure);
      const best = figures.format(hi);
      const left = cx - (label + 8 + ctx.measureText(best).width) / 2;
      const base = y + 15;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = rgba(P.fg3);
      ctx.fillText(best, left + label + 8, base);
      setType(T.hint);
      ctx.fillStyle = rgba(P.fg4);
      ctx.fillText(COPY.hi, left, base);
    }
    y += row.best + gap.cause;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    setType(T.overLine);
    ctx.fillStyle = rgba(P.fg3);
    ctx.fillText(overLine, cx, y + row.cause / 2);
    y += row.cause + gap.actions;

    drawButton(cx, y);
    y += row.button + gap.keys;
    if (keys) drawKeyHint(cx, y);

    ctx.letterSpacing = "0px";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 1;
  }
  /** "Re-enter": the design system's primary button, Icon+Text, 148 wide. */
  function drawButton(cx: number, top: number) {
    const w = BUTTON_W;
    const left = cx - w / 2;
    const fill = ctx.createLinearGradient(0, top, 0, top + BUTTON_H);
    fill.addColorStop(0, rgba(P.buttonFrom));
    fill.addColorStop(1, rgba(P.buttonTo));
    ctx.fillStyle = fill;
    ctx.strokeStyle = rgba(P.buttonLine);
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, left + 0.5, top + 0.5, w - 1, BUTTON_H - 1, P.radius.button);
    ctx.fill();
    ctx.stroke();
    setType(P.type.button);
    const label = ctx.measureText(COPY.again).width;
    const x0 = cx - (BUTTON_ICON + 4 + label) / 2;
    const mid = top + BUTTON_H / 2;
    ctx.save();
    ctx.translate(x0, mid - BUTTON_ICON / 2);
    ctx.scale(BUTTON_ICON / ICON, BUTTON_ICON / ICON);
    ctx.strokeStyle = rgba(P.buttonIcon);
    ctx.lineWidth = ICON / BUTTON_ICON;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(refresh);
    ctx.restore();
    ctx.fillStyle = rgba(P.buttonInk);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(COPY.again, x0 + BUTTON_ICON + 4, mid + 0.5);
  }
  /** "Hit [space] to re-enter", the key drawn as a Mac keycap with a darker lip. */
  function drawKeyHint(cx: number, top: number) {
    setType(P.type.chip);
    const keyW = ctx.measureText(COPY.restartKey).width + 16;
    setType(P.type.hint);
    const lead = ctx.measureText(COPY.restartLead).width;
    const tail = ctx.measureText(COPY.restartTail).width;
    let x = cx - (lead + 4 + keyW + 4 + tail) / 2;
    const mid = top + KEY_H / 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgba(P.fg4);
    ctx.fillText(COPY.restartLead, x, mid);
    x += lead + 4;
    ctx.fillStyle = rgba(P.keyEdge);
    ctx.beginPath();
    roundRect(ctx, x, top, keyW, KEY_H, P.radius.key);
    ctx.fill();
    ctx.fillStyle = rgba(P.key);
    ctx.strokeStyle = rgba(P.keyLine);
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, x + 0.5, top + 0.5, keyW - 1, KEY_H - 2, P.radius.key);
    ctx.fill();
    ctx.stroke();
    setType(P.type.chip);
    ctx.fillStyle = rgba(P.fg3);
    ctx.textAlign = "center";
    ctx.fillText(COPY.restartKey, x + keyW / 2, mid);
    x += keyW + 4;
    setType(P.type.hint);
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(P.fg4);
    ctx.fillText(COPY.restartTail, x, mid);
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
    const txt = COPY.share(dodged, figures.format(overScore));
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
    // Focus from a click or a tap shows no ring (the user, 2026-10-16). Chrome counts
    // this script focus as keyboard focus, so the canvas carries the mark until blur.
    canvas.dataset.focus = "pointer";
    try {
      canvas.focus({ preventScroll: true });
    } catch {}
    act();
  });
  canvas.addEventListener("blur", () => delete canvas.dataset.focus);
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
    if (name === "cr:theme") {
      const next = (d as { theme?: unknown }).theme;
      if (next === "dark" || next === "light") setTheme(next);
    }
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
      canJump: grounded || (canCoyote && now - lastGroundedAt <= COYOTE_MS),
      feetY: Math.round(yOf(bullP)),
      next: nextHazard(),
      cause: phase === "over" ? overCause : null,
      dodged,
      jumps,
      runs,
      W,
      H,
      theme,
      price: +priceAt(bullP).toFixed(2),
      day: supportAt(BULL_CX)?.day,
      clock: +clock.toFixed(3),
      level: levelAt(clock),
      coach: phase === "play" ? coach : null,
      bearPose,
      card: phase === "over" ? cardK : 0,
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
    keyTarget.removeEventListener("keydown", onKey);
    win.removeEventListener("message", onMessage);
    win.removeEventListener("resize", resize);
    doc.removeEventListener("visibilitychange", onVis);
    ro?.disconnect();
    themeWatch?.disconnect();
    host.innerHTML = "";
  }

  // The host switches modes on itself (an attribute on <html>, <body> or any
  // ancestor): the DOM follows through CSS, the canvas through a fresh read.
  let themeWatch: MutationObserver | null = null;
  if ("MutationObserver" in win) {
    themeWatch = new MutationObserver(refreshPalette);
    for (let el = host as HTMLElement | null; el; el = el.parentElement) {
      themeWatch.observe(el, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    }
  }

  function debugCandles() {
    return candles.map((c) => ({
      x: c.x,
      o: c.o,
      c: c.c,
      h: c.h,
      l: c.l,
      kind: c.kind,
      gapAfter: c.gapAfter,
      bear: c.bear,
      id: c.id,
      day: c.day,
    }));
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
    for (const f of Object.values(P.type)) void doc.fonts?.load(f.css);
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
    setTheme,
    element: root,
    _debugCandles: debugCandles,
    _debugChart: (startDay: number, n: number) => {
      restart(startDay);
      while (candles.length < n) spawnNext();
      return debugCandles();
    },
  };
}
