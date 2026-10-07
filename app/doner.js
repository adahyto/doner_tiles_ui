import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));

// hex, a color function (rgb(), hsl(), oklch(), …) or a named color; nothing that could close a CSS block
const COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^;{}()]*\)|[a-z]+)$/i;

const COLOR_VARS = {
  accent: "--dnr-accent",
  accentContrast: "--dnr-accent-contrast",
  surface: "--dnr-surface",
  text: "--dnr-text",
};

// pairs checked against WCAG AA for normal text
const CONTRAST_PAIRS = [
  ["--dnr-accent-contrast", "--dnr-accent"],
  ["--dnr-text", "--dnr-surface"],
];

const SCHEME_BLOCK = /\[data-dnr-scheme="(light|dark)"\]\s*{([^}]*)}/g;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export class DonerError extends Error {}

export function minifyCss(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    // a space before ":" may be a descendant combinator (".a :is(b)"), so only the space after it goes
    .replace(/\s*([{};,])\s*/g, "$1")
    .replace(/:\s+/g, ":")
    .replace(/\s*!\s*important/gi, "!important")
    .trim();
}

export function parseDeclarations(body) {
  const declarations = new Map();
  for (const declaration of body.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const key = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (key && value) declarations.set(key, value);
  }
  return declarations;
}

export function contrastRatio(a, b) {
  const luminance = (hex) => {
    const full = hex.length === 4 ? hex.replace(/\w/g, (c) => c + c) : hex;
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function listThemes(root = APP_DIR) {
  return fs
    .readdirSync(path.join(root, "src/themes"))
    .filter((file) => file.endsWith(".css"))
    .map((file) => file.slice(0, -4))
    .sort();
}

export function listComponents(root = APP_DIR) {
  return fs
    .readdirSync(path.join(root, "src/components"), { recursive: true })
    .filter((file) => path.basename(file) === "index.css")
    .map((file) => path.dirname(file).split(path.sep).join("/"))
    .sort();
}

const declarationsCss = (declarations) =>
  [...declarations].map(([k, v]) => `${k}:${v};`).join("");

export default class DonerClass {
  #configJson;
  #root;
  warnings = [];

  constructor({ root = APP_DIR, config } = {}) {
    this.#root = root;
    this.#configJson = config ?? this.#loadConfig();
    this.#validateConfig();
  }

  init() {
    const distDir = path.join(this.#root, "_dist");
    fs.mkdirSync(distDir, { recursive: true });
    const file = path.join(distDir, "doner-tiles.css");
    fs.writeFileSync(file, this.build());
    return file;
  }

  build() {
    this.warnings = [];
    const { components, themes } = this.#configJson;
    const css =
      components.map((c) => this.#readFile(`src/components/${c}/index.css`)).join("") +
      themes.map((theme, i) => this.#themeCss(theme, i === 0)).join("");
    // a layer lets any unlayered rule of the page override the library without specificity hacks
    return minifyCss(`@layer doner{${css}}`);
  }

  #themeCss(theme, isDefault) {
    const source = this.#readFile(`src/themes/${theme}.css`).replace(/\/\*[\s\S]*?\*\//g, "");
    const schemes = { light: new Map(), dark: new Map() };
    for (const [, scheme, body] of source.matchAll(SCHEME_BLOCK)) {
      schemes[scheme] = parseDeclarations(body);
    }
    if (!schemes.light.size) {
      throw new DonerError(`Theme "${theme}" has no [data-dnr-scheme="light"] block`);
    }

    const { dark: darkColors = {}, ...lightColors } = this.#configJson.colors ?? {};
    this.#applyColors(schemes.light, lightColors);
    if (schemes.dark.size) this.#applyColors(schemes.dark, darkColors);
    for (const [scheme, declarations] of Object.entries(schemes)) {
      this.#checkContrast(`${theme} (${scheme})`, declarations);
    }

    const themeAttr = `[data-dnr-theme="${theme}"]`;
    // data-dnr-scheme lives on <html>; the theme may sit on <html> or on any element inside it,
    // and the default theme also applies to :root; its dark block skips a :root with another theme,
    // because :root:not(...) outranks that theme's light block and would leak into it
    const selectors = (condition = "") =>
      [
        ...(isDefault ? [condition ? `:root${condition}:not([data-dnr-theme])` : ":root"] : []),
        condition ? `:root${condition}${themeAttr}` : themeAttr,
        ...(condition ? [`:root${condition} ${themeAttr}`] : []),
      ].join(",");

    let css = `${selectors()}{${declarationsCss(schemes.light)}}`;
    if (schemes.dark.size) {
      const dark = declarationsCss(schemes.dark);
      css +=
        `@media (prefers-color-scheme: dark){${selectors(':not([data-dnr-scheme="light"])')}{${dark}}}` +
        `${selectors('[data-dnr-scheme="dark"]')}{${dark}}`;
    }
    return css;
  }

  #applyColors(declarations, colors) {
    for (const [key, value] of Object.entries(colors)) {
      declarations.set(COLOR_VARS[key], value);
    }
  }

  #checkContrast(label, declarations) {
    for (const [fg, bg] of CONTRAST_PAIRS) {
      const [a, b] = [declarations.get(fg), declarations.get(bg)];
      if (!HEX.test(a ?? "") || !HEX.test(b ?? "")) continue;
      const ratio = contrastRatio(a, b);
      if (ratio < 4.5) {
        this.warnings.push(`${label}: ${fg} ${a} on ${bg} ${b} has contrast ${ratio.toFixed(2)}:1, WCAG AA needs 4.5:1`);
      }
    }
  }

  #loadConfig() {
    try {
      return JSON.parse(this.#readFile("config.json"));
    } catch (err) {
      throw new DonerError(`config.json: ${err.message}`);
    }
  }

  #validateConfig() {
    const { themes, components, colors = {} } = this.#configJson;

    if (!Array.isArray(themes) || !themes.length) {
      throw new DonerError(`"themes" must be a non-empty array, the first one is the default`);
    }
    for (const theme of themes) {
      if (typeof theme !== "string" || !/^[\w-]+$/.test(theme) || !this.#exists(`src/themes/${theme}.css`)) {
        throw new DonerError(`Unknown theme "${theme}" - see src/themes/`);
      }
    }
    if (!Array.isArray(components) || !components.length) {
      throw new DonerError(`"components" must be a non-empty array`);
    }
    for (const component of components) {
      if (!this.#exists(`src/components/${component}/index.css`)) {
        throw new DonerError(`Unknown component "${component}" - see src/components/`);
      }
    }
    const { dark = {}, ...light } = colors;
    for (const [prefix, group] of [["colors", light], ["colors.dark", dark]]) {
      for (const [key, value] of Object.entries(group)) {
        if (!(key in COLOR_VARS)) {
          throw new DonerError(`Unknown ${prefix}.${key} - use ${Object.keys(COLOR_VARS).join(", ")}`);
        }
        if (!COLOR_PATTERN.test(value)) {
          throw new DonerError(`${prefix}.${key} must be a CSS color, got "${value}"`);
        }
      }
    }
  }

  #exists(filePath) {
    return fs.existsSync(path.join(this.#root, filePath));
  }

  #readFile(filePath) {
    return fs.readFileSync(path.join(this.#root, filePath), "utf8");
  }
}
