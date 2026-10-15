// Physics is the single source of truth for fairness (PRD section 6, "Physics and
// motion"). The spawner derives every fairness rule from these numbers, so feel and
// fairness cannot drift apart. One frame is 1/60 s; motion is scaled by real frame time.

export const CANDLE_W = 22; // candle body width, px
export const SLOT = 38; // distance between candle centres, px
export const PPU = 21; // pixels per price unit

export const JUMP_V = -10.2; // jump velocity, px per frame, upward
export const GRAV = 0.46; // gravity, px per frame squared
export const AIR_FRAMES = (2 * -JUMP_V) / GRAV; // 44.3 frames in the air
export const APEX = (JUMP_V * JUMP_V) / (2 * GRAV); // 113 px

export const SPEED0 = 2.8; // start speed, px per frame
export const SPEED_MAX = 7.0; // top speed
export const ACCEL = 0.0014; // speed gain per frame: the cap is reached in about 50 s

export const BUFFER_MS = 150; // an early press is honoured on landing
export const COYOTE_MS = 100; // a late press is honoured after leaving an edge
export const LOOKAHEAD = 6; // candles fully inked ahead of the bull

export const BOX_L = -16; // bull hit box, left of its centre x
export const BOX_R = 24; // bull hit box, right of its centre x
export const BOX_H = 30; // bull hit box, above its feet

export const STEP_MAX_PX = 36; // tallest green step the bull walks up
export const RESTART_MS = 2600;
export const MAX_RISE_U = 1.55; // rising cap between consecutive green tops, price units
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
} as const;
