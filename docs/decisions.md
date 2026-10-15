# decisions

Every call, newest last, with who made it. "The user" is the product owner; "Claude" marks an implementation call the user can overturn.

## 2026-10-16: the repo is set up

- **Name and home:** `tradl-candle-runner` on the Desktop, next to the other Tradl labs, private on GitHub as `realnileshhh/tradl-candle-runner`. (The user, from Claude's recommendation.)
- **What it delivers:** the `<CandleRunner />` React component, a Next.js review page that recreates the backtest wait screen with the host's controls, and the one-file `candle-runner-loading.html` the PRD promises (section 8), all from one engine. (The user, from Claude's recommendation.)
- **Styling:** CSS Modules on the design system's tokens as CSS variables; no Tailwind. (The user, from Claude's recommendation.)
- **The verification suite rebuilt in Playwright**, since the PRD's `verify.py` is not on this Mac. (The user, from Claude's recommendation.)
- **The design system is read only and read every session.** (The user: "we will never write anything in the design system. It is read only.") Done with a SessionStart hook that prints the read steps, a fingerprint read (one `use_figma` call when nothing changed), and a PreToolUse guard that blocks every Figma write on the file and lets `use_figma` run only the vetted reader. The reader loads the Icons page with `loadAsync()` instead of switching to it, so it changes nothing in the file. (Claude.)
- **Icons:** the design system's first; Tabler (`@tabler/icons-react` 3.49.0) only for what it lacks; never drawn. (The user: "These are the icons from the design system tool. If you need anything beyond this, then you will be taking from here.") Design system icons are exported as SVG through the reader into `design-system/icons/` and generated into `src/design-system/icons.ts` with `currentColor`. (Claude.) First two: `icon-circle-check` (163:73) and `icon-clock` (49:12).
- **Tabler icons in use:** `IconLoader2`, the review page's spinner (the design system has no spinner).
- **Token names in CSS:** semantics as `--ds-<path>`, Radius, Padding and Gap as `--ds-<name>`, primitives as `--ds-primitive-<path>`, text styles as `--ds-type-<name>` (a `font` shorthand) with `-tracking`. A segment that repeats the start of the next is dropped (`color/green/green-400` reads `color-green-400`). Dark is the default mode. (Claude.)
- **Inter:** self-hosted by next/font in the app (no request to Google), from Google Fonts in the one-file build as the PRD specifies. `--ds-font-inter` reads `var(--font-inter, "Inter")` so both work. (Claude.)
- **The port is faithful first:** the engine is the 13 October build in TypeScript with its behaviour unchanged, split into constants, copy, palette, art, view and engine. The colours that were written into the script (the rupee note, the eye white, the chip ink, the hatching, the shadow, the canvas mark) became `--cr-*` tokens with the same values, so every colour lives in `src/game/tokens.css`. Harmonising the look comes next, on the user's instructions. (Claude, from the user: "set up the whole repo as of now, then I will start giving you instructions.")
- **Small fixes in the port:** `destroy()` also removes the window resize listener (used only where ResizeObserver is missing), and the canvas waits for the page's own Inter (next/font's family name) instead of the literal "Inter". No change to play. (Claude.)
- **The one-file build** is bundled by esbuild into one HTML file of 29.3 KB (the original was 48 KB), keeping only the design system tokens it uses. It is written to `public/candle-runner-loading.html`, the path the PRD gives the front end, and git-ignored as a build output. (Claude.)
- **The review page mounts the iframe with `sandbox="allow-scripts"`**, as the PRD says the product may. (Claude.)
- **Versions, pinned exactly:** Next 16.4.1, React 19.3.1 (the patch released with Next 16.4.1), TypeScript 5.9.3, ESLint 9.39.5, Playwright 1.63.0, esbuild 0.28.2, Prettier 3.9.9. ESLint 10 waits on `eslint-plugin-react` (it allows up to 9); TypeScript 6.1 and later wait on `typescript-eslint`. `npm audit` reports a `braces` advisory in ESLint's file matching: a development tool only, not shipped. (Claude.)

## 2026-10-16: the design system on the first read

The repo's snapshot started from the UGC lab's (read 2026-10-15). The first fingerprint found three parts changed, read again:
- added primitive `color/Neutral/grey-150` (#E5EAE6);
- `Interaction/selected`, light mode: `Alpha/black-16` became `Neutral/grey-150`;
- added icons `icon-copy` (1625:1462) and `icon-profile` (1632:1490).

## 2026-10-16: what the baseline taught the suite

- **The no-input death comes earlier than the PRD says.** PRD section 12 expects the bull to die on the coached red at 4.5 to 5.5 s. The original itself dies at 4.08 s in some runs: the first red may sit at slot 22 (x 902), and 727 px of travel from 2.8 px a frame, gaining 0.0014 a frame, takes 244.7 frames, 4.08 s. The check uses 4.0 to 5.5 s. **For the user:** correct the PRD's figure (and "about 5 seconds" in section 6, rule 6), or move the first hazard later if 4.5 s is the intent. (Claude.)
- **"All four hazards met" is chance, not a rule.** The PRD saw red, gap, wall and bear in each 45 s run. Over 18 runs the suite saw about 6.4 gaps and 5.7 walls a run, so a run without one happens (a gap-free run is about 1 in 600). The check asks for at least three kinds. (Claude.)
- **The scripted player reads frame time:** under load one animation frame can carry two frames of motion, and a fixed gap-edge window can be skipped. It widens with the frame. Each death is logged with its cause, time, speed and frame length. (Claude.)

## open

- The harmonisation proposals (`docs/harmonisation.md`): every row waits on the user.
- PRD section 7, the results handoff: to build, suite first.
- The PRD's no-input figure (above).
