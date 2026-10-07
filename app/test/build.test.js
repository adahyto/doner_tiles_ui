import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import Doner, { DonerError, minifyCss, mergeRootBlocks } from "../doner.js";

const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLES_DIR = path.join(APP_DIR, "..", "styles");
const baseConfig = JSON.parse(fs.readFileSync(path.join(APP_DIR, "config.json"), "utf8"));
const themes = fs.readdirSync(path.join(APP_DIR, "src/themes"));

for (const theme of themes) {
  test(`styles/${theme}-doner-tiles.css is up to date`, () => {
    const css = new Doner({ config: { ...baseConfig, theme } }).build();
    const committed = fs.readFileSync(path.join(STYLES_DIR, `${theme}-doner-tiles.css`), "utf8");
    assert.equal(committed, css, "run npm run build:styles");
  });
}

test("output is wrapped in @layer doner", () => {
  const css = new Doner({ config: baseConfig }).build();
  assert.ok(css.startsWith("@layer doner{") && css.endsWith("}"));
});

test("minifier keeps descendant combinators before pseudo-classes", () => {
  assert.equal(minifyCss(".a :is(h2, h3) { margin : 0 }"), ".a :is(h2,h3){margin :0}");
  assert.equal(minifyCss("p :first-child{x: 1}"), "p :first-child{x:1}");
  assert.equal(minifyCss("@media (min-width: 856px) { a { b: c !important } }"), "@media (min-width:856px){a{b:c!important}}");
});

test("merged :root keeps a variable without trailing semicolon and values with colons", () => {
  const css = mergeRootBlocks(":root{--a: 1px;--b: url(data:x)}\n.x{y:z}:root{--a:2px}");
  assert.match(css, /--a:2px;/);
  assert.match(css, /--b:url\(data:x\);/);
  assert.equal(css.match(/:root/g).length, 1);
});

test("init writes _dist next to the generator, whatever the cwd", () => {
  const cwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doner-"));
  try {
    process.chdir(tmp);
    const file = new Doner().init();
    assert.equal(path.dirname(file), path.join(APP_DIR, "_dist"));
    assert.ok(fs.existsSync(file));
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true });
  }
});

test("invalid config fails loudly", () => {
  const bad = [
    { ...baseConfig, theme: "nope" },
    { ...baseConfig, components: ["tile", "nope"] },
    { ...baseConfig, components: [] },
    { ...baseConfig, colors: { accent: "red;}body{display:none", accentContrast: "#fff" } },
  ];
  for (const config of bad) {
    assert.throws(() => new Doner({ config }), DonerError);
  }
  assert.doesNotThrow(() => new Doner({ config: { ...baseConfig, colors: { accent: "rgb(1 2 3 / 50%)", accentContrast: "white" } } }));
});
