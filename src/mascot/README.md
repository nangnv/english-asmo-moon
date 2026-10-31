# Mascot assets for the app

Pre-sized copies of the ASMO Moon mascot from `/mascot` (1254px transparent PNG originals).
Resized to 440×440 WebP (quality 84) with Pillow, keeping the full canvas, aspect ratio and alpha.
`scripts/bundle.mjs` inlines every `*.webp` here as `MASCOT.<name>` (e.g. `MASCOT.welcome`).

- `asmo-welcome.webp` — greeting a new learner
- `asmo-study.webp` — returning learner, today's lesson
- `asmo-correct.webp` — today's goal reached
- `asmo-rest.webp` — no progress data yet
