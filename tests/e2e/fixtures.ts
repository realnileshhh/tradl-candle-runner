import { test as base, expect, type Page } from "@playwright/test";
import type { DebugState } from "../../src/game/types";

export interface TargetOptions {
  /** Where the game under test lives: a route of the app or a file URL. */
  target: string;
}

interface Fixtures {
  /** Opens the target and returns once the game has drawn its first frame. */
  openGame: (opts?: { viewport?: { width: number; height: number }; query?: string }) => Promise<void>;
  /** Script errors and console errors the page produced (asserted empty after every test). */
  pageErrors: string[];
}

export const test = base.extend<TargetOptions & Fixtures>({
  target: ["/play", { option: true }],

  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    await use(errors);
    expect(errors, "the page threw or logged errors").toEqual([]);
  },

  openGame: async ({ page, target, pageErrors }, use) => {
    void pageErrors;
    // Fonts never decide a result: serve an empty stylesheet instead of Google's,
    // so the suite runs offline and the same every time.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/css", body: "" }),
    );
    await use(async (opts = {}) => {
      if (opts.viewport) await page.setViewportSize(opts.viewport);
      await page.goto(target + (opts.query ?? ""));
      await page.waitForFunction(() => !!window.__crDebug);
    });
  },
});

export { expect };

export const debug = (page: Page) => page.evaluate(() => window.__crDebug as DebugState);

export const waitForPhase = (page: Page, phase: DebugState["phase"], timeout = 10_000) =>
  page.waitForFunction((p) => window.__crDebug?.phase === p, phase, { timeout, polling: "raf" });
