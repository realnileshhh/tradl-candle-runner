# Candle Runner

The game in Tradl's backtest chat while a run computes: a bull runs along a candlestick chart and you jump the red candles until your report lands. Built in React and Next.js on the Tradl Design System.

- **Behaviour:** the PRD, `docs/prd/candle-runner.md`.
- **Look:** the Tradl Design System in Figma (read only), mirrored in `design-system/` and generated into `src/design-system/`.
- **Working on it with Claude Code:** `CLAUDE.md` and `.claude/rules/`.

## Run it

```bash
nvm use            # Node 24
npm install
npx playwright install chromium   # once, for the suite
npm run dev        # http://localhost:3000 (the review page) and /play (the game alone)
```

`npm run verify` runs the lint, the build and the verification suite: the gate before anything ships.

## For the front end

Two ways to put the game in the product, from the same engine:

**One file, in an iframe** (the PRD's integration, section 7). `npm run build:embed` writes `public/candle-runner-loading.html`: one file, no dependencies, the Inter font its only request.

```html
<iframe id="cr-frame" src="/candle-runner-loading.html?embed=1" title="Candle Runner"
        sandbox="allow-scripts" style="border:0;width:100%;height:439px;background:transparent"></iframe>
```

```js
window.addEventListener("message", (e) => {
  const m = e.data || {};
  if (m.source !== "candle-runner") return;
  if (m.event === "size") frame.style.height = m.data.height + "px";
});
// when the report is ready (today the game fades out; then remove the frame after 750 ms)
frame.contentWindow.postMessage("cr:results", "*");
// when the user leaves the conversation
frame.contentWindow.postMessage("cr:dismiss", "*");
```

**A React component**, for a React host:

```tsx
import { CandleRunner, type CandleRunnerControls } from "@/components/candle-runner/candle-runner";

const game = useRef<CandleRunnerControls>(null);
<CandleRunner ref={game} onEvent={(name, data) => track(`game_${name}`, data)} />;
// when the report lands
await game.current?.dismiss();
```

Events: `ready`, `start`, `first-jump`, `game-over`, `new-best`, `copied`, `dismissed`, `size` (PRD section 10 maps them to analytics names).

## Status

The 13 October build, ported without changing play and verified against the original (zero deaths in 45 s on every input, on every target). Next: harmonising its look with the design system (`docs/harmonisation.md`) and the results handoff (PRD section 7).
