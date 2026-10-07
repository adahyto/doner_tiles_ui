import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));

// hex, functional notation (rgb(), hsl(), oklch(), …) or a named color; nothing that could close a CSS block
const COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|[a-z-]+\([^;{}()]*\)|[a-z]+)$/i;

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

export function mergeRootBlocks(styles) {
  const rootPattern = /:root\s*{([^}]*)}/g;
  const vars = new Map();

  for (const [, body] of styles.matchAll(rootPattern)) {
    for (const declaration of body.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon === -1) continue;
      const key = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();
      if (key.startsWith("--") && value) vars.set(key, value);
    }
  }

  if (!vars.size) return styles;

  return (
    styles.replace(rootPattern, "") +
    `\n\n:root{${[...vars].map(([k, v]) => `${k}:${v};`).join("")}}`
  );
}

export default class DonerClass {
  #configJson;
  #root;

  get #cssColorVars() {
    const { accent, accentContrast } = this.#configJson.colors;
    return `:root{--accent-color:${accent};--accent-color--contrast:${accentContrast};}`;
  }

  get #cssFiles() {
    const { components, theme } = this.#configJson;
    return [
      this.#componentsCss(components),
      this.#readFile(`src/themes/${theme}/variables.css`),
      this.#componentsCss(components, theme),
    ].join("");
  }

  constructor({ root = APP_DIR, config } = {}) {
    this.#root = root;
    this.#configJson = config ?? this.#loadConfig();
    this.#validateConfig();
  }

  init() {
    const distDir = path.join(this.#root, "_dist");
    fs.mkdirSync(distDir, { recursive: true });
    const file = path.join(distDir, `${this.#configJson.theme}-doner-tiles.css`);
    fs.writeFileSync(file, this.build());
    return file;
  }

  build() {
    const css = (this.#cssFiles + this.#cssColorVars).replace(/\/\*[\s\S]*?\*\//g, "");
    return minifyCss(mergeRootBlocks(css));
  }

  #loadConfig() {
    try {
      return JSON.parse(this.#readFile("config.json"));
    } catch (err) {
      throw new DonerError(`config.json: ${err.message}`);
    }
  }

  #validateConfig() {
    const { theme, components, colors } = this.#configJson;

    if (typeof theme !== "string" || !this.#exists(`src/themes/${theme}/variables.css`)) {
      throw new DonerError(`Unknown theme "${theme}" - see src/themes/`);
    }
    if (!Array.isArray(components) || !components.length) {
      throw new DonerError(`"components" must be a non-empty array`);
    }
    for (const component of components) {
      if (!this.#exists(`src/components/${component}/index.css`)) {
        throw new DonerError(`Unknown component "${component}" - see src/components/`);
      }
    }
    for (const key of ["accent", "accentContrast"]) {
      if (!COLOR_PATTERN.test(colors?.[key] ?? "")) {
        throw new DonerError(`colors.${key} must be a CSS color, got "${colors?.[key]}"`);
      }
    }
  }

  #exists(filePath) {
    return fs.existsSync(path.join(this.#root, filePath));
  }

  #readFile(filePath) {
    return fs.readFileSync(path.join(this.#root, filePath), "utf8");
  }

  #componentsCss(components, theme = "") {
    return components
      .map((component) => {
        const cssPath = theme
          ? `src/themes/${theme}/components/${component}/index.css`
          : `src/components/${component}/index.css`;
        return this.#exists(cssPath) ? this.#readFile(cssPath) : "";
      })
      .join("");
  }
}
