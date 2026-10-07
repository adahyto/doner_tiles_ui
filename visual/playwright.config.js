import { defineConfig } from "@playwright/test";

// screenshots depend on the fonts and the renderer, so they are made and checked only in
// mcr.microsoft.com/playwright:v1.63.0-noble (CI uses the same image, see README "Development")
export default defineConfig({
  testDir: ".",
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    browserName: "chromium",
    viewport: { width: 1100, height: 760 },
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.002 },
  },
});
