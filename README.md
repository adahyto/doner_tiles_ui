# Doner Tiles UI

## Composable tiles css library generator

Lightweight CSS library designed to help you build esthetic tile-based interfaces effortlessly.
Check out the repo and add your themes to match your project or build tiles CSS excluding some components.

Demo: https://adahyto.github.io/doner_tiles_ui/

## Install

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/doner-tiles-ui@2/styles/doner-tiles.css">
```

or `npm i doner-tiles-ui` and `import "doner-tiles-ui";` (all themes) / `import "doner-tiles-ui/styles/material-doner-tiles.css";` in a bundler.

## Quick start

Use one of the ready-made files from `styles/`:

- `doner-tiles.css` – all themes, `neuromorphism` is the default,
- `neuromorphism-doner-tiles.css`, `neobrutalism-doner-tiles.css`, `material-doner-tiles.css` – a single theme.

```html
<div class="dnr-tile">
  <img class="dnr-tile-img" src="" alt="" />
  <div class="dnr-tile-header">
    <h2></h2>
    <h3></h3>
  </div>
  <div class="dnr-tile-content"></div>
  <div class="dnr-tile-actions">
    <button class="dnr-btn"></button>
    <button class="dnr-btn dnr-btn--accent"></button>
  </div>
</div>
```

The tile is a size container (its buttons switch to a row at 480px of tile width), so it has to get its width
from the layout – a grid cell, a block, a flex item with `flex: 1` – not from its content.

Everything sits in `@layer doner`, so any rule of your page overrides the library without fighting specificity.

## Themes and dark mode

The first theme of a build applies to the whole page. Any other theme in the file can be set on `<html>` or on any element:

```html
<html data-dnr-theme="neobrutalism">
<section data-dnr-theme="material">…</section>
```

Dark mode follows the system. Force a scheme with `data-dnr-scheme` on `<html>`:

```html
<html data-dnr-scheme="dark">   <!-- or "light" -->
```

For the page background use `var(--dnr-page)` – neuromorphism only looks right when the page has the tile color:

```css
body { background: var(--dnr-page); color: var(--dnr-text); }
```

## Button hover

Pick how buttons react to the pointer with `data-dnr-hover` on `<html>`, on a container or on a single button
(the button's own attribute wins):

```html
<html data-dnr-hover="lift">
<button class="dnr-btn" data-dnr-hover="glow">…</button>
```

| Value | Effect |
| --- | --- |
| `shadow` | the theme's hover shadow (default) |
| `lift` | rises by 3px with the theme's hover shadow |
| `press` | sinks in: inner shadow, scaled to 96% |
| `glow` | soft halo in the accent color |
| `ring` | accent ring around the button |
| `fill` | the accent sweeps in from the left; the accent button inverts |
| `none` | no change |

Each value only sets four variables on the button, so you can also write your own:
`--dnr-btn-hover-shadow`, `--dnr-btn-hover-transform`, `--dnr-btn-hover-filter` and `--dnr-btn-hover-fill`
(`0%`–`100%`, width of the `--dnr-btn-fill-color` sweep). With `prefers-reduced-motion` buttons do not move.

## Variables

Override any of them on `:root` or on the element with `data-dnr-theme`:

| Variable | Used for |
| --- | --- |
| `--dnr-accent`, `--dnr-accent-contrast` | accent button background and its text |
| `--dnr-surface`, `--dnr-text` | tile background and text |
| `--dnr-page` | suggested page background (not used by the components) |
| `--dnr-space` | tile padding and spacing |
| `--dnr-radius`, `--dnr-img-radius`, `--dnr-btn-radius` | corner radius of tile, image, button |
| `--dnr-tile-border`, `--dnr-tile-shadow` | tile border and shadow |
| `--dnr-btn-bg`, `--dnr-btn-border`, `--dnr-btn-shadow`, `--dnr-btn-shadow-hover`, `--dnr-btn-filter-hover` | button |
| `--dnr-btn-accent-border`, `--dnr-btn-accent-shadow-hover` | accent button |
| `--dnr-focus-ring` | keyboard focus outline |

## Build your own CSS

Requires Node.js 18.17+, no dependencies.

1. Edit `app/config.json`:

   ```json
   {
     "themes": ["neobrutalism", "material"],
     "components": ["tile", "tile/header", "tile/image", "tile/actions", "button", "button/accent"],
     "colors": {
       "accent": "#122446",
       "accentContrast": "#ffffff",
       "dark": { "accent": "#ffd23f", "accentContrast": "#111111" }
     }
   }
   ```

   - `themes` – files from `app/src/themes/`, the first one is the default,
   - `components` – folders from `app/src/components/`,
   - `colors` (optional) – `accent`, `accentContrast`, `surface`, `text`; `colors.dark` for the dark scheme.
     Colors below WCAG AA contrast (4.5:1) print a warning.
2. Run:

   ```sh
   cd app
   npm run start
   ```

3. The minified file is written to `app/_dist/doner-tiles.css`.

### Adding a theme

Create `app/src/themes/<name>.css` with two blocks of variables – every variable from the table in the light block,
only the overrides in the dark one:

```css
[data-dnr-scheme="light"] { color-scheme: light; --dnr-accent: …; … }
[data-dnr-scheme="dark"]  { color-scheme: dark; --dnr-accent: …; }
```

The generator turns them into the right selectors. `npm test` checks that the theme defines every variable.

## Migrating from 1.x

- Variables are prefixed: `--accent-color` → `--dnr-accent`, `--accent-color--contrast` → `--dnr-accent-contrast`,
  theme variables (`--shadow--std`, `--border-radius--std`, …) are replaced by the ones in the table.
- `config.json`: `"theme": "x"` → `"themes": ["x"]`; the output is `_dist/doner-tiles.css`.
- Themes are single files of variables (`src/themes/<name>.css`) instead of folders with component overrides.
- Switch themes at runtime with `data-dnr-theme` instead of swapping the stylesheet.

## Development

```sh
cd app
npm run build:styles   # rebuild styles/ (every component, every theme, theme colors)
npm test               # checks that styles/ is up to date, themes are complete and the generator works
```
