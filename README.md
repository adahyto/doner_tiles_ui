# Doner Tiles UI

## Composable tiles css library generator

Lightweight CSS library designed to help you build esthetic tile-based interfaces effortlessly.
Check out the repo and add your themes to match your project or build tiles CSS excluding some components.

Demo: https://adahyto.github.io/doner_tiles_ui/

## Quick start

Pick a ready-made theme from `styles/` (`neuromorphism`, `neobrutalism`, `material`) and use the markup:

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

## Build your own CSS

Requires Node.js, no dependencies.

1. Edit `app/config.json`:
   - `theme` – a folder from `app/src/themes/`,
   - `components` – components to include (folders from `app/src/components/`),
   - `colors.accent` and `colors.accentContrast` – accent colors.
2. Run:

   ```sh
   cd app
   npm run start
   ```

3. The minified file is written to `app/_dist/<theme>-doner-tiles.css`.

To add a theme, create `app/src/themes/<name>/variables.css` and component overrides in `app/src/themes/<name>/components/<component>/index.css`.
