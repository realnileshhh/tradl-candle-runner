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

## 2026-10-16: the design system check ignores order

- **Moving things in Figma is not a change.** The session's first read found `variables-1` and `variables-2` changed, and the reads that followed kept changing: someone was reordering variables in Figma. Nothing had been added, removed, renamed or given a new value. The user: "if the tokens should be added or changed or something, then only we will go deep into the overall thing. Not just because the rows are moved, or maybe a component was moved here and there."
- **How:** the reader sorts every list (variables, icons, pages, collections, text styles) by the code-unit order of each row's JSON before hashing and splitting. The snapshot was re-sorted once from the committed one with the reader's own `sorted` and `chunk`, and a fresh fingerprint matched all four parts, which proves the morning's changes were order only. `tokens.css` was regenerated: the same 408 names and values, in the new order. (Claude.)
- **When the fingerprint moves between reads**, the file is being edited: say so, work from the snapshot, check again later (CLAUDE.md). (Claude.)

## 2026-10-16: no automatic restart

- **The game over card waits for the player.** The 2.6 s automatic restart is gone, and so is the countdown on the pill: it reads "Again". A tap, a click, Space or Up arrow restarts, as before, once 250 ms have passed. (The user: "it should not start automatically. Again has a timer, let's remove that.") This overrides PRD section 6, rules 7 and 8 (design rules). A player who never touches the game now sees the card from the first death on, not a restart every 2.6 s (section 4, flow 2).
- **"now" dropped from the hint line:** "tap to restart · press C to copy your score". With no countdown, "now" no longer has a later to contrast with. (Claude.)
- **The suite:** the no-input check stops at the death; a new check, ports only, waits 4 s on the card and expects no restart. The original still restarts on its own, so the reference skips it. (Claude.)
- **For the user:** the PRD's text still has the 2.6 s restart in sections 4, 6 (rules, physics, screen copy), 7 (the card's restart "suspended"), 11, 12 and 13. Update it when you say so.
- **Approved** by the user after the screenshots at 1280 and 390, inline and in the iframe.

## 2026-10-16: hazards on the narrow canvas

- **The bug:** below 520 px wide (phones) no hazard ever spawned. The first hazard waited for a candle at least 20 slots ahead of the bull, measured in screen x, and new candles appear just past the right edge: x 1117 on a 1003 px canvas, but x 502 on a 388 px one, never the 852 needed. Every later hazard waits on the first, so the chart stayed green for good. The original of 13 October has the same bug. (Found by Claude while taking the 390 px screenshots; fix asked by the user.)
- **The fix:** the first hazard is measured along the run (`x + distance`), so a phone meets it when a desktop does. Desktop play is unchanged: its first fill already reaches that far before the run moves. (Claude.)
- **The suite:** a no-input check at 390 px (death on the coached red at 4.0 to 5.5 s) and a fourth scripted player run, pointer at 390 px, since the narrow canvas shows less chart ahead and its fairness had never been tried. Both skip the reference, which still has the bug. (Claude.)
- **The scripted player uses coyote time.** The first full run at phone width lost one life in the one-file build: a gap at 43.1 s, normal frames. The record of the last frames showed a small step down onto the last candle before the gap edge, which left the bull airborne for the whole 3-frame window in which the player jumps gaps, and the player only pressed when grounded. A person pressing there jumps, because the game honours a press for 100 ms after the bull leaves a ledge. So the game was fair and the player had a blind spot, at any width. `__crDebug.canJump` now says whether a press would jump (grounded or within coyote time) and the player presses on it; the original has no `canJump`, so there it still reads `grounded`. (Claude.)

## 2026-10-16: the logo mark on the canvas

- **The canvas's corner mark is the design system's logo mark**, not "tl/." set in type. (The user: "t/. is just a text, let's use actual tradl logo mark from the design system.") Exported through the reader from the Logos page: `logomark-dark` (1415:24, white "t") and `logomark-light` (1507:7279, "t" #010101), both with "/" and "." in #00AF79, saved as returned in `design-system/logos/`. `npm run ds:sync` now writes `src/design-system/logos.ts`: each logo's paths with their own fills. (The user.)
- **How it is drawn:** with `Path2D` from those paths, 12 px tall, where the type sat. The two variants share their paths and differ only in the "t", so the "t" takes the mode's brand ink (`--cr-brand-ink`, which the theme work points at the design system's primary text colour: white on dark, black on light) and the "/." keep the logo's own green. The faint watermark opacities stay: the "t" at 38%, the green at 60%. (Claude.)
- **Not changed:** the "tl/." signature after the line in the top bar is still type. Waiting on the user.

## 2026-10-16: no focus ring on a click

- **A click or a tap focuses the canvas without the green ring; Tab still shows it.** (The user: "there should be no highlight green border if i click inside or outside the box.") The ring was already `:focus-visible` only, but the pointer handler focuses the canvas from script, and Chrome counts that as keyboard focus, so every click lit it and a click outside put it out. The engine now marks the canvas `data-focus="pointer"` on pointerdown and clears it on blur; the CSS draws the ring only without the mark. Keyboard players keep a visible focus (WCAG 2.4.7). The original rings on a click too, so the reference skips the new check. (Claude.)

## 2026-10-16: no shadow under the bull

- **The bull's ground shadow is gone, in light and in dark.** (The user: "remove the shadow beneath from the bull", "both in light and dark".) The ellipse under its feet, drawn in `drawScene`, is removed; the shading on its body stays, since it is part of the drawing (`art.ts`). `--cr-shadow` had no other use, so it leaves the theming API with the theme work's files. (Claude.)

## 2026-10-16: every gap is a fall

- **A bull that goes over a gap's edge without jumping falls in, at any speed.** (The user: "at every pit, the bull should fall. That's the concept.") At speed 6 and up (a score of 1,000 or more) the bull used to run across narrow gaps with a jitter: the airborne step-up landing (`STEP_MAX_PX`, 36 px, there so a jump can land on a higher candle) lifted it out, since at 6.5 px a frame it drops only about 6 px over a 36 px gap. The same rule also landed it from above when the far side sat lower. Now the engine marks the bull `inPit` when it is over a gap without having jumped, and an `inPit` bull lands nowhere: it falls and dies by "gap". A jump still saves it, including the 100 ms late press after the edge (coyote time), and a jump that comes up short keeps the generous landing. (Claude.)
- **The suite:** a check that plays to speed 6, then walks into the first gap and expects the fall. On the old build it ran across 3 times in 6. The original does the same, so the reference skips it. (Claude.)

## 2026-10-16: bigger candles and a tall red in place of the wall (in Figma, waiting on approval)

- **The grey doji wall becomes a tall red candle**: the same box (0.1 units below the feet to 1.8 to 2.4 above) and the same rules (from speed 3, never while the market climbs), solid red with its wicks. Its kind stays `"wall"` inside the engine and its death cause stays `"wall"` in the `game-over` event, so the host contract does not change. (The user, from Claude's recommendation.)
- **Candles 28 px wide instead of 22** in the 38 px slot (`CANDLE_W`), and **green bodies at least 0.6 units** (13 px) tall; bigger NIFTY days keep their own body. Reds keep their height. (The user, from Claude's recommendation.)
- **Figma first** (the user's rule): drawn in the Candle Runner file, page "Candles", frame "Candles: today and proposed" (44:3), dark and light, at 2x. The Tradl Design System is not a library in that file, so the mock uses the tokens' resolved colours and names the token on each layer. Code waits on the user's approval of the frame. (The user.)
- **The NIFTY chart's movement stays with the session that built it** (tradl-candle-runner-1b); this session does the wall and the candle size only. (The user, from Claude's recommendation.)

## 2026-10-16: the whole game on the design system, in both modes

The user: "let's harmonise the full UI end-to-end with the current design system", "go through the full design system, type scale, typography, and the product as well", a button to switch between light and dark "so that we can do it across both the designs", and for the candles, the product's chart frame (8164:2356): "let's try to harmonise the chart of the game like this only". Three read-only agents read the product file (`dIJRmOBY8ETf9z6eciXwlS`): its type, its screens and surfaces, and the candlestick chart in both modes. `docs/harmonisation.md` has every mapping; the calls:

- **Every game colour is a design system token, per mode.** `--cr-*` keeps its names (the theming API) and points at `--ds-*`, declared on `:root` and every `[data-theme]` so a subtree in Light resolves Light's values. Characters on primitives, the same in both modes (option 2 of the old proposal). (Claude, from the user's instruction.)
- **The chart follows the product's:** solid candles, wick in the body colour, no outline, square corners, no gridlines, a price axis column at the right (520 px and wider) in `Caption` and `Text/secondary`, and a last-price tag at the bull's price. The wick stays 2 px (PRD section 6). The doji wall takes `Chart colors/Grey`, since the product's chart has no neutral candle. (Claude.)
- **Type from the design system's text styles**, picked to set each role the way the product sets the same kind of text: sentence case, no tracked capitals, so "Hi", "Score", "Game over", "New best" (copy changed in `copy.ts`; the PRD's text waits on the user). (Claude.)
- **The palette keeps alpha** (`#FFFFFF1A`), reads type and radius from tokens, and is read again on every change of mode. (Claude.)
- **Theme contract, additive:** the game follows the page's `data-theme`; `MountOptions.theme`, the `theme` prop, `handle.setTheme()`, the message `{ type: "cr:theme", theme }` and `?theme=` on the one-file build force a mode; `__crDebug.theme` reports it. No existing message or event changed. (Claude.)
- **The review page's Dark and Light switch** uses Tabler's `IconMoon` and `IconSun`: the design system has no sun or moon icon. The mode is applied before paint by an inline script (Next's own guide, "Preventing flash"), from `?theme=` or the last choice. (Claude.)
- **Icons:** the design system's `icon-arrow--point-up` (44:171) exported and drawn in the jump flag from its path; `icon-clock` replaces the hand-drawn timer clock. (Claude, from the harmonisation list.)
- **The design system's font token carries the system stack** after Inter (`scripts/design-system.mjs`), so a blocked font never turns the game's text serif. (Claude.)
- **Waiting on the user:** the screenshots in both modes, and the eight calls under "for the user" in `docs/harmonisation.md`.

## 2026-10-16: the chart moves as a market does

The user: "I want the charts to be more realistic, a bit more up and down", "At the start, it is going either from the up or from the down, so it should maintain that", and "Game physics for now will remain the same". (The example path the user mentioned didn't come through with the message.)

- **Why it looked flat:** after every hazard the PRD lays a flat runway of 5 to 10 candles, and hazards come at 50 to 80% per eligible candle, so trend candles only showed in the few slots between. (Claude.)
- **A market direction:** every run opens going up or down, at even odds, and keeps that direction for 24 to 44 candles before the market turns. Within a trend the price moves in legs: 3 to 6 candles the trend's way (the PRD's up and down moods, their geometry unchanged), then a pause (chop, 2 to 3 candles) or a shallow pullback (1 or 2 candles, 0.1 to 0.4 units each), then the next leg. A pullback is smaller than the smallest leg, so a trend never undoes itself. (Claude, from the user's request.)
- **Runways drift with the trend**, 0.1 to 0.35 units a candle, instead of lying flat: a step is at most about 0.75 units with the jitter, half the 1.55 rising cap, so the landing stays safe. Hazards still wait for a flat approach, and every other fairness rule is unchanged. Physics is untouched. (Claude.)
- **Falls on long drops:** the camera follows only while the bull is grounded, and a fall out ends the run 54 px below the canvas. The pause after every leg lands the bull, so the longest uninterrupted drop is one leg, as before. Ten scripted runs at phone width (five per target) had zero deaths. (Claude, after the other session flagged the risk.)
- **The suite:** `tests/e2e/terrain.spec.ts` lays 40 fresh charts and checks each opens with three candles stepping one way and holds that way over its first 22 candles (at least 3 units; the worst of a million simulated openings moved 6.4), and that both directions occur. The original opens flat, so the reference skips it. The no-input death on the coached red now comes at 4.5 to 4.7 s, inside 4.0 to 5.5. (Claude.)
- **For the user:** the PRD's text still has the old moods (section 6, "Candles and terrain", rules 3 and 10) and the flat runway (fairness rule 1). Update it when you say so.
- **Seen, not changed:** in a steep down leg the chart can run off the bottom of the canvas ahead of the bull, since the camera keeps the bull's feet at 60% of the height. A camera that looks a few candles ahead would keep the trend in view; it is a change to the camera rule (PRD section 6, physics rule 14), so it waits on the user.

## 2026-10-16: a new bull, from character sheets

The user: the bull in the game "doesn't look like a bull, honestly, from afar"; the new one should be the stock market bull, minimal, 2D vector, on the design system and not on the game palette.

- **Sheets generated on Higgsfield**, GPT Image 2.5 Sunburst at max quality and 4K (3840 x 2160), through the Higgsfield MCP server, connected at user scope. (The user asked for each sheet; the prompts are Claude's.)
  - v1, the minimal market bull.
  - v2, cute: it read as a calf (grey patches like cow spots, a round body with no hump). (Claude.)
  - v3, cute from research (baby schema, Duolingo's shape rules, bull versus cow cues): the blush still read as a cow. (The user.)
  - v4, cute on v1's market-bull anatomy, with v1 and v3 passed in as reference images: no blush, forelock, spots or grey muzzle. (Claude, from the user's note.)
- **Colours proposed, waiting on the user:** the body `Text/primary`, the far legs `Text/tertiary`, the horns and the tail tuft `Accent/secondary`, the cuts `Background/primary`. The bull flips with the mode the way the logomark's "t" does. Character colours are the user's call (`.claude/rules/design-system.md`).
- **The Figma file:** "Tradl · Candle Runner · Characters" in the drafts of Tradl AI's team (the user chose the team), https://www.figma.com/design/IY2vpfEtVluENs9q2dXdVy. Pages: Cover, Workspace, Final assets (the user). In the Workspace, one section per sheet, `bull-sheet-v1` to `bull-sheet-v4-cute`, each with the generated `reference`. v1 also has `vector`: every drawing traced into named vector parts, with the panels, type, guides and candles rebuilt as layers, every fill bound to the design system library's variables, and the light tile and swatches in the library's Light mode. (Claude.)

- **v4 traced too** (the user: "lets do the vector for v4"): `bull-sheet-v4-cute` now has its `vector` frame next to the `reference`, built the same way as v1's. It has 33 drawings in 172 named vector parts, 63 text layers and no images, and every fill is bound to a library variable. (Claude.)

- **The bull is locked: v1** (the user, pointing at `bull-sheet-v1` / `vector`, node 3:6: "I'm locking in this bull"). Its colours stand as proposed.
- **The Figma file is for the whole game**, renamed "Candle Runner" by the user. The cover now reads "The game in Tradl's backtest chat". (The user.)
- **How work moves from here:** every UI change is made in the Figma file first, then in the game, and only on the user's instruction. (The user: "Whatever changes we will make to the website UI-wise, first we will do it in Figma, and then we will do it in the main game... When I tell you what you need to do, then you will do it.")
- **The bear comes next, the same way:** research, a character sheet PNG on Higgsfield, the user's lock, then vectors. No vectors without the user's approval. (The user.)

## 2026-10-16: the bear is locked and traced; a new cover

- **The bear is locked: `bear-sheet-v1`** (the user: "you have done a fabulous job on the bear"). It was generated on Higgsfield with the locked bull as its style reference. Its colours sit on the bull's token system, one step down: the body `Text/secondary`, the far limbs `Text/tertiary`, the claws and the stub tail `Accent/negative`, the cuts `Background/primary`. (The user, on Claude's proposal.)
- **The bear in Figma:** the Workspace section `bear-sheet-v1` holds the `reference` and the `vector`, built like the bull's: 32 drawings in named parts, every fill bound to a library variable, the light tile and swatches in the library's Light mode. On the light tile the eyes are cut-outs showing the tile, as the token system says, where the generated image drew them black. (The user asked for it; the build is Claude's.)
- **The cover** (the user: "design it with minimum column grids... according to the design language of our product... Don't add a lot of text"): six columns, 96 margins and 32 gutters. Columns 1 and 2 hold the logomark at the top and "Candle Runner" at the bottom. Columns 3 to 6 hold the game panel, drawn like the product's chart card (`Background/surface`, `Border/default`, radius 20), with the traced bull and bear facing each other across a rising run of candles. The page ground is the product's background gradient, bound to `Gradient/background-primary`. The plugin API can't set the file thumbnail, so it is set by hand: right-click the `cover` frame, Set as thumbnail. (Claude, on the user's brief.)

- **The bear's face, rebuilt on the two colour tiles** (the user, on the light tile: "the nose is not defined, and it is taking up the background"). The face had been traced as holes. The nose hole sat on the snout's tip, so in light mode the snout opened onto the background, and the eye and brow holes ran together. Now the snout's tip is closed in the body colour, and the eye (a circle), the brow (a bar) and the nose (inside the tip) are shapes above the head in `Background/primary`. So the face reads in either mode on any ground. (Claude, from the user's note.) Undone at the user's request: see the next entry.

## 2026-10-16: the bear vector matches its PNG

The user: discard the face rebuild and keep the bear sheet's vector like the PNG, "each pixel colour should be the same as the character sheet... the rasterized character sheet and the vector sheet should look exactly the same, no mistakes at all."

- **The face rebuild is gone.** All 32 drawings are traced again from the PNG. On the dark panels the eyes, brows, noses and cut lines are cut-outs, as the PNG draws them in the panel colour. On the light tile they are black shapes, as the PNG draws them. Colour edges sit at the midpoint between their two colours. (The user's request; the method is Claude's.)
- **Everything else is measured off the PNG:**
  - panel and tile edges, the table, and the swatches, with the PNG's white borders;
  - the height bar and the dimension mark;
  - the solid baselines, as rectangles of `Chart colors/Grey-2`, 1.2 to 1.6 px;
  - each of the 191 guide dashes, each its own rectangle, since the PNG's dashes are uneven;
  - the candles in panel 10, with 10 px wicks as drawn.

  The text is live Inter: Black for the title, Bold for the subtitle and panel titles, Medium for the captions. Each size is fitted to the ink height, and the letter spacing is set gap by gap so each letter sits where the PNG has it. (Claude.)
- **Two bugs fixed on the way:**
  - A line layer renders 1 px above where it is placed, so solid lines are now rectangles.
  - The traced vectors came in from SVG with scale constraints, so resizing a panel moved them by up to 2 px. Their constraints are now left and top. (Claude.)
- **Colours on the nearest token where the PNG strays from the system.** Primitives are used only where no semantic token carries the grey. (Claude.)

  | Part | PNG colour | Token |
  |---|---|---|
  | Far limbs, main panels | about #7A | `grey-600` |
  | Far limbs, dark tile and tiny bear | about #81 | `Text/tertiary` |
  | Construction drawing: eye, inner ear, claw area | #2D to #48 | `grey-750` |
  | Panel 10 bull: middle far leg | #6E | `grey-650` |
  | Panel 10 bull: other two far legs | #8E and #95 | `Text/tertiary` |
  | Guides and baselines | | `Chart colors/Grey-2` |
- **The result:** the vector export, compared pixel by pixel with the PNG, differs by more than 24 levels on 0.04% of the sheet. It was 0.46% after the first re-trace. Every drawing aligns with the PNG at 0, 0 to a quarter pixel. What remains:
  - **Letter shapes:** the PNG's lettering is GPT's, not Inter, so edges differ although positions match.
  - **The Construction tail:** the PNG paints it a shaded #CE3235. It stays `Accent/negative`, 24 levels off.
  - **The candles' soft dark rims:** GPT's rendering, not drawn.

## 2026-10-16: the bull and the bear from Figma, in the game

The user locked both designs, the bull (`bull-sheet-v1` / `vector`, node 3:6) and the bear (`bear-sheet-v1` / `vector`, node 17:4): "integrate it. Replace it with the current bull and bear... make sure that we make the copy of the current bull and bear... in this repo only so that we can get back to them whenever we want to."

- **The classic characters are kept** in `characters/classic/`:
  - `art.ts` as it was;
  - its tokens and palette entries;
  - a render of every pose in both modes;
  - a README on how to bring them back.

  The folder is left out of TypeScript and ESLint, so it stays as it was. (The user asked; the place is Claude's.)
- **The drawings the game uses**, exported from Figma as SVG into `characters/figma/`, with `manifest.json` (node ids, boxes, where the feet stand):
  - the bull's run cycle (6), jump (takeoff, apex, land), idle (ready) and crash (stumble, down);
  - the bear's four breaths.

  (Claude.)
- **From Figma to the canvas:** `npm run characters:sync` (`scripts/characters.mjs`) writes `src/game/characters.ts`, generated, never edited.
  - Each drawing stands on its panel's ground, the bull centred on its hit box, the bear's feet on the middle of its candle.
  - The sheets draw the bull at a different size in each panel, so every panel is matched to the run cycle by the area of the body.
  - Outlines are redrawn as polygons within 0.1 px of the vector at game size, and encoded at about two characters a point, so the art adds about 10 KB to the one-file build. `art.ts` decodes them once into `Path2D`.
  - Still no images: every character is vector paths filled with palette colours. (Claude.)
- **How they move:**
  - The bull gallops through the six run drawings, one every 10 px of running. In the air it springs, tops out and reaches down, by its vertical speed. It stands ready in the intro. On a crash it stumbles, then lies down.
  - The bear breathes through its four drawings, as the classic bear breathed. Reduced motion holds it still on the first, and keeps the gallop's hooves on the ground.
  - A faded character (pencilled bears ahead, the intro) is drawn whole first and then faded, so the legs behind never show through the body. (Claude.)
- **Size and hit boxes:** the hit boxes are unchanged (PRD section 6, rule 13; `constants.ts`).
  - The bull runs about as tall as the classic one, its hit box inside its body.
  - The bear is as tall as the bull, as its sheet asks. Its raised paw reaches about 12 px past its hit box toward the bull, so touching the claws' tips is forgiven. (Claude.)
- **Colours** are the sheets' semantic tokens (`docs/harmonisation.md`), so the characters follow the mode. On Light the bear swaps its two greys and keeps its eyes, brow and nose dark, as its light tile draws them. Its thin cut lines that open onto the outline show the chart, as the bull's do. Removed tokens: `--cr-bull-ink`, `--cr-eye`, `--cr-bear-light`, `--cr-bear-ink` (the classic outline, eyes and muzzle; `--cr-bear-ink` now names the bear's dark features). New: `--cr-bear-shade`, `--cr-bear-claw`. (Claude.)
- **For the user:** the PRD still describes the classic look: section 5's token table (`--cr-bull` #efe7d6, `--cr-bear` #8a5a3b) and section 6's "brown bear ... breathing". Update its text when you say so.

## 2026-10-16: the chart runs on NIFTY 50

The user: "use these data as candles throughout, so that the game becomes an endless loop... ignore volume data". The data is NIFTY 50's daily candles from 8 July 2024 to 16 October 2026, 566 days.

- **The user's calls**, on Claude's recommendations:
  - NIFTY's path under the game's rules: every candle is a day, but red candles stay the hazards, so a falling day is drawn as the game draws a falling market, a green step down.
  - Each run starts on a random day and goes forward, from the last day back to the first.
  - The axis and the tag read NIFTY's level.

  This overturns the PRD's non goal "Real market data. Candles are generated." (section 3).
- **The data:** `data/nifty-daily.csv`, the source without its volume column. `npm run market:sync` (`scripts/market.mjs`) writes `src/game/nifty-data.ts`: every price to the index's 0.05 tick, about 7 KB. `src/game/market.ts` reads it back. (Claude.)
- **How a day becomes a candle** (`engine.ts`, the spawner): one price unit is 0.8% of the price (`MARKET_PCT`). A typical day then moves the chart half a unit, and 88% of days fit the caps as they were. The candle is green, and its close follows NIFTY's level as far as the fairness rules allow:
  - a step of at most the rising cap up (1.55 units);
  - a step of at most 1.4 down (`DROP_MAX_U`), the steepest step of the PRD's down mood. By the jump physics, a bull running off such a staircase at top speed meets it again within 127 px, inside the 146 px below its feet on the smallest canvas;
  - a pause after six steps down in a row (`LEG_MAX`, the PRD's longest leg);
  - a runway after a hazard that drifts at most 0.35 units a candle (`RUNWAY_STEP_U`), as the generated runway did;
  - a flat approach held within 0.15 a candle (`FLAT_STEP_U`).

  A move held back is caught up by the next free candles. Bodies and wicks are the day's own, clamped for legibility (body 0.2 to 2.5 units, wicks 0.1 to 1.5). Hazards keep the PRD's geometry and weights, and each takes a day; a gap takes none, and the day after it sits at the same price. The wall's "never in an up mood" now reads "never while NIFTY is climbing away from the bull". The loop's first day moves from its own open, so the 5% gap between the last day and the first never reaches the chart. (Claude.)
- **A first try, undone:** runways that drifted 0.75 a candle and steps down of 1.55 tracked NIFTY more closely, but the scripted player died twice in the 45 s gate. It fell off a long descent, and it was still in the air at a wall after one. The values above are the validated ones. (Claude.)
- **How closely it follows:** measured over 189 charts (55,000 candles), the chart sits 0.65 units (0.5%) from NIFTY's level at the median. It is 6.5 units (5%) at the 99th percentile and 11.4 (9%) at worst, in NIFTY's sharpest weeks (March 2026, April 2025), where the caps and the runways hold it back for a few candles. Fairness wins over fidelity there, by the PRD's principle 5. (Claude.)
- **The axis:** labels on round NIFTY prices about every 4 units, two decimals, grouped as the product writes rupees ("24,500.00"). The tag shows the bull's price on that scale. Unit 100 is the run's first close, and after the loop the levels carry on from where the chart is. (Claude.)
- **The suite:** `tests/e2e/terrain.spec.ts` replaces the opening-trend check, which described the generated market. It now checks four things:
  - every candle is the next NIFTY day, from varied starts;
  - the tops follow NIFTY within the caps and within bounds set from the measurement above;
  - the loop is seamless;
  - the tag reads the day's close.

  The handle has `_debugChart(startDay, n)`, and `__crDebug` has `price` and `day`. The reference skips these checks: the original generates its candles. (Claude.)
- **For the user:** the PRD's text still describes generated candles (section 3, non goal 1; section 6, "Candles and terrain", rules 3 to 6 and 10). With the new characters and the data, the one-file build is about 60 KB against section 8's 48 KB (43 KB before these two changes). Update the PRD's text and the budget when you say so.

## 2026-10-16: the pace goes up in levels

The user: "We will have incremental speed every 5 seconds, and we will have around 5 levels. Make sure that the game is not too difficult for the users, but also make sure that in 25 seconds we will achieve the maximum speed, whatever you think is best according to the game physics."

- **Five levels, a step every 5 s of play** (`constants.ts`: `LEVELS`, `LEVEL_S`, `levelSpeed()`, `speedAt()`).
  - The start pace holds for the first 5 s, through the coached first red.
  - The pace then steps up at 5, 10, 15, 20 and 25 s: 2.8, 3.26, 3.79, 4.42, 5.15 and 6.0 px a frame. Each level is 16.5% faster than the one before, so every step feels the same and the early ones are the gentlest.
  - A step eases in over half a second (`LEVEL_EASE_S`), so the bull never lurches in mid-jump. (Claude, on the user's brief.)
- **The top speed is 6.0, down from 7.0**, so the game is not too difficult. The old curve was at 4.9 at 25 s and only neared 7.0 at about 50 s; reaching 7.0 at 25 s would have made the second half of every run far harder. At 6.0, a hazard entering the phone canvas is 0.74 s away (0.63 s at 7.0); on the desktop canvas it is over 2 s away. (Claude.)
- **The clock** is play time counted in frame time, as every motion is, so a slow or hidden tab doesn't skip a level. `__crDebug` has `clock` and `level`. (Claude.)
- **Fairness:** a runway after a hazard is sized for the next level's pace. The bull may level up before it gets there, and a faster jump lands further on. The thresholds stay as they were: walls from 3.0 (level 1), streaks of 2 from 3.6 (level 2) and of 3 from 4.6 (level 4). The hazard chance still grows with the pace, 50% to 80%, so it reaches 80% at 25 s. The steepest step down stays within the room below the bull at the new top speed (94 px of the 146). (Claude.)
- **The suite:** a new check plays 27 s and reads the pace every frame: the level at each second, each level's pace between its eases, the top speed from 25.5 s, and a pace that never drops. The 45 s scripted player now expects the top speed. The reference skips the new check, since the original speeds up a little every frame. (Claude.)
- **For the user:** the PRD's text still has the old curve (section 6, "Physics and motion": `SPEED_MAX = 7.0`, `ACCEL = 0.0014`; "Difficulty pacing": "2.8 to 7.0 over about 50 seconds"). Update it when you say so.

## open

- The PRD's text for the new characters, NIFTY's candles, the one-file size and the pace levels (the entries above): waiting on the user.
- The harmonised look (`docs/harmonisation.md`, "for the user"): applied, waiting on the user's approval.
- PRD section 7, the results handoff: to build, suite first.
- The PRD's no-input figure (above).
