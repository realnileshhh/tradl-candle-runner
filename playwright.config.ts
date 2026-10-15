import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { TargetOptions } from "./tests/e2e/fixtures";

// The verification suite (PRD section 12): the regression gate before any change ships.
// Three targets run the same checks:
//   app        /play, the React component (src/game through <CandleRunner />)
//   embed      /candle-runner-loading.html, the one-file build
//   reference  reference/candle-runner-loading.html, the original as it shipped on
//              13 October 2026: the baseline that proves the checks themselves
// `npm test` runs app and embed; `npm run test:reference` runs the baseline.

const PORT = 3210;
const reference = pathToFileURL(join(__dirname, "reference", "candle-runner-loading.html")).href;

export default defineConfig<TargetOptions>({
  testDir: "tests/e2e",
  timeout: 120_000,
  fullyParallel: true,
  workers: 3,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    // the product's chat column
    viewport: { width: 1005, height: 800 },
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    { name: "app", use: { target: "/play" } },
    { name: "embed", use: { target: "/candle-runner-loading.html" } },
    { name: "reference", use: { target: reference } },
  ],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/play`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
