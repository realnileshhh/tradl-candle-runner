# harmonisation: the game on the design system

The game shipped with a palette and type read from the product's loading screen on 13 October 2026. This page puts each of its values next to the Tradl Design System, with a proposed token for each. **Every row is a proposal, nothing is applied yet: the user decides, row by row or by group.** A change is one line in `src/game/tokens.css` (colour) or `src/game/candle-runner.module.css` (type, spacing), then `npm run verify` and a look on the review page.

`npm run lint` prints the backlog: today 36 of 38 game colour tokens hold their own colour, and the game stylesheet has 19 raw sizes.

"Distance" is the perceptual difference between today's colour and the proposal (OKLab, ×100; colours with alpha are compared over the game's ground): under 2 is hard to see, 2 to 5 is visible side by side, over 5 is a clear change. Every number here is computed from the tokens, not estimated.

**Read this first:** the game's greys lean green (#a3a3a3 is neutral, but #6b7a73, #8aa89a and #5f6d67 are tinted), while the design system's greys are neutral. Moving the game's text onto the semantic text tokens is a visible shift (7 to 8), not a quiet one. That is the main look decision.

## colour: ground, lines and type

| game token | today | role | proposal | its value | distance | note |
|---|---|---|---|---|---|---|
| `--cr-bg` | #0a120e | page ground when standalone | `--ds-gradient-background-primary-to` | #03160F | 1.8 | the end of the product's own page gradient; inside the product the frame is transparent, so this shows only standalone. `--ds-background-modal` (#101110) is 1.3 but neutral |
| `--cr-panel` | white 1.6% | panel fill | `--ds-background-surface-raised` | white 4% | 2.4 | the panel lifts a little |
| `--cr-line` | white 8% | panel and timer borders | `--ds-border-default` | white 10% | 2.2 | |
| `--cr-grid` | #8aa89a | gridlines (at 10%), price labels (at 42%) | `--ds-primitive-color-green-300` | #80B094 | 2.9 | keeps the green cast; no semantic token means "grid". Neutral instead: `--ds-text-tertiary` (#8A8A8A), 8.1 |
| `--cr-fg` | #ffffff | score figures | `--ds-text-primary` | #FFFFFF | 0 | |
| `--cr-fg-2` | #d4d4d4 | "GAME OVER" | `--ds-text-secondary` | #BABABA | 8.1 | darker; the primitive `grey-250` (#D6D6D6) is 0.6 but skips the semantic layer |
| `--cr-fg-3` | #a3a3a3 | witty line, timer, hints | `--ds-text-secondary` | #BABABA | 7.3 | lighter; `--ds-text-tertiary` (#8A8A8A) is 8.2 and darker |
| `--cr-fg-4` | #6b7a73 | score strip labels | `--ds-text-tertiary` | #8A8A8A | 7.2 | lighter and neutral; the primitive `grey-600` (#757575) is 2.1 |
| `--cr-hatch` | #ffffff | doji wall hatching (at 16%) | `--ds-text-primary` | #FFFFFF | 0 | |
| `--cr-brand-ink` | #ffffff | "tl" of the canvas mark | see "icons and logo" below | | | |

## colour: the chart

| game token | today | role | proposal | its value | distance | note |
|---|---|---|---|---|---|---|
| `--cr-green` | #4fb37c | green candle body, the "tl/." signature, the restart pill | `--ds-accent-secondary` | #3FCF8E | 7.6 | the design system's positive green (green-400): brighter, the clearest visible change |
| `--cr-green-edge` | #7ad3a0 | green outline and wick | `--ds-accent-secondary` | #3FCF8E | 5.3 | the same token as the body: a flatter candle. The design system has no lighter positive green to outline with |
| `--cr-green-deep` | #37724e | defined, never used (also unused in the original) | remove | | | |
| `--cr-mint` | #a9e5c3 | "+1" puffs, restart pill text | `--ds-primitive-color-heatmap-positive-light-300` | #B4D5C5 | 4.5 | or `--ds-accent-secondary`, one green for every positive thing |
| `--cr-red` | #dc5550 | red candle body | `--ds-accent-negative` | #E5484D | 2.4 | |
| `--cr-red-edge` | #f2817b | red outline and wick | `--ds-accent-negative` | #E5484D | | the body's token, as for green; the nearest lighter red is `--ds-chart-colors-coral` (#E28678, 2.9), whose meaning is a chart series |
| `--cr-neutral` | #5f6d67 | doji wall body | `--ds-primitive-color-neutral-grey-700` | #5E5E5E | 4.4 | no semantic token means "neutral candle"; `grey-650` (#717171) is 3.4 |
| `--cr-neutral-edge` | #8e9c96 | doji wall outline | `--ds-primitive-color-neutral-grey-500` | #8A8A8A | 5.0 | |

A question first: does the product's own candlestick chart (the report the user is about to read) use `Chart colors/green` (#0E8159) and `Chart colors/red` (#C83C50)? If it does, matching it may matter more than matching the accents. They sit far from today's candles (15.8 and 6.6) and the green is much darker on this ground.

## colour: accents

| game token | today | role | proposal | its value | distance | note |
|---|---|---|---|---|---|---|
| `--cr-gold` | #e6c46a | "↑ jump" flag, "NEW BEST" chip, nose ring | `--ds-accent-intermediate` | #FBBF24 | 5.0 | brighter, more saturated |
| `--cr-chip-ink` | #2a2208 | text on the gold chips | `--ds-text-inverse` | #000000 | 25.8 | black instead of a dark brown; on gold both read as dark text |
| `--cr-amber` | #d9a441 | the timer from 30 s | `--ds-text-waiting` | #D89E49 | 1.9 | the design system's own "waiting" colour: a match in meaning too |
| `--cr-amber-line` | amber 35% | its border | `--ds-accent-tints-intermediate-30` | yellow-400 at 30% | 1.3 | |
| `--cr-focus` | green at 55% | canvas focus ring | `--ds-accent-secondary` | #3FCF8E | 29.4 | a solid ring instead of a soft one, as on the review page's buttons |

## colour: the characters

The bull, the bear and the rupee note are illustrations; the design system has no illustration palette. Two ways:

1. **Keep them as the game's own** illustration colours, documented as the one exception to "tokens only".
2. **Map them onto primitives** (no new tokens, the design system's own colours):

| game token | today | nearest primitive | its value | distance |
|---|---|---|---|---|
| `--cr-bull` | #efe7d6 | `--ds-primitive-color-neutral-grey-150` | #E5EAE6 | 2.2 |
| `--cr-bull-shade` | #d4c6a6 | no close match: `--ds-primitive-color-neutral-grey-300` | #BABABA | 6.1 |
| `--cr-bull-ink` | #1c201e | `--ds-primitive-color-neutral-grey-800` | #202320 | 1.3 |
| `--cr-horn` | #d9c08a | `--ds-primitive-color-chart-sand` | #DCAF6A | 4.6 |
| `--cr-eye` | #ffffff | `--ds-primitive-color-neutral-white` | #FFFFFF | 0 |
| `--cr-bear` | #8a5a3b | `--ds-primitive-color-yellow-700` | #8F5D27 | 2.7 |
| `--cr-bear-light` | #c99a74 | `--ds-primitive-color-chart-sand-light` | #CDA05C | 3.7 |
| `--cr-bear-ink` | #2a1c14 | `--ds-primitive-color-neutral-grey-800` | #202320 | 3.0 |
| `--cr-shadow` | #000000 | `--ds-primitive-color-neutral-black` | #000000 | 0 |
| `--cr-note-fill` | #e6c46a | `--ds-primitive-color-heatmap-intermediate-light-500` | #F2BA3E | 3.7 |
| `--cr-note-ink` | #9c7a2a | `--ds-primitive-color-heatmap-intermediate-dark-300` | #9A7019 | 2.7 |
| `--cr-note-light` | #f4dfa3 | `--ds-primitive-color-heatmap-intermediate-light-300` | #FBE2A0 | 1.4 |
| `--cr-note-text` | #6d4e12 | `--ds-primitive-color-yellow-500-4` | #68431C | 3.7 |

## type

The game sets its own sizes. The design system's styles (all Inter) that fit each:

| where | today | proposal |
|---|---|---|
| witty line | 14 px / 20, 400 | `Mobile text styles/Body/MD` (14/20, 400): the same |
| "tl/." signature | 14 px, 600 | `Label/LG` (14/20, 600) |
| timer chip | 13 px / 18, tabular | `Numeric/SM` (12/18, 400) or `Numeric/MD` (14/20, 500): the design system has no 13 |
| score strip labels "HI", "SCORE" | 12 px, uppercase, tracking 0.08em | `Label/MD` (12/16, 600), uppercase kept |
| score figures | 14 px, 600, tabular | `Numeric/LG` (16/20, 600) or `Numeric/MD` (14/20, 500) |
| canvas: price labels | 11 px, 500 | `Caption` (10/14) or `Numeric/SM` (12/18) |
| canvas: hint, restart line | 12 px | `Body/SM` (12/18) |
| canvas: "↑ jump", "NEW BEST" | 11 px, 600 | `Label/MD` (12/16, 600) |
| canvas: "GAME OVER" | 16 px, 600, tracking 0.18em | `Heading/SM` (16/22, 600) |
| canvas: the score on the card | 40 px, 600 | `Display XXXL` (42, 700) or `Display XXL` (30, 500) |
| canvas: "Again" pill | 13 px, 600 | `Label/LG` (14/20, 600) |

The canvas reads type from tokens the same way it reads colour, so this is a palette change in `palette.ts` plus tokens, not hand-set sizes.

## spacing and radius

| where | today | proposal |
|---|---|---|
| panel radius | 12 px | `--ds-radius-12`: the same |
| timer pill radius | 999 px | `--ds-radius-999`: the same |
| skip link radius | 8 px | `--ds-radius-8`: the same |
| timer pill padding | 2 px 10 px 2 px 8 px | `--ds-padding-2` `--ds-padding-8` (10 is not on the scale) |
| top bar gap | 12 px | `--ds-gap-12`: the same |
| timer icon gap | 6 px | `--ds-gap-4` or `--ds-gap-8` (6 is not on the scale) |
| score cluster gap | 10 px | `--ds-gap-8` or `--ds-gap-12` |
| score strip margins | 6 px above, 8 below | `--ds-gap-8` both |

## icons and logo

| where | today | proposal |
|---|---|---|
| the timer's clock | drawn by hand in `view.ts` | the design system's `icon-clock` (49:12): already exported, in `dsIcons` |
| "↑" in the jump flag | a text arrow | the design system's `icon-arrow--point-up` (44:171) |
| the rupee note | an illustration | keep: it is art, not an icon |
| "tl/." on the canvas and in the top bar | set in type | the design system's mark from the Logos page (345:1965), exported as SVG; the user's brand rule is the white mark with the green / and . |

## before the first colour change

`palette.ts` reads six-digit hex. A few proposals are design system tokens with alpha (`--ds-background-surface-raised` is white at 4%). The palette needs to keep alpha before those land; it is a small change with its own check.
