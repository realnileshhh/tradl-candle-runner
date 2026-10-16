// The game's theme contract: it draws in the design system's Dark or Light, opens
// in the mode the page asks for (?theme on /play and on the one-file build), and
// switches mode in the middle of a run without restarting it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import type { Theme } from "../../src/game/types";
import { debug, expect, test, waitForPhase } from "./fixtures";

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "reference", "the original has one look and no theme contract");
});

const gameTheme = async (page: Page) => (await debug(page)).theme;

/** The host switches mode the way each target's host does: the app on its own <html>, a frame by message. */
const switchTo = (page: Page, project: string, theme: Theme) =>
  project === "embed"
    ? page.evaluate((t) => window.postMessage({ type: "cr:theme", theme: t }, "*"), theme)
    : page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);

test("opens in dark with no flag", async ({ page, openGame }) => {
  await openGame();
  expect(await gameTheme(page)).toBe("dark");
});

test("opens in light with ?theme=light", async ({ page, openGame }) => {
  await openGame({ query: "?theme=light" });
  expect(await gameTheme(page)).toBe("light");
});

test("every game token resolves to a value in light", async ({ page, openGame }) => {
  await openGame({ query: "?theme=light" });
  expect(await gameTheme(page)).toBe("light");
  // A token may be defined once per mode: each name once.
  const names = [
    ...new Set(
      [
        ...readFileSync(join(__dirname, "../../src/game/tokens.css"), "utf8").matchAll(/(--cr-[a-z0-9-]+)\s*:/g),
      ].map((m) => m[1]),
    ),
  ];
  const empty = await page.evaluate((tokens) => {
    const style = getComputedStyle(document.querySelector("canvas")!);
    return tokens.filter((t) => !style.getPropertyValue(t).trim());
  }, names);
  expect(empty).toEqual([]);
});

test("switching mode mid-run keeps the run", async ({ page, openGame }, info) => {
  await openGame();
  await waitForPhase(page, "play");
  await page.keyboard.press("Space");
  const before = await debug(page);
  expect(before.theme).toBe("dark");

  await switchTo(page, info.project.name, "light");
  await expect.poll(() => gameTheme(page)).toBe("light");
  let now = await debug(page);
  expect(now.runs, "the switch restarted the run").toBe(before.runs);
  expect(["play", "over"]).toContain(now.phase);
  expect(now.t, "the switch remounted the game").toBeGreaterThanOrEqual(before.t);

  await switchTo(page, info.project.name, "dark");
  await expect.poll(() => gameTheme(page)).toBe("dark");
  now = await debug(page);
  expect(now.runs, "the switch back restarted the run").toBe(before.runs);
  expect(["play", "over"]).toContain(now.phase);
});

test("setTheme forces a mode; with no argument the game follows the page again", async ({ page, openGame }) => {
  await openGame();
  await page.evaluate(() => window.candleRunner?.setTheme("light"));
  await expect.poll(() => gameTheme(page)).toBe("light");
  await page.evaluate(() => window.candleRunner?.setTheme());
  await expect.poll(() => gameTheme(page)).toBe("dark");
});
