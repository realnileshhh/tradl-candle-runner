// The review page (/): the host's side of the contract, inline and in an iframe.

import type { Frame, Page } from "@playwright/test";
import type { DebugState } from "../../src/game/types";
import { expect, test } from "./fixtures";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "app", "the review page belongs to the app");
});

test("inline: Report ready removes the game and flips the step line", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("Preparing your equity strategy")).toBeVisible();
  await page.getByRole("button", { name: "Report ready" }).click();
  await expect(page.locator("canvas")).toHaveCount(0, { timeout: 2000 });
  await expect(page.getByText("Backtest ready")).toBeVisible();
  await expect(page.getByText("dismissed")).toBeVisible();
});

test("iframe: the one-file build sizes its frame and leaves on Report ready", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.goto("/");
  await page.getByRole("radio", { name: "Iframe" }).click();
  const frame = page.frameLocator('iframe[title="Candle Runner"]');
  await expect(frame.locator("canvas")).toBeVisible();
  await expect.poll(async () => (await page.locator("iframe").boundingBox())?.height ?? 0).toBeGreaterThan(420);
  await page.getByRole("button", { name: "Report ready" }).click();
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 2000 });
  await expect(page.getByText("Backtest ready")).toBeVisible();
});

test("Leave conversation removes the game; New run brings one back", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Leave conversation" }).click();
  await expect(page.locator("canvas")).toHaveCount(0, { timeout: 2000 });
  await expect(page.getByText("Backtest ready")).toHaveCount(0);
  await page.getByRole("button", { name: "New run" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
});

// The colour mode switch: the design system's Dark (the default) and Light, so the
// game can be designed and harmonised in both.

const html = (page: Page) => page.locator("html");
const inlineTheme = (page: Page) => page.evaluate(() => window.__crDebug?.theme);

/** The frame's document, once its game has drawn a frame. */
async function gameFrame(page: Page): Promise<Frame> {
  const element = await page.locator('iframe[title="Candle Runner"]').elementHandle();
  const frame = await element?.contentFrame();
  if (!frame) throw new Error("the game's frame has no document");
  await frame.waitForFunction(() => !!window.__crDebug);
  return frame;
}
const frameDebug = (frame: Frame) => frame.evaluate(() => window.__crDebug as DebugState);

/**
 * Notes on <html> the mode it held when <body> first existed: what the first paint
 * can show, long before React runs. Only the inline script in <head> sets it that early.
 */
const noteModeAtBody = (page: Page) =>
  page.addInitScript(() => {
    const watch = new MutationObserver(() => {
      if (!document.body) return;
      watch.disconnect();
      document.documentElement.dataset.themeAtBody = document.documentElement.dataset.theme ?? "none";
    });
    watch.observe(document, { childList: true, subtree: true });
  });

test("Light switches the page, and the inline game follows without a restart", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.goto("/");
  await page.waitForFunction(() => !!window.__crDebug);
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  expect(await inlineTheme(page)).toBe("dark");
  const before = await page.evaluate(() => window.__crDebug!.t);

  await page.getByRole("radio", { name: "Light" }).click();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "false");
  await expect.poll(() => inlineTheme(page)).toBe("light");
  expect(await page.evaluate(() => window.__crDebug!.t), "the switch remounted the game").toBeGreaterThanOrEqual(
    before,
  );

  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => inlineTheme(page)).toBe("dark");
});

test("iframe: the frame's game follows a switch without reloading; a new run opens in the mode", async ({
  page,
  pageErrors,
}) => {
  void pageErrors;
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.goto("/");
  await page.getByRole("radio", { name: "Iframe" }).click();
  const element = page.locator('iframe[title="Candle Runner"]');
  await expect(element).toHaveAttribute("src", /[?&]theme=dark(&|$)/);
  let frame = await gameFrame(page);
  expect((await frameDebug(frame)).theme).toBe("dark");
  const before = (await frameDebug(frame)).t;

  await page.getByRole("radio", { name: "Light" }).click();
  await expect.poll(async () => (await frameDebug(frame)).theme).toBe("light");
  // The address keeps the mode the run opened in: a new one would reload the frame.
  await expect(element).toHaveAttribute("src", /[?&]theme=dark(&|$)/);
  expect((await frameDebug(frame)).t, "the switch reloaded the frame").toBeGreaterThanOrEqual(before);

  await page.getByRole("radio", { name: "Dark" }).click();
  await expect.poll(async () => (await frameDebug(frame)).theme).toBe("dark");

  await page.getByRole("radio", { name: "Light" }).click();
  await page.getByRole("button", { name: "New run" }).click();
  await expect(element).toHaveAttribute("src", /[?&]theme=light(&|$)/);
  frame = await gameFrame(page);
  await expect.poll(async () => (await frameDebug(frame)).theme).toBe("light");
});

test("?theme=light opens the review page in light, before the first paint", async ({ page, pageErrors }) => {
  void pageErrors;
  await noteModeAtBody(page);
  await page.goto("/?theme=light");
  await expect(html(page)).toHaveAttribute("data-theme-at-body", "light");
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  await page.waitForFunction(() => !!window.__crDebug);
  expect(await inlineTheme(page)).toBe("light");
});

test("the chosen mode survives a reload", async ({ page, pageErrors }) => {
  void pageErrors;
  await page.goto("/");
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await noteModeAtBody(page);
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme-at-body", "light");
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  await page.waitForFunction(() => !!window.__crDebug);
  expect(await inlineTheme(page)).toBe("light");
});
