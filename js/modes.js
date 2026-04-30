/* =========================================================
   Retro Paint — mode definitions: palettes, tools, stamps
   ========================================================= */
(function (global) {

  // ---- Pixel-art stamp helpers ----
  // Each stamp is rows of characters, each char is a key in `pal`.
  // Space and "." mean transparent.
  function makeStamp(rows, pal) {
    return { rows, pal, w: rows[0].length, h: rows.length };
  }

  // Draw a stamp centered at (x, y) on ctx, scaled by `scale`
  function drawStamp(ctx, stamp, x, y, scale) {
    scale = scale || 3;
    const ox = x - Math.floor((stamp.w * scale) / 2);
    const oy = y - Math.floor((stamp.h * scale) / 2);
    for (let py = 0; py < stamp.h; py++) {
      const row = stamp.rows[py];
      for (let px = 0; px < stamp.w; px++) {
        const ch = row[px];
        if (!ch || ch === ' ' || ch === '.') continue;
        const c = stamp.pal[ch];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + px * scale, oy + py * scale, scale, scale);
      }
    }
  }

  // ---- Mario Paint stamps ----
  const MARIO_STAMPS = {
    mushroom: makeStamp([
      "  RRRRRRR  ",
      " RWWRRRWWR ",
      "RWWWRRRWWWR",
      "RRRRRRRRRRR",
      "RRWWRRRWWRR",
      " KKKWWWKKK ",
      " KFFFFFFFK ",
      " KFKFFKFFK ",
      "  KFFFFFK  ",
      "  KKKKKKK  "
    ], { R: '#e60000', W: '#ffffff', K: '#000000', F: '#ffd9b3' }),

    star: makeStamp([
      "     YY     ",
      "    YYYY    ",
      "    YYYY    ",
      "YYYYYYYYYYYY",
      " YYYYYYYYYY ",
      "  YYYYYYYY  ",
      "  YYYYYYYY  ",
      " YYYYYYYYYY ",
      " YYY    YYY ",
      "YY        YY"
    ], { Y: '#ffd700' }),

    heart: makeStamp([
      " RR  RR ",
      "RPPRRPPR",
      "RPPPPPPR",
      "RPPPPPPR",
      " RPPPPR ",
      "  RPPR  ",
      "   RR   "
    ], { R: '#cc0033', P: '#ff6688' }),

    flower: makeStamp([
      "  PP  PP  ",
      " PWPPPPWP ",
      " PWPYYPWP ",
      "PPPPYYPPPP",
      "PWPPPPPPWP",
      "PPPPPPPPPP",
      " PPPGGPPP ",
      "    GG    ",
      "    GG    ",
      "   GGGG   "
    ], { P: '#ff66cc', W: '#ffffff', Y: '#ffd700', G: '#33aa33' }),

    yoshi: makeStamp([
      "   GGGGGG   ",
      "  GWWGGGGG  ",
      " GWBWGGGGGG ",
      " GWBWGGGGRR ",
      " GGGGGGGGRR ",
      "GGGGGGGGGGG ",
      "GWWWWWWWGGG ",
      "GWWWWWWWGGG ",
      " GGGGGGGGG  ",
      " RR    RR   "
    ], { G: '#33cc33', W: '#ffffff', B: '#000000', R: '#cc0000' }),

    coin: makeStamp([
      "  YYYY  ",
      " YOOOOY ",
      "YOYYYYOY",
      "YOYOOYOY",
      "YOYOOYOY",
      "YOYYYYOY",
      " YOOOOY ",
      "  YYYY  "
    ], { Y: '#ffe066', O: '#cc8800' }),

    note: makeStamp([
      "    KK",
      "    KK",
      "    KK",
      "    KK",
      "    KK",
      "  KKKK",
      "KKKKKK",
      "KKKKKK"
    ], { K: '#000000' }),

    smile: makeStamp([
      "  YYYYYY  ",
      " YYYYYYYY ",
      "YYBBYYBBYY",
      "YYBBYYBBYY",
      "YYYYYYYYYY",
      "YBYYYYYYBY",
      "YBBYYYYBBY",
      " YBBBBBBY ",
      "  YYYYYY  "
    ], { Y: '#ffe55c', B: '#000000' })
  };

  // ---- Kid Pix stamps ----
  const KIDPIX_STAMPS = {
    sun: makeStamp([
      "Y..Y..Y",
      ".YYYYY.",
      "YYOOOOY",
      ".YOYYO.",
      "YYOOOOY",
      ".YYYYY.",
      "Y..Y..Y"
    ], { Y: '#ffcc00', O: '#ff8800' }),

    cat: makeStamp([
      "K.....K",
      "KK...KK",
      "KKKKKKK",
      "KWKWKWK",
      "KKKPKKK",
      ".KKKKK.",
      "..K.K.."
    ], { K: '#444444', W: '#ffffff', P: '#ff66aa' }),

    house: makeStamp([
      "....RR....",
      "...RRRR...",
      "..RRRRRR..",
      ".RRRRRRRR.",
      "RRRRRRRRRR",
      "WWWBBWWWWW",
      "WWWBBWWGGW",
      "WWWBBWWGGW",
      "WWWBBWWGGW"
    ], { R: '#cc2233', W: '#f5e8c0', B: '#5a3a1a', G: '#88ccff' }),

    tree: makeStamp([
      "..GGGG..",
      ".GGGGGG.",
      "GGGGGGGG",
      "GGGGGGGG",
      ".GGGGGG.",
      "..GBBG..",
      "...BB...",
      "...BB..."
    ], { G: '#22aa44', B: '#5a3a1a' }),

    ufo: makeStamp([
      "..CCCCCC..",
      ".CWWWWWWC.",
      "CWWWWWWWWC",
      "GGGGGGGGGG",
      "GGGGGGGGGG",
      ".YYY..YYY."
    ], { C: '#22ddff', W: '#ffffff', G: '#888888', Y: '#ffcc00' }),

    rainbow: makeStamp([
      "...RRRRRR...",
      "..RYYYYYYR..",
      ".RYGGGGGGYR.",
      "RYGBBBBBBGYR",
      "YGBPPPPPPBGY"
    ], { R: '#ff3333', Y: '#ffcc00', G: '#33cc33', B: '#3366ff', P: '#aa44ff' }),

    smiley: makeStamp([
      "..YYYYY..",
      ".YYYYYYY.",
      "YYBYYYBYY",
      "YYBYYYBYY",
      "YYYYYYYYY",
      "YBYYYYYBY",
      ".YBBBBBY.",
      "..YYYYY.."
    ], { Y: '#ffd633', B: '#000000' }),

    star2: makeStamp([
      "....M....",
      "...MMM...",
      "MMMMMMMMM",
      ".MMMMMMM.",
      "..MMMMM..",
      ".MM...MM.",
      "M.......M"
    ], { M: '#ff66ff' })
  };

  // ---- Palettes ----
  const PALETTES = {
    mspaint: [
      '#000000', '#7f7f7f', '#7f0000', '#7f7f00',
      '#007f00', '#007f7f', '#00007f', '#7f007f',
      '#7f7f3f', '#003f3f', '#003f7f', '#3f007f',
      '#7f3f00', '#7f003f',
      '#ffffff', '#bfbfbf', '#ff0000', '#ffff00',
      '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
      '#ffff7f', '#00ff7f', '#7fbfff', '#7f7fff',
      '#ff007f', '#ff7f00'
    ],
    mariopaint: [
      '#000000', '#ffffff',
      '#ff3344', '#ff77aa',
      '#ff8800', '#ffd700',
      '#ffe55c', '#aaff66',
      '#33cc33', '#66ddee',
      '#3388ff', '#aa55ff',
      '#8b4513', '#bbbbbb',
      '#ff1493', '#7cfc00'
    ],
    kidpix: [
      '#000000', '#ffffff',
      '#ff0033', '#ff3399', '#ff66cc',
      '#ff6600', '#ffcc00', '#ffff33',
      '#33ff33', '#00cc66', '#00ffcc',
      '#0099ff', '#3333ff', '#9933ff',
      '#cc0099', '#663300', '#999999', '#cccccc'
    ]
  };

  // ---- Tool definitions per mode ----
  // Tool entries: { id, label, icon, kind, opts? }
  const TOOLS = {
    mspaint: [
      { id: 'pencil', label: 'Pencil', icon: '✏️', shortcut: 'p' },
      { id: 'brush', label: 'Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'fill', label: 'Fill', icon: '🪣', shortcut: 'f' },
      { id: 'eyedrop', label: 'Pick', icon: '💧', shortcut: 'k' },
      { id: 'spray', label: 'Spray', icon: '💨', shortcut: 's' },
      { id: 'line', label: 'Line', icon: '╱', shortcut: 'l' },
      { id: 'rect', label: 'Rect', icon: '▭', shortcut: 'r' },
      { id: 'rectFill', label: 'Rect•', icon: '▬' },
      { id: 'ellipse', label: 'Oval', icon: '◯', shortcut: 'o' },
      { id: 'ellipseFill', label: 'Oval•', icon: '⬤' }
    ],
    mariopaint: [
      { id: 'musicpencil', label: 'Music Pencil', icon: '🎵', shortcut: 'p' },
      { id: 'brush', label: 'Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'fill', label: 'Bucket', icon: '🪣', shortcut: 'f' },
      { id: 'spray', label: 'Spray', icon: '💨', shortcut: 's' },
      { id: 'stamp:mushroom', label: 'Mushroom', icon: '🍄', kind: 'stamp', stamp: 'mushroom' },
      { id: 'stamp:star',     label: 'Star',     icon: '⭐', kind: 'stamp', stamp: 'star' },
      { id: 'stamp:heart',    label: 'Heart',    icon: '❤️', kind: 'stamp', stamp: 'heart' },
      { id: 'stamp:flower',   label: 'Flower',   icon: '🌸', kind: 'stamp', stamp: 'flower' },
      { id: 'stamp:yoshi',    label: 'Yoshi',    icon: '🦖', kind: 'stamp', stamp: 'yoshi' },
      { id: 'stamp:coin',     label: 'Coin',     icon: '🪙', kind: 'stamp', stamp: 'coin' },
      { id: 'stamp:note',     label: 'Note',     icon: '🎼', kind: 'stamp', stamp: 'note' },
      { id: 'stamp:smile',    label: 'Smile',    icon: '😊', kind: 'stamp', stamp: 'smile' }
    ],
    kidpix: [
      { id: 'wacky:rainbow', label: 'Rainbow', icon: '🌈', kind: 'wacky', wacky: 'rainbow', shortcut: 'p' },
      { id: 'wacky:echo',    label: 'Echo',    icon: '🔁', kind: 'wacky', wacky: 'echo' },
      { id: 'wacky:sparkle', label: 'Sparkle', icon: '✨', kind: 'wacky', wacky: 'sparkle' },
      { id: 'wacky:kaleido', label: 'Mirror',  icon: '🦋', kind: 'wacky', wacky: 'kaleido' },
      { id: 'wacky:dots',    label: 'Dots',    icon: '⚪', kind: 'wacky', wacky: 'dots' },
      { id: 'wacky:noodle',  label: 'Noodle',  icon: '🍜', kind: 'wacky', wacky: 'noodle' },
      { id: 'brush', label: 'Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'spray', label: 'Spray', icon: '💨', shortcut: 's' },
      { id: 'fill',  label: 'Mixer', icon: '🪣', shortcut: 'f' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'dynamite', label: 'Dynamite!', icon: '🧨', kind: 'action', action: 'dynamite' },
      { id: 'ohno', label: 'Oh No!', icon: '😱', kind: 'action', action: 'ohno' },
      { id: 'stamp:sun',    label: 'Sun',    icon: '☀️', kind: 'stamp', stamp: 'sun', stampSet: 'kidpix' },
      { id: 'stamp:cat',    label: 'Cat',    icon: '🐱', kind: 'stamp', stamp: 'cat', stampSet: 'kidpix' },
      { id: 'stamp:house',  label: 'House',  icon: '🏠', kind: 'stamp', stamp: 'house', stampSet: 'kidpix' },
      { id: 'stamp:tree',   label: 'Tree',   icon: '🌳', kind: 'stamp', stamp: 'tree', stampSet: 'kidpix' },
      { id: 'stamp:ufo',    label: 'UFO',    icon: '🛸', kind: 'stamp', stamp: 'ufo', stampSet: 'kidpix' },
      { id: 'stamp:smiley', label: 'Smiley', icon: '🙂', kind: 'stamp', stamp: 'smiley', stampSet: 'kidpix' },
      { id: 'stamp:star2',  label: 'Pop★',   icon: '🌟', kind: 'stamp', stamp: 'star2', stampSet: 'kidpix' }
    ]
  };

  global.PaintModes = {
    palettes: PALETTES,
    tools: TOOLS,
    stamps: { mariopaint: MARIO_STAMPS, kidpix: KIDPIX_STAMPS },
    drawStamp,
    titles: {
      mspaint: 'untitled — Paint',
      mariopaint: '* Mario Paint *',
      kidpix: 'KID PIX !'
    }
  };
})(window);
