/* =========================================================
   Retro Paint — main app: canvas engine, tools, mode switching
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;

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
    colorIndex: 0
  };

  const undoStack = [];
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
    } catch (e) { /* ignore */ }
  }
  function undo() {
    const s = undoStack.pop();
    if (s) ctx.putImageData(s, 0, 0);
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
        strokeLine(ctx, state.startX, state.startY, p.x, p.y, Math.max(1, state.size), state.primary);
      }
    },
    rect: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        ctx.strokeStyle = state.primary;
        ctx.lineWidth = Math.max(1, state.size);
        ctx.strokeRect(
          Math.min(state.startX, p.x), Math.min(state.startY, p.y),
          Math.abs(p.x - state.startX), Math.abs(p.y - state.startY)
        );
      }
    },
    rectFill: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        ctx.fillStyle = state.primary;
        ctx.fillRect(
          Math.min(state.startX, p.x), Math.min(state.startY, p.y),
          Math.abs(p.x - state.startX), Math.abs(p.y - state.startY)
        );
      }
    },
    ellipse: {
      down(p) { saveSnapshot(); state.startX = p.x; state.startY = p.y; },
      move(p) {
        restoreSnapshot();
        const cx = (state.startX + p.x) / 2;
        const cy = (state.startY + p.y) / 2;
        const rx = Math.abs(p.x - state.startX) / 2;
        const ry = Math.abs(p.y - state.startY) / 2;
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
        const cx = (state.startX + p.x) / 2;
        const cy = (state.startY + p.y) / 2;
        const rx = Math.abs(p.x - state.startX) / 2;
        const ry = Math.abs(p.y - state.startY) / 2;
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
    }
  };

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

  function dropStamp(p) {
    const set = state.activeStampSet || (state.mode === 'kidpix' ? 'kidpix' : 'mariopaint');
    const stamps = PaintModes.stamps[set];
    if (!stamps) return;
    const s = stamps[state.activeStamp];
    if (!s) return;
    const scale = Math.max(2, Math.round(state.size * 0.8) + 2);
    PaintModes.drawStamp(ctx, s, p.x, p.y, scale);
    Sounds.stampPlop();
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
    if (fn) fn(p);
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Sounds.init();
    canvas.setPointerCapture(e.pointerId);
    state.drawing = true;
    state.button = e.button;
    const p = getPos(e);
    state.startX = state.lastX = p.x;
    state.startY = state.lastY = p.y;
    pushUndo();
    dispatchTool('down', p);
    state.lastX = p.x; state.lastY = p.y;
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = getPos(e);
    updateStatusPos(p);
    if (!state.drawing) return;
    dispatchTool('move', p);
    state.lastX = p.x; state.lastY = p.y;
  });
  function endStroke(e) {
    if (!state.drawing) return;
    state.drawing = false;
    state.snapshot = null;
    if (e) {
      const p = getPos(e);
      dispatchTool('up', p);
    }
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
  $('btn-clear').addEventListener('click', () => {
    if (confirm('Clear the canvas?')) { pushUndo(); clearCanvas('#ffffff'); }
  });
  $('btn-save').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `retro-paint-${state.mode}-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  $('primary-swatch').addEventListener('click', () => pickColorPrompt(true));
  $('secondary-swatch').addEventListener('click', () => pickColorPrompt(false));

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
  });

  // ---- Keyboard shortcuts ----
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault(); $('btn-save').click();
    } else if (e.key === '1') setMode('mspaint');
    else if (e.key === '2') setMode('mariopaint');
    else if (e.key === '3') setMode('kidpix');
  });

  // ---- Init ----
  setMode('mspaint');
})();
