# Achievement medals for the app

Pre-sized copies of the medals in `/medals` (1254px transparent PNG originals).
Resized to 288×288 WebP (quality 86) with Pillow, keeping the full canvas, aspect ratio and alpha.
`scripts/bundle.mjs` inlines every `*.webp` here as `MEDALS['<file name>']`, e.g. `MEDALS['01-first-steps']`.
Locked badges reuse the same image with grayscale + opacity (see `.badge-medal` in `src/style.css`).
