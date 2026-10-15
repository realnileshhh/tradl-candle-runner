// The canvas palette, read from the game's CSS tokens (src/game/tokens.css) at
// mount, so the host can theme it and the design system can feed it. No colour
// is written here: a token that is missing is a bug `npm run lint` catches.

export type RGB = readonly [number, number, number];

export function hexToRgb(value: string): RGB {
  let h = value.trim();
  if (h[0] === "#") {
    if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  const m = h.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255];
}

export function rgba(rgb: RGB, a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

export interface Palette {
  grid: RGB;
  fg: string;
  fg2: string;
  fg3: string;
  fg4: string;
  green: string;
  greenEdge: string;
  greenRGB: RGB;
  red: string;
  redEdge: string;
  redRGB: RGB;
  neutral: string;
  neutralEdge: string;
  neutralRGB: RGB;
  gold: string;
  mint: string;
  chipInk: string;
  bull: string;
  bullShade: string;
  ink: string;
  horn: string;
  eye: string;
  bear: string;
  bearLight: string;
  bearInk: string;
  hatchRGB: RGB;
  brandInkRGB: RGB;
  shadowRGB: RGB;
  bgRGB: RGB;
  font: string;
}

export function readPalette(el: Element, win: Window): Palette {
  const cs = win.getComputedStyle(el);
  const tok = (name: `--cr-${string}`) => cs.getPropertyValue(name).trim();
  return {
    grid: hexToRgb(tok("--cr-grid")),
    fg: tok("--cr-fg"),
    fg2: tok("--cr-fg-2"),
    fg3: tok("--cr-fg-3"),
    fg4: tok("--cr-fg-4"),
    green: tok("--cr-green"),
    greenEdge: tok("--cr-green-edge"),
    greenRGB: hexToRgb(tok("--cr-green")),
    red: tok("--cr-red"),
    redEdge: tok("--cr-red-edge"),
    redRGB: hexToRgb(tok("--cr-red")),
    neutral: tok("--cr-neutral"),
    neutralEdge: tok("--cr-neutral-edge"),
    neutralRGB: hexToRgb(tok("--cr-neutral")),
    gold: tok("--cr-gold"),
    mint: tok("--cr-mint"),
    chipInk: tok("--cr-chip-ink"),
    bull: tok("--cr-bull"),
    bullShade: tok("--cr-bull-shade"),
    ink: tok("--cr-bull-ink"),
    horn: tok("--cr-horn"),
    eye: tok("--cr-eye"),
    bear: tok("--cr-bear"),
    bearLight: tok("--cr-bear-light"),
    bearInk: tok("--cr-bear-ink"),
    hatchRGB: hexToRgb(tok("--cr-hatch")),
    brandInkRGB: hexToRgb(tok("--cr-brand-ink")),
    shadowRGB: hexToRgb(tok("--cr-shadow")),
    bgRGB: hexToRgb(tok("--cr-bg")),
    font: tok("--cr-font"),
  };
}
