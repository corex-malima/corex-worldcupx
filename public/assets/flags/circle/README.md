# Circular flag assets

Place licensed circular country flag assets here using the team id as the file name:

```text
mex.png
rsa.png
kor.png
```

The app reads these files through `Team.flagUrl` at `/assets/flags/circle/{teamId}.png`.
If an image is missing, the UI falls back to the existing emoji flag inside the same circular frame.

Do not scrape Flaticon automatically. Add only assets downloaded with a valid license and keep attribution details in `docs/11-flag-assets.md`.
