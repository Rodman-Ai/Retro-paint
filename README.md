# Retro Paint

A browser-based retro paint emulator that runs on desktop, tablet, and phone.
One canvas, three switchable modes — each faithfully themed after a beloved
classic:

| Mode              | Inspiration                | Era    |
| ----------------- | -------------------------- | ------ |
| **MS Paint 95**   | Microsoft Paint on Win 95  | 1995   |
| **Mario Paint**   | Mario Paint on the SNES    | 1992   |
| **Kid Pix**       | Kid Pix on classic Mac OS  | 1989+  |

No build step. No dependencies. Just static HTML, CSS, and vanilla JavaScript
talking to the HTML5 Canvas and Web Audio APIs.

---

## Live demo

Once GitHub Pages is enabled (see [Deploying](#deploying)), the app will be
served at:

    https://rodman-ai.github.io/Retro-paint/

---

## Quick start (local)

```bash
# Any static file server works. Pick one:
python3 -m http.server 8000
# or
npx --yes serve .
```

Then open `http://localhost:8000`. You can also just double-click
`index.html` — everything is loaded with relative paths.

---

## Feature matrix

### MS Paint 95
- Win 95 chrome — beveled gray buttons, blue-gradient titlebar, sunken status
  bar, classic 28-color palette.
- **Tools:** pencil, brush, eraser, flood fill (bucket), eyedropper, spray
  can, line, rectangle (outline + filled), ellipse (outline + filled).
- Live drag-preview for every shape tool (snapshot/restore pattern).

### Mario Paint
- Candy-pink + sky-blue theme, chunky pixel-art buttons with 3D drop shadow.
- **Musical Pencil** — every palette color is mapped to a Web Audio note;
  each click and drag plays the corresponding tone.
- **Stamps** (8 hand-built pixel-art sprites): mushroom, star, heart, flower,
  Yoshi, coin, music note, smile.
- All standard tools (brush, eraser, fill, spray) themed to match.

### Kid Pix
- Bold black-bordered chunky 90s Mac look, hatched diagonals, pop colors.
- **Wacky brushes** (6 styles): rainbow stripes, echo halos, sparkle burst,
  kaleidoscope mirror, scattered colored dots, wobbly noodle.
- **Cartoon stamps** (7): sun, cat, house, tree, UFO, smiley, pop-star.
- **Dynamite** — animated particle explosion + shockwave that wipes the
  canvas to white.
- **Oh No!** — full-screen splash text, then clear.

### Cross-cutting features
- HTML5 Canvas at a logical 640 × 480, scaled responsively while keeping a
  4 : 3 aspect ratio.
- Pointer Events for unified mouse / touch / pen / stylus input.
- 16-step undo history (`Ctrl+Z`).
- Save current canvas as a PNG (`Ctrl+S` or click 💾 Save).
- Brush size slider (1–32 px).
- Primary + secondary color swatches (Shift- or right-click any palette
  color to set the secondary).
- Click the big primary/secondary swatch to open a full OS color picker.
- Web Audio synth for every sound — no audio assets to ship.

---

## Controls

### Mouse / touch
| Action                                      | What it does                          |
| ------------------------------------------- | ------------------------------------- |
| Click / tap a tool                          | Select tool                           |
| Click / tap a palette swatch                | Set primary color                     |
| Shift-click or right-click a swatch         | Set secondary color                   |
| Click the big primary/secondary swatch      | Open OS color picker                  |
| Drag on canvas                              | Draw with current tool                |
| Drag a shape tool                           | Live-preview a line/rect/ellipse      |
| Tap a stamp tool then tap canvas            | Drop a stamp at that point            |
| Tap **Dynamite** then tap canvas            | Animated explosion, then clear        |
| Tap **Oh No!**                              | Splash text, then clear               |

### Keyboard shortcuts
| Key                  | Action                          |
| -------------------- | ------------------------------- |
| `1`                  | Switch to MS Paint 95           |
| `2`                  | Switch to Mario Paint           |
| `3`                  | Switch to Kid Pix               |
| `Ctrl/Cmd + Z`       | Undo                            |
| `Ctrl/Cmd + S`       | Save canvas as PNG              |

---

## Architecture

```
Retro-paint/
├── index.html               # Page shell (~3 KB)
├── styles.css               # Layout + 3 themed stylesheets (~12 KB)
├── js/
│   ├── app.js               # Canvas engine, tools, mode switching
│   ├── modes.js             # Palettes, tool lists, pixel-art stamps
│   └── sounds.js            # Web Audio synth (notes + SFX)
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions → GitHub Pages
├── .nojekyll                # Tell Pages not to Jekyll-process the site
└── README.md
```

### Drawing engine (`js/app.js`)
- A single `<canvas>` at logical 640 × 480.
- All tools implement `{ down(p), move(p)?, up(p)? }` and are dispatched from
  unified Pointer Event handlers.
- Shape tools snapshot the canvas on `pointerdown` (`getImageData`) and
  restore + redraw on every `pointermove` so previews never accumulate.
- `floodFill` is a stack-based scanline fill on `ImageData`.
- Wacky brushes are pure functions of `(ctx, x, y, lastX, lastY)` and live in
  a small registry inside the file.
- Undo keeps the last 16 `ImageData` snapshots in memory.

### Modes (`js/modes.js`)
- `PaintModes.palettes[mode]` — color list per mode.
- `PaintModes.tools[mode]`    — ordered list of tool buttons per mode.
- `PaintModes.stamps[set]`    — pixel-art stamps as `{ rows, pal, w, h }`,
  rendered with `drawStamp(ctx, stamp, x, y, scale)`.

### Sound (`js/sounds.js`)
- One lazily-created `AudioContext`, resumed on the first user gesture
  (required by Safari / Chrome auto-play policy).
- Helpers for tones, noise bursts, and frequency sweeps. All effects
  (`stampPlop`, `eraseSwoosh`, `wackyBoing`, `sprayHiss`, `pop`, `rainbow`,
  `explosion`, `ohNo`, `noteForColor`) are composed from those.

---

## Deploying

This repo deploys to **GitHub Pages** via GitHub Actions. The workflow at
`.github/workflows/deploy.yml` uploads the whole repo as a Pages artifact and
deploys it on every push to `main` or to this development branch.

### One-time setup (repo owner, ~30 seconds)

1. Open **Settings → Pages** in the GitHub repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push (or re-run the workflow) — the action publishes to
   `https://rodman-ai.github.io/Retro-paint/`.

That's it. Subsequent pushes auto-deploy. The action's run logs and the live
URL will appear under the **Actions** and **Environments** tabs.

### Deploying somewhere else

The site is fully static with relative paths, so it drops straight into:
- **Netlify** — drag the folder onto netlify.com/drop, or `netlify deploy`.
- **Vercel** — `vercel --prod` from the repo root.
- **Cloudflare Pages** — connect the repo, leave the build command blank,
  set the output directory to `/`.
- **S3 + CloudFront**, **nginx**, **Caddy**, anything that serves files.

---

## Browser support

Tested working in current Chrome, Firefox, Safari, and Edge on desktop, plus
Mobile Safari (iOS) and Chrome (Android). Requires:

- HTML5 Canvas 2D
- Pointer Events
- Web Audio API (sound effects degrade silently if unavailable)
- ES2017+ (object spread, async/await are not used; arrow functions and
  `const`/`let` are)
