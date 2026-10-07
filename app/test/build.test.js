import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import Doner, { DonerError, contrastRatio, listComponents, listThemes, minifyCss, parseDeclarations } from "../doner.js";
import { stylesBuilds } from "../build-styles.js";

const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLES_DIR = path.join(APP_DIR, "..", "styles");
const baseConfig = JSON.parse(fs.readFileSync(path.join(APP_DIR, "config.json"), "utf8"));

for (const [name, config] of stylesBuilds()) {
  test(`styles/${name} is up to date`, () => {
    const committed = fs.readFileSync(path.join(STYLES_DIR, name), "utf8");
    assert.equal(committed, new Doner({ config }).build(), "run npm run build:styles");
  });
}

test("every theme defines every variable the components use, in both schemes", () => {
  const used = new Set();
  for (const component of listComponents()) {
    const css = fs.readFileSync(path.join(APP_DIR, "src/components", component, "index.css"), "utf8");
    // var(--x, fallback) is optional
    for (const [, name] of css.matchAll(/var\((--dnr-[\w-]+)\)/g)) used.add(name);
  }
  // the button's own hover variables are set by the component, not by the themes
  for (const name of used) if (/^--dnr-btn-(hover-|fill-color$)/.test(name)) used.delete(name);
  for (const theme of listThemes()) {
    const source = fs.readFileSync(path.join(APP_DIR, "src/themes", `${theme}.css`), "utf8");
    const light = parseDeclarations(source.match(/\[data-dnr-scheme="light"\]\s*{([^}]*)}/)[1]);
    const dark = parseDeclarations(source.match(/\[data-dnr-scheme="dark"\]\s*{([^}]*)}/)[1]);
    for (const name of used) assert.ok(light.has(name), `${theme} misses ${name}`);
    for (const name of dark.keys()) assert.ok(light.has(name), `${theme} dark-only ${name}`);
  }
});

test("every theme declares the same variables, so none leaks in from the default theme on :root", () => {
  const names = (theme) => {
    const source = fs.readFileSync(path.join(APP_DIR, "src/themes", `${theme}.css`), "utf8");
    return [...parseDeclarations(source.match(/\[data-dnr-scheme="light"\]\s*{([^}]*)}/)[1]).keys()].sort();
  };
  const [first, ...rest] = listThemes();
  for (const theme of rest) assert.deepEqual(names(theme), names(first), `${theme} vs ${first}`);
});

test("default themes pass the contrast check", () => {
  const doner = new Doner({ config: { themes: listThemes(), components: listComponents() } });
  doner.build();
  assert.deepEqual(doner.warnings, []);
});

test("low contrast colors produce a warning", () => {
  const doner = new Doner({ config: { ...baseConfig, colors: { accent: "#777", accentContrast: "#888" } } });
  doner.build();
  assert.equal(doner.warnings.length, 1);
  assert.match(doner.warnings[0], /neuromorphism \(light\).*--dnr-accent-contrast #888/);
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(0), "21");
});

test("first theme is the default on :root, others only on their attribute, dark scheme auto and forced", () => {
  const css = new Doner({ config: { ...baseConfig, themes: ["material", "neobrutalism"] } }).build();
  assert.ok(css.startsWith("@layer doner{") && css.endsWith("}"));
  assert.match(css, /:root,\[data-dnr-theme="material"\]\{/);
  assert.match(css, /\}\[data-dnr-theme="neobrutalism"\]\{/);
  assert.match(css, /@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-dnr-scheme="light"\]\):not\(\[data-dnr-theme\]\),/);
  // the default dark block must not outrank another theme's light block on <html>
  assert.match(css, /\}:root\[data-dnr-scheme="dark"\]:not\(\[data-dnr-theme\]\),/);
  assert.match(css, /:root\[data-dnr-scheme="dark"\] \[data-dnr-theme="neobrutalism"\]\{/);
  assert.doesNotMatch(css, /:root\[data-dnr-scheme="dark"\],:root\[data-dnr-scheme="dark"\]\[data-dnr-theme="neobrutalism"\]/);
});

test("config colors override the theme, colors.dark only the dark scheme", () => {
  const css = new Doner({ config: { ...baseConfig, colors: { accent: "#123456", dark: { accent: "#abcdef" } } } }).build();
  const [light, dark] = css.split("@media (prefers-color-scheme");
  assert.match(light, /--dnr-accent:#123456;/);
  assert.match(dark, /--dnr-accent:#abcdef;/);
});

test("minifier keeps descendant combinators before pseudo-classes", () => {
  assert.equal(minifyCss(".a :is(h2, h3) { margin : 0 }"), ".a :is(h2,h3){margin :0}");
  assert.equal(minifyCss("p :first-child{x: 1}"), "p :first-child{x:1}");
  assert.equal(minifyCss("@media (min-width: 856px) { a { b: c !important } }"), "@media (min-width:856px){a{b:c!important}}");
});

test("declarations keep values with colons and a last one without semicolon", () => {
  const d = parseDeclarations(" --a: 1px; --b: url(data:x) ");
  assert.equal(d.get("--a"), "1px");
  assert.equal(d.get("--b"), "url(data:x)");
});

test("init writes _dist next to the generator, whatever the cwd", () => {
  const cwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doner-"));
  try {
    process.chdir(tmp);
    const file = new Doner().init();
    assert.equal(file, path.join(APP_DIR, "_dist", "doner-tiles.css"));
    assert.ok(fs.existsSync(file));
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true });
  }
});

test("invalid config fails loudly", () => {
  const bad = [
    { ...baseConfig, themes: ["nope"] },
    { ...baseConfig, themes: "neuromorphism" },
    { ...baseConfig, themes: ["../neuromorphism"] },
    { ...baseConfig, components: ["tile", "nope"] },
    { ...baseConfig, components: [] },
    { ...baseConfig, colors: { accent: "red;}body{display:none" } },
    { ...baseConfig, colors: { dark: { text: "url(x)" } } },
    { ...baseConfig, colors: { border: "#fff" } },
  ];
  for (const config of bad) {
    assert.throws(() => new Doner({ config }), DonerError, JSON.stringify(config));
  }
  assert.doesNotThrow(() => new Doner({ config: { ...baseConfig, colors: { accent: "rgb(1 2 3 / 50%)", accentContrast: "white" } } }));
});

test("package versions and CHANGELOG agree", () => {
  const root = JSON.parse(fs.readFileSync(path.join(APP_DIR, "..", "package.json"), "utf8"));
  const app = JSON.parse(fs.readFileSync(path.join(APP_DIR, "package.json"), "utf8"));
  const changelog = fs.readFileSync(path.join(APP_DIR, "..", "CHANGELOG.md"), "utf8");
  assert.equal(app.version, root.version);
  assert.equal(changelog.match(/^## (\S+)/m)[1], root.version);
});

test("every hover preset sets all four hover variables", () => {
  const css = fs.readFileSync(path.join(APP_DIR, "src/components/button/index.css"), "utf8");
  const presets = [...css.matchAll(/\.dnr-btn\[data-dnr-hover="([\w-]+)"\]\s*{([^}]*)}/g)];
  assert.deepEqual(presets.map(([, name]) => name), ["shadow", "lift", "press", "glow", "ring", "fill", "none"]);
  for (const [, name, body] of presets) {
    const keys = [...parseDeclarations(body).keys()].sort();
    assert.deepEqual(keys, ["--dnr-btn-hover-fill", "--dnr-btn-hover-filter", "--dnr-btn-hover-shadow", "--dnr-btn-hover-transform"], name);
  }
});
