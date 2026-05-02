import { defineConfig, devices } from "@playwright/test";

// E2E config — runs against an already-running dev server on :8080.
// We don't auto-start the dev server because Claude/dev keeps it running
// in the background; auto-start would conflict on port 8080.
//
// To run: npx playwright test
//   --headed            run in real browser window (debug)
//   --ui                interactive mode
//   tests/e2e/sop04     filter to a slice
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // tests share dev DB state, run sequentially
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
