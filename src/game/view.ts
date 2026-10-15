// The game's DOM around the canvas: the top bar (witty line, timer), the score
// strip and the panel. Built once at mount from the CSS Module's class names, so
// the React component and the one-file build render the same markup.

import { COPY } from "./copy";
import type { CandleRunnerClasses } from "./types";

export interface View {
  root: HTMLElement;
  skip: HTMLAnchorElement;
  wit: HTMLElement;
  witText: HTMLElement;
  timer: HTMLElement;
  clock: HTMLElement;
  timerWit: HTMLElement;
  hi: HTMLElement;
  score: HTMLElement;
  note: HTMLElement;
  canvas: HTMLCanvasElement;
  live: HTMLElement;
}

// The rupee note in the score strip: an illustration, coloured by tokens.
const noteSvg = (c: CandleRunnerClasses) =>
  `<svg viewBox="0 0 30 18" aria-hidden="true">` +
  `<rect class="${c.noteBody}" x="1" y="1.5" width="28" height="15" rx="2.5" stroke-width="1.2"/>` +
  `<rect class="${c.noteFrame}" x="4" y="4.5" width="22" height="9" rx="1" fill="none" stroke-width=".8" opacity=".6"/>` +
  `<circle class="${c.noteCoin}" cx="15" cy="9" r="4" stroke-width=".9"/>` +
  `<text class="${c.noteText}" x="15" y="12" text-anchor="middle" font-size="7.5" font-weight="700">&#8377;</text></svg>`;

// Harmonisation backlog: drawn by hand; the design system has icon-clock (49:12).
const CLOCK_SVG =
  '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6.5" r="4.6" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
  '<path d="M6 4v2.6l1.8 1.1M4.4 1.2h3.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

export function createView(host: HTMLElement, c: CandleRunnerClasses, showTimer: boolean): View {
  host.innerHTML =
    `<div class="${c.root}" tabindex="-1">` +
    `<a class="${c.skip}" href="#">${COPY.skip}</a>` +
    `<div class="${c.top}">` +
    `<span class="${c.wit}"><span data-cr="wit-text"></span><span class="${c.sig}">${COPY.signature}</span></span>` +
    `<span class="${c.timer}"${showTimer ? "" : " hidden"}>${CLOCK_SVG}<b data-cr="clock">0:00</b><span class="${c.timerWit}"></span></span>` +
    `</div>` +
    `<div class="${c.hud}">` +
    `<span data-cr="hi">${COPY.hi}<b>00000</b></span>` +
    `<span class="${c.score}"><span class="${c.note}" aria-hidden="true">${noteSvg(c)}</span><span data-cr="score">${COPY.score}<b>00000</b></span></span>` +
    `</div>` +
    `<div class="${c.panel}">` +
    `<canvas class="${c.canvas}" tabindex="0" role="img" aria-label="${COPY.canvasLabel}"></canvas>` +
    `<div class="${c.live}" aria-live="polite"></div>` +
    `</div>` +
    `</div>`;

  const root = host.firstElementChild as HTMLElement;
  const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector(selector) as T;
  return {
    root,
    skip: q<HTMLAnchorElement>(`.${c.skip}`),
    wit: q(`.${c.wit}`),
    witText: q('[data-cr="wit-text"]'),
    timer: q(`.${c.timer}`),
    clock: q('[data-cr="clock"]'),
    timerWit: q(`.${c.timerWit}`),
    hi: q('[data-cr="hi"] b'),
    score: q('[data-cr="score"] b'),
    note: q(`.${c.note}`),
    canvas: q<HTMLCanvasElement>(`.${c.canvas}`),
    live: q(`.${c.live}`),
  };
}
