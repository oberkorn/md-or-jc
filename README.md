# MD or JC?

Is that face a **Medical Doctor** or **Jesus Christ**? A 10-card image guessing game.

Live: <https://mdjc.pheb.workers.dev>

## Stack

Single-file React app (React + Babel Standalone via CDN) served as static assets from a Cloudflare Worker. No build step.

## Deploy

```sh
npx wrangler deploy
```

Config is in `wrangler.jsonc`. The Worker is assets-only (no script); everything ships as static files.

## Re-cropping source images

Originals live in `images_original/`. Cropped, face-centered JPEGs end up in `images/`. To regenerate:

```sh
python3 -m venv .venv
.venv/bin/pip install opencv-python-headless pillow pillow-avif-plugin
.venv/bin/python crop_faces.py
```

Face detection runs OpenCV's YuNet DNN (`yunet.onnx`, committed) with Haar cascades as fallback. Crops are square (1:1), face ~40% of frame height, minimum 90% of source short-edge so small-face images keep context.

**Never hand-edit files in `images/`** — the script wipes and regenerates them from `images_original/` each run.

## Card deck

- 8 medical doctors (`doctor_*`)
- 10 Jesus depictions (`jc_*`, `Jesus_Christ*`, `hobart`)
- 1 Trump (`trump_pope`)

Each game shuffles 9 random non-Trump cards, then pins the Trump card to slot 10. The Trump card is a trick — both MD and JC score as wrong. Max achievable score: 9/10.
