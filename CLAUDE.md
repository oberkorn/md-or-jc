# Project notes for Claude

Static React game deployed to Cloudflare Workers as assets-only. Single-file app; no build step.

## Deploy

`npx wrangler deploy` — config in `wrangler.jsonc`, Worker name `md-or-jc`, target `md-or-jc.pheb.workers.dev`.

## Image workflow

- `images_original/` — source truth (mixed .jpg/.webp/.avif)
- `images/` — regenerated JPEGs, face-cropped
- `crop_faces.py` — YuNet (primary) + Haar (fallback), square 1:1 crops, face ~40% of frame, min 90% of source short-edge
- Never hand-edit `images/`; edit originals and re-run the script

## Invariants — don't break

- **Trump card (`trump_pope.jpg`)** has `answer: "trump"`, pinned to slot 10 by `startGame` in `index.html`, and scores wrong no matter what. Leave this intact unless the user explicitly asks to change the joke.
- **Results pill** uses `🗽 ??` for Trump, not the US flag emoji — regional indicator sequences don't render on older Windows.
- `index.html` assumes all image paths end in `.jpg`. Keep it that way; the crop script writes JPEG regardless of source format.

## Cloudflare

- `wrangler.jsonc` pins `account_id` because the user has multiple Cloudflare accounts
- Assets-only Worker (`assets.directory: "./"`); files excluded via `.assetsignore`
