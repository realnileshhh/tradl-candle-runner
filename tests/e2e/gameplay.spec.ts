// PRD section 12, the verification table, as tests. Every target runs every check.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { debug, expect, test, waitForPhase } from "./fixtures";
import { readBot, startScriptedPlayer, startSpawnAudit, type Input } from "./scripted-player";

const PLAY_SECONDS = Number(process.env.CR_PLAY_SECONDS ?? 45);

test.describe("scripted player", () => {
  for (const input of ["space", "arrow", "pointer"] as Input[]) {
    test(`${PLAY_SECONDS} s with ${input}: zero deaths, a fair chart`, async ({ page, openGame }) => {
      test.setTimeout((PLAY_SECONDS + 30) * 1000);
      await openGame();
      await startScriptedPlayer(page, input);
      const spawn = startSpawnAudit(page);
      await page.waitForTimeout(PLAY_SECONDS * 1000);
      spawn.stop();
      const bot = await readBot(page);
      const chart = spawn.report();
      console.log(`[${test.info().project.name}] ${input}: ${JSON.stringify({ ...bot, ...chart })}`);

      expect(bot.deaths, `the scripted player died: ${bot.deathLog.join("; ")}`).toBe(0);
      expect(bot.jumps, "the player hardly played").toBeGreaterThan(PLAY_SECONDS * 0.3);
      if (PLAY_SECONDS >= 45) expect(bot.maxSpeed).toBeGreaterThan(6);
      expect(chart.maxStep, "a green step above the rising cap").toBeLessThanOrEqual(chart.cap + 1e-9);
      expect(chart.minBetween, "two hazards closer than three candles").toBeGreaterThanOrEqual(3);
      // The PRD saw all four kinds in each 45 s run; a run without one is chance (a gap-free run is
      // about 1 in 600), so the check asks for variety, not all four.
      if (PLAY_SECONDS >= 45)
        expect(Object.keys(chart.kinds).length, "too few hazard kinds met").toBeGreaterThanOrEqual(3);
    });
  }
});

// The PRD's table says 4.5 to 5.5 s. The physics allows earlier: the first red can
// sit at slot 22 (x 902), 727 px of travel from 2.8 px a frame gaining 0.0014 a
// frame, which is 244.7 frames, 4.08 s. The original measures 4.08 s too, so the
// window here is the one the spawner allows (docs/decisions.md, 2026-10-16).
test("no input: death on the coached red at 4.0 to 5.5 s, then a restart", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "over");
  const d = await debug(page);
  console.log(`[${test.info().project.name}] no input: ${d.cause} at ${d.t} s`);
  expect(d.cause).toBe("red");
  expect(d.t).toBeGreaterThanOrEqual(4.0);
  expect(d.t).toBeLessThanOrEqual(5.5);
  await page.waitForFunction(() => window.__crDebug?.runs === 1, null, { timeout: 4000 });
});

test("a tap on the game over card restarts at once", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "over");
  await page.waitForTimeout(300);
  await page.locator("canvas").click();
  await expect.poll(async () => (await debug(page)).runs, { timeout: 250 }).toBe(1);
});

test("Space, Up arrow and a click each make one jump", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "play");
  const jumpsAfter = async (act: () => Promise<void>, expected: number) => {
    await act();
    await expect.poll(async () => (await debug(page)).jumps, { timeout: 500 }).toBe(expected);
    await page.waitForTimeout(900); // land before the next press
    expect((await debug(page)).jumps).toBe(expected);
  };
  await jumpsAfter(() => page.keyboard.press("Space"), 1);
  await jumpsAfter(() => page.keyboard.press("ArrowUp"), 2);
  await jumpsAfter(() => page.locator("canvas").click(), 3);
});

test("typing in a text field never jumps", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "play");
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "prompt";
    document.body.prepend(input);
  });
  await page.locator("#prompt").focus();
  await page.keyboard.type("  ");
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(300);
  expect((await debug(page)).jumps).toBe(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("play starts without the intro", async ({ page, openGame }) => {
    await openGame();
    expect((await debug(page)).phase).toBe("play");
  });
});

test("cr:dismiss fades the game out", async ({ page, openGame }) => {
  await openGame();
  await page.evaluate(() => window.postMessage("cr:dismiss", "*"));
  await waitForPhase(page, "exit", 1000);
});

test("phone width 390: no horizontal scroll, the narrow canvas", async ({ page, openGame }) => {
  await openGame({ viewport: { width: 390, height: 844 } });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  expect((await debug(page)).H).toBe(230);
});

test("frame cost: under 2 ms of script per frame", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference" && !process.env.CR_REFERENCE_PERF, "measured on the ports");
  await openGame();
  await waitForPhase(page, "play");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const script = async () => {
    const { metrics } = await cdp.send("Performance.getMetrics");
    return metrics.find((m) => m.name === "ScriptDuration")?.value ?? 0;
  };
  const frames = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let n = 0;
          const start = performance.now();
          const tick = () => (performance.now() - start < 3000 ? (n++, requestAnimationFrame(tick)) : resolve(n));
          requestAnimationFrame(tick);
        }),
    );
  const before = await script();
  const count = await frames();
  const perFrameMs = (((await script()) - before) * 1000) / count;
  console.log(
    `[${info.project.name}] frame cost: ${perFrameMs.toFixed(3)} ms of script per frame over ${count} frames`,
  );
  expect(perFrameMs).toBeLessThan(2);
});

test("every game token resolves to a value", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original predates the token list");
  await openGame();
  const names = [
    ...readFileSync(join(__dirname, "../../src/game/tokens.css"), "utf8").matchAll(/(--cr-[a-z0-9-]+)\s*:/g),
  ].map((m) => m[1]);
  const empty = await page.evaluate((tokens) => {
    const style = getComputedStyle(document.querySelector("canvas")!);
    return tokens.filter((t) => !style.getPropertyValue(t).trim());
  }, names);
  expect(empty).toEqual([]);
});
