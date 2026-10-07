# Changelog

## 2.4.0

- `glassmorphism` is the default theme of `doner-tiles.css` and of the generator's `config.json`
  (was `neuromorphism`). Pages that relied on the default without `data-dnr-theme` change their look:
  add `data-dnr-theme="neuromorphism"` to `<html>` to keep it. The page needs `background: var(--dnr-page)`.
- Demo opens with glassmorphism.

## 2.3.0

- Themes `glassmorphism` (frosted translucent tiles over a gradient page) and `minimal` (hairline borders,
  no shadows), both with dark mode; in `doner-tiles.css` and as `styles/<theme>-doner-tiles.css`.
- Tile variable `--dnr-tile-backdrop` (`backdrop-filter`), `none` in the other themes.
- `--dnr-page` may be a gradient: set it with `background`, not `background-color`.
- Demo: the new themes, the header takes the tile color.

## 2.2.0

- Generator: `"hover"` in `config.json` sets the default button hover (any `data-dnr-hover` value);
  unknown values and a missing `button` component stop the build with an error.
- Hover text color is a fifth variable, `--dnr-btn-hover-color`, so `fill` works as the default too;
  the accent button's text color comes from `--dnr-btn-color`.

## 2.1.0

- Button hover effects: `data-dnr-hover="shadow|lift|press|glow|ring|fill|none"` on `<html>`, a container
  or one button; each sets `--dnr-btn-hover-shadow|transform|filter|fill`, so custom effects need no new CSS.
- Demo: hover picker in the header.

## 2.0.1

- Dark mode in `styles/doner-tiles.css`: with another theme on `<html>`, the default theme's dark variables
  no longer override it (neobrutalism got neuromorphism's soft shadows instead of its hard accent shadow).
- Every theme declares the same variables (neobrutalism: `--dnr-btn-filter-hover: none`), checked by a test.
- Demo: code boxes, labels and the nav border follow the theme in both schemes.

## 2.0.0

Breaking – see "Migrating from 1.x" in the README.

- Themes are files of `--dnr-*` variables; components read only those variables.
- Dark mode for every theme: follows the system, `data-dnr-scheme="dark|light"` on `<html>` forces it.
- Several themes in one file, switched with `data-dnr-theme` on `<html>` or any element (`styles/doner-tiles.css`).
- Tile actions switch to a row through a container query (tile width 480px) instead of the viewport width.
- Spacing and radius scale with the screen (`clamp()`).
- All CSS in `@layer doner`.
- Buttons: keyboard focus ring, `:active`, `:disabled` / `aria-disabled`, `font: inherit`, work as `<a>`;
  transitions respect `prefers-reduced-motion`.
- Tiles: spacing between content elements instead of a margin reset, `box-sizing`, image without the baseline gap,
  actions pinned to the bottom of stretched tiles.
- Generator: `themes` array, `colors.surface`/`text`/`dark`, contrast warnings (WCAG AA), config validation
  with exit code 1, works from any directory, fixed minifier (kept spaces before `:` in selectors).
- npm package `doner-tiles-ui`, MIT license, CI.

## 1.0.0

- Tile and button components with neuromorphism, neobrutalism and material themes.
- Node.js generator building a minified CSS file from `config.json`.
