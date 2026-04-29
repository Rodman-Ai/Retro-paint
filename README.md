# Retro Paint

A browser-based retro paint emulator for desktop and mobile that channels three
classic drawing apps:

- **MS Paint 95** — Windows 95 chrome, classic 28-color palette, pencil/brush/
  fill/line/rectangle/ellipse, eyedropper, spray can.
- **Mario Paint (SNES)** — chunky candy-colored UI, musical pencil that plays a
  note per color, pixel-art stamps (mushroom, star, Yoshi, coin, note…).
- **Kid Pix (90s Mac)** — bold black borders, wacky brushes (rainbow, echo,
  sparkle, kaleidoscope, dots, noodle), goofy stamps, plus the classic
  **Dynamite** (animated explosion) and **Oh No!** clear-the-canvas tools.

## Run it

It's a static site — no build step. Just open `index.html` in a browser, or
serve the directory:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

- **Touch / mouse / pen** all draw via Pointer Events.
- **1 / 2 / 3** switch modes (MS Paint / Mario Paint / Kid Pix).
- **Ctrl+Z** undo (16-step history).
- **Ctrl+S** save the canvas as a PNG.
- **Right-click / Shift-click** a swatch to set the secondary color.
- Click the big primary/secondary swatches to open a full color picker.

## Files

- `index.html` — page shell
- `styles.css` — shared layout + three theme stylesheets
- `js/app.js` — canvas engine, tools, mode switching
- `js/modes.js` — palettes, tool lists, pixel-art stamps
- `js/sounds.js` — Web Audio synth (Mario Paint notes, Kid Pix sound effects)
