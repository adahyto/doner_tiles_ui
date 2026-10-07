import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = "file://" + path.join(DIR, "fixture.html");

const themes = fs
  .readdirSync(path.join(DIR, "../app/src/themes"))
  .filter((file) => file.endsWith(".css"))
  .map((file) => file.slice(0, -4))
  .sort();
const presets = [
  ...fs
    .readFileSync(path.join(DIR, "../app/src/components/button/index.css"), "utf8")
    .matchAll(/\.dnr-btn\[data-dnr-hover="([\w-]+)"\]/g),
].map(([, name]) => name);

const open = async (page, attributes) => {
  await page.goto(FIXTURE);
  await page.evaluate((attrs) => {
    for (const [name, value] of Object.entries(attrs)) document.documentElement.setAttribute(name, value);
  }, attributes);
};

for (const theme of themes) {
  // the scheme is set both ways: by the system (auto) and forced, the dark-mode bug of 2.0.0 hit only one of them
  for (const [scheme, system, forced] of [
    ["light", "light", null],
    ["dark", "dark", null],
    ["dark-forced", "light", "dark"],
    ["light-forced", "dark", "light"],
  ]) {
    test(`${theme} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      await open(page, { "data-dnr-theme": theme, ...(forced && { "data-dnr-scheme": forced }) });
      await expect(page).toHaveScreenshot(`${theme}-${scheme}.png`, { fullPage: true });
    });
  }

  for (const scheme of ["light", "dark"]) {
    test(`${theme} ${scheme} hover`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const preset of presets) {
        await open(page, { "data-dnr-theme": theme, "data-dnr-hover": preset });
        // the buttons with a margin, so lifted buttons, glows and offset shadows are in the picture
        const box = await page.locator("#tile .dnr-tile-actions").boundingBox();
        const clip = { x: box.x - 24, y: box.y - 16, width: box.width + 48, height: box.height + 40 };
        for (const button of ["plain", "accent"]) {
          await page.hover(`#${button}`);
          await expect(page, `${preset} ${button}`).toHaveScreenshot(`hover-${theme}-${scheme}-${preset}-${button}.png`, { clip });
        }
      }
    });
  }
}
