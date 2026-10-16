# design system rules

The Tradl Design System (Figma file `ZRYpUf3iulUMH0Rbdb68hk`) is the source of truth for colour, type, radius, spacing, icons and logos. It is **read only**: this repo reads it and never writes to it. It is still changing, so it is read at the start of every session (CLAUDE.md > Session start).

## reading it

- The only code that runs against the file is `scripts/figma/read-design-system.js`, through `use_figma`, passed exactly as the file holds it with only `const PART = ...` changed. The guard hook compares the code with the file and blocks anything else, as well as every Figma write tool on that file.
- Parts: `fingerprint` (a hash per part), `meta`, `variables-n`, `icons-n`, and `svg:<node id>` to export one node (an icon, a logo) as SVG markup.
- Every list is sorted before it is hashed and split (code-unit order of each row's JSON), so moving things around in Figma changes no hash. Only an addition, a removal, a rename or a new value sends you to read parts.
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
- **Alpha:** some tokens carry alpha as 8-digit hex (`#FFFFFF1A`). CSS reads them as they are, and so does the canvas: `parseColour` in `palette.ts` keeps the alpha, and `rgba(colour, k)` multiplies it.
- `npm run lint` fails on an undefined `--ds-*` or `--cr-*` token, on a colour typed by hand, and on type or spacing off the system in `src/app` and `src/components`.

## the game's tokens: --cr-*

The game has its own tokens in `src/game/tokens.css`: its theming API (the PRD lets the host override them) and the one place its colours live. The canvas reads them at mount through `palette.ts`; the DOM through the CSS Module.

- **Every `--cr-*` colour points at a design system token** (`--cr-red: var(--ds-accent-negative);`), declared on `:root` and on every `[data-theme]` so a subtree in Light resolves Light's values. `docs/harmonisation.md` records each mapping and its source. Keep the `--cr-*` names: they are the public API.
- **Type on the canvas and in the DOM** comes from `--cr-type-*` tokens (a design system text style each, with `-tracking`); the canvas reads them through `palette.ts`.
- A new colour in the game is a new `--cr-*` token whose value is a `--ds-*` token. Never a hex in code.
- The bull and the bear take their locked character sheets' semantic tokens (`docs/harmonisation.md`), so they follow the mode. The rupee note's illustration colours have no semantic home in the design system; their mapping onto primitives is a call for the user.

## icons

The design system's icons first, Tabler second, never drawn (the user, 2026-10-16: "these are the icons from the design system tool; anything beyond this, take from Tabler").

1. Find it: `design-system/snapshot/icons-*.json` lists every icon on the Icons page with its node id.
2. Export it: the reader with `PART = "svg:<node id>"`. Save the returned `svg` exactly to `design-system/icons/<icon name>.svg`.
3. `npm run ds:sync`: `src/design-system/icons.ts` carries it with its colours turned to `currentColor` and its size left to CSS.
4. Use it: `<Icon name="icon-clock" />` in React (size with `--icon-size`, colour with `color`), or `dsIcons["icon-clock"]` as markup in the engine.

Only when no design system icon fits: `@tabler/icons-react` (pinned) in React; for the engine, copy the one SVG from `@tabler/icons` into the code with its source named, and keep it `currentColor`. Note every Tabler icon in `docs/decisions.md` so the design system can adopt it.

## logos

The marks live on the design system's Logos page (`345:1965`); the trad/. wordmark is node `361:2588`; the bare logo mark is `1415:24` (white "t", for dark) and `1507:7279` (black "t", for light). A logo is exported like an icon (`svg:<node id>`), saved as returned to `design-system/logos/<name>.svg`, and `npm run ds:sync` writes `src/design-system/logos.ts` (`dsLogos`): each logo's paths with their own fills, since a logo is the brand's artwork, not a themable icon. Never redraw a logo or set it in type.

- The canvas draws `dsLogos["logomark-dark"]` with `Path2D` (`drawBrand()` in `engine.ts`). The "t", the one part that differs between the two variants, takes `--cr-brand-ink` from the palette at draw time, so it follows the mode; the "/." keep the logo's green.
- The "tl/." signature in the top bar is still set in type: waiting on the user.

## what the design system doesn't have

Say so, name the nearest existing token and the difference, and let the user decide: they change Figma, or accept the nearest. Record the call in `docs/decisions.md`.
