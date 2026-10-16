# harmonisation: the game on the design system

On 16 October 2026 the user asked for the whole game to be harmonised with the Tradl Design System, end to end, in both of its modes, and for the chart to follow the product's own candlestick chart. This page records what was applied and where each choice came from. **It waits on the user's approval** (CLAUDE.md, hard rule 12); the calls that are most visible are listed first, under "for the user".

Every `--cr-*` colour token now points at a `--ds-*` token (`npm run lint`: 0 of 74 hold their own colour), and the game stylesheet has no raw size left. The tokens are declared on `:root` and on every `[data-theme]`, so a page or a subtree switched to Light works the game's colours out again from Light's values. The canvas reads them through `palette.ts` at mount and again whenever the mode changes.

## sources

| what | where in Figma |
|---|---|
| the candlestick chart | product file `dIJRmOBY8ETf9z6eciXwlS`, Stock page: Dark 8164:2356, Light 8500:69476 (in 8150:29266) |
| how the product sets type | the same file, page 6329:7092: the backtest detail 8139:13727, Explore 8034:16475, the community modal 8644:20190 (Dark and Light) |
| surfaces, borders, buttons | the Stock page in both modes (8164:2227, 8150:29266) |
| tokens, text styles, icons, logos | the design system, `ZRYpUf3iulUMH0Rbdb68hk` (read only) |

## for the user

1. **The chart is the product's.** Solid candles in `Accent/secondary` and `Accent/negative`, the wick in the body's colour and stopping at its edges, no lighter outline, square corners. No gridlines: the product's candlestick chart has none. Prices with two decimals in a column at the right, its edge a `Border/subtle` line, in `Caption` and `Text/secondary`. Below 520 px wide the column would hide a seventh of the chart ahead of the bull, so there the labels sit over the chart's edge.
2. **A last-price tag, new.** The product's chart tags its last price on the axis; the game tags the bull's own price, the chart's "now". `Accent/secondary` in Dark, `Accent/Tints/Positive/positive-60` in Light, as the product does. Dark's white figure on the bright green is the product's choice and low in contrast. Easy to drop if it is one thing too many.
3. **The doji wall is a tall red candle** (the user's call, 16 October 2026): solid `Accent/negative` like every red, no hatching. It was the chart grey, hatched; `--cr-neutral`, `--cr-neutral-edge` and `--cr-hatch` went with that look.
4. **Sentence case, no tracked capitals.** The product never sets uppercase with letter spacing. "HI" and "SCORE" read "Hi" and "Score", "GAME OVER" reads "Game over", "NEW BEST" reads "New best". This changes copy in PRD sections 5 and 6 (screen copy): the PRD's text is unchanged until you say so.
5. **The characters move onto primitives** (no new tokens, the same in both modes). The bull loses its cream: `grey-150` with `grey-300` shading is a cooler white. The design system has no warm off-white; keeping the bull's own colours instead is the alternative.
6. **The wick stays 2 px** (PRD section 6, "Candles and terrain", rule 1). The product's is 1 px at a quarter of the game's candle width; 1 px at the game's size reads as a hairline.
7. **The "Again" pill is the product's primary button**: the positive gradient, `Border/subtle`, radius 8, `Label/MD`, `Text/primary` (white in Dark, black in Light, as the product sets it).
8. **The top bar's "tl/." signature is still set in type**, in `Accent/secondary` and `Label/LG`, waiting on your call (the canvas mark is the logo, done separately).

## colour

| game token | design system token | Dark | Light | used for |
|---|---|---|---|---|
| `--cr-bg` | `Gradient/background-primary/to` | #03160F | #F6F6F6 | the page ground when standalone; the skip link |
| `--cr-panel` | `Table/Card-bg` | #3939394D | #FFFFFF | the panel: the product's chart card |
| `--cr-line` | `Border/default` | #FFFFFF1A | #0000001A | the panel's border |
| `--cr-grid` | `Border/subtle` | #FFFFFF0F | #0000000F | the price axis's edge |
| `--cr-axis` | `Text/secondary` | #BABABA | #5E5E5E | price labels |
| `--cr-chip`, `--cr-chip-line` | `Background/surface`, `Border/subtle` | | | the timer chip, as the product's pills |
| `--cr-fg` | `Text/primary` | #FFFFFF | #000000 | score figures, the card's score |
| `--cr-fg-2`, `--cr-fg-3` | `Text/secondary` | #BABABA | #5E5E5E | "Game over"; timer, hints, the card's line |
| `--cr-fg-4` | `Text/tertiary` | #8A8A8A | #717171 | the witty line, "Hi" and "Score", the restart line |
| `--cr-green`, `--cr-green-edge`, `--cr-mint` | `Accent/secondary` | #3FCF8E | #18744B | green candles, "+1", the skip link |
| `--cr-red`, `--cr-red-edge` | `Accent/negative` | #E5484D | #AE373B | red candles, the doji wall |
| `--cr-tag` | `Accent/secondary` / `positive-60` | #3FCF8E | #18744B99 | the last-price tag |
| `--cr-tag-ink`, `--cr-button-ink`, `--cr-brand-ink` | `Text/primary` | #FFFFFF | #000000 | the tag's figure, "Again", the "t" of the canvas mark |
| `--cr-gold` | `Accent/intermediate` | #FBBF24 | #FBBF24 | the jump flag, "New best", the nose ring |
| `--cr-chip-ink` | `Text/Inverse neutral` | #000000 | #000000 | text on the gold chips (`Text/Inverse` turns white in Light) |
| `--cr-amber`, `--cr-amber-line` | `Text/Waiting`, `Accent/Tints/Intermediate-30` | #D89E49 | #98652A | the timer from 30 s |
| `--cr-focus` | `Accent/secondary` | | | the canvas focus ring |
| `--cr-overlay` | `Overlay/backdrop-80` | #000000CC | #FFFFFFCC | the chart behind the game over card |
| `--cr-button-from`, `--cr-button-to` | `Gradient/accent/positive/default` | #0F8F63 to #0B7350 | #3FCF8E to #30BE6C | "Again" |
| `--cr-button-line` | `Border/subtle` | | | its border |
| `--cr-brand-accent` | `Accent/secondary` | | | the top bar's "tl/." |

`--cr-green-deep` is gone: it was never used, here or in the original. `--cr-shadow` went with the bull's ground shadow, which the user had removed on 16 October 2026.

### the characters (from their locked sheets, 16 October 2026)

The bull and the bear are the ones the user locked in the Candle Runner Figma file (`bull-sheet-v1`, `bear-sheet-v1`). Their colours are the sheets' semantic tokens, so they follow the mode. Cut lines, eyes and noses are holes in the body. The classic characters and their primitives are in `characters/classic/`.

| game token | design system | Dark | Light | where |
|---|---|---|---|---|
| `--cr-bull` | `Text/primary` | #FFFFFF | #000000 | the bull's body |
| `--cr-bull-shade` | `Text/tertiary` | #8A8A8A | #717171 | its far legs and ear |
| `--cr-horn` | `Accent/secondary` | #3FCF8E | #18744B | its horns and tail tuft |
| `--cr-bear` | `Text/secondary`, Light `Text/tertiary` | #BABABA | #717171 | the bear's body: a step lighter than its far side in Light, as its light tile draws it |
| `--cr-bear-shade` | `Text/tertiary`, Light `Text/secondary` | #8A8A8A | #5E5E5E | its far limbs and ear |
| `--cr-bear-claw` | `Accent/negative` | | | its claws and stub tail |
| `--cr-bear-ink` | `Text/Inverse neutral` | | | behind its eyes, brow, nose and cut lines: dark in both modes, as its sheet draws them |
| `--cr-note-fill`, `-light`, `-ink`, `-text` | `heatmap/intermediate light-500`, `light-300`, `dark-300`, `yellow-500-4` | | | the rupee note |

On its sheet the bear's far limbs are `grey-600` (#757575), the grey the generated image drew. In the game they are `Text/tertiary`, the semantic token the bear's colours were agreed on, so they follow the mode.

## type

The product sets most text at 10, 12 and 14 px in weights 400 and 500, never in tracked capitals. Its own style names (text-sm and so on) are not the design system's, and its 12/16 workhorse has no exact match; the game takes the design system's nearest style for each role. Each role is a `--cr-type-*` token (a `font` shorthand) with its `-tracking`, read by the DOM and by the canvas alike.

| where | style | was |
|---|---|---|
| witty line | `Body/MD` 14/20 | 14/20 |
| "tl/." signature | `Label/LG` 14/20 600 | 14, 600 |
| timer | `Numeric/SM` 12/18 | 13/18 |
| "Hi", "Score" | `Body/SM` 12/18 | 12, uppercase, tracked 0.08em |
| score figures | `Numeric/MD` 14/20 500 | 14, 600 |
| price labels, the tag | `Caption` 10/14 | 11, 500 |
| hint, restart line | `Body/SM` 12/18 | 12 |
| jump flag, "New best", "+1" | `Label/MD` 12/16 600 | 11 and 12, 600, tracked |
| "Game over" | `Heading/SM` 16/22 600 | 16, 600, tracked 0.18em |
| the card's score | `Display XXXL` 42, 700 | 40, 600 |
| the card's line | `Body/MD` 14/20 | 14 |
| "Again" | `Label/MD` 12/16 600 | 13, 600 |

Score figures keep tabular digits so they don't jitter as they count. The design system's font token now carries the system stack after Inter (`scripts/design-system.mjs`), so type stays sans serif where the font can't load.

## spacing, radius, icons

| where | now | was |
|---|---|---|
| panel radius | `radius-8`, the product's chart card | 12 |
| timer chip | `radius-999`, padding `2` `8`, gap `4` | 999, 2 10 2 8, gap 6 |
| top bar gap | `gap-12` | 12 |
| score strip | margins `gap-8`, cluster gap `gap-8` | 6 above, 8 below, 10 |
| canvas chips | `radius-999` (`--cr-radius-chip`), 20 tall | 18 tall, radius 9 |
| "Again" | `radius-8` (`--cr-radius-button`), 150 by 32 | radius 16 |
| the timer's clock | the design system's `icon-clock` (49:12) | drawn by hand |
| the jump flag's arrow | the design system's `icon-arrow--point-up` (44:171), drawn from its path | a "↑" in type |
| the canvas mark | the design system's logo mark (Logos, 1415:24 and 1507:7279) | "tl/." in type |

## light and dark

The game follows the page's mode: `data-theme` on `<html>` or any ancestor switches it, through CSS for the DOM and a fresh palette read for the canvas. A host can also force a mode: the `theme` prop, `handle.setTheme()`, `{ type: "cr:theme", theme }` posted to the frame, or `?theme=light` on the one-file build. The review page has a Dark and Light switch in its bar.
