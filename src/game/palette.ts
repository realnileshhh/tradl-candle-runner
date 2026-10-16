// The canvas palette, read from the game's CSS tokens (src/game/tokens.css) at
// mount and again whenever the mode changes, so the host can theme it and the
// design system feeds it. No colour, size or font is written here: a token that
// is missing is a bug `npm run lint` and the suite catch.

/** A colour with its alpha, 0 to 255 per channel and 0 to 1 for alpha. */
export type RGBA = readonly [number, number, number, number];

const CLEAR: RGBA = [0, 0, 0, 0];

/**
 * Reads a token's colour. The design system writes hex with or without alpha
 * (#E5484D, #FFFFFF1A); a host override may write rgb() or rgba().
 */
export function parseColour(value: string): RGBA {
  const v = value.trim();
  if (v[0] === "#") {
    let h = v.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return CLEAR;
    const byte = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [byte(0), byte(2), byte(4), h.length === 8 ? byte(6) / 255 : 1];
  }
  const m = v.match(/[\d.]+%?/g);
  if (!m || m.length < 3) return CLEAR;
  const alpha = m[3] === undefined ? 1 : m[3].endsWith("%") ? parseFloat(m[3]) / 100 : +m[3];
  return [+m[0], +m[1], +m[2], alpha];
}

/** The colour as canvas paint, its own alpha multiplied by k. */
export function rgba(c: RGBA, k = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.round(c[3] * k * 1000) / 1000})`;
}

/** A design system text style as the canvas sets it. */
export interface Font {
  /** The `font` shorthand, as the token holds it. */
  css: string;
  /** The same at 80%, for the game over card on a short canvas. */
  small: string;
  /** The text style's letter spacing, as a CSS length. */
  tracking: string;
}

function readFont(shorthand: string, tracking: string): Font {
  const scaled = (k: number) =>
    shorthand.replace(/(\d+(?:\.\d+)?)px(?:\/(\d+(?:\.\d+)?)px)?/, (_, size: string, lh?: string) =>
      lh ? `${Math.round(+size * k)}px/${Math.round(+lh * k)}px` : `${Math.round(+size * k)}px`,
    );
  const t = tracking.trim();
  return { css: shorthand, small: scaled(0.8), tracking: !t || t === "0" ? "0px" : t };
}

export interface Palette {
  /* the chart */
  up: RGBA;
  upEdge: RGBA;
  down: RGBA;
  downEdge: RGBA;
  grid: RGBA;
  axis: RGBA;
  tag: RGBA;
  tagInk: RGBA;
  /* type colours */
  fg: RGBA;
  fg2: RGBA;
  fg3: RGBA;
  fg4: RGBA;
  /* accents and surfaces */
  gold: RGBA;
  chipInk: RGBA;
  mint: RGBA;
  overlay: RGBA;
  buttonFrom: RGBA;
  buttonTo: RGBA;
  buttonInk: RGBA;
  buttonIcon: RGBA;
  buttonLine: RGBA;
  key: RGBA;
  keyLine: RGBA;
  keyEdge: RGBA;
  brandInk: RGBA;
  brandAccent: RGBA;
  /* the characters: illustration colours, always drawn solid */
  bull: string;
  bullShade: string;
  horn: string;
  bear: string;
  bearShade: string;
  bearClaw: string;
  bearInk: string;
  /* type, from the design system's text styles */
  type: {
    axis: Font;
    hint: Font;
    chip: Font;
    overTitle: Font;
    overScore: Font;
    overScoreCompact: Font;
    figure: Font;
    overLine: Font;
    button: Font;
  };
  /* radius, px */
  radius: {
    chip: number;
    button: number;
    key: number;
  };
}

export function readPalette(el: Element, win: Window): Palette {
  const cs = win.getComputedStyle(el);
  const tok = (name: `--cr-${string}`) => cs.getPropertyValue(name).trim();
  const col = (name: `--cr-${string}`) => parseColour(tok(name));
  const solid = (name: `--cr-${string}`) => rgba(col(name));
  const font = (name: `--cr-${string}`) => readFont(tok(name), tok(`${name}-tracking`));
  const px = (name: `--cr-${string}`) => parseFloat(tok(name)) || 0;
  return {
    up: col("--cr-green"),
    upEdge: col("--cr-green-edge"),
    down: col("--cr-red"),
    downEdge: col("--cr-red-edge"),
    grid: col("--cr-grid"),
    axis: col("--cr-axis"),
    tag: col("--cr-tag"),
    tagInk: col("--cr-tag-ink"),
    fg: col("--cr-fg"),
    fg2: col("--cr-fg-2"),
    fg3: col("--cr-fg-3"),
    fg4: col("--cr-fg-4"),
    gold: col("--cr-gold"),
    chipInk: col("--cr-chip-ink"),
    mint: col("--cr-mint"),
    overlay: col("--cr-overlay"),
    buttonFrom: col("--cr-button-from"),
    buttonTo: col("--cr-button-to"),
    buttonInk: col("--cr-button-ink"),
    buttonIcon: col("--cr-button-icon"),
    buttonLine: col("--cr-button-line"),
    key: col("--cr-key"),
    keyLine: col("--cr-key-line"),
    keyEdge: col("--cr-key-edge"),
    brandInk: col("--cr-brand-ink"),
    brandAccent: col("--cr-brand-accent"),
    bull: solid("--cr-bull"),
    bullShade: solid("--cr-bull-shade"),
    horn: solid("--cr-horn"),
    bear: solid("--cr-bear"),
    bearShade: solid("--cr-bear-shade"),
    bearClaw: solid("--cr-bear-claw"),
    bearInk: solid("--cr-bear-ink"),
    type: {
      axis: font("--cr-type-axis"),
      hint: font("--cr-type-hint"),
      chip: font("--cr-type-chip"),
      overTitle: font("--cr-type-over-title"),
      overScore: font("--cr-type-over-score"),
      overScoreCompact: font("--cr-type-over-score-compact"),
      figure: font("--cr-type-figure"),
      overLine: font("--cr-type-over-line"),
      button: font("--cr-type-button"),
    },
    radius: {
      chip: px("--cr-radius-chip"),
      button: px("--cr-radius-button"),
      key: px("--cr-radius-key"),
    },
  };
}
