/* =========================================================
   Retro Paint — main app: canvas engine, tools, mode switching
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let W = canvas.width;
  let H = canvas.height;

  const state = {
    mode: 'mspaint',
    tool: 'pencil',
    primary: '#000000',
    secondary: '#ffffff',
    size: 4,
    drawing: false,
    button: 0,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    snapshot: null,
    activeWacky: null,
    activeStamp: null,
    activeStampSet: null,
    colorIndex: 0,
    shift: false,
    mirror: 'off',
    muted: false,
    opacity: 1,
    gridOn: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    panning: false,
    spaceHeld: false,
    recent: [],
    smudgeData: null,
    selection: null,
    selDrag: null,
    bgPattern: 'none',
    frames: null,
    frameIdx: 0,
    onion: false
  };

  const undoStack = [];
  const redoStack = [];
  const MAX_UNDO = 16;

  function clearCanvas(color) {
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, W, H);
  }
  clearCanvas('#ffffff');

  function pushUndo() {
    try {
      undoStack.push(ctx.getImageData(0, 0, W, H));
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack.length = 0;
      updateUndoButtons();
    } catch (e) { /* ignore */ }
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(ctx.getImageData(0, 0, W, H));
    ctx.putImageData(undoStack.pop(), 0, 0);
    updateUndoButtons();
    scheduleAutosave();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(ctx.getImageData(0, 0, W, H));
    ctx.putImageData(redoStack.pop(), 0, 0);
    updateUndoButtons();
    scheduleAutosave();
  }
  function updateUndoButtons() {
    const u = $('btn-undo'), r = $('btn-redo');
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  // ---- Coordinate translation ----
  function getPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round((ev.clientX - rect.left) * (W / rect.width)),
      y: Math.round((ev.clientY - rect.top) * (H / rect.height))
    };
  }

  // ---- Color helpers ----
  function parseColor(c) {
    // Accepts #rrggbb or rgb(...). Returns [r,g,b,255]
    if (c[0] === '#') {
      const v = parseInt(c.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 255];
    }
    const m = c.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (m) return [+m[1], +m[2], +m[3], 255];
    return [0, 0, 0, 255];
  }
  function rgbToHex([r, g, b]) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ---- Flood fill ----
  function floodFill(x, y, fillHex) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const img = ctx.getImageData(0, 0, W, H);
    const data = img.data;
    const idx = (cx, cy) => (cy * W + cx) * 4;
    const i0 = idx(x, y);
    const tr = data[i0], tg = data[i0 + 1], tb = data[i0 + 2], ta = data[i0 + 3];
    const [fr, fg, fb] = parseColor(fillHex);
    if (tr === fr && tg === fg && tb === fb && ta === 255) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
      const i = idx(cx, cy);
      if (data[i] !== tr || data[i + 1] !== tg || data[i + 2] !== tb || data[i + 3] !== ta) continue;
      data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---- Drawing primitives ----
  function dot(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
    c.fill();
  }
  function strokeLine(c, x1, y1, x2, y2, w, color, cap) {
    c.strokeStyle = color;
    c.lineWidth = w;
    c.lineCap = cap || 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  // ---- Wacky brushes (Kid Pix) ----
  const wackyBrushes = {
    rainbow(c, x, y, lx, ly) {
      const colors = ['#ff0000','#ff8800','#ffd700','#33cc33','#00ccff','#3366ff','#aa44ff'];
      const w = Math.max(2, state.size);
      for (let i = 0; i < colors.length; i++) {
        const offset = (i - 3) * (w * 0.7);
        c.strokeStyle = colors[i];
        c.lineWidth = w * 0.8;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(lx, ly + offset);
        c.lineTo(x, y + offset);
        c.stroke();
      }
    },
    echo(c, x, y) {
      const w = state.size;
      c.fillStyle = state.primary;
      for (let i = 5; i >= 1; i--) {
        c.globalAlpha = 0.18 * i;
        dot(c, x, y, w * i * 0.6);
      }
      c.globalAlpha = 1;
    },
    sparkle(c, x, y) {
      const colors = ['#ffff66', '#ffffff', '#ffd700', state.primary];
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (state.size * 4);
        const sx = x + Math.cos(a) * r;
        const sy = y + Math.sin(a) * r;
        c.fillStyle = colors[(Math.random() * colors.length) | 0];
        const s = 1 + Math.random() * 3;
        c.fillRect(sx - s/2, sy - s/2, s, s);
      }
    },
    kaleido(c, x, y, lx, ly) {
      const w = state.size;
      const cx = W / 2, cy = H / 2;
      c.strokeStyle = state.primary;
      c.lineWidth = w;
      c.lineCap = 'round';
      const draw = (dx1, dy1, dx2, dy2) => {
        c.beginPath();
        c.moveTo(dx1, dy1);
        c.lineTo(dx2, dy2);
        c.stroke();
      };
      draw(x, y, lx, ly);
      draw(2*cx - x, y, 2*cx - lx, ly);
      draw(x, 2*cy - y, lx, 2*cy - ly);
      draw(2*cx - x, 2*cy - y, 2*cx - lx, 2*cy - ly);
    },
    dots(c, x, y) {
      const r = Math.max(2, state.size);
      const palette = ['#ff3366','#ffcc00','#33cc33','#3366ff','#aa44ff','#00ccff'];
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * (r * 4);
        c.fillStyle = palette[(Math.random() * palette.length) | 0];
        dot(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + Math.random() * r);
      }
    },
    noodle(c, x, y, lx, ly) {
      const w = state.size;
      const colors = ['#ffcc88', '#ffaa66', '#ff8844'];
      for (let i = -1; i <= 1; i++) {
        const wob = Math.sin((x + y + i * 13) * 0.1) * w;
        c.strokeStyle = colors[i + 1];
        c.lineWidth = w * 0.5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(lx + i * 2, ly + wob);
        c.lineTo(x + i * 2, y + wob);
        c.stroke();
      }
    }
  };

  // ---- Tool handlers ----
  // Each handler returns { down, move, up }; receives world position {x,y}
  const Tools = {
    pencil: {
      down(p) { ctx.fillStyle = state.primary; ctx.fillRect(p.x, p.y, 1, 1); },
      move(p) {
        strokeLine(ctx, state.lastX + 0.5, state.lastY + 0.5, p.x + 0.5, p.y + 0.5, 1, state.primary, 'butt');
      }
    },
    brush: {
      down(p) {
        ctx.fillStyle = state.primary;
        dot(ctx, p.x, p.y, state.size);
      },
      move(p) {
        strokeLine(ctx, state.lastX, state.lastY, p.x, p.y, state.size * 2, state.primary);
      }
    },
    eraser: {
      down(p) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - state.size, p.y - state.size, state.size * 2, state.size * 2);
      },
      move(p) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = state.size * 2;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(state.lastX, state.lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    },
    fill: {
      down(p) { floodFill(p.x, p.y, state.primary); }
    },
    eyedrop: {
      down(p) {
        if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return;
        const d = ctx.getImageData(p.x, p.y, 1, 1).data;
        setPrimary(rgbToHex([d[0], d[1], d[2]]));
        // Auto-switch back to pencil for convenience
        setTool('pencil');
      }
    },
    spray: {
      down(p) { sprayAt(p); Sounds.sprayHiss(); },
      move(p) { sprayAt(p); }
    },
    line: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const e = state.shift ? snapTo45(state.startX, state.startY, p.x, p.y) : p;
        strokeLine(ctx, state.startX, state.startY, e.x, e.y, Math.max(1, state.size), state.primary);
      }
    },
    rect: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const e = state.shift ? snapToSquare(state.startX, state.startY, p.x, p.y) : p;
        ctx.strokeStyle = state.primary;
        ctx.lineWidth = Math.max(1, state.size);
        ctx.strokeRect(
          Math.min(state.startX, e.x), Math.min(state.startY, e.y),
          Math.abs(e.x - state.startX), Math.abs(e.y - state.startY)
        );
      }
    },
    rectFill: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const e = state.shift ? snapToSquare(state.startX, state.startY, p.x, p.y) : p;
        ctx.fillStyle = state.primary;
        ctx.fillRect(
          Math.min(state.startX, e.x), Math.min(state.startY, e.y),
          Math.abs(e.x - state.startX), Math.abs(e.y - state.startY)
        );
      }
    },
    ellipse: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const e = state.shift ? snapToSquare(state.startX, state.startY, p.x, p.y) : p;
        const cx = (state.startX + e.x) / 2;
        const cy = (state.startY + e.y) / 2;
        const rx = Math.abs(e.x - state.startX) / 2;
        const ry = Math.abs(e.y - state.startY) / 2;
        ctx.strokeStyle = state.primary;
        ctx.lineWidth = Math.max(1, state.size);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    ellipseFill: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const e = state.shift ? snapToSquare(state.startX, state.startY, p.x, p.y) : p;
        const cx = (state.startX + e.x) / 2;
        const cy = (state.startY + e.y) / 2;
        const rx = Math.abs(e.x - state.startX) / 2;
        const ry = Math.abs(e.y - state.startY) / 2;
        ctx.fillStyle = state.primary;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    musicpencil: {
      down(p) {
        Sounds.noteForColor(state.colorIndex);
        ctx.fillStyle = state.primary;
        const s = Math.max(2, state.size);
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
      },
      move(p) {
        const s = Math.max(2, state.size);
        ctx.strokeStyle = state.primary;
        ctx.lineWidth = s;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(state.lastX, state.lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // Sprinkle musical notes occasionally
        if (Math.hypot(p.x - state.lastX, p.y - state.lastY) > 8) {
          Sounds.noteForColor(state.colorIndex + Math.floor(Math.random() * 3));
        }
      }
    },
    stamp: {
      down(p) { dropStamp(p); }
    },
    wacky: {
      down(p) {
        Sounds.wackyBoing();
        const fn = wackyBrushes[state.activeWacky];
        if (fn) fn(ctx, p.x, p.y, p.x, p.y);
      },
      move(p) {
        const fn = wackyBrushes[state.activeWacky];
        if (fn) fn(ctx, p.x, p.y, state.lastX, state.lastY);
      }
    },
    dynamite: {
      down(p) {
        Sounds.explosion();
        explodeThenClear(p);
      }
    },
    ohno: {
      down() {
        Sounds.ohNo();
        ohNoSplash();
        setTimeout(() => clearCanvas('#ffffff'), 500);
      }
    },
    gradient: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const e = state.shift ? snapTo45(state.startX, state.startY, p.x, p.y) : p;
        const g = ctx.createLinearGradient(state.startX, state.startY, e.x, e.y);
        g.addColorStop(0, state.primary);
        g.addColorStop(1, state.secondary);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    },
    smudge: {
      down(p) {
        const r = Math.max(2, state.size);
        const x = Math.max(0, Math.min(W - r*2, p.x - r));
        const y = Math.max(0, Math.min(H - r*2, p.y - r));
        try { state.smudgeData = ctx.getImageData(x, y, r*2, r*2); } catch (e) { state.smudgeData = null; }
      },
      move(p) {
        if (!state.smudgeData) return;
        const r = Math.max(2, state.size);
        ctx.save();
        ctx.globalAlpha = 0.4 * state.opacity;
        const tmp = document.createElement('canvas');
        tmp.width = state.smudgeData.width;
        tmp.height = state.smudgeData.height;
        tmp.getContext('2d').putImageData(state.smudgeData, 0, 0);
        ctx.drawImage(tmp, p.x - r, p.y - r);
        ctx.restore();
        // Refresh sample for trailing smudge
        const x = Math.max(0, Math.min(W - r*2, p.x - r));
        const y = Math.max(0, Math.min(H - r*2, p.y - r));
        try { state.smudgeData = ctx.getImageData(x, y, r*2, r*2); } catch (e) {}
      }
    },
    text: {
      down(p) {
        const txt = prompt('Enter text:');
        if (!txt) return;
        const sz = Math.max(12, state.size * 4);
        ctx.save();
        ctx.fillStyle = state.primary;
        ctx.globalAlpha = state.opacity;
        ctx.font = `bold ${sz}px Tahoma, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(txt, p.x, p.y);
        ctx.restore();
        scheduleAutosave();
      }
    },
    select: {
      down(p) {
        // If clicking inside an existing selection, start dragging it
        if (state.selection && pointInSel(p)) {
          state.selDrag = { dx: p.x - state.selection.x, dy: p.y - state.selection.y };
          return;
        }
        // Otherwise start a new selection rect
        state.selection = { x: p.x, y: p.y, w: 0, h: 0 };
        state.selDrag = null;
        saveSnapshot();
      },
      move(p) {
        if (state.selDrag && state.selection) {
          // Move existing selection (re-render snapshot + ghost)
          restoreSnapshot();
          state.selection.x = p.x - state.selDrag.dx;
          state.selection.y = p.y - state.selDrag.dy;
          drawSelectionMarquee();
        } else if (state.selection) {
          state.selection.w = p.x - state.selection.x;
          state.selection.h = p.y - state.selection.y;
          restoreSnapshot();
          drawSelectionMarquee();
        }
      },
      up() {
        state.selDrag = null;
        if (state.selection && (Math.abs(state.selection.w) < 2 || Math.abs(state.selection.h) < 2)) {
          state.selection = null;
          restoreSnapshot();
        }
      }
    }
  };

  function pointInSel(p) {
    if (!state.selection) return false;
    const s = state.selection;
    const x = Math.min(s.x, s.x + s.w), y = Math.min(s.y, s.y + s.h);
    const w = Math.abs(s.w), h = Math.abs(s.h);
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }
  function drawSelectionMarquee() {
    if (!state.selection) return;
    const s = state.selection;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
    ctx.strokeStyle = '#fff';
    ctx.lineDashOffset = 4;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
    ctx.restore();
  }

  function sprayAt(p) {
    const r = state.size * 2;
    ctx.fillStyle = state.primary;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r;
      const sx = p.x + Math.cos(a) * d;
      const sy = p.y + Math.sin(a) * d;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  function saveSnapshot() { state.snapshot = ctx.getImageData(0, 0, W, H); }
  function restoreSnapshot() { if (state.snapshot) ctx.putImageData(state.snapshot, 0, 0); }

  // Constrain helpers (when Shift is held during shape drag)
  function snapToSquare(sx, sy, x, y) {
    const dx = x - sx, dy = y - sy;
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: sx + Math.sign(dx || 1) * m, y: sy + Math.sign(dy || 1) * m };
  }
  function snapTo45(sx, sy, x, y) {
    const dx = x - sx, dy = y - sy;
    const a = Math.atan2(dy, dx);
    const step = Math.PI / 4;
    const snap = Math.round(a / step) * step;
    const len = Math.hypot(dx, dy);
    return { x: sx + Math.cos(snap) * len, y: sy + Math.sin(snap) * len };
  }

  // Symmetry: list of mirrored point pairs (current, last) given the active mirror mode
  function mirrorPoints(p, lp) {
    const out = [];
    const cx = W / 2, cy = H / 2;
    const m = state.mirror;
    if (m === 'h' || m === 'both') out.push({ p: { x: 2*cx - p.x, y: p.y }, lp: { x: 2*cx - lp.x, y: lp.y } });
    if (m === 'v' || m === 'both') out.push({ p: { x: p.x, y: 2*cy - p.y }, lp: { x: lp.x, y: 2*cy - lp.y } });
    if (m === 'both') out.push({ p: { x: 2*cx - p.x, y: 2*cy - p.y }, lp: { x: 2*cx - lp.x, y: 2*cy - lp.y } });
    return out;
  }
  // Tools whose drawing should be mirrored when symmetry is on
  const MIRROR_TOOLS = new Set(['pencil', 'brush', 'eraser', 'spray', 'musicpencil']);
  function shouldMirror() {
    if (state.mirror === 'off') return false;
    return MIRROR_TOOLS.has(state.tool) || state.tool.startsWith('wacky:') || state.tool.startsWith('stamp:');
  }

  // Extended mirror modes (4-way / 8-way kaleidoscope)
  function mirrorPointsExt(p, lp) {
    if (state.mirror === 'h' || state.mirror === 'v' || state.mirror === 'both') {
      return mirrorPoints(p, lp);
    }
    const cx = W / 2, cy = H / 2;
    const out = [];
    if (state.mirror === '4way' || state.mirror === '8way') {
      out.push({ p: { x: 2*cx - p.x, y: p.y }, lp: { x: 2*cx - lp.x, y: lp.y } });
      out.push({ p: { x: p.x, y: 2*cy - p.y }, lp: { x: lp.x, y: 2*cy - lp.y } });
      out.push({ p: { x: 2*cx - p.x, y: 2*cy - p.y }, lp: { x: 2*cx - lp.x, y: 2*cy - lp.y } });
    }
    if (state.mirror === '8way') {
      const reflect = (q) => {
        const dx = q.x - cx, dy = q.y - cy;
        return { x: cx + dy, y: cy + dx };
      };
      const r1 = { p: reflect(p), lp: reflect(lp) };
      out.push(r1);
      out.push({ p: { x: 2*cx - r1.p.x, y: r1.p.y }, lp: { x: 2*cx - r1.lp.x, y: r1.lp.y } });
      out.push({ p: { x: r1.p.x, y: 2*cy - r1.p.y }, lp: { x: r1.lp.x, y: 2*cy - r1.lp.y } });
      out.push({ p: { x: 2*cx - r1.p.x, y: 2*cy - r1.p.y }, lp: { x: 2*cx - r1.lp.x, y: 2*cy - r1.lp.y } });
    }
    return out;
  }

  // Per-stamp sound overrides
  const STAMP_SOUNDS = {
    mariopaint: {
      mushroom: 'marioPowerUp',
      oneUp: 'marioPowerUp',
      star: 'marioStarHit',
      heart: 'kpDing',
      flower: 'marioJump',
      yoshi: 'marioYoshiTongue',
      bowser: 'marioBowser',
      coin: 'marioCoin',
      note: 'noteFreq',
      ghost: 'marioGhost',
      koopaShell: 'marioJump',
      bobOmb: 'marioBobOmb',
      piranha: 'marioFireball',
      pipe: 'marioPipe',
      fireFlower: 'marioFireball',
      smile: 'kpDing'
    },
    kidpix: {
      sun: 'kpDing',
      cat: 'kpQuack',
      house: 'kpHonk',
      tree: 'kpBubble',
      ufo: 'kpLaser',
      rocket: 'kpWhoosh',
      fish: 'kpBubble',
      bird: 'kpQuack',
      butterfly: 'kpSparkle',
      balloon: 'kpBoing',
      gift: 'kpDing',
      cupcake: 'kpDing',
      pizza: 'kpHonk',
      snowman: 'kpFizz',
      robot: 'kpLaser',
      smiley: 'kpBoing',
      star2: 'kpSparkle'
    }
  };

  function dropStamp(p) {
    const set = state.activeStampSet || (state.mode === 'kidpix' ? 'kidpix' : 'mariopaint');
    const stamps = PaintModes.stamps[set];
    if (!stamps) return;
    const s = stamps[state.activeStamp];
    if (!s) return;
    const scale = Math.max(2, Math.round(state.size * 0.8) + 2);
    PaintModes.drawStamp(ctx, s, p.x, p.y, scale);
    const sfxName = (STAMP_SOUNDS[set] || {})[state.activeStamp];
    if (sfxName && typeof Sounds[sfxName] === 'function') {
      Sounds[sfxName]();
    } else {
      Sounds.stampPlop();
    }
  }

  // ---- Special effects ----
  function explodeThenClear(p) {
    const snap = ctx.getImageData(0, 0, W, H);
    const start = performance.now();
    const dur = 700;
    const particles = [];
    const colors = ['#ff3300','#ff8800','#ffcc00','#ffffff','#cc0000','#ff66aa'];
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 360;
      particles.push({
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        c: colors[(Math.random() * colors.length) | 0],
        s: 4 + Math.random() * 10
      });
    }
    function frame(now) {
      const t = (now - start) / 1000;
      const elapsed = now - start;
      ctx.putImageData(snap, 0, 0);
      // Big shockwave ring
      const ringR = 30 + (elapsed / dur) * 220;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 4 * (1 - elapsed / dur);
      ctx.beginPath();
      ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      for (const pt of particles) {
        const x = p.x + pt.vx * t;
        const y = p.y + pt.vy * t + 200 * t * t;
        ctx.fillStyle = pt.c;
        ctx.fillRect(x - pt.s/2, y - pt.s/2, pt.s, pt.s);
      }
      if (elapsed < dur) requestAnimationFrame(frame);
      else clearCanvas('#ffffff');
    }
    requestAnimationFrame(frame);
  }

  function ohNoSplash() {
    const splash = $('splash');
    splash.querySelector('.splash-text').textContent = 'OH NO!';
    splash.hidden = false;
    splash.querySelector('.splash-content').style.animation = 'none';
    void splash.offsetWidth;
    splash.querySelector('.splash-content').style.animation = '';
    setTimeout(() => { splash.hidden = true; }, 1000);
  }

  // ---- Pointer events ----
  function dispatchTool(phase, p) {
    let key = state.tool;
    let h;
    if (key.startsWith('stamp:')) h = Tools.stamp;
    else if (key.startsWith('wacky:')) h = Tools.wacky;
    else h = Tools[key];
    if (!h) return;
    const fn = h[phase];
    if (!fn) return;
    ctx.save();
    ctx.globalAlpha = state.opacity;
    fn(p);
    ctx.restore();
  }

  canvas.addEventListener('pointerdown', (e) => {
    // Pan instead of drawing if Space is held or middle/secondary button
    if (state.spaceHeld || e.button === 1) {
      e.preventDefault();
      state.panning = { sx: e.clientX, sy: e.clientY, ox: state.panX, oy: state.panY };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    e.preventDefault();
    Sounds.init();
    canvas.setPointerCapture(e.pointerId);
    state.drawing = true;
    state.button = e.button;
    state.shift = e.shiftKey;
    // Stylus pressure → variable size for this stroke
    if (e.pressure && e.pointerType !== 'mouse') {
      state.size = Math.max(1, Math.round(state.size * (0.5 + e.pressure)));
    }
    const p = getPos(e);
    state.startX = state.lastX = p.x;
    state.startY = state.lastY = p.y;
    pushUndo();
    recordStrokeStart(p);
    dispatchTool('down', p);
    if (shouldMirror()) {
      const realLast = { x: state.lastX, y: state.lastY };
      for (const m of mirrorPointsExt(p, p)) {
        state.lastX = m.lp.x; state.lastY = m.lp.y;
        dispatchTool('down', m.p);
      }
      state.lastX = realLast.x; state.lastY = realLast.y;
    }
    state.lastX = p.x; state.lastY = p.y;
  });
  canvas.addEventListener('pointermove', (e) => {
    state.shift = e.shiftKey;
    if (state.panning) {
      state.panX = state.panning.ox + (e.clientX - state.panning.sx);
      state.panY = state.panning.oy + (e.clientY - state.panning.sy);
      applyZoomTransform();
      return;
    }
    const p = getPos(e);
    updateStatusPos(p);
    updateBrushCursor(e);
    if (!state.drawing) return;
    recordStrokeMove(p);
    dispatchTool('move', p);
    if (shouldMirror()) {
      const realLast = { x: state.lastX, y: state.lastY };
      for (const m of mirrorPointsExt(p, realLast)) {
        state.lastX = m.lp.x; state.lastY = m.lp.y;
        dispatchTool('move', m.p);
      }
      state.lastX = realLast.x; state.lastY = realLast.y;
    }
    state.lastX = p.x; state.lastY = p.y;
  });
  function endStroke(e) {
    if (state.panning) { state.panning = false; }
    if (!state.drawing) return;
    state.drawing = false;
    state.snapshot = null;
    if (e) {
      const p = getPos(e);
      dispatchTool('up', p);
    }
    recordStrokeEnd();
    scheduleAutosave();
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('pointerleave', endStroke);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- UI building ----
  function buildTools() {
    const root = $('tools');
    root.innerHTML = '';
    const tools = PaintModes.tools[state.mode];
    for (const t of tools) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.title = t.label;
      btn.textContent = t.icon;
      btn.dataset.tool = t.id;
      btn.addEventListener('click', () => {
        Sounds.click();
        setTool(t.id, t);
      });
      const lab = document.createElement('span');
      lab.className = 'tool-label';
      lab.textContent = t.label;
      btn.appendChild(lab);
      root.appendChild(btn);
    }
    // Default tool selection
    const def = tools[0];
    setTool(def.id, def);
  }

  function buildPalette() {
    const root = $('palette');
    root.innerHTML = '';
    const palette = PaintModes.palettes[state.mode];
    palette.forEach((c, i) => {
      const sw = document.createElement('button');
      sw.className = 'palette-swatch-item';
      sw.style.background = c;
      sw.title = c;
      sw.addEventListener('click', (e) => {
        if (e.shiftKey) setSecondary(c);
        else { setPrimary(c); state.colorIndex = i; }
        Sounds.click();
      });
      sw.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        setSecondary(c);
      });
      root.appendChild(sw);
    });
    setPrimary(palette[0]);
    setSecondary(palette[palette.length - 1]);
  }

  function setPrimary(c) {
    state.primary = c;
    $('primary-swatch').style.background = c;
    pushRecentColor(c);
  }
  function pushRecentColor(c) {
    if (!c) return;
    state.recent = [c, ...state.recent.filter(x => x !== c)].slice(0, 12);
    renderRecent();
    try { localStorage.setItem('retropaint:recent', JSON.stringify(state.recent)); } catch (e) {}
  }
  function renderRecent() {
    const root = $('recent-colors');
    if (!root) return;
    root.innerHTML = '';
    state.recent.forEach((c) => {
      const sw = document.createElement('button');
      sw.className = 'palette-swatch-item';
      sw.style.background = c;
      sw.title = c;
      sw.addEventListener('click', (e) => {
        if (e.shiftKey) setSecondary(c); else setPrimary(c);
        Sounds.click();
      });
      sw.addEventListener('contextmenu', (e) => { e.preventDefault(); setSecondary(c); });
      root.appendChild(sw);
    });
  }
  function setSecondary(c) {
    state.secondary = c;
    $('secondary-swatch').style.background = c;
  }
  function setTool(id, def) {
    state.tool = id;
    if (id.startsWith('stamp:')) {
      state.activeStamp = (def && def.stamp) || id.split(':')[1];
      state.activeStampSet = (def && def.stampSet) || (state.mode === 'kidpix' ? 'kidpix' : 'mariopaint');
    } else if (id.startsWith('wacky:')) {
      state.activeWacky = (def && def.wacky) || id.split(':')[1];
    } else if (id === 'dynamite' || id === 'ohno') {
      // one-shot tool; still keep selected for status
    }
    document.querySelectorAll('.tool-btn').forEach(el => {
      el.dataset.active = (el.dataset.tool === id) ? 'true' : 'false';
    });
    const labelMap = {};
    PaintModes.tools[state.mode].forEach(t => labelMap[t.id] = t.label);
    $('status-tool').textContent = labelMap[id] || id;
  }

  function setMode(mode) {
    state.mode = mode;
    try { localStorage.setItem('retropaint:mode', mode); } catch (e) {}
    document.body.className = 'mode-' + mode;
    document.querySelectorAll('.mode-btn').forEach(b => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active);
    });
    buildTools();
    buildPalette();
    $('canvas-title').textContent = PaintModes.titles[mode];
    $('status-mode').textContent = (
      mode === 'mspaint' ? 'MS Paint 95'
      : mode === 'mariopaint' ? 'Mario Paint'
      : 'Kid Pix'
    );
  }

  function updateStatusPos(p) {
    $('status-pos').textContent = `${p.x}, ${p.y}`;
  }

  // ---- Header actions ----
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Sounds.click();
      setMode(btn.dataset.mode);
    });
  });
  $('btn-undo').addEventListener('click', () => { Sounds.click(); undo(); });
  $('btn-clear').addEventListener('click', (e) => {
    if (e.shiftKey) { resetAll(); return; }
    if (confirm('Clear the canvas?')) { pushUndo(); clearCanvas('#ffffff'); scheduleAutosave(); }
  });
  $('btn-save').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `retro-paint-${state.mode}-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  $('primary-swatch').addEventListener('click', () => openHsvPicker(true));
  $('secondary-swatch').addEventListener('click', () => openHsvPicker(false));
  $('primary-swatch').addEventListener('contextmenu', (e) => { e.preventDefault(); pickColorPrompt(true); });
  $('secondary-swatch').addEventListener('contextmenu', (e) => { e.preventDefault(); pickColorPrompt(false); });

  function pickColorPrompt(primary) {
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = primary ? state.primary : state.secondary;
    inp.addEventListener('input', () => {
      if (primary) setPrimary(inp.value); else setSecondary(inp.value);
    });
    inp.click();
  }

  // ---- Brush size ----
  const sizeInput = $('brush-size');
  const sizeDisp = $('brush-size-display');
  sizeInput.addEventListener('input', () => {
    state.size = +sizeInput.value;
    sizeDisp.textContent = String(state.size);
    try { localStorage.setItem('retropaint:size', String(state.size)); } catch (e) {}
  });

  // ---- Brush cursor preview ----
  const brushCursor = $('brush-cursor');
  function updateBrushCursor(ev) {
    if (!brushCursor) return;
    const rect = canvas.getBoundingClientRect();
    const inside =
      ev.clientX >= rect.left && ev.clientX <= rect.right &&
      ev.clientY >= rect.top  && ev.clientY <= rect.bottom;
    if (!inside) { brushCursor.style.display = 'none'; return; }
    const scale = rect.width / W;
    const px = state.tool === 'pencil' ? 1 : Math.max(2, state.size * 2);
    const sz = px * scale;
    brushCursor.style.display = 'block';
    brushCursor.style.width = brushCursor.style.height = sz + 'px';
    brushCursor.style.left = (ev.clientX - sz / 2) + 'px';
    brushCursor.style.top  = (ev.clientY - sz / 2) + 'px';
  }
  canvas.addEventListener('pointerleave', () => {
    if (brushCursor) brushCursor.style.display = 'none';
  });

  // ---- Symmetry mirror (cycle off → H → V → Both → 4-way → 8-way) ----
  const MIRROR_LABELS = { off: '⌒ Off', h: '↔ H', v: '↕ V', both: '✚ Both', '4way': '✦ 4-way', '8way': '❋ 8-way' };
  function setMirror(m) {
    state.mirror = m;
    $('btn-symmetry').textContent = MIRROR_LABELS[m];
  }
  $('btn-symmetry').addEventListener('click', () => {
    const order = ['off', 'h', 'v', 'both', '4way', '8way'];
    setMirror(order[(order.indexOf(state.mirror) + 1) % order.length]);
    Sounds.click();
  });
  setMirror('off');

  // ---- Sound mute ----
  function setMuted(b) {
    state.muted = !!b;
    Sounds.setEnabled(!state.muted);
    $('btn-mute').textContent = state.muted ? '🔇' : '🔊';
    try { localStorage.setItem('retropaint:muted', state.muted ? '1' : '0'); } catch (e) {}
  }
  $('btn-mute').addEventListener('click', () => setMuted(!state.muted));

  // ---- Redo button ----
  $('btn-redo').addEventListener('click', () => { Sounds.click(); redo(); });

  // ---- Open image ----
  const fileInput = $('file-input');
  $('btn-open').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      pushUndo();
      clearCanvas('#ffffff');
      const r = Math.min(W / img.width, H / img.height);
      const dw = img.width * r, dh = img.height * r;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      URL.revokeObjectURL(img.src);
      scheduleAutosave();
    };
    img.onerror = () => alert('Could not load that image.');
    img.src = URL.createObjectURL(f);
    fileInput.value = '';
  });

  // ---- Autosave + restore ----
  let saveTimer = null;
  function scheduleAutosave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem('retropaint:canvas', canvas.toDataURL('image/png')); }
      catch (e) { /* quota or security */ }
    }, 1500);
  }
  function tryRestore() {
    let data;
    try { data = localStorage.getItem('retropaint:canvas'); } catch (e) { return; }
    if (!data) return;
    const img = new Image();
    img.onload = () => {
      if (confirm('Restore your last drawing?')) {
        ctx.drawImage(img, 0, 0);
      } else {
        try { localStorage.removeItem('retropaint:canvas'); } catch (e) {}
      }
    };
    img.src = data;
  }

  // ---- Keyboard shortcuts ----
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    state.shift = e.shiftKey;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z' && e.shiftKey) { e.preventDefault(); redo(); return; }
    if (mod && k === 'z') { e.preventDefault(); undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (mod && k === 's') { e.preventDefault(); $('btn-save').click(); return; }
    if (mod && k === 'o') { e.preventDefault(); $('btn-open').click(); return; }
    if (mod) return;
    if (e.key === '1') return setMode('mspaint');
    if (e.key === '2') return setMode('mariopaint');
    if (e.key === '3') return setMode('kidpix');
    if (k === 'm') return setMuted(!state.muted);
    if (k === 'y') return $('btn-symmetry').click();
    if (k === 'g') return $('btn-grid').click();
    if (k === '?' || (e.shiftKey && k === '/')) { e.preventDefault(); return showHelp(); }
    if (k === '+' || k === '=') return setZoom(state.zoom * 1.25);
    if (k === '-' || k === '_') return setZoom(state.zoom / 1.25);
    if (k === '0') { state.panX = 0; state.panY = 0; return setZoom(1); }
    if (k === 'v') return nextBgPattern();
    if (k === 'f' && e.shiftKey) { e.preventDefault(); return toggleAnim(); }
    if (e.key === ' ') { e.preventDefault(); state.spaceHeld = true; canvas.style.cursor = 'grab'; return; }
    if (k === 'delete' || k === 'backspace') {
      // Delete clears selection contents
      if (state.selection) {
        pushUndo();
        const s = state.selection;
        const x = Math.min(s.x, s.x + s.w), y = Math.min(s.y, s.y + s.h);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, Math.abs(s.w), Math.abs(s.h));
        ctx.restore();
        state.selection = null;
        return;
      }
    }
    // Single-letter tool hotkey for current mode
    const tool = (PaintModes.tools[state.mode] || []).find(t => t.shortcut === k);
    if (tool) { setTool(tool.id, tool); Sounds.click(); }
  });
  window.addEventListener('keyup', (e) => {
    state.shift = e.shiftKey;
    if (e.key === ' ') { state.spaceHeld = false; canvas.style.cursor = ''; }
  });

  // ---- Brush opacity ----
  const opacityInput = $('brush-opacity');
  const opacityDisp = $('brush-opacity-display');
  if (opacityInput) {
    opacityInput.addEventListener('input', () => {
      state.opacity = (+opacityInput.value) / 100;
      opacityDisp.textContent = String(opacityInput.value);
      try { localStorage.setItem('retropaint:opacity', String(state.opacity)); } catch (e) {}
    });
  }

  // ---- Pixel grid overlay ----
  function renderGrid() {
    if (!state.gridOn) { canvas.style.backgroundImage = ''; return; }
    const sz = Math.max(1, Math.round(state.zoom));
    const c = `linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)`;
    canvas.style.backgroundImage = c;
    canvas.style.backgroundSize = `${sz * 1}px ${sz * 1}px`;
  }
  $('btn-grid').addEventListener('click', () => {
    state.gridOn = !state.gridOn;
    $('btn-grid').textContent = state.gridOn ? '⊞ On' : '⊞ Off';
    Sounds.click();
    renderGrid();
  });

  // ---- Modal helper (used by New canvas, Filters, Help, HSV picker) ----
  function showModal(title, bodyHtml, opts) {
    return new Promise((resolve) => {
      const m = $('modal');
      $('modal-title').textContent = title;
      $('modal-body').innerHTML = bodyHtml;
      m.hidden = false;
      const ok = $('modal-ok'), cancel = $('modal-cancel');
      ok.textContent = (opts && opts.okText) || 'OK';
      cancel.style.display = (opts && opts.hideCancel) ? 'none' : '';
      const close = (val) => {
        m.hidden = true;
        ok.removeEventListener('click', okH);
        cancel.removeEventListener('click', cancelH);
        resolve(val);
      };
      const okH = () => close(true);
      const cancelH = () => close(false);
      ok.addEventListener('click', okH);
      cancel.addEventListener('click', cancelH);
    });
  }

  // ---- New canvas dialog ----
  $('btn-new').addEventListener('click', async () => {
    const sizes = [
      ['320 × 240 (small)', 320, 240],
      ['480 × 360',         480, 360],
      ['640 × 480 (default)', 640, 480],
      ['800 × 600',         800, 600],
      ['1024 × 768',       1024, 768]
    ];
    const opts = sizes.map(([l, w, h]) =>
      `<label style="display:block;padding:4px"><input type="radio" name="size" value="${w}x${h}" ${w===640?'checked':''}> ${l}</label>`
    ).join('');
    const ok = await showModal('New canvas',
      `<div>Pick a size:</div>${opts}<div style="margin-top:8px">This will erase the current drawing.</div>`);
    if (!ok) return;
    const sel = document.querySelector('input[name="size"]:checked');
    if (!sel) return;
    const [w, h] = sel.value.split('x').map(Number);
    resizeCanvas(w, h);
  });
  function resizeCanvas(w, h) {
    pushUndo();
    canvas.width = w; canvas.height = h;
    W = w; H = h;
    clearCanvas('#ffffff');
    scheduleAutosave();
  }

  // ---- Help overlay ----
  $('btn-help').addEventListener('click', () => showHelp());
  function showHelp() {
    showModal('Retro Paint — Help', `
      <p><b>Modes:</b> 1 / 2 / 3 — MS Paint · Mario Paint · Kid Pix</p>
      <p><b>Tools:</b> hover any tool button, or use single-letter hotkeys
        — P pencil · B brush · E eraser · F fill · K pick · S spray
        · L line · R rect · O oval · G gradient · T text · A select.</p>
      <p><b>Edit:</b> Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+S save · Ctrl+O open.</p>
      <p><b>View:</b> + / − / 0 zoom · Space+drag (or 2-finger) pan · G grid · Y mirror · M mute.</p>
      <p><b>Shapes:</b> hold Shift while dragging for square / circle / 45° line.</p>
      <p><b>Symmetry:</b> Off → H → V → Both → 4-way → 8-way kaleidoscope.</p>
      <p><b>Animation:</b> use the bar at the bottom — add frames, scrub, play, toggle onion skin.</p>
      <p><b>FX:</b> the FX button applies image filters (invert / grayscale / sepia / posterize / blur).</p>
    `, { hideCancel: true, okText: 'Got it' });
  }

  // ---- Image filters ----
  function applyFilter(kind) {
    pushUndo();
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    if (kind === 'invert') {
      for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i+1] = 255 - d[i+1]; d[i+2] = 255 - d[i+2]; }
    } else if (kind === 'grayscale') {
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114) | 0;
        d[i] = d[i+1] = d[i+2] = v;
      }
    } else if (kind === 'sepia') {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        d[i]   = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        d[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        d[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
    } else if (kind === 'posterize') {
      const lvl = 4;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.round(d[i]   / 255 * lvl) / lvl * 255;
        d[i+1] = Math.round(d[i+1] / 255 * lvl) / lvl * 255;
        d[i+2] = Math.round(d[i+2] / 255 * lvl) / lvl * 255;
      }
    } else if (kind === 'brighten') {
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] + 24); d[i+1] = Math.min(255, d[i+1] + 24); d[i+2] = Math.min(255, d[i+2] + 24); }
    } else if (kind === 'darken') {
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.max(0, d[i] - 24); d[i+1] = Math.max(0, d[i+1] - 24); d[i+2] = Math.max(0, d[i+2] - 24); }
    }
    ctx.putImageData(img, 0, 0);
    if (kind === 'blur') {
      // Cheap blur: scale down then up
      const tmp = document.createElement('canvas');
      tmp.width = W >> 1; tmp.height = H >> 1;
      tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tmp, 0, 0, W, H);
    }
    scheduleAutosave();
  }
  $('btn-filter').addEventListener('click', async () => {
    const kinds = ['invert', 'grayscale', 'sepia', 'posterize', 'blur', 'brighten', 'darken'];
    const opts = kinds.map(k =>
      `<label style="display:block;padding:4px"><input type="radio" name="filter" value="${k}" ${k==='invert'?'checked':''}> ${k}</label>`).join('');
    const ok = await showModal('Image filter', `<div>Pick a filter:</div>${opts}`);
    if (!ok) return;
    const sel = document.querySelector('input[name="filter"]:checked');
    if (sel) applyFilter(sel.value);
  });

  // ---- Custom HSV color picker (replaces OS picker on big swatches) ----
  function rgbStrToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const v = mx, d = mx - mn;
    const s = mx ? d / mx : 0;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, v];
  }
  function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let [r, g, b] = [0, 0, 0];
    if (h < 60)      [r, g, b] = [c, x, 0];
    else if (h < 120)[r, g, b] = [x, c, 0];
    else if (h < 180)[r, g, b] = [0, c, x];
    else if (h < 240)[r, g, b] = [0, x, c];
    else if (h < 300)[r, g, b] = [x, 0, c];
    else             [r, g, b] = [c, 0, x];
    const to = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  async function openHsvPicker(forPrimary) {
    const cur = forPrimary ? state.primary : state.secondary;
    const rgb = parseColor(cur);
    const [h0, s0, v0] = rgbStrToHsv(rgb[0], rgb[1], rgb[2]);
    const html = `
      <div style="display:flex;flex-direction:column;gap:6px">
        <div id="hsv-preview" style="height:40px;border:1px solid #000"></div>
        <label>H <input id="hsv-h" type="range" min="0" max="360" value="${Math.round(h0)}"></label>
        <label>S <input id="hsv-s" type="range" min="0" max="100" value="${Math.round(s0*100)}"></label>
        <label>V <input id="hsv-v" type="range" min="0" max="100" value="${Math.round(v0*100)}"></label>
        <input id="hsv-hex" type="text" value="${cur}" style="width:80px">
      </div>`;
    const m = $('modal');
    $('modal-title').textContent = forPrimary ? 'Primary color' : 'Secondary color';
    $('modal-body').innerHTML = html;
    m.hidden = false;
    const upd = () => {
      const h = +$('hsv-h').value, s = +$('hsv-s').value / 100, v = +$('hsv-v').value / 100;
      const hex = hsvToHex(h, s, v);
      $('hsv-preview').style.background = hex;
      $('hsv-hex').value = hex;
    };
    ['hsv-h','hsv-s','hsv-v'].forEach(id => $(id).addEventListener('input', upd));
    $('hsv-hex').addEventListener('change', () => {
      const v = $('hsv-hex').value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        $('hsv-preview').style.background = v;
      }
    });
    upd();
    return new Promise((resolve) => {
      const ok = $('modal-ok'), cancel = $('modal-cancel');
      const close = (apply) => {
        m.hidden = true;
        ok.removeEventListener('click', okH);
        cancel.removeEventListener('click', cancelH);
        if (apply) {
          const hex = $('hsv-hex').value;
          if (forPrimary) setPrimary(hex); else setSecondary(hex);
        }
        resolve(apply);
      };
      const okH = () => close(true);
      const cancelH = () => close(false);
      ok.addEventListener('click', okH);
      cancel.addEventListener('click', cancelH);
    });
  }

  // ---- Pan & zoom ----
  function applyZoomTransform() {
    const stage = canvas.parentElement;
    if (!stage) return;
    canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    canvas.style.transformOrigin = 'center';
    $('btn-zoom-reset').textContent = Math.round(state.zoom * 100) + '%';
    renderGrid();
  }
  function setZoom(z) {
    state.zoom = Math.max(0.25, Math.min(8, z));
    applyZoomTransform();
  }
  $('btn-zoom-in').addEventListener('click', () => setZoom(state.zoom * 1.25));
  $('btn-zoom-out').addEventListener('click', () => setZoom(state.zoom / 1.25));
  $('btn-zoom-reset').addEventListener('click', () => { state.panX = 0; state.panY = 0; setZoom(1); });
  canvas.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) return; // require modifier so it doesn't hijack scrolling
    e.preventDefault();
    setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });

  // ---- Stroke replay ----
  let recording = [];
  function recordStrokeStart(p) { recording.push({ t: 'start', p, tool: state.tool, color: state.primary, size: state.size, alpha: state.opacity, mode: state.mode, mirror: state.mirror }); }
  function recordStrokeMove(p) { recording.push({ t: 'm', p, time: performance.now() }); }
  function recordStrokeEnd() { recording.push({ t: 'end' }); }
  let lastDrawing = null;
  function captureForReplay() { lastDrawing = ctx.getImageData(0, 0, W, H); }
  $('btn-replay').addEventListener('click', () => {
    if (!recording.length) { alert('Nothing to replay yet — make a stroke first.'); return; }
    const seq = recording.slice();
    pushUndo();
    clearCanvas('#ffffff');
    let i = 0, prev = null, t0 = performance.now();
    function step() {
      while (i < seq.length) {
        const e = seq[i++];
        if (e.t === 'start') {
          state.lastX = e.p.x; state.lastY = e.p.y;
          state.startX = e.p.x; state.startY = e.p.y;
          dispatchTool('down', e.p);
          prev = e.p;
        } else if (e.t === 'm') {
          dispatchTool('move', e.p);
          state.lastX = e.p.x; state.lastY = e.p.y;
          prev = e.p;
          // Yield occasionally so the user sees the strokes form
          if (i % 3 === 0) { requestAnimationFrame(step); return; }
        } else if (e.t === 'end') {
          dispatchTool('up', prev);
        }
      }
    }
    requestAnimationFrame(step);
  });

  // ---- Animation flipbook ----
  function ensureFrames() {
    if (state.frames) return;
    state.frames = [ctx.getImageData(0, 0, W, H)];
    state.frameIdx = 0;
    showAnimBar();
    updateAnimBar();
  }
  function showAnimBar() { $('anim-bar').hidden = false; }
  function updateAnimBar() {
    if (!state.frames) return;
    $('anim-frame').textContent = `${state.frameIdx + 1} / ${state.frames.length}`;
    drawCurrentFrame();
  }
  function commitCurrentToFrame() {
    if (!state.frames) return;
    state.frames[state.frameIdx] = ctx.getImageData(0, 0, W, H);
  }
  function drawCurrentFrame() {
    if (!state.frames) return;
    ctx.putImageData(state.frames[state.frameIdx], 0, 0);
    if (state.onion && state.frameIdx > 0) {
      const prev = state.frames[state.frameIdx - 1];
      ctx.save();
      ctx.globalAlpha = 0.3;
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      tmp.getContext('2d').putImageData(prev, 0, 0);
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();
    }
  }
  $('anim-prev').addEventListener('click', () => {
    if (!state.frames) return;
    commitCurrentToFrame();
    state.frameIdx = (state.frameIdx - 1 + state.frames.length) % state.frames.length;
    updateAnimBar();
  });
  $('anim-next').addEventListener('click', () => {
    if (!state.frames) return;
    commitCurrentToFrame();
    state.frameIdx = (state.frameIdx + 1) % state.frames.length;
    updateAnimBar();
  });
  $('anim-add').addEventListener('click', () => {
    ensureFrames();
    commitCurrentToFrame();
    state.frames.splice(state.frameIdx + 1, 0, ctx.getImageData(0, 0, W, H));
    state.frameIdx++;
    updateAnimBar();
  });
  $('anim-del').addEventListener('click', () => {
    if (!state.frames || state.frames.length <= 1) return;
    state.frames.splice(state.frameIdx, 1);
    state.frameIdx = Math.max(0, state.frameIdx - 1);
    updateAnimBar();
  });
  let playing = null;
  $('anim-play').addEventListener('click', () => {
    if (!state.frames || state.frames.length < 2) { ensureFrames(); return; }
    if (playing) { clearInterval(playing); playing = null; $('anim-play').textContent = '▶'; return; }
    commitCurrentToFrame();
    let i = 0;
    $('anim-play').textContent = '■';
    playing = setInterval(() => {
      i = (i + 1) % state.frames.length;
      ctx.putImageData(state.frames[i], 0, 0);
    }, 150);
  });
  $('anim-onion').addEventListener('change', () => {
    state.onion = $('anim-onion').checked;
    drawCurrentFrame();
  });
  // Keyboard "F" toggles the animation bar
  function toggleAnim() {
    if ($('anim-bar').hidden) { ensureFrames(); }
    else { $('anim-bar').hidden = true; state.frames = null; if (playing) { clearInterval(playing); playing = null; } }
  }

  // ---- Reset all settings/storage ----
  function resetAll() {
    if (!confirm('Reset all preferences and stored drawing?')) return;
    try {
      ['canvas','mode','size','opacity','muted','recent'].forEach(k => localStorage.removeItem('retropaint:' + k));
    } catch (e) {}
    location.reload();
  }

  // ---- HD export (2x / 3x) ----
  // Triple-click 💾 Save to choose scale
  let saveClicks = 0, saveTimer2 = null;
  $('btn-save').addEventListener('click', async (e) => {
    if (e.shiftKey) {
      const scale = +(prompt('Save at scale?', '2') || '1');
      if (scale > 0 && scale <= 8) {
        const off = document.createElement('canvas');
        off.width = W * scale; off.height = H * scale;
        const c2 = off.getContext('2d');
        c2.imageSmoothingEnabled = false;
        c2.drawImage(canvas, 0, 0, off.width, off.height);
        const a = document.createElement('a');
        a.download = `retro-paint-${state.mode}-${scale}x-${Date.now()}.png`;
        a.href = off.toDataURL('image/png');
        a.click();
        e.stopImmediatePropagation();
      }
    }
  }, true);

  // ---- Background pattern picker (via dblclick on canvas frame) ----
  // Uses CSS class on .canvas-stage; cycles through patterns
  const BG_PATTERNS = ['none', 'grid', 'dots', 'graph', 'lines', 'blueprint'];
  function nextBgPattern() {
    const i = (BG_PATTERNS.indexOf(state.bgPattern) + 1) % BG_PATTERNS.length;
    state.bgPattern = BG_PATTERNS[i];
    const stage = document.querySelector('.canvas-stage');
    BG_PATTERNS.forEach(p => stage.classList.remove('bg-' + p));
    stage.classList.add('bg-' + state.bgPattern);
  }

  // ---- Init ----
  // Restore persisted preferences first
  try {
    const savedSize = +localStorage.getItem('retropaint:size');
    if (savedSize >= 1 && savedSize <= 32) {
      state.size = savedSize;
      sizeInput.value = String(savedSize);
      sizeDisp.textContent = String(savedSize);
    }
    const savedOpacity = +localStorage.getItem('retropaint:opacity');
    if (savedOpacity > 0 && savedOpacity <= 1) {
      state.opacity = savedOpacity;
      opacityInput.value = String(Math.round(savedOpacity * 100));
      opacityDisp.textContent = opacityInput.value;
    }
    const savedRecent = JSON.parse(localStorage.getItem('retropaint:recent') || '[]');
    if (Array.isArray(savedRecent)) state.recent = savedRecent.slice(0, 12);
    renderRecent();
    setMuted(localStorage.getItem('retropaint:muted') === '1');
  } catch (e) {}

  let savedMode = 'mspaint';
  try { savedMode = localStorage.getItem('retropaint:mode') || 'mspaint'; } catch (e) {}
  if (!['mspaint','mariopaint','kidpix'].includes(savedMode)) savedMode = 'mspaint';
  setMode(savedMode);
  updateUndoButtons();
  tryRestore();

  // Register service worker for offline / installable PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
