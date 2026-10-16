// The game's public contract: mount options, the handle it returns, and the
// events it posts to the host (PRD sections 7 and 10).

export type DeathCause = "red" | "gap" | "fall" | "wall" | "bear";
export type Phase = "intro" | "play" | "over" | "exit";

/** The design system's two modes. The game follows the page unless the host names one. */
export type Theme = "dark" | "light";

export type CandleRunnerEvent =
  "ready" | "start" | "first-jump" | "game-over" | "new-best" | "copied" | "dismissed" | "size";

export type EventData = Record<string, unknown>;

/** Messages the host may post to the game (the frame's window, or the page's for an inline mount). */
export type HostMessage = "cr:dismiss" | "cr:done" | "cr:results" | { type: "cr:theme"; theme: Theme };

/** The class names the game's DOM uses: the keys of candle-runner.module.css. */
export type CandleRunnerClasses = Readonly<
  Record<
    | "root"
    | "exit"
    | "skip"
    | "top"
    | "wit"
    | "show"
    | "sig"
    | "timer"
    | "hot"
    | "timerWit"
    | "hud"
    | "score"
    | "note"
    | "noteBody"
    | "noteFrame"
    | "noteCoin"
    | "noteText"
    | "pulse"
    | "panel"
    | "canvas"
    | "live",
    string
  >
>;

export interface MountOptions {
  /** The CSS Module's class map, so the React app and the one-file build share one stylesheet. */
  classes: CandleRunnerClasses;
  /** Show the waiting timer. The `timer=0` query flag also hides it. */
  timer?: boolean;
  /** Where keys are heard: the whole window (inside an iframe) or the canvas only (inline). */
  keys?: "window" | "canvas";
  /** Local storage key for the high score. */
  storageKey?: string;
  /** The design system mode to draw in. Left out, the game follows the page's own mode. */
  theme?: Theme;
  onEvent?: (name: CandleRunnerEvent, data: EventData) => void;
}

export interface Candle {
  x: number;
  o: number;
  c: number;
  h: number;
  l: number;
  kind: "up" | "red" | "wall";
  gapAfter: number;
  bear: boolean;
  scored: boolean;
  id: number;
  first?: boolean;
  streak?: number;
  bearPhase?: number;
  /** The NIFTY day this candle is (an index into src/game/market.ts's DAYS). */
  day: number;
}

/** A candle as the verification suite reads it. */
export type DebugCandle = Pick<Candle, "x" | "o" | "c" | "h" | "l" | "kind" | "gapAfter" | "bear" | "id" | "day">;

export interface NextHazard {
  kind: "red" | "wall" | "bear" | "gap";
  dist: number;
  x: number;
  width: number;
  topPx: number;
}

/** Written to window.__crDebug every frame: the verification suite reads it. */
export interface DebugState {
  t: number;
  phase: Phase;
  score: number;
  hi: number;
  speed: number;
  grounded: boolean;
  /** A press now would jump: on the ground, or just off an edge (coyote time). Absent in the original. */
  canJump?: boolean;
  feetY: number;
  next: NextHazard | null;
  cause: DeathCause | null;
  dodged: number;
  jumps: number;
  runs: number;
  W: number;
  H: number;
  /** The mode the canvas is drawn in, read from the game's computed color-scheme. */
  theme: Theme;
  /** The price the tag shows: the bull's height on NIFTY's scale. Absent in the original. */
  price?: number;
  /** The NIFTY day of the candle under the bull, when there is one. Absent in the original. */
  day?: number;
  /** Seconds of play on the game's own clock (frame time, as the physics counts it). Absent in the original. */
  clock?: number;
  /** The pace level, 0 at the start to LEVELS at the top speed. Absent in the original. */
  level?: number;
  /** The hazard the jump flag stands over now: each kind is coached once a page. Absent in the original. */
  coach?: { kind: CoachKind; id: number } | null;
  /** On a bear death, the drawing the bear that hit is in (its swat). Absent in the original. */
  bearPose?: string | null;
  /** How far the game over card has faded in, 0 to 1. Absent in the original. */
  card?: number;
}

/** The hazards the jump flag coaches, the first time each appears in a page's session. */
export type CoachKind = "red" | "gap" | "bear";

export interface CandleRunnerHandle {
  /** Fades the game out; resolves after the exit animation. */
  dismiss: () => Promise<void>;
  /** Stops the loop and removes the game's DOM. */
  destroy: () => void;
  restart: () => void;
  /** Draws the game in a mode; no argument goes back to following the page. */
  setTheme: (theme?: Theme) => void;
  element: HTMLElement;
  _debugCandles: () => DebugCandle[];
  /** Restarts on a given NIFTY day and lays the chart out to n candles, beyond the edge, without playing it. */
  _debugChart: (startDay: number, n: number) => DebugCandle[];
}

declare global {
  interface Window {
    /** Written every frame; the verification suite reads it. */
    __crDebug?: DebugState;
    /** The mounted game, on the one-file build and on /play. */
    candleRunner?: Pick<CandleRunnerHandle, "dismiss" | "restart" | "setTheme" | "_debugCandles" | "_debugChart">;
    /** The one-file build's API: mount it yourself with ?nomount. */
    CandleRunner?: {
      mount: (host: HTMLElement, opts?: Omit<MountOptions, "classes">) => CandleRunnerHandle;
      constants: Readonly<Record<string, number>>;
    };
  }
}
