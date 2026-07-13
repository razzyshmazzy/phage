(function () {
  var KEY = 'phage_intro_seen';
  var replay = location.search.indexOf('replay') !== -1;

  var shell = document.getElementById('shell');

  // Prefix intro art with the site baseurl so the pieces resolve under
  // /<baseurl>/assets/img/ on a GitHub Pages project site.
  var BASE = (window.PHAGE_BASE || '') + '/assets/img/';

  // Reveal the underlying blog and let it scroll.
  function revealPage() {
    document.documentElement.classList.add('revealed');
  }

  document.getElementById('reset').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); } catch (err) {}
    location.href = location.pathname + '?replay';
  });

  // Already played (and not forcing replay) -> just show the page.
  if (!replay && localStorage.getItem(KEY)) {
    revealPage();
    shell.remove();
    return;
  }

  var ctx = shell.getContext('2d');
  var W, H, DPR;

  function rnd(m) { return (Math.random() - 0.5) * 2 * m; }

  // ---- Load the assets ----
  // PHAGE is five separate letter images, and the "neverend" line below
  // ("in all my fragmented theory") is five separate word images. Each
  // piece is a full-canvas transparent PNG holding one letter/word at its
  // original position, so drawing them at the old placement is unchanged.
  var LETTER_FILES = ['letter_P.png', 'letter_H.png', 'letter_A.png',
                      'letter_G.png', 'letter_E.png'];
  var WORD_FILES = ['word_in.png', 'word_all.png', 'word_my.png',
                    'word_fragmented.png', 'word_theory.png'];

  // Optional QA time-stretch: ?slow=N slows the reveal N× (default 1,
  // so normal loads are unaffected).
  var SLOW = (function () {
    var m = location.search.match(/[?&]slow=([\d.]+)/);
    return m ? Math.max(1, parseFloat(m[1])) : 1;
  })();

  function makePieces(files, prefix) {
    return files.map(function (src) {
      return {
        img: new Image(),
        revealAt: 0,
        name: src.replace(prefix, '').replace('.png', '')
      };
    });
  }
  // PHAGE letters keep placement (0.231, 0.085); words keep (0.201, 0.572).
  var letters = makePieces(LETTER_FILES, 'letter_');
  var words = makePieces(WORD_FILES, 'word_');
  var pieces = letters.concat(words);

  var need = pieces.length, loaded = 0;
  function tick() { if (++loaded === need) start(); }
  pieces.forEach(function (p, i) {
    p.img.onload = p.img.onerror = tick;
    p.img.src = BASE + (i < letters.length ? LETTER_FILES[i]
                                           : WORD_FILES[i - letters.length]);
  });

  // ---- Scribble-in schedule ----
  // Each piece is "scribbled" onto the page in turn: PHAGE letters left to
  // right, then the phrase words. A piece reveals along a scribbling pen
  // motion (the art itself is hand-scribbled, so this reads as it being
  // drawn in). Small per-piece randomness keeps every load a little different.
  var revealStart = 0;
  var lastEnd = 0;            // when the last piece finishes scribbling
  var forceComplete = false;  // snap everything fully drawn on trigger

  // Placement unchanged: PHAGE letters (0.231, 0.085); words (0.201, 0.572).
  letters.forEach(function (l) { l.left = 0.231; l.top = 0.085; });
  words.forEach(function (w) { w.left = 0.201; w.top = 0.572; });

  // Pen speed: a constant amount of ink (px) drawn per ms, identical for
  // every piece — so how long a piece takes scales with how much ink it has.
  var SPEED = 3.0 / SLOW;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Global scribble timeline: every piece's little scribble "patches" are
  // pooled and shuffled, so the ink fills in from random parts of the whole
  // text (both PHAGE and the phrase at once) rather than left to right.
  var gPatches = [], gCum = [], gPtr = 0, gTotal = 0;

  function buildAll() {
    pieces.forEach(function (p) { p.scribbler = makeScribbler(p); });
    var all = [];
    pieces.forEach(function (p) {
      p.scribbler.patches.forEach(function (pt) {
        all.push({ piece: p, pts: pt.pts, len: pt.len });
      });
    });
    all = shuffle(all);
    gCum = []; var acc = 0;
    for (var i = 0; i < all.length; i++) { acc += all[i].len; gCum[i] = acc; }
    gPatches = all; gTotal = acc; gPtr = 0;
    pieces.forEach(function (p) { p.scribbler.drawnCount = 0; });
    lastEnd = gTotal / SPEED;          // constant speed -> total time = ink / speed

    window.__phageSchedule = {
      totalMs: Math.round(lastEnd),
      patches: all.length,
      drawOrderSample: all.slice(0, 40).map(function (a) { return a.piece.name; })
    };
  }

  // Reveal whatever patches should be visible by `now`: constant pen speed
  // means we've drawn SPEED*elapsed pixels of ink, in the shuffled order.
  function revealAdvance(now) {
    var drawnLen = SPEED * (now - revealStart);
    while (gPtr < gPatches.length && gCum[gPtr] <= drawnLen) {
      var ap = gPatches[gPtr];
      ap.piece.scribbler.drawPatch(ap.pts);
      ap.piece.scribbler.drawnCount++;
      gPtr++;
    }
  }

  // ---- Scribble reveal ----
  // Each piece's ink box is tiled with small scribble patches; the global
  // timeline strokes them into a mask in random order, and the art shows
  // only where the pen has scribbled so far.

  // Ink bounding box as fractions of the image (computed once, downscaled).
  function computeBBox(img) {
    var maxd = 300;
    var s = Math.min(1, maxd / Math.max(img.naturalWidth, img.naturalHeight));
    var cw = Math.max(1, Math.round(img.naturalWidth * s));
    var ch = Math.max(1, Math.round(img.naturalHeight * s));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var cc = c.getContext('2d');
    cc.drawImage(img, 0, 0, cw, ch);
    var d;
    try { d = cc.getImageData(0, 0, cw, ch).data; }
    catch (err) { return { fx: 0, fy: 0, fw: 1, fh: 1 }; }
    var minx = cw, miny = ch, maxx = 0, maxy = 0, found = false;
    for (var y = 0; y < ch; y++) {
      for (var x = 0; x < cw; x++) {
        if (d[(y * cw + x) * 4 + 3] > 40) {
          found = true;
          if (x < minx) minx = x;
          if (x > maxx) maxx = x;
          if (y < miny) miny = y;
          if (y > maxy) maxy = y;
        }
      }
    }
    if (!found) return { fx: 0, fy: 0, fw: 1, fh: 1 };
    return { fx: minx / cw, fy: miny / ch,
             fw: (maxx - minx + 1) / cw, fh: (maxy - miny + 1) / ch };
  }

  // A per-piece scribbler: the art texture, a reveal mask, and a set of
  // small scribble patches tiled over the ink (drawn in random order by the
  // global timeline).
  function makeScribbler(piece) {
    var scale = Math.min(W * 0.6, 1100) / piece.img.naturalWidth;
    var DW = Math.max(1, Math.round(piece.img.naturalWidth * scale));
    var DH = Math.max(1, Math.round(piece.img.naturalHeight * scale));
    var b = piece.bbox;
    var bx = b.fx * DW, by = b.fy * DH, bw = b.fw * DW, bh = b.fh * DH;

    var tex = document.createElement('canvas'); tex.width = DW; tex.height = DH;
    tex.getContext('2d').drawImage(piece.img, 0, 0, DW, DH);
    var mask = document.createElement('canvas'); mask.width = DW; mask.height = DH;
    var out = document.createElement('canvas'); out.width = DW; out.height = DH;
    var mc = mask.getContext('2d');

    var lw = Math.max(4, bh * 0.33);
    mc.strokeStyle = '#fff';
    mc.lineCap = 'round';
    mc.lineJoin = 'round';
    mc.lineWidth = lw * 1.35;

    // Tile the ink box with small cells; each cell is one scribble patch
    // (a short zig-zag that fills that cell).
    var rows = Math.max(1, Math.round(bh / lw));
    var cols = Math.max(1, Math.round(bw / lw));
    var cw = bw / cols, ch = bh / rows;
    var patches = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var ox = bx + c * cw, oy = by + r * ch;
        var sub = 3, pts = [], len = 0;
        for (var k = 0; k <= sub; k++) {
          var f = k / sub;
          var px = ox + f * cw + rnd(cw * 0.2);
          var py = oy + ch * 0.5 + Math.sin(f * Math.PI * 2) * ch * 0.45 + rnd(ch * 0.2);
          if (k > 0) len += Math.hypot(px - pts[k - 1][0], py - pts[k - 1][1]);
          pts.push([px, py]);
        }
        patches.push({ pts: pts, len: len });
      }
    }

    return {
      DW: DW, DH: DH, X0: W * piece.left, Y0: H * piece.top,
      tex: tex, mask: mask, out: out, mc: mc,
      patches: patches, patchCount: patches.length, drawnCount: 0,
      // Stroke one scribble patch into the mask.
      drawPatch: function (pts) {
        var m = this.mc;
        m.beginPath();
        m.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) m.lineTo(pts[i][0], pts[i][1]);
        m.stroke();
      },
      // Show the art only where the pen has scribbled (mask = destination-in).
      paint: function (c) {
        var oc = this.out.getContext('2d');
        oc.clearRect(0, 0, this.DW, this.DH);
        oc.drawImage(this.tex, 0, 0);
        oc.globalCompositeOperation = 'destination-in';
        oc.drawImage(this.mask, 0, 0);
        oc.globalCompositeOperation = 'source-over';
        c.drawImage(this.out, this.X0, this.Y0);
      }
    };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    shell.width = W * DPR;
    shell.height = H * DPR;
    shell.style.width = W + 'px';
    shell.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildAll();                        // drawn size changed; rebuild scribblers
    if (!shattered) paintShell(performance.now());
  }

  // One piece: scribble mask while filling, plain image once fully drawn.
  function paintPiece(piece) {
    var sc = piece.scribbler;
    if (!sc) return;
    if (forceComplete || sc.drawnCount >= sc.patchCount) {
      drawImg(piece.img, piece.left, piece.top, 1);
    } else if (sc.drawnCount > 0) {
      sc.paint(ctx);
    }
  }

  // Draw white background, advance the scribble, then paint every piece.
  function paintShell(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    if (!forceComplete) revealAdvance(now);
    for (var w = 0; w < words.length; w++) paintPiece(words[w]);
    for (var i = 0; i < letters.length; i++) paintPiece(letters[i]);
  }

  function drawImg(img, leftPct, topPct, alpha) {
    if (!img.naturalWidth || alpha <= 0) return;
    var w = Math.min(W * 0.6, 1100);
    var h = w * img.naturalHeight / img.naturalWidth;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, W * leftPct, H * topPct, w, h);
    ctx.restore();
  }

  // ---- Reveal loop + trigger ----
  var shattered = false;

  function start() {
    pieces.forEach(function (p) { p.bbox = computeBBox(p.img); });
    revealStart = performance.now();
    resize();                 // sizes canvas, builds scribblers + timeline
    window.addEventListener('resize', resize);

    // Redraw every frame so each piece scribbles in on schedule.
    (function revealLoop(now) {
      if (shattered) return;
      paintShell(now || performance.now());
      requestAnimationFrame(revealLoop);
    })(revealStart);

    // Shatter a short beat after everything has finished being scribbled in.
    var HOLD = 900;
    var timer = setTimeout(function () { trigger(W / 2, H / 2); },
                           lastEnd + HOLD);

    // ...or once the cursor has travelled a fair distance. If pieces are
    // still being scribbled, snap them complete before it breaks.
    var moved = 0;
    var MOVE_MAX = 800;   // px of accumulated cursor travel before it breaks
    window.addEventListener('pointermove', function (e) {
      moved += Math.hypot(e.movementX || 0, e.movementY || 0);
      if (moved >= MOVE_MAX) {
        clearTimeout(timer);
        trigger(e.clientX, e.clientY);
      }
    });
  }

  function trigger(cx, cy) {
    if (shattered) return;
    forceComplete = true;      // ensure every letter is fully drawn...
    paintShell(performance.now());  // ...into the shell before we snapshot it
    shatter(cx, cy);
  }

  // ---- Shatter: radial glass-break into flying shards ----
  function shatter(cx, cy) {
    shattered = true;
    try { localStorage.setItem(KEY, '1'); } catch (err) {}

    // Snapshot the current shell (PHAGE screen) as the shard texture.
    var cap = document.createElement('canvas');
    cap.width = shell.width;
    cap.height = shell.height;
    cap.getContext('2d').drawImage(shell, 0, 0);

    var maxR = 0;
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (c) {
      maxR = Math.max(maxR, Math.hypot(c[0] - cx, c[1] - cy));
    });

    // ----- one shatter (radial glass-break) -----
    var RINGS = 4, SPOKES = 20;
    var grid = [];
    for (var i = 0; i <= RINGS; i++) {
      grid[i] = [];
      var r = maxR * Math.pow(i / RINGS, 1.25);
      for (var j = 0; j <= SPOKES; j++) {
        if (i === 0) { grid[i][j] = [cx, cy]; continue; }
        var a = (j / SPOKES) * Math.PI * 2 + rnd(0.12);
        var rr = r + rnd(maxR * 0.05);
        grid[i][j] = [cx + Math.cos(a) * rr + rnd(6), cy + Math.sin(a) * rr + rnd(6)];
      }
    }

    var pieces = [];
    for (var i = 0; i < RINGS; i++) {
      for (var j = 0; j < SPOKES; j++) {
        var poly = i === 0
          ? [grid[0][0], grid[1][j], grid[1][j + 1]]
          : [grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]];

        var sx = 0, sy = 0;
        for (var k = 0; k < poly.length; k++) { sx += poly[k][0]; sy += poly[k][1]; }
        sx /= poly.length; sy /= poly.length;

        var side = (sx - W / 2) / (W / 2);   // -1 (far left) .. +1 (far right)
        pieces.push({
          poly: poly,
          dx: 0, dy: 0, alpha: 1,
          // tiny outward nudge — pieces just barely separate, no rotation
          vx: side * (0.5 + Math.random() * 0.5) + rnd(0.3),
          vy: rnd(0.4)
        });
      }
    }

    var fadeAt = 250;            // brief hold, then fade away
    var start = performance.now();

    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, W, H);
      var visible = false;
      for (var p = 0; p < pieces.length; p++) {
        var pc = pieces[p];
        pc.dx += pc.vx;
        pc.dy += pc.vy;
        if (t > fadeAt) pc.alpha -= 0.006;   // fade into transparency (slow)
        if (pc.alpha > 0) { visible = true; drawPiece(pc, cap); }
      }
      if (visible) requestAnimationFrame(frame);
      else { revealPage(); shell.remove(); }   // reveal the page fully
    }
    requestAnimationFrame(frame);

    function drawPiece(pc, tex) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pc.alpha);
      ctx.translate(pc.dx, pc.dy);   // just a slight offset, no rotation
      ctx.beginPath();
      ctx.moveTo(pc.poly[0][0], pc.poly[0][1]);
      for (var k = 1; k < pc.poly.length; k++) ctx.lineTo(pc.poly[k][0], pc.poly[k][1]);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(tex, 0, 0, W, H);
      ctx.restore();
    }
  }
})();
