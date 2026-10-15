# design system rules

The Tradl Design System (Figma file `ZRYpUf3iulUMH0Rbdb68hk`) is the source of truth for colour, type, radius, spacing, icons and logos. It is **read only**: this repo reads it and never writes to it. It is still changing, so it is read at the start of every session (CLAUDE.md > Session start).

## reading it

- The only code that runs against the file is `scripts/figma/read-design-system.js`, through `use_figma`, passed exactly as the file holds it with only `const PART = ...` changed. The guard hook compares the code with the file and blocks anything else, as well as every Figma write tool on that file.
- Parts: `fingerprint` (a hash per part), `meta`, `variables-n`, `icons-n`, and `svg:<node id>` to export one node (an icon, a logo) as SVG markup.
- A snapshot part is saved **exactly as returned** to `design-system/snapshot/<part>.json`: the hashes in `ds:check` only match when the JSON is unchanged. Never hand-edit the snapshot.
- Read tools (`get_screenshot`, `get_metadata`, `get_design_context`, `get_variable_defs`) are fine for looking at a component or a page.

## tokens in code

`npm run ds:sync` turns the snapshot into `src/design-system/tokens.css` (CSS custom properties, aliases resolved, each line naming its Figma variable), `tokens.ts` (the names, as the `DsToken` type) and `icons.ts`. All three are generated: never edit them.

How a Figma name becomes a CSS name: lowercase kebab-case, and a segment that only repeats the start of the next one is dropped.

| collection | Figma | CSS |
|---|---|---|
| Semantics | `Text/primary`, `Accent/Tints/Positive/positive-10` | `--ds-text-primary`, `--ds-accent-tints-positive-10` |
| Radius, Padding, Gap | `radius-8`, `padding-12`, `gap-8` | `--ds-radius-8`, `--ds-padding-12`, `--ds-gap-8` |
| Primitives | `color/green/green-400`, `space/3` | `--ds-primitive-color-green-400`, `--ds-primitive-space-3` |
| text styles | `Mobile text styles/Body/MD` | `--ds-type-mobile-text-styles-body-md` (a `font` shorthand) and `...-tracking` |
| font family | Inter | `--ds-font-inter`, fed by next/font's `--font-inter` in the app, "Inter" in the one-file build |

- **Semantic tokens first.** A primitive only where no semantic token carries the meaning, and say why in a comment.
- **Modes:** Semantics has Dark and Light. Dark is the default (`:root`, `[data-theme="dark"]`); `[data-theme="light"]` switches a subtree. The app runs dark (`<html data-theme="dark">`).
- **Type:** `font: var(--ds-type-...)` plus `letter-spacing: var(--ds-type-...-tracking)`. Never a raw font size, weight or line height in `src/app` or `src/components`.
- **Spacing and radius:** `--ds-gap-*`, `--ds-padding-*`, `--ds-radius-*`. A value the scale doesn't have (6 px, 10 px) is rounded to the nearest step, or asked about when the difference shows.
- **Alpha:** some tokens carry alpha as 8-digit hex (`#FFFFFF1A`). CSS reads them as they are. The canvas palette's `hexToRgb` reads the first six digits only, so before a `--cr-*` token points at an alpha token, teach `palette.ts` to keep the alpha.
- `npm run lint` fails on an undefined `--ds-*` or `--cr-*` token, on a colour typed by hand, and on type or spacing off the system in `src/app` and `src/components`.

## the game's tokens: --cr-*

The game has its own tokens in `src/game/tokens.css`: its theming API (the PRD lets the host override them) and the one place its colours live. The canvas reads them at mount through `palette.ts`; the DOM through the CSS Module.

- **Harmonising** the game means pointing a `--cr-*` token at a design system token (`--cr-red: var(--ds-accent-negative);`), one decision at a time, from `docs/harmonisation.md`. Keep the `--cr-*` name: it is the public API.
- A new colour in the game is a new `--cr-*` token whose value is a `--ds-*` token. Never a hex in code.
- Illustration colours (the bull, the bear, the rupee note) have no semantic home in the design system. Their mapping onto primitives is a call for the user.

## icons

The design system's icons first, Tabler second, never drawn (the user, 2026-10-16: "these are the icons from the design system tool; anything beyond this, take from Tabler").

1. Find it: `design-system/snapshot/icons-*.json` lists every icon on the Icons page with its node id.
2. Export it: the reader with `PART = "svg:<node id>"`. Save the returned `svg` exactly to `design-system/icons/<icon name>.svg`.
3. `npm run ds:sync`: `src/design-system/icons.ts` carries it with its colours turned to `currentColor` and its size left to CSS.
4. Use it: `<Icon name="icon-clock" />` in React (size with `--icon-size`, colour with `color`), or `dsIcons["icon-clock"]` as markup in the engine.

Only when no design system icon fits: `@tabler/icons-react` (pinned) in React; for the engine, copy the one SVG from `@tabler/icons` into the code with its source named, and keep it `currentColor`. Note every Tabler icon in `docs/decisions.md` so the design system can adopt it.

## logos

The marks live on the design system's Logos page (`345:1965`); the trad/. wordmark is node `361:2588`. A logo is exported like an icon (`svg:<node id>`) and keeps its own colours (it is the brand's artwork, not a themable icon). Never redraw a logo or set it in type. The game's canvas mark "tl/." is drawn as text today: on the harmonisation list.

## what the design system doesn't have

Say so, name the nearest existing token and the difference, and let the user decide: they change Figma, or accept the nearest. Record the call in `docs/decisions.md`.
