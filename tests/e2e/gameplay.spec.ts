// PRD section 12, the verification table, as tests. Every target runs every check.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { debug, expect, test, waitForPhase } from "./fixtures";
import { GREEN_BODY_MIN_U, LEVEL_EASE_S, LEVEL_S, LEVELS, SPEED_MAX, levelSpeed } from "../../src/game/constants";
import { readBot, startScriptedPlayer, startSpawnAudit, type Input } from "./scripted-player";

const PLAY_SECONDS = Number(process.env.CR_PLAY_SECONDS ?? 45);
const PHONE = { width: 390, height: 844 };
// The narrow canvas (below 520 px) had no hazards at all: the first one waited for a
// candle 20 slots ahead of the bull on screen, and there new candles appear closer
// than that. Fixed on 2026-10-16; the original still has it (docs/decisions.md).
const NARROW_BUG = "the original never spawns a hazard on the narrow canvas";

const RUNS: { input: Input; phone?: boolean }[] = [
  { input: "space" },
  { input: "arrow" },
  { input: "pointer" },
  // Phones tap, and the narrow canvas shows less chart ahead, so it gets its own run.
  { input: "pointer", phone: true },
];

test.describe("scripted player", () => {
  for (const { input, phone } of RUNS) {
    const name = phone ? `${input} at phone width` : input;
    test(`${PLAY_SECONDS} s with ${name}: zero deaths, a fair chart`, async ({ page, openGame }, info) => {
      test.skip(!!phone && info.project.name === "reference", NARROW_BUG);
      test.setTimeout((PLAY_SECONDS + 30) * 1000);
      await openGame(phone ? { viewport: PHONE } : undefined);
      await startScriptedPlayer(page, input);
      const spawn = startSpawnAudit(page);
      await page.waitForTimeout(PLAY_SECONDS * 1000);
      spawn.stop();
      const bot = await readBot(page);
      const chart = spawn.report();
      console.log(`[${info.project.name}] ${name}: ${JSON.stringify({ ...bot, ...chart })}`);

      expect(bot.deaths, `the scripted player died: ${bot.deathLog.join("; ")}`).toBe(0);
      expect(bot.jumps, "the player hardly played").toBeGreaterThan(PLAY_SECONDS * 0.3);
      // the top speed comes at 25 s (the original, accelerating to 7.0 in about 50 s, passes 6 at 45 s)
      if (PLAY_SECONDS >= 45) expect(bot.maxSpeed).toBeGreaterThanOrEqual(info.project.name === "reference" ? 6 : SPEED_MAX - 0.01);
      expect(chart.maxStep, "a green step above the rising cap").toBeLessThanOrEqual(chart.cap + 1e-9);
      expect(chart.minBetween, "two hazards closer than three candles").toBeGreaterThanOrEqual(3);
      // A quiet day still reads as a candle (the user, 2026-10-16); the original draws thinner ones.
      if (info.project.name !== "reference")
        expect(chart.minGreenBody, "a green body thinner than the minimum").toBeGreaterThanOrEqual(GREEN_BODY_MIN_U - 1e-9);
      // The PRD saw all four kinds in each 45 s run; a run without one is chance (a gap-free run is
      // about 1 in 600), so the check asks for variety, not all four.
      if (PLAY_SECONDS >= 45)
        expect(Object.keys(chart.kinds).length, "too few hazard kinds met").toBeGreaterThanOrEqual(3);
    });
  }
});

// The PRD's table says 4.5 to 5.5 s. The physics allows earlier: the first red can
// sit at slot 22 (x 902), 727 px of travel. The original gains 0.0014 px a frame from
// 2.8 and gets there in 244.7 frames, 4.08 s; the ports hold the start pace of 2.8
// until the first level at 5 s, so 259.6 frames, 4.33 s. The window here is the one
// the spawner allows (docs/decisions.md, 2026-10-16).
test("no input: death on the coached red at 4.0 to 5.5 s", async ({ page, openGame }) => {
  await openGame();
  await waitForPhase(page, "over");
  const d = await debug(page);
  console.log(`[${test.info().project.name}] no input: ${d.cause} at ${d.t} s`);
  expect(d.cause).toBe("red");
  expect(d.t).toBeGreaterThanOrEqual(4.0);
  expect(d.t).toBeLessThanOrEqual(5.5);
});

// The user, 2026-10-16: the speed steps up every 5 s, five levels, the top speed at
// 25 s. Read every frame on the game's own play clock (the one its physics runs on).
test("the pace steps up a level every 5 s and tops out at 25 s", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original speeds up a little every frame, to 7.0 in about 50 s");
  test.setTimeout(60_000);
  await openGame();
  await startScriptedPlayer(page, "space");
  const samples = await page.evaluate(
    () =>
      new Promise<{ clock: number; level: number; speed: number }[]>((resolve) => {
        const out: { clock: number; level: number; speed: number }[] = [];
        const tick = () => {
          const d = window.__crDebug;
          if (d?.phase === "play" && d.clock != null && d.level != null) out.push({ clock: d.clock, level: d.level, speed: d.speed });
          if (out.length && out[out.length - 1].clock >= 27) return resolve(out);
          if (d?.phase === "over") return resolve(out);
          requestAnimationFrame(tick);
        };
        tick();
      }),
  );
  const bot = await readBot(page);
  expect(bot.deaths, `the scripted player died: ${bot.deathLog.join("; ")}`).toBe(0);
  expect(samples[samples.length - 1].clock).toBeGreaterThanOrEqual(27);
  for (let i = 1; i < samples.length; i++) expect(samples[i].speed, "the pace never drops").toBeGreaterThanOrEqual(samples[i - 1].speed);
  for (const s of samples) {
    expect(s.level, `level at ${s.clock} s`).toBe(Math.min(LEVELS, Math.floor(s.clock / LEVEL_S)));
    expect(s.speed).toBeLessThanOrEqual(SPEED_MAX);
    // Between the half-second eases, each level holds its own pace.
    // (__crDebug rounds the speed to 0.01)
    if (s.clock - s.level * LEVEL_S >= LEVEL_EASE_S) expect(Math.abs(s.speed - levelSpeed(s.level)), `pace at ${s.clock} s`).toBeLessThanOrEqual(0.006);
  }
  const top = samples.filter((s) => s.clock >= LEVELS * LEVEL_S + LEVEL_EASE_S);
  expect(top.length).toBeGreaterThan(0);
  for (const s of top) expect(Math.abs(s.speed - SPEED_MAX)).toBeLessThanOrEqual(0.006);
  console.log(`[${info.project.name}] paces: ${[0, 1, 2, 3, 4, 5].map((k) => levelSpeed(k).toFixed(2)).join(", ")}`);
});

// The user, 2026-10-16: "at every pit, the bull should fall". At speed the step-up landing
// used to lift the bull out of a narrow gap before it had dropped 36 px, so it ran across.
test("at speed, walking into a gap is a fall", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original lets the bull run across a narrow gap at speed");
  test.setTimeout(150_000);
  await openGame();
  await startScriptedPlayer(page, "space", { walkIntoGapsFrom: 6 });
  // The first gap met at speed 6 or more: either the bull falls into it, or it is back on
  // the ground past it. A bull still falling has left the gap behind but is not grounded.
  const outcome = await page.evaluate(
    () =>
      new Promise<{ result: string; speed: number; t: number }>((resolve) => {
        let walking = false;
        const tick = () => {
          const d = window.__crDebug!;
          if (d.phase === "over") return resolve({ result: d.cause ?? "", speed: d.speed, t: d.t });
          if (d.speed >= 6 && d.next?.kind === "gap") walking = true;
          else if (walking && d.grounded) return resolve({ result: "ran across", speed: d.speed, t: d.t });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log(`[${info.project.name}] walked into a gap: ${outcome.result} at ${outcome.t} s, speed ${outcome.speed}`);
  expect(outcome.result).toBe("gap");
});

// The first hazard is measured along the run, so a phone meets it when a desktop does.
test("phone width 390, no input: death on the coached red at 4.0 to 5.5 s", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", NARROW_BUG);
  await openGame({ viewport: PHONE });
  await waitForPhase(page, "over");
  const d = await debug(page);
  console.log(`[${info.project.name}] phone, no input: ${d.cause} at ${d.t} s`);
  expect(d.cause).toBe("red");
  expect(d.t).toBeGreaterThanOrEqual(4.0);
  expect(d.t).toBeLessThanOrEqual(5.5);
});

// The original restarts on its own 2.6 s after a death. The user removed that on
// 2026-10-16: the card waits for a tap or a key (docs/decisions.md).
test("the game over card waits for the player", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original restarts on its own after 2.6 s");
  await openGame();
  await waitForPhase(page, "over");
  // Only waiting shows that nothing happens: well past the original's 2.6 s.
  await page.waitForTimeout(4000);
  const d = await debug(page);
  expect(d.phase).toBe("over");
  expect(d.runs).toBe(0);
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

// The user, 2026-10-16: no green ring when clicking in or out of the game. A click focuses
// the canvas from script, which Chrome counts as keyboard focus, so the engine marks it.
test("a click focuses the canvas without the focus ring; Tab still shows it", async ({ page, openGame }, info) => {
  test.skip(info.project.name === "reference", "the original rings the canvas on a click too");
  await openGame();
  const canvas = page.locator("canvas");
  const state = () =>
    canvas.evaluate((c) => ({ focused: c === document.activeElement, ring: getComputedStyle(c).boxShadow }));
  await waitForPhase(page, "play");
  await canvas.click();
  expect(await state()).toEqual({ focused: true, ring: "none" });
  await page.keyboard.press("Space");
  expect(await state()).toEqual({ focused: true, ring: "none" });
  await page.mouse.click(2, 2);
  for (let i = 0; i < 6 && !(await state()).focused; i++) await page.keyboard.press("Tab");
  const tabbed = await state();
  expect(tabbed.focused, "Tab never reached the canvas").toBe(true);
  expect(tabbed.ring, "keyboard focus lost its ring").not.toBe("none");
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
