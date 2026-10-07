// Demo page: theme, scheme, hover and color pickers, code blocks with Copy, theme CSS read from styles/
const themeChangeInput = document.getElementById("themeChange");
themeChangeInput.addEventListener("change", () => {
  document.documentElement.dataset.dnrTheme = themeChangeInput.value;
  syncColorInputs();
  showThemeCode();
});

const schemeChangeInput = document.getElementById("schemeChange");
schemeChangeInput.addEventListener("change", () => {
  if (schemeChangeInput.value) {
    document.documentElement.dataset.dnrScheme = schemeChangeInput.value;
  } else {
    delete document.documentElement.dataset.dnrScheme;
  }
  syncColorInputs();
});

const hoverChangeInput = document.getElementById("hoverChange");
hoverChangeInput.addEventListener("change", () => {
  document.documentElement.dataset.dnrHover = hoverChangeInput.value;
});

const colorChangeInput = document.getElementById("colorChange");
colorChangeInput.addEventListener("input", () => {
  changeCSSVariable("--dnr-accent", colorChangeInput.value);
});

const colorContrastChange = document.getElementById("colorContrastChange");
colorContrastChange.addEventListener("input", () => {
  changeCSSVariable("--dnr-accent-contrast", colorContrastChange.value);
});

// until the user picks a color, the inputs show the colors of the current theme and scheme
const syncColorInputs = () => {
  const style = getComputedStyle(document.documentElement);
  for (const [input, name] of [[colorChangeInput, "--dnr-accent"], [colorContrastChange, "--dnr-accent-contrast"]]) {
    if (!document.documentElement.style.getPropertyValue(name)) {
      input.value = style.getPropertyValue(name).trim();
    }
  }
  refreshPreview();
};

// hex next to each color picker, and the placeholder image drawn in the accent colors of the current scheme
// (an SVG made here, so the page loads nothing from other sites)
const demoImage = document.getElementById("demoImage");
const placeholder = (bg, fg) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" viewBox="0 0 512 256">` +
      `<rect width="512" height="256" fill="${bg}"/>` +
      `<text x="256" y="128" fill="${fg}" font-family="sans-serif" font-size="56" font-weight="600" ` +
      `text-anchor="middle" dominant-baseline="central">512 × 256</text></svg>`,
  );
const refreshPreview = () => {
  for (const input of [colorChangeInput, colorContrastChange]) {
    document.querySelector(`output[for="${input.id}"]`).value = input.value;
  }
  const style = getComputedStyle(document.documentElement);
  const hex = (name) => style.getPropertyValue(name).trim().replace("#", "");
  let [bg, fg] = [hex("--dnr-accent"), hex("--dnr-accent-contrast")];
  // the dark scheme has a light accent, a big light block would glare there
  if (style.colorScheme === "dark") [bg, fg] = [fg, bg];
  if (/^[0-9a-f]{3,8}$/i.test(bg) && /^[0-9a-f]{3,8}$/i.test(fg)) {
    demoImage.src = placeholder(`#${bg}`, `#${fg}`);
  }
};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncColorInputs);
syncColorInputs();

// "Only one theme?" shows the built file from styles/ for the picked theme, so it never drifts from the library;
// the minified file is spread over lines here to be readable, the colors picked above are written into it
const themeCss = {};
const themeDetails = document.querySelector(".theme-css");
const themeCode = document.getElementById("themeCode");

const formatCss = (css) => {
  let out = "";
  let depth = 0;
  let quote = "";
  const newline = () => "\n" + "  ".repeat(depth);
  for (const ch of css) {
    if (quote) {
      out += ch;
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
    } else if (ch === "{") {
      depth++;
      out += " {" + newline();
    } else if (ch === ";") {
      out += ";" + newline();
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      out = out.trimEnd() + newline() + "}" + newline();
    } else {
      out += ch;
    }
  }
  return out.replace(/\n\s*\n/g, "\n").trim() + "\n";
};

const showThemeCode = async () => {
  const theme = themeChangeInput.value;
  const file = `${theme}-doner-tiles.css`;
  try {
    themeCss[theme] ??= await fetch(`styles/${file}`).then((response) => {
      if (!response.ok) throw new Error(response.status);
      return response.text();
    });
  } catch {
    themeDetails.hidden = true;
    return;
  }
  if (theme !== themeChangeInput.value) return;
  let css = themeCss[theme];
  // replace the whole current value of the light scheme (first occurrence), so every change lands in the code
  for (const name of ["--dnr-accent", "--dnr-accent-contrast"]) {
    const value = document.documentElement.style.getPropertyValue(name);
    if (value) css = css.replace(new RegExp(`(${name}:)[^;}]*`), `$1${value.replace(/[;{}$]/g, "")}`);
  }
  document.getElementById("themeFile").textContent = file;
  themeCode.textContent = formatCss(css);
  themeDetails.hidden = false;
};
showThemeCode();

const changeCSSVariable = (name, value) => {
  document.documentElement.style.setProperty(name, value);
  refreshPreview();
  showThemeCode();
};

// a Copy button on every code block (added here, so the page without JavaScript has no dead buttons)
document.querySelectorAll(".code").forEach((block) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dnr-btn code__copy";
  button.textContent = "Copy";
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(block.querySelector("code").textContent);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select and copy";
    }
    setTimeout(() => (button.textContent = "Copy"), 2000);
  });
  block.querySelector(".code__bar").append(button);
});
