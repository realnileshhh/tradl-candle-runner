# code rules

## the stack

Next.js 16.4 (App Router, Turbopack, Cache Components and Partial Prefetching on), React 19.3, TypeScript 5.9 (strict), CSS Modules, ESLint 9 with Next's config, Prettier, Playwright, esbuild for the one-file build. Node 24 (`.nvmrc`).

- **Read the bundled Next docs first:** `node_modules/next/dist/docs/` (AGENTS.md). This Next differs from older versions: Cache Components change caching and prerendering, and routes are hidden with React's `<Activity>` instead of unmounted on navigation, so effects clean up when a route hides and run again when it shows. The game's mount and destroy live in an effect for that reason.
- **Versions are pinned exactly** in `package.json`. Upgrade on purpose, one package at a time, with `npm run verify` after. ESLint stays on 9 while `eslint-plugin-react` (inside `eslint-config-next`) doesn't support 10, and TypeScript stays below 6.1 for `typescript-eslint`.

## structure

- `src/app/`: routes only (`layout.tsx`, `page.tsx`, route folders). Pages are server components that render client components.
- `src/components/<name>/<name>.tsx` with `<name>.module.css` beside it. One component per folder.
- `src/game/`: the engine, no React and no Next. It must build with esbuild for the one-file output.
- `src/design-system/`: generated, never edited.
- Import through `@/` (`@/game`, `@/components/...`). Import the game from `@/game` (its `index.ts`), not its files.

## React

- `"use client"` only where there is state, effects or browser APIs.
- An imperative widget (the game) mounts in `useEffect` and is destroyed in its cleanup; its callbacks go through `useEffectEvent`, so new props don't remount it. Don't pass an Effect Event as a prop: pass a plain function and wrap it in the receiver.
- `ref` is a prop (React 19). Expose a stable object with `useImperativeHandle` that talks to whatever is mounted now.
- No inline `style` except for values known only at run time (the iframe's height from its `size` event).

## CSS

- CSS Modules for everything a component owns; `src/app/globals.css` for the truly global (box sizing, body). Class names camelCase.
- Values from tokens (`.claude/rules/design-system.md`): `var(--ds-*)` in the app, `var(--cr-*)` in the game.
- Media queries: the game's breakpoints are the PRD's (900 and 600 px). The app works from 390 px wide with no horizontal scroll.

## TypeScript

- Strict, no `any`. Narrow with `in` and type guards. A cast needs a reason next to it (the CSS Module map cast to `CandleRunnerClasses` is the known one).
- Public types live in `src/game/types.ts`; window globals are declared there too.

## comments and names

- Comments say why, in plain sentences. Name the PRD section a rule comes from.
- Files and folders lowercase kebab-case. No em dashes, anywhere.

## dependencies

Before adding one, ask: does the one-file build need it (it must stay dependency-free), and is it more than a few lines we could own? Pin it exactly and record it in `docs/decisions.md`.
