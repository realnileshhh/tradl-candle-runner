// Physics is the single source of truth for fairness (PRD section 6, "Physics and
// motion"). The spawner derives every fairness rule from these numbers, so feel and
// fairness cannot drift apart. One frame is 1/60 s; motion is scaled by real frame time.

export const CANDLE_W = 28; // candle body width, px: like a stock chart at this zoom (the user, 2026-10-16)
export const SLOT = 38; // distance between candle centres, px
export const PPU = 21; // pixels per price unit
// The smallest green body, so a quiet NIFTY day still reads as a candle (the user,
// 2026-10-16). Only the body's bottom moves: its top, where the bull runs, does not.
export const GREEN_BODY_MIN_U = 0.6;

export const JUMP_V = -10.2; // jump velocity, px per frame, upward
export const GRAV = 0.46; // gravity, px per frame squared
export const AIR_FRAMES = (2 * -JUMP_V) / GRAV; // 44.3 frames in the air
export const APEX = (JUMP_V * JUMP_V) / (2 * GRAV); // 113 px

export const SPEED0 = 2.8; // start speed, px per frame
export const SPEED_MAX = 6.0; // top speed, reached at the last level

// The pace steps up a level every LEVEL_S seconds of play, LEVELS times, so the top
// speed comes at 25 s (the user, 2026-10-16). Each level is 16.5% faster than the one
// before, so every step feels the same and the early ones are the gentlest; the top
// is 6.0, not the 7.0 the old curve neared at 50 s, so the hardest pace stays fair to a
// person (at 6.0 a hazard entering the phone canvas is 0.74 s away). A step eases in
// over LEVEL_EASE_S, so the bull never lurches in mid-jump.
export const LEVELS = 5;
export const LEVEL_S = 5;
export const LEVEL_EASE_S = 0.5;
/** A level's pace, px per frame: SPEED0 at level 0, SPEED_MAX at level LEVELS. */
export const levelSpeed = (level: number) => SPEED0 * Math.pow(SPEED_MAX / SPEED0, Math.min(Math.max(level, 0), LEVELS) / LEVELS);
/** The level reached after t seconds of play. */
export const levelAt = (t: number) => Math.min(LEVELS, Math.floor(t / LEVEL_S));
/** The speed after t seconds of play: the level's pace, eased in from the level before. */
export function speedAt(t: number) {
  const level = levelAt(t);
  if (level === 0) return SPEED0;
  const k = Math.min(1, (t - level * LEVEL_S) / LEVEL_EASE_S);
  return levelSpeed(level - 1) + (levelSpeed(level) - levelSpeed(level - 1)) * k * k * (3 - 2 * k);
}

export const BUFFER_MS = 150; // an early press is honoured on landing
export const COYOTE_MS = 100; // a late press is honoured after leaving an edge
export const LOOKAHEAD = 6; // candles fully inked ahead of the bull

export const BOX_L = -16; // bull hit box, left of its centre x
export const BOX_R = 24; // bull hit box, right of its centre x
export const BOX_H = 30; // bull hit box, above its feet

export const STEP_MAX_PX = 36; // tallest green step the bull walks up
export const MAX_RISE_U = 1.55; // rising cap between consecutive green tops, price units
// The cap on a step down: the steepest step of the PRD's down mood (open 1.7 below the
// last close, body 0.3). A staircase this steep is still landed on at top speed: a bull
// running off it falls 0.23 t^2, meets the stairs within (1.4 * PPU / SLOT)^2 * SPEED_MAX^2
// / (GRAV / 2) = 94 px, inside the 146 px below its feet on the smallest canvas.
export const DROP_MAX_U = 1.4;
// A fall stops at the room below the bull on the smallest canvas (its feet sit at 60%
// of the height: 0.4 * 230 px, --cr-canvas-h at 600 px wide and below), then the chart
// holds level for PAUSE_CANDLES: the camera follows only a grounded bull, and three
// level candles let it catch up most of the way at top speed.
export const MIN_CANVAS_H = 230;
export const LEG_DROP_U = (0.4 * MIN_CANVAS_H) / PPU; // 4.4 units
export const PAUSE_CANDLES = 3;
export const RUNWAY_STEP_U = 0.35; // a runway after a hazard drifts at most this a candle, as the generated one did
export const FLAT_STEP_U = 0.15; // a candle held level for a flat approach: three stay within 0.35 of each other

// The chart runs on NIFTY 50's daily candles (src/game/market.ts). One price unit is
// this percent of the price: a typical day moves the chart half a unit, and the caps
// above hold 88% of days as they were (the rest catch up over the next candles).
export const MARKET_PCT = 0.8;
export const WALL_MIN_SPEED = 3.0;
export const DOUBLE_MIN_SPEED = 3.6;
export const TRIPLE_MIN_SPEED = 4.6;
export const FIRST_HAZARD_SLOTS = 20; // about five seconds of running at start speed

export const BULL_X = 142; // the bull's centre x
export const BULL_X_NARROW = 92; // below NARROW_W, so more chart is visible ahead
export const NARROW_W = 520;

export const constants = {
  CANDLE_W,
  SLOT,
  PPU,
  JUMP_V,
  GRAV,
  APEX,
  AIR_FRAMES,
  SPEED0,
  SPEED_MAX,
  LEVELS,
  LEVEL_S,
} as const;
