// The game over card, the score strip, the jump flags and the bear's swat, as the
// user approved them in the Candle Runner Figma file on 16 October 2026 (Workspace,
// sections game-over-v1 and bear-hit-v1; docs/decisions.md).

import type { Page } from "@playwright/test";
import type { DebugState } from "../../src/game/types";
import { debug, expect, test, waitForPhase } from "./fixtures";
import { startScriptedPlayer } from "./scripted-player";

const NEW_DESIGN = "the original predates the 16 October 2026 design";

/** Figures as the product writes numbers: grouped, no leading zeros ("3,351", never "03351"). */
const FIGURE = /^(0|[1-9]\d{0,2}(,\d{2})*(,\d{3})?)$/;

const strip = (page: Page) =>
  page.evaluate(() => ({
    hi: document.querySelector('[data-cr="hi"]')?.textContent ?? "",
    hiFigure: document.querySelector('[data-cr="hi"] b')?.textContent ?? "",
    score: document.querySelector('[data-cr="score"] b')?.textContent ?? "",
  }));

test("the score strip reads Personal best, with figures as the product writes them", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", NEW_DESIGN);
  test.setTimeout(90_000);
  await openGame();
  expect((await strip(page)).hi.startsWith("Personal best")).toBe(true);
  await startScriptedPlayer(page, "space");
  // A point is 12 px of running: 840 a minute at the start pace, more at each level.
  // The score passes 1,000, and shows a group, at about 42 s.
  await page.waitForFunction(() => (window.__crDebug?.score ?? 0) > 1000, null, { timeout: 60_000, polling: "raf" });
  const s = await strip(page);
  expect(s.score).toMatch(FIGURE);
  expect(s.hiFigure).toMatch(FIGURE);
  expect(s.score).toContain(",");
});

test("Space on the game over card re-enters", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "over", 10_000);
  const runs = (await debug(page)).runs;
  // A restart waits 250 ms after the death, so a press made while dying doesn't count.
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await debug(page)).runs).toBe(runs + 1);
  expect((await debug(page)).phase).not.toBe("over");
});

test("the jump flag coaches the first red, gap and bear once a page, never after a restart", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original flags the first red on every run");
  test.setTimeout(90_000);
  await openGame();
  // Every flagged hazard, with the run it was flagged in.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __crCoach: string[] }).__crCoach = seen;
    const tick = () => {
      const d = window.__crDebug;
      const key = d?.coach ? `${d.coach.kind}:${d.coach.id}:${d.runs}` : "";
      if (key && !seen.includes(key)) seen.push(key);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await startScriptedPlayer(page, "space");
  await page.waitForTimeout(25_000);
  await page.evaluate(() => window.candleRunner!.restart());
  await page.waitForTimeout(15_000);
  const flagged = await page.evaluate(() => (window as unknown as { __crCoach: string[] }).__crCoach);
  console.log(`[${info.project.name}] flagged: ${flagged.join(", ")}`);
  const kinds = flagged.map((f) => f.split(":")[0]);
  // Each kind is flagged over one hazard at most, across both runs.
  expect(new Set(kinds).size).toBe(kinds.length);
  // The first hazard of a page's first run is always a red (PRD section 6, rule 6), so the red is coached.
  expect(flagged.find((f) => f.startsWith("red:"))?.endsWith(":0")).toBe(true);
});

/** Plays, jumping everything but bears, until a bear ends the run; then samples the swat. */
async function bearDeath(page: Page) {
  await startScriptedPlayer(page, "space", { walkIntoBears: true });
  // Bears are 18% of hazards after the first red: none in 90 s would happen about once in 3,000 runs.
  await page.waitForFunction(() => window.__crDebug?.phase === "over", null, { timeout: 90_000, polling: "raf" });
  expect((await debug(page)).cause).toBe("bear");
  return page.evaluate(
    () =>
      new Promise<Pick<DebugState, "bearPose" | "card">[]>((resolve) => {
        const out: Pick<DebugState, "bearPose" | "card">[] = [];
        const start = performance.now();
        const tick = () => {
          const d = window.__crDebug!;
          out.push({ bearPose: d.bearPose, card: d.card });
          if (performance.now() - start < 700) requestAnimationFrame(tick);
          else resolve(out);
        };
        tick();
      }),
  );
}

test("the bear swats back: raise, swipe, down, growl, and the card after the swat", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original's bear only breathes");
  test.setTimeout(120_000);
  await openGame();
  const frames = await bearDeath(page);
  const poses = frames.map((f) => f.bearPose).filter((p, i, a) => p && p !== a[i - 1]);
  expect(poses.slice(-4)).toEqual(["swipe-raise", "swipe-swipe", "swipe-down", "react-growl"]);
  // The card waits for the swat to land: no card while the paw is still up.
  for (const f of frames) if (f.bearPose === "swipe-raise" || f.bearPose === "swipe-swipe") expect(f.card).toBe(0);
  expect(frames[frames.length - 1].card).toBeGreaterThan(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the bear growls at once, with no swat", async ({ page, openGame }, info) => {
    test.skip(info.project.name === "reference", "the original's bear only breathes");
    test.setTimeout(120_000);
    await openGame();
    const frames = await bearDeath(page);
    expect(new Set(frames.map((f) => f.bearPose))).toEqual(new Set(["react-growl"]));
  });
});
