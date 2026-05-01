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
    ], { Y: '#ffe55c', B: '#000000' }),

    ghost: makeStamp([
      "  WWWWWW  ",
      " WWWWWWWW ",
      "WWBWWWWBWW",
      "WWBWWWWBWW",
      "WWWWWWWWWW",
      "WRRWWWWRRW",
      "WWWWWWWWWW",
      "WWWWWWWWWW",
      "WWWWWWWWWW",
      "W WW WW WW"
    ], { W: '#ffffff', B: '#000000', R: '#ff66aa' }),

    bowser: makeStamp([
      "  GGGGGG  ",
      " GGGGGGGG ",
      "GGYYYYYYGG",
      "GYWBBBBWYG",
      "GYYBBBBYYG",
      "GGRRRRRRGG",
      " GRRRRRRG ",
      " GGGGGGGG ",
      "  GG  GG  "
    ], { G: '#33aa33', Y: '#ffe066', W: '#ffffff', B: '#000000', R: '#ff5500' }),

    fireFlower: makeStamp([
      "   RYR   ",
      "  YRYRY  ",
      " RYBYBYR ",
      "YRBYRYBRY",
      " RYBYBYR ",
      "  YRYRY  ",
      "   RYR   ",
      "   GGG   ",
      "  GGGGG  "
    ], { R: '#ff3300', Y: '#ffd700', B: '#000000', G: '#33aa33' }),

    oneUp: makeStamp([
      "  GGGGGGG  ",
      " GWWGGGWWG ",
      "GWWWGGGWWWG",
      "GGGGGGGGGGG",
      "GGWWGGGWWGG",
      " KKKWWWKKK ",
      " KFFFFFFFK ",
      " KFKFFKFFK ",
      "  KFFFFFK  ",
      "  KKKKKKK  "
    ], { G: '#33cc33', W: '#ffffff', K: '#000000', F: '#ffd9b3' }),

    koopaShell: makeStamp([
      "  KKKKKK  ",
      " KGGGGGGK ",
      "KGYYYYYYGK",
      "KGYGGGGYGK",
      "KGYGYYGYGK",
      "KGYGYYGYGK",
      "KGYGGGGYGK",
      "KGYYYYYYGK",
      " KKKKKKKK "
    ], { K: '#000000', G: '#33aa33', Y: '#ffe066' }),

    bobOmb: makeStamp([
      "    YY    ",
      "   YYYY   ",
      "  KKKKKK  ",
      " KKKKKKKK ",
      "KKWKKKKKKK",
      "KWWKKKKKKK",
      "KKKKKKKKKK",
      " KKKKKKKK ",
      "  KKKKKK  ",
      "  YY  YY  "
    ], { Y: '#ffd700', K: '#1a1a1a', W: '#ffffff' }),

    piranha: makeStamp([
      "  RRWWWRR  ",
      " RWWWWWWWR ",
      "RWWKWWKWWWR",
      "RWKWWKKKWWR",
      "RWWWKKKWWWR",
      " RWWWWWWWR ",
      "  RRWWWRR  ",
      "    GGG    ",
      "    GGG    ",
      "   GGGGG   "
    ], { R: '#ff3344', W: '#ffffff', K: '#000000', G: '#33aa33' }),

    pipe: makeStamp([
      "GGGGGGGGGG",
      "GWWWWWWWWG",
      "GWGGGGGGWG",
      "GGGGGGGGGG",
      " GGGGGGGG ",
      " GWGGGGWG ",
      " GGGGGGGG ",
      " GGGGGGGG ",
      " GWGGGGWG ",
      " GGGGGGGG "
    ], { G: '#33aa33', W: '#88ee88' })
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
    ], { M: '#ff66ff' }),

    rocket: makeStamp([
      "...R...",
      "..RWR..",
      ".RWWWR.",
      ".RWBWR.",
      ".RWWWR.",
      ".RYRYR.",
      "RR.R.RR",
      "Y..R..Y",
      "...Y..."
    ], { R: '#cc2233', W: '#ffffff', B: '#3366ff', Y: '#ffcc00' }),

    fish: makeStamp([
      "...BBBBB..",
      "..BBBBBBB.",
      ".BBBBBBBBO",
      "BBKBBBBBOO",
      "BBBBBBBBBO",
      ".BBBBBBBB.",
      "..BBBBBBB.",
      "...BBBBB..",
      ".....OO..."
    ], { B: '#33ccff', K: '#000000', O: '#ff8800' }),

    bird: makeStamp([
      "...BBBB...",
      "..BBBBBBB.",
      ".BBKBBBBBO",
      ".BBBBBBBBO",
      ".BBBBBBBB.",
      "..BBBBBB..",
      "...K..K...",
      "...K..K..."
    ], { B: '#3366ff', K: '#000000', O: '#ffcc00' }),

    balloon: makeStamp([
      "  RRRRRR  ",
      " RWRRRRRR ",
      "RWWRRRRRRR",
      "RWRRRRRRRR",
      "RRRRRRRRRR",
      "RRRRRRRRRR",
      " RRRRRRRR ",
      "  RRRRRR  ",
      "    RR    ",
      "    KK    ",
      "    KK    "
    ], { R: '#ff3333', W: '#ffaaaa', K: '#000000' }),

    gift: makeStamp([
      "...RRRRR...",
      "..R.RRR.R..",
      "PPPPPPPPPPP",
      "PRRRRRRRRRP",
      "PRRRRRRRRRP",
      "PRRRRRRRRRP",
      "PRRRRRRRRRP",
      "PRRRRRRRRRP",
      "PPPPPPPPPPP"
    ], { R: '#cc2244', P: '#ffd700' }),

    cupcake: makeStamp([
      "...P.P.P...",
      "..PPPPPPP..",
      ".PWPWPWPWP.",
      "PPPPPPPPPPP",
      "BBBBBBBBBBB",
      "BWBWBWBWBWB",
      "BBBBBBBBBBB",
      ".BBBBBBBBB.",
      "..BBBBBBB.."
    ], { P: '#ff66cc', W: '#ffffff', B: '#cc8844' }),

    butterfly: makeStamp([
      "..PP....PP..",
      ".PPPP..PPPP.",
      "PPPPPPPPPPPP",
      "PPYYPPPPYYPP",
      "PPPPPPKPPPPP",
      ".PPPPPKPPPPP",
      "..PPPPKPPPP.",
      "...PPPKPPP..",
      "....PPKPP..."
    ], { P: '#aa44ff', Y: '#ffcc00', K: '#000000' }),

    snowman: makeStamp([
      "...WWWWW...",
      "..WWKKKWW..",
      ".WKWKWKWKW.",
      ".WWWWKWWWW.",
      "..WWWWWWW..",
      "..WWWWWWW..",
      ".WWWWWWWWW.",
      "WWKWKWKWKWW",
      "WWWWWWWWWWW",
      "WWWWWWWWWWW",
      ".WWWWWWWWW."
    ], { W: '#ffffff', K: '#000000' }),

    pizza: makeStamp([
      "..YYYYYYY..",
      ".YOOYOOYOOY",
      ".YOOYOOYOOY",
      "YOOOOOOOOOY",
      "YOOOYOOYOOY",
      "YOOOYOOYOOY",
      "YOOOOOOOOOY",
      ".YOOYOOYOOY",
      "..YYYYYYY..",
      "...YYYYY..."
    ], { Y: '#ffcc66', O: '#cc3322' }),

    robot: makeStamp([
      ".KKKKKKKKK.",
      ".KGGGGGGGK.",
      ".KGRGGGRGK.",
      ".KGGGKGGGK.",
      ".KGGKKKGGK.",
      ".KKKKKKKKK.",
      "KKBBBBBBBKK",
      "K..KKKKK..K"
    ], { K: '#888888', G: '#cccccc', R: '#ff3333', B: '#444444' })
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
    ],
    // MacPaint: 1-bit B&W. Two "colors" + greys for the dither preview.
    macpaint: [
      '#000000', '#ffffff',
      '#222222', '#444444', '#666666',
      '#888888', '#aaaaaa', '#cccccc'
    ],
    // Tux Paint: bright primaries for kids.
    tuxpaint: [
      '#000000', '#ffffff',
      '#ed1c24', '#ff7f27', '#fff200',
      '#22b14c', '#00a2e8', '#3f48cc',
      '#a349a4', '#ff66cc', '#b97a57',
      '#ffaec9', '#fff5b3', '#c8bfe7',
      '#7f7f7f', '#c3c3c3'
    ],
    // Paint Shop Pro: pro-grayscale + RGB strip.
    psp: [
      '#000000', '#202020', '#404040', '#606060',
      '#808080', '#a0a0a0', '#c0c0c0', '#ffffff',
      '#ff0000', '#00ff00', '#0000ff',
      '#ffff00', '#ff00ff', '#00ffff',
      '#800000', '#008000', '#000080',
      '#808000', '#800080', '#008080',
      '#ff8040', '#40ff80', '#4080ff',
      '#ffc080', '#80ffc0', '#c080ff'
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
      { id: 'ellipseFill', label: 'Oval•', icon: '⬤' },
      { id: 'gradient', label: 'Gradient', icon: '🌈', shortcut: 'g' },
      { id: 'smudge', label: 'Smudge', icon: '👆' },
      { id: 'text', label: 'Text', icon: 'T', shortcut: 't' },
      { id: 'select', label: 'Select', icon: '⬚', shortcut: 'a' }
    ],
    mariopaint: [
      { id: 'musicpencil', label: 'Music Pencil', icon: '🎵', shortcut: 'p' },
      { id: 'brush', label: 'Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'fill', label: 'Bucket', icon: '🪣', shortcut: 'f' },
      { id: 'spray', label: 'Spray', icon: '💨', shortcut: 's' },
      { id: 'gradient', label: 'Gradient', icon: '🌈', shortcut: 'g' },
      { id: 'text', label: 'Text', icon: 'T', shortcut: 't' },
      { id: 'stamp:mushroom', label: 'Mushroom', icon: '🍄', kind: 'stamp', stamp: 'mushroom' },
      { id: 'stamp:oneUp',    label: '1-Up',     icon: '🍀', kind: 'stamp', stamp: 'oneUp' },
      { id: 'stamp:star',     label: 'Star',     icon: '⭐', kind: 'stamp', stamp: 'star' },
      { id: 'stamp:fireFlower', label: 'Fire Flower', icon: '🔥', kind: 'stamp', stamp: 'fireFlower' },
      { id: 'stamp:heart',    label: 'Heart',    icon: '❤️', kind: 'stamp', stamp: 'heart' },
      { id: 'stamp:flower',   label: 'Flower',   icon: '🌸', kind: 'stamp', stamp: 'flower' },
      { id: 'stamp:yoshi',    label: 'Yoshi',    icon: '🦖', kind: 'stamp', stamp: 'yoshi' },
      { id: 'stamp:bowser',   label: 'Bowser',   icon: '👹', kind: 'stamp', stamp: 'bowser' },
      { id: 'stamp:coin',     label: 'Coin',     icon: '🪙', kind: 'stamp', stamp: 'coin' },
      { id: 'stamp:note',     label: 'Note',     icon: '🎼', kind: 'stamp', stamp: 'note' },
      { id: 'stamp:ghost',    label: 'Boo',      icon: '👻', kind: 'stamp', stamp: 'ghost' },
      { id: 'stamp:koopaShell', label: 'Shell',  icon: '🛡️', kind: 'stamp', stamp: 'koopaShell' },
      { id: 'stamp:bobOmb',   label: 'Bob-omb',  icon: '💣', kind: 'stamp', stamp: 'bobOmb' },
      { id: 'stamp:piranha',  label: 'Piranha',  icon: '🌶️', kind: 'stamp', stamp: 'piranha' },
      { id: 'stamp:pipe',     label: 'Pipe',     icon: '🟢', kind: 'stamp', stamp: 'pipe' },
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
      { id: 'gradient', label: 'Gradient', icon: '🌈', shortcut: 'g' },
      { id: 'smudge', label: 'Smudge', icon: '👆' },
      { id: 'text', label: 'Text', icon: 'T', shortcut: 't' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'dynamite', label: 'Dynamite!', icon: '🧨', kind: 'action', action: 'dynamite' },
      { id: 'ohno', label: 'Oh No!', icon: '😱', kind: 'action', action: 'ohno' },
      { id: 'stamp:sun',       label: 'Sun',       icon: '☀️', kind: 'stamp', stamp: 'sun',       stampSet: 'kidpix' },
      { id: 'stamp:cat',       label: 'Cat',       icon: '🐱', kind: 'stamp', stamp: 'cat',       stampSet: 'kidpix' },
      { id: 'stamp:house',     label: 'House',     icon: '🏠', kind: 'stamp', stamp: 'house',     stampSet: 'kidpix' },
      { id: 'stamp:tree',      label: 'Tree',      icon: '🌳', kind: 'stamp', stamp: 'tree',      stampSet: 'kidpix' },
      { id: 'stamp:ufo',       label: 'UFO',       icon: '🛸', kind: 'stamp', stamp: 'ufo',       stampSet: 'kidpix' },
      { id: 'stamp:rocket',    label: 'Rocket',    icon: '🚀', kind: 'stamp', stamp: 'rocket',    stampSet: 'kidpix' },
      { id: 'stamp:fish',      label: 'Fish',      icon: '🐠', kind: 'stamp', stamp: 'fish',      stampSet: 'kidpix' },
      { id: 'stamp:bird',      label: 'Bird',      icon: '🐦', kind: 'stamp', stamp: 'bird',      stampSet: 'kidpix' },
      { id: 'stamp:butterfly', label: 'Butterfly', icon: '🦋', kind: 'stamp', stamp: 'butterfly', stampSet: 'kidpix' },
      { id: 'stamp:balloon',   label: 'Balloon',   icon: '🎈', kind: 'stamp', stamp: 'balloon',   stampSet: 'kidpix' },
      { id: 'stamp:gift',      label: 'Gift',      icon: '🎁', kind: 'stamp', stamp: 'gift',      stampSet: 'kidpix' },
      { id: 'stamp:cupcake',   label: 'Cupcake',   icon: '🧁', kind: 'stamp', stamp: 'cupcake',   stampSet: 'kidpix' },
      { id: 'stamp:pizza',     label: 'Pizza',     icon: '🍕', kind: 'stamp', stamp: 'pizza',     stampSet: 'kidpix' },
      { id: 'stamp:snowman',   label: 'Snowman',   icon: '⛄', kind: 'stamp', stamp: 'snowman',   stampSet: 'kidpix' },
      { id: 'stamp:robot',     label: 'Robot',     icon: '🤖', kind: 'stamp', stamp: 'robot',     stampSet: 'kidpix' },
      { id: 'stamp:smiley',    label: 'Smiley',    icon: '🙂', kind: 'stamp', stamp: 'smiley',    stampSet: 'kidpix' },
      { id: 'stamp:star2',     label: 'Pop★',      icon: '🌟', kind: 'stamp', stamp: 'star2',     stampSet: 'kidpix' }
    ],
    // MacPaint — Phase 3 ships patterns + FatBits + Goodies + lasso.
    macpaint: [
      { id: 'pencil', label: 'Pencil', icon: '✏️', shortcut: 'p' },
      { id: 'macBrush', label: 'P-Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'macFill', label: 'P-Fill', icon: '🪣', shortcut: 'f' },
      { id: 'spray', label: 'Spray', icon: '💨', shortcut: 's' },
      { id: 'line', label: 'Line', icon: '╱', shortcut: 'l' },
      { id: 'rect', label: 'Rect', icon: '▭', shortcut: 'r' },
      { id: 'rectFill', label: 'Rect•', icon: '▬' },
      { id: 'ellipse', label: 'Oval', icon: '◯', shortcut: 'o' },
      { id: 'ellipseFill', label: 'Oval•', icon: '⬤' },
      { id: 'text', label: 'Text', icon: 'A', shortcut: 't' },
      { id: 'select', label: 'Marquee', icon: '⬚', shortcut: 'a' },
      { id: 'lasso', label: 'Lasso', icon: '◌' },
      { id: 'fatbits', label: 'FatBits', icon: '🔍' },
      { id: 'gInvert', label: 'Invert', icon: '◐' },
      { id: 'gFlipH', label: 'Flip H', icon: '⇄' },
      { id: 'gFlipV', label: 'Flip V', icon: '⇅' },
      { id: 'gRot90', label: 'Rot 90', icon: '↻' },
      { id: 'gTrace', label: 'Trace', icon: '✎' },
      { id: 'gThreshold', label: '1-Bit', icon: '◑' }
    ],
    // Tux Paint — Phase 1 minimal set; Phase 4 adds magic effects, categorized stamps, mascot.
    tuxpaint: [
      { id: 'pencil', label: 'Paint', icon: '✏️', shortcut: 'p' },
      { id: 'brush', label: 'Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'fill', label: 'Fill', icon: '🪣', shortcut: 'f' },
      { id: 'spray', label: 'Spray', icon: '💨', shortcut: 's' },
      { id: 'line', label: 'Lines', icon: '╱', shortcut: 'l' },
      { id: 'rect', label: 'Shapes', icon: '▭', shortcut: 'r' },
      { id: 'wacky:rainbow', label: 'Magic', icon: '🌈', kind: 'wacky', wacky: 'rainbow' },
      { id: 'text', label: 'Text', icon: 'T', shortcut: 't' },
      { id: 'stamp:smile', label: 'Stamp', icon: '😊', kind: 'stamp', stamp: 'smile' }
    ],
    // Paint Shop Pro — Phase 1 pro-toolbox; Phase 5 adds layers UI, dialogs, clone, tabs.
    psp: [
      { id: 'pencil', label: 'Pencil', icon: '✏️', shortcut: 'p' },
      { id: 'brush', label: 'Brush', icon: '🖌️', shortcut: 'b' },
      { id: 'eraser', label: 'Eraser', icon: '🧽', shortcut: 'e' },
      { id: 'fill', label: 'Bucket', icon: '🪣', shortcut: 'f' },
      { id: 'eyedrop', label: 'Dropper', icon: '💧', shortcut: 'k' },
      { id: 'spray', label: 'Airbrush', icon: '💨', shortcut: 's' },
      { id: 'smudge', label: 'Smudge', icon: '👆' },
      { id: 'line', label: 'Line', icon: '╱', shortcut: 'l' },
      { id: 'rect', label: 'Rect', icon: '▭', shortcut: 'r' },
      { id: 'rectFill', label: 'Rect•', icon: '▬' },
      { id: 'ellipse', label: 'Oval', icon: '◯', shortcut: 'o' },
      { id: 'ellipseFill', label: 'Oval•', icon: '⬤' },
      { id: 'gradient', label: 'Gradient', icon: '🌈', shortcut: 'g' },
      { id: 'text', label: 'Text', icon: 'T', shortcut: 't' },
      { id: 'select', label: 'Select', icon: '⬚', shortcut: 'a' }
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
      kidpix: 'KID PIX !',
      macpaint: 'untitled (MacPaint)',
      tuxpaint: 'Tux Paint — New Picture',
      psp: 'Image1 @ 100% (Layer 1)'
    }
  };
})(window);
