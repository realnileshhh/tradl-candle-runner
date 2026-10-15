// The review page (/): the host's side of the contract, inline and in an iframe.

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
