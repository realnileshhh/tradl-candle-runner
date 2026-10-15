# tradl candle runner

@AGENTS.md

Candle Runner is the game in Tradl's backtest chat while a run computes: a bull runs along a candlestick chart and the user jumps the red candles until the report lands. This repo builds it in React and Next.js, on the Tradl Design System, and hands the product's front end two things: a `<CandleRunner />` component and the one-file `candle-runner-loading.html` the PRD promises.

Three sources of truth, never mixed up:

| what | source | in this repo |
|---|---|---|
| **Behaviour**: rules, physics, fairness, copy, events, the host contract | the PRD | `docs/prd/candle-runner.md` |
| **Look**: colour, type, radius, spacing, icons, logos | the Tradl Design System, Figma file `ZRYpUf3iulUMH0Rbdb68hk`, **read only** | `design-system/` (snapshot), `src/design-system/` (generated) |
| **The baseline**: the game as it shipped and was verified on 13 October 2026 | the original file | `reference/candle-runner-loading.html` (never edited) |

## Session start: read the design system

The design system is still changing, so it is read from Figma at the start of every session, before any other work. A SessionStart hook (`.claude/settings.json`) prints this reminder.

1. Run `scripts/figma/read-design-system.js` through the Figma MCP `use_figma` tool on file `ZRYpUf3iulUMH0Rbdb68hk`, with `PART = "fingerprint"`. The script must be passed exactly as it is in the file, with only the `PART` line changed.
2. `npm run ds:check -- '<the result>'` compares it with `design-system/snapshot/`.
3. If it names parts: read each one (`PART` = its name), save it to `design-system/snapshot/<part>.json` exactly as returned, delete the parts it names, then `npm run ds:sync` and `npm run lint`. Run `ds:check` again until it says unchanged. Then tell the user what changed (which tokens, which icons) and what in the game it touches.

If Figma can't be reached, say so and work from the snapshot.

**The design system is read only. Nothing in this repo ever writes to it.** A PreToolUse hook (`scripts/guard-design-system.mjs`) blocks any Figma call on that file except the read tools (`get_screenshot`, `get_metadata`, `get_design_context`, `get_variable_defs`) and `use_figma` running the vetted reader. Do not work around the guard. When the design system lacks something (a colour, a type size, an icon), it is the user's call in Figma: say what is missing and propose the nearest existing token. Never add a token, in Figma or in code.

## What the repo delivers

| deliverable | what | where |
|---|---|---|
| `<CandleRunner />` | the game for a React host: props for timer, key scope, storage key, events; a ref with `dismiss()` | `src/components/candle-runner/` |
| the one-file build | `candle-runner-loading.html`: one file, no dependencies, only the Inter font requested, works with `sandbox="allow-scripts"` (PRD section 8) | `npm run build:embed` writes `public/candle-runner-loading.html` (git-ignored) |
| the review page | `/`: the backtest chat's wait screen with the game below the step line, mounted inline or in the iframe, and the host's controls (Report ready, Leave conversation, New run) with the event log | `src/components/wait-screen/` |
| `/play` | the game alone, as the one-file build shows it: the suite's target for the component | `src/app/play/` |
| the verification suite | PRD section 12 as Playwright tests, run against the component, the one-file build and the original | `tests/e2e/` |

Both the component and the one-file build call the same framework-free engine (`src/game/`) with the same CSS Module, so they cannot drift apart.

## Where things live

```
CLAUDE.md                        this file; .claude/rules/ holds the detail
AGENTS.md                        Next.js's own agent note (written by `next dev`): read node_modules/next/dist/docs/
.claude/settings.json            hooks: read the design system at session start; guard it from writes
.claude/rules/                   design-system, game, code, testing: the craft, read before working in that area
docs/prd/candle-runner.md        the PRD (the user's document, kept as it came)
docs/decisions.md                every call, dated, with who made it
docs/harmonisation.md            the game's look against the design system: proposals waiting on the user
docs/research/chrome-dino.md     how the Chrome dino game works, compared with Candle Runner
reference/                       the original game file, untouched: the baseline
design-system/snapshot/          the design system read from Figma: meta, variables-n, icons-n (exactly as returned)
design-system/icons/             design system icons exported from Figma as SVG, as Figma gave them
scripts/
  figma/read-design-system.js    the only code that runs against the design system (read only)
  design-system.mjs              ds:status · ds:check · ds:sync · the session-start text
  guard-design-system.mjs        the PreToolUse guard
  build-embed.mjs                the one-file build
  lint-design.mjs                the design lint (part of `npm run lint`)
src/
  design-system/                 GENERATED by `npm run ds:sync`, never edited: tokens.css, tokens.ts, icons.ts
  game/                          the engine, framework-free
    constants.ts                 physics: the single source of truth for fairness
    copy.ts                      every word the game shows
    engine.ts                    mount(): state, spawner, step, drawing, input, lifecycle
    art.ts · view.ts             the bull and the bear on canvas · the DOM around the canvas
    palette.ts                   the canvas palette, read from the game's tokens
    tokens.css                   the game's tokens (--cr-*): its theming API, harmonised onto --ds-*
    candle-runner.module.css     the game's DOM styles
    types.ts · index.ts          the contract (options, handle, events) · the public surface
  components/                    candle-runner (the React wrapper), wait-screen (the review page), icon
  app/                           layout, globals.css, / (review), /play
  embed/                         the one-file build's entry, page styles and HTML template
tests/e2e/                       the suite: fixtures, the scripted player, gameplay and review specs
```

## Commands

| command | what it does |
|---|---|
| `npm run dev` | the one-file build, then Next on http://localhost:3000: `/` is the review page, `/play` the game alone |
| `npm run verify` | lint, build, the suite on the component and the one-file build. **The definition of done for code** |
| `npm run lint` | route types, ESLint, TypeScript, then the design lint: undefined tokens, colours by hand, type and spacing off the system, em dashes. It also prints the harmonisation backlog |
| `npm run build` | the one-file build and the Next production build |
| `npm test` | the suite against `/play` and the one-file build (needs `npm run build` first). `CR_PLAY_SECONDS=15 npm test` for a quicker scripted player while iterating |
| `npm run test:reference` | the suite against the original file: run it whenever a check changes, to prove the check against the baseline |
| `npm run build:embed` | `public/candle-runner-loading.html` alone, with its size |
| `npm run ds:status` · `ds:check -- '<json>'` · `ds:sync` | the snapshot's hashes · compare with Figma's fingerprint · regenerate `src/design-system/` |
| `npm run format` | Prettier over the repo |

## How a change is made

1. **Find its source.** Behaviour: the PRD section. Look: the design system and `docs/harmonisation.md`. If the PRD and the request disagree, ask.
2. **Check first when behaviour changes.** Extend the suite before the code (the PRD's rule for section 7), run it against the original if the check is about existing behaviour, and only then change the engine.
3. **Make the change** following `.claude/rules/`. Physics changes go in `constants.ts`; words in `copy.ts`; colours in `tokens.css` as design system tokens.
4. **Verify:** `npm run verify`. Then look at it on the review page at desktop and phone width (screenshots), in both mounts.
5. **Show the user** and get approval. Record the call in `docs/decisions.md`, and update the PRD's text only when the user asks.

## Hard rules

1. **The design system is read only.** Read it at session start; never write to it; never invent a token. A missing token is a question for the user.
2. **Design system tokens only** for colour, type, radius and spacing in the app (`--ds-*`), and through the game's own tokens (`--cr-*`) in the game. No colour typed by hand anywhere in `src/` outside the two token files. `npm run lint` enforces it.
3. **Icons: the design system's first, Tabler second, never drawn.** A design system icon is exported through the reader into `design-system/icons/` and used through `<Icon name>` or `dsIcons` (`.claude/rules/design-system.md`). Only when the design system has none that fits, use Tabler (`@tabler/icons-react`, pinned; the user's rule, 2026-10-16).
4. **Fairness comes from physics.** Every spawner rule is derived from `constants.ts`; nothing is tuned by hand. The scripted player must survive 45 s with zero deaths on every input.
5. **The game never decides when a result exists and never closes itself.** The host tells it (PRD sections 3 and 7).
6. **The one-file build stays one file**: no runtime dependency, no request but the Inter font, `sandbox="allow-scripts"` works, no script errors.
7. **The original stays untouched** in `reference/`. It is the baseline the suite proves itself against.
8. **Read Next.js's bundled docs** (`node_modules/next/dist/docs/`) before writing Next code: this is Next 16 with Cache Components on, which differs from older Next.
9. **Names:** files and folders lowercase kebab-case (`CLAUDE.md`, `AGENTS.md` and `README.md` are the exceptions); CSS Module classes camelCase; React components PascalCase.
10. **No em dashes** anywhere: in copy, code, comments, docs and replies. The design lint fails on them.
11. **Ask with a recommendation** when a call is the user's: three or four questions at a time, the recommended option first. Record each call in `docs/decisions.md`.
12. **Done means two things:** `npm run verify` passes, and the user has approved what they saw.
13. **Commit only when the user asks.** The repo is private on GitHub: `realnileshhh/tradl-candle-runner`. Dependencies are pinned to exact versions.

## Open work

- **Harmonise the look with the design system** (`docs/harmonisation.md`): 36 of the game's 38 colour tokens and its type and spacing still hold their own values. Each proposal waits on the user.
- **PRD section 7, the results handoff** (banner, "See results", two-pill card, `cr:results` no longer closing the game, `cr:failed`): not built. The game today behaves as on 13 October: `cr:results` fades it out.
- **A PRD figure to correct:** with no input the bull can die on the coached red from 4.08 s, not 4.5 s (section 12; `docs/decisions.md`, 2026-10-16).
