import fs from "fs";

export default class DonerClass {
  #configJson;

  get #cssColorVars() {
    const { accent, accentContrast } = this.#configJson.colors;
    return `:root{--accent-color:${accent};--accent-color--contrast:${accentContrast};}`;
  }

  get #cssFiles() {
    const { components, theme } = this.#configJson;
    return [
      components && this.#componentsCss(components),
      theme && this.#readFile(`src/themes/${theme}/variables.css`),
      theme && this.#componentsCss(components, theme),
    ]
      .filter(Boolean)
      .join("");
  }

  constructor() {
    this.#loadConfig();
  }

  init() {
    fs.mkdirSync("_dist", { recursive: true });
    this.#createCssFile();
  }

  #loadConfig() {
    this.#configJson = JSON.parse(this.#readFile("config.json"));
  }

  #readFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: File not found - ${filePath}`);
      return "";
    }
    return fs.readFileSync(filePath, "utf8");
  }

  #createCssFile() {
    const cssContent = this.#mergeRootBlocks(
      this.#cssFiles + this.#cssColorVars
    );
    fs.writeFileSync(
      `_dist/${this.#configJson.theme}-doner-tiles.css`,
      this.#minifyCss(cssContent)
    );
  }

  #componentsCss(components, theme = "") {
    return components
      .map((component) => {
        const cssPath = theme
          ? `src/themes/${theme}/components/${component}/index.css`
          : `src/components/${component}/index.css`;
        return fs.existsSync(cssPath) ? this.#readFile(cssPath) : "";
      })
      .join("");
  }

  #minifyCss(input) {
    try {
      return input
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s*([{}:;,])\s*/g, "$1")
        .replace(/\s+/g, " ")
        .replace(/\s*!\s*important/gi, "!important")
        .trim();
    } catch (err) {
      return "";
    }
  }

  #mergeRootBlocks(styles) {
    const rootBlocks = styles.match(/:root\s*{[^}]*}/g);
    if (!rootBlocks) return styles;

    const mergedVars = Object.fromEntries(
      rootBlocks.flatMap((block) =>
        (block.match(/--[\w-]+\s*:\s*[^;]+;/g) || []).map((variable) => {
          const [key, value] = variable
            .split(":")
            .map((v) => v.replace(";", ""));
          return [key, value];
        })
      )
    );

    return (
      styles.replace(/:root\s*{[^}]*}/g, "") +
      `\n\n:root{${Object.entries(mergedVars)
        .map(([k, v]) => `${k}:${v};`)
        .join("")}}`
    );
  }
}
