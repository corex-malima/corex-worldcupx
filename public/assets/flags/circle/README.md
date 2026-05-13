# Circular flag assets

Place licensed country flag assets here using the team id as the file name:

```text
mex.svg
rsa.svg
kor.svg
```

The app reads these files through `Team.flagUrl` at `/assets/flags/circle/{teamId}.svg`.
If an image is missing, the UI falls back to a FIFA-code badge inside the same circular frame.

Current assets come from `flag-icons` under MIT license. Keep attribution details in `docs/11-flag-assets.md`.

Missing images intentionally fall back to the FIFA code in the UI.
