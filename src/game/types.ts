// The game's public contract: mount options, the handle it returns, and the
// events it posts to the host (PRD sections 7 and 10).

export type DeathCause = "red" | "gap" | "fall" | "wall" | "bear";
export type Phase = "intro" | "play" | "over" | "exit";
export type Pose = "run" | "jump" | "crash" | "idle";

export type CandleRunnerEvent =
  "ready" | "start" | "first-jump" | "game-over" | "new-best" | "copied" | "dismissed" | "size";

export type EventData = Record<string, unknown>;

/** Messages the host may post to the game (the frame's window, or the page's for an inline mount). */
export type HostMessage = "cr:dismiss" | "cr:done" | "cr:results";

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
}

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
  feetY: number;
  next: NextHazard | null;
  cause: DeathCause | null;
  dodged: number;
  jumps: number;
  runs: number;
  W: number;
  H: number;
}

export interface CandleRunnerHandle {
  /** Fades the game out; resolves after the exit animation. */
  dismiss: () => Promise<void>;
  /** Stops the loop and removes the game's DOM. */
  destroy: () => void;
  restart: () => void;
  element: HTMLElement;
  _debugCandles: () => Pick<Candle, "x" | "o" | "c" | "h" | "l" | "kind" | "gapAfter" | "bear" | "id">[];
}

declare global {
  interface Window {
    /** Written every frame; the verification suite reads it. */
    __crDebug?: DebugState;
    /** The mounted game, on the one-file build and on /play. */
    candleRunner?: Pick<CandleRunnerHandle, "dismiss" | "restart" | "_debugCandles">;
    /** The one-file build's API: mount it yourself with ?nomount. */
    CandleRunner?: {
      mount: (host: HTMLElement, opts?: Omit<MountOptions, "classes">) => CandleRunnerHandle;
      constants: Readonly<Record<string, number>>;
    };
  }
}
