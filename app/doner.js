import fs from "fs";

export default class DonerClass {
  get #configJson() {
    return JSON.parse(fs.readFileSync("config.json", "utf8"));
  }

  get #cssColorVars() {
    const colors = this.#configJson.colors;
    return ` :root{--accent-color:${colors.accent}; --accent-color--contrast:${colors.accentContrast};}`;
  }

  get #minifiedFiles() {
    const { components, theme } = this.#configJson;
    return [
      components && this.#componentsCss(components),
      components && theme && this.#componentsCss(components, theme),
      components &&
        theme &&
        this.#minifyCss(`src/themes/${theme}/variables.css`),
    ]
      .filter(Boolean)
      .join("");
  }

  init() {
    fs.mkdirSync("_dist", { recursive: true });
    this.#createCssFile();
  }

  #createCssFile() {
    fs.writeFileSync(
      `_dist/${this.#configJson.theme}-doner-tiles.css`,
      this.#minifiedFiles + this.#cssColorVars
    );
  }

  #componentsCss(components, theme = "") {
    return components
      .map((component) => {
        let cssPath = "";
        if (theme) {
          cssPath = `src/themes/${theme}/components/${component}/index.css`;
        } else {
          cssPath = `src/components/${component}/index.css`;
        }
        return fs.existsSync(cssPath) ? this.#minifyCss(cssPath) : "";
      })
      .join("");
  }

  #minifyCss(src) {
    return fs
      .readFileSync(src, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s*([{}:;,])\s*/g, "$1")
      .replace(/\s+/g, " ")
      .replace(/\s*!\s*important/gi, "!important")
      .trim();
  }
}
