// Demo page: theme, scheme, hover and color pickers, code boxes read from styles/
const themeChangeInput = document.getElementById("themeChange");
themeChangeInput.addEventListener("change", () => {
  document.documentElement.dataset.dnrTheme = themeChangeInput.value;
  syncColorInputs();
  document
    .querySelectorAll('.theme-code')
    .forEach(themeEl => {
      themeEl.classList.toggle(
        'hidden',
        themeEl.getAttribute('data-theme') !== themeChangeInput.value
      );
  });
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

// the code boxes show the built files from styles/, so they never drift from the library
document.querySelectorAll(".theme-code").forEach(async (themeEl) => {
  const response = await fetch(`styles/${themeEl.dataset.theme}-doner-tiles.css`);
  themeEl.value = await response.text();
  for (const name of ["--dnr-accent", "--dnr-accent-contrast"]) {
    const value = document.documentElement.style.getPropertyValue(name);
    if (value) themeEl.value = themeEl.value.replace(new RegExp(`(${name}:)[^;}]*`), `$1${value}`);
  }
});

const changeCSSVariable = (name, value) => {
  document.documentElement.style.setProperty(name, value);
  refreshPreview();
  // replace the whole current value of the light scheme (first occurrence), so every change lands in the code
  const pattern = new RegExp(`(${name}:)[^;}]*`);
  document
    .querySelectorAll('.theme-code').forEach(themeEl => {
      themeEl.value = themeEl.value.replace(pattern, `$1${value.replace(/[;{}$]/g, '')}`);
    });
}
