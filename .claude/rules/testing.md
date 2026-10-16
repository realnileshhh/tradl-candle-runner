# testing rules

`tests/e2e/` is the PRD's verification suite (section 12) in Playwright: the regression gate before any change ships. `npm run verify` (lint, build, suite) is the definition of done for code.

## three targets, one suite

| project | target | runs in |
|---|---|---|
| `app` | `/play`: the engine through `<CandleRunner />` | `npm test`, `npm run verify` |
| `embed` | `/candle-runner-loading.html`: the one-file build | `npm test`, `npm run verify` |
| `reference` | `reference/candle-runner-loading.html`: the original | `npm run test:reference` |

The reference run proves the checks themselves: a check that fails on the original is a wrong check (or a wrong PRD figure), not a port bug. Run it whenever a check is added or changed. Tests that only make sense for the ports skip the reference with a reason.

## what is checked

- **The scripted player** (`scripted-player.ts`): 45 s on each input (Space, Up arrow, pointer), and pointer again at phone width (390 px, the narrow canvas), with zero deaths. It runs inside the page every frame, reads `window.__crDebug.next` and jumps from the physics window, never seeing further than a player does. With it, a spawn audit: the largest green step stays under the rising cap (1.55 units), at least three candles between hazards, at least three hazard kinds met. Every run prints its numbers.
- No input: death on the coached red between 4.0 and 5.5 s, at desktop and at phone width (ports only: the original has no hazards on the narrow canvas). The card then waits: no restart on its own (ports only). Tap on the card: restart at once. One press, one jump, for each input. Typing in a text field: no jump. Reduced motion: no intro. `cr:dismiss`: the exit. Phone width: no horizontal scroll, the narrow canvas. Frame cost under 2 ms of script. Every `--cr-*` token resolves.
- The chart (`terrain.spec.ts`, ports only): every candle the next NIFTY day from a random start, the tops following NIFTY's level within the caps (bounds measured over 55,000 candles), a seamless loop, the tag on NIFTY's scale.
- The review page (`app` only): Report ready, inline and in the iframe; Leave conversation; New run.
- Every test fails on any script error or console error (the `pageErrors` fixture). Google Fonts are stubbed, so the suite runs offline and the same every time.

## writing checks

- Check behaviour first, then change code: a new rule from the PRD gets its check before its implementation.
- Read state from `window.__crDebug` and the handle, not from pixels. Extend `__crDebug` when a check needs more.
- No fixed waits where a condition exists: `waitForPhase`, `waitForFunction` with `polling: "raf"`, `expect.poll`.
- A random outcome is never asserted as certain. Assert the rule (zero deaths, the cap, the spacing), and give chance-bound observations a bound with its odds written next to it.
- `CR_PLAY_SECONDS=15 npm test` shortens the scripted player while iterating; the gate is always 45 s.
- The suite runs on three workers. A failure under load names its cause (the scripted player logs the cause, time, speed and frame length of every death); read it before calling it flaky.

## visual checks

The suite doesn't judge looks. After a visual change, screenshot the review page at 1280 and 390 px wide, inline and in the iframe, and show the user.
