// Rebuilds ../styles/<theme>-doner-tiles.css for every theme with components and colors from config.json
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Doner from "./doner.js";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.join(appDir, "..", "styles");
const config = JSON.parse(fs.readFileSync(path.join(appDir, "config.json"), "utf8"));

for (const theme of fs.readdirSync(path.join(appDir, "src/themes"))) {
  const file = path.join(stylesDir, `${theme}-doner-tiles.css`);
  fs.writeFileSync(file, new Doner({ config: { ...config, theme } }).build());
  console.log(`✅ ${path.relative(process.cwd(), file)}`);
}
