// Rebuilds ../styles: one file per theme and doner-tiles.css with all themes (first one is the default),
// always with every component and the themes' own colors, independent of config.json
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Doner, { listComponents, listThemes } from "./doner.js";

export const DEFAULT_THEME = "neuromorphism";

export function stylesBuilds() {
  const components = listComponents();
  const themes = listThemes();
  const all = [DEFAULT_THEME, ...themes.filter((t) => t !== DEFAULT_THEME)];
  return [
    ...themes.map((theme) => [`${theme}-doner-tiles.css`, { themes: [theme], components }]),
    ["doner-tiles.css", { themes: all, components }],
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "styles");
  fs.mkdirSync(stylesDir, { recursive: true });
  for (const [name, config] of stylesBuilds()) {
    const file = path.join(stylesDir, name);
    fs.writeFileSync(file, new Doner({ config }).build());
    console.log(`✅ ${path.relative(process.cwd(), file)}`);
  }
}
