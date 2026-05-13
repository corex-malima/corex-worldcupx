# Flag assets

The country flag SVGs in `public/assets/flags/circle/` come from the open-source `flag-icons` project.

- Source: https://github.com/lipis/flag-icons
- License: MIT
- Format used here: `flags/1x1/*.svg`

The app renders each SVG in a circular frame through `TeamIdentity`. If an asset is missing, the UI falls back to a stable circular FIFA-code badge instead of showing a broken image.
