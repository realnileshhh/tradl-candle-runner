# game rules

The game's behaviour is the PRD's (`docs/prd/candle-runner.md`). Read the section before changing anything it covers:

| PRD section | covers | code |
|---|---|---|
| 3 | principles and non goals: one input, the chart is the level, every death the player's fault, minimal animation, no sound | everywhere |
| 5 | the frame: position, sizes, top bar, score strip, panel, tokens | `view.ts`, `candle-runner.module.css`, `tokens.css` |
| 6 | rules, physics, terrain, hazards, fairness, pacing, copy | `constants.ts`, `engine.ts`, `market.ts`, `copy.ts`, `art.ts` |
| 7 | the results handoff (not built yet) | `engine.ts`, the review page |
| 8 | non functional: one file, font, frame cost, errors, hidden tab, reduced motion, storage, sandbox, keys, accessibility, theming, width | `engine.ts`, `scripts/build-embed.mjs` |
| 10 | events | `types.ts`, `emit()` in `engine.ts` |
| 12 | verification | `tests/e2e/` |

## the engine

- `src/game/` is framework-free TypeScript. `mount(host, options)` builds the DOM, starts the loop and returns the handle (`dismiss`, `destroy`, `restart`). React and the one-file build both call it; neither reimplements anything.
- **Physics lives in `constants.ts` only.** The spawner derives every fairness rule from it (runway from the jump range, gap width from the jump range, the rising cap under the step height). Change a constant, and the suite tells you whether the game is still fair.
- **Motion is scaled by real frame time** (one frame is 1/60 s; a frame longer than 32 ms counts as 32). Never move anything by a per-frame amount.
- **Words live in `copy.ts`**, numbers that are product calls (timer thresholds, rotation interval) next to them. Copy changes are product calls: mirror them in the PRD when the user says so.
- **Colours, type and canvas radii come from the palette**, read from `--cr-*` tokens at mount and on every change of mode. Never cache a palette value across frames. No colour literal in the engine, the art or the view.
- **Characters are drawn on canvas** (`art.ts`) as vector outlines filled with palette colours: no images, no sprite sheet. The outlines are the bull and the bear the user locked in the Candle Runner Figma file: `characters/figma/` holds the drawings as Figma exports them, and `npm run characters:sync` writes `src/game/characters.ts` (generated, never edited). A new pose is a new drawing exported into `characters/figma/` and named in its `manifest.json`. The classic characters are kept in `characters/classic/`.
- **The chart is NIFTY 50**, a day a candle (`market.ts`, from `data/nifty-daily.csv` through `npm run market:sync`). The spawner follows NIFTY's level only as far as the fairness rules allow; a new rule there changes how closely it follows, and `terrain.spec.ts` measures that.
- `window.__crDebug` is written every frame and `_debugCandles()` is on the handle: the suite depends on both. Keep their shape, extend it when a check needs more.
- Keep the engine's cost under the PRD's budget: 2 ms of script per frame (it measures about 0.17 ms). No allocation-heavy work in `step()` or `drawScene()`.

## the host contract

- The game never decides when a result exists and never closes itself (PRD section 3). The host posts messages; the game posts events.
- Messages in: `cr:dismiss`, `cr:done`, `cr:results` (today all three fade the game out; section 7 changes `cr:results` to show the banner, and adds `cr:failed`).
- Modes: the game follows the page's `data-theme` (an observer on its ancestors re-reads the palette). A host forces one with the `theme` option or prop, `handle.setTheme()`, the message `{ type: "cr:theme", theme }`, or `?theme=` on the one-file build. `__crDebug.theme` reports the mode drawn.
- Events out: `ready`, `start`, `first-jump`, `game-over`, `new-best`, `copied`, `dismissed`, `size`. Inside a frame they go to `window.parent` as `{ source: "candle-runner", event, data }`; inline they go to `onEvent`. Renaming one is a breaking change for the front end: ask first.
- Keys: `keys: "window"` inside a frame or on `/play`, `"canvas"` (the default) inline in a host page, so the prompt box never jumps the bull. Keys are ignored in inputs, text areas, selects and editable elements.

## accessibility and motion

- The canvas is focusable with a descriptive label; game over is announced in a live region; "Skip the game" is the first tab stop.
- Keyboard focus on the canvas shows the ring; a click or a tap focuses it without one (`data-focus="pointer"`, set on pointerdown, cleared on blur).
- `prefers-reduced-motion`: no intro, no bob, no bear breathing, a 220 ms exit. Any new motion gets the same treatment.

## making it harder or easier

The PRD's pacing table (section 6, "Difficulty pacing") names the knobs. The pace goes up in levels (`constants.ts`: five steps of 16.5%, one every 5 s of play, to `SPEED_MAX` 6.0 at 25 s; the user, 2026-10-16), and `gameplay.spec.ts` checks every level. Too hard: raise the runway margin first, then lower `SPEED_MAX`. Too easy: raise `SPEED_MAX` or lower the streak thresholds; keep the top speed at 25 s unless the user says otherwise. Every change goes through the scripted player.
