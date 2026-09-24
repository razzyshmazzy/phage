// Justified collage — used by the feed and the poetry page.
//  - Feed: each tile keeps its picture's aspect ratio.
//  - Poetry: no images; each tile's size tracks the poem's length (data-weight),
//    scaled so the longest poem is ~3x the area of the shortest. The poetry page
//    has several sections (Junior / Sophomore / Freshman), each its own .cards
//    container laid out independently but scaled against ALL poems so sizes are
//    comparable across sections.
// Tiles are grouped into rows and each row's height is nudged so the row fills
// the width — a messy, packed amalgamation.
(function () {
  var body = document.body;
  var isFeed = body.classList.contains('feed');
  var isPoetry = body.classList.contains('poetry');
  if (!isFeed && !isPoetry) return;

  var containers = Array.prototype.slice.call(document.querySelectorAll('.cards'));
  if (!containers.length) return;

  var GAP = 10;
  var TARGET = isPoetry ? 150 : 300;
  var LAST_MAX = TARGET * 2;

  // Poetry: map every poem's length -> aspect in [1, 3] (global across sections).
  if (isPoetry) {
    var tiles = Array.prototype.slice.call(document.querySelectorAll('.poem-tile'));
    var ws = tiles.map(function (c) { return +c.getAttribute('data-weight') || 1; });
    var smn = Math.sqrt(Math.min.apply(null, ws));
    var smx = Math.sqrt(Math.max.apply(null, ws));
    tiles.forEach(function (c, i) {
      var t = smx > smn ? (Math.sqrt(ws[i]) - smn) / (smx - smn) : 0.5;
      c._aspect = 1 + 2 * t;
    });
  }

  function aspectOf(card) {
    if (isPoetry) return card._aspect || 1;
    var img = card.querySelector('img.card-image');
    if (img && img.naturalWidth && img.naturalHeight) {
      return img.naturalWidth / img.naturalHeight;
    }
    return 1.6;
  }

  // Returns false only when the container has no measurable width yet (read
  // before the browser's first layout pass); the caller retries next frame.
  function layoutContainer(container) {
    var cards = Array.prototype.slice.call(container.querySelectorAll('.card'));
    if (!cards.length) return true;      // nothing to place
    var W = container.clientWidth;
    if (!W) return false;                // not measurable yet — signal a retry

    var rows = [], row = [], aSum = 0;
    for (var i = 0; i < cards.length; i++) {
      var a = aspectOf(cards[i]);
      row.push({ card: cards[i], a: a });
      aSum += a;
      if (aSum * TARGET + (row.length - 1) * GAP >= W) {
        rows.push(row); row = []; aSum = 0;
      }
    }
    if (row.length) rows.push(row);

    for (var r = 0; r < rows.length; r++) {
      var items = rows[r];
      var last = r === rows.length - 1;
      var sum = 0;
      for (var j = 0; j < items.length; j++) sum += items[j].a;
      var gaps = (items.length - 1) * GAP;
      var h = (W - gaps) / sum;
      // Keep every tile ~the same size: a sparse last row would otherwise
      // stretch its tiles much taller/wider than the rest, so cap it back to
      // the normal row height (scaling those images down to match).
      if (last && h > LAST_MAX) h = TARGET;
      for (var k = 0; k < items.length; k++) {
        // Width fills the row (length-encoded). Height is left to the content
        // (title + small padding) so poetry tiles hug their text rather than
        // stretching to the row height.
        items[k].card.style.width = Math.floor(items[k].a * h) + 'px';
      }
    }
    return true;
  }

  // Lay out every container. If any wasn't measurable yet (0 width), retry on
  // the next frame — otherwise, on a warm reload where cached images fire no
  // 'load' event, a single early 0-width read would strand the tiles at their
  // CSS default width (250px) and the collage would never justify to fill.
  var _retries = 0;
  function layoutAll() {
    var ready = true;
    for (var i = 0; i < containers.length; i++) {
      if (layoutContainer(containers[i]) === false) ready = false;
    }
    if (ready) { _retries = 0; return; }
    if (_retries++ < 60) requestAnimationFrame(layoutAll);
  }

  // ---- Torn-paper edge (feed pictures) ----
  // Mask each picture with one of the hand-drawn torn frames (frame-1..8),
  // cycled tile to tile so they aren't all identical. Each frame PNG is an
  // opaque torn shape on transparent, used as an alpha mask (its colour is
  // irrelevant), so the picture shows only through the ragged silhouette.
  var FRAME_COUNT = 8;
  var IMG_BASE = (window.PHAGE_BASE || '') + '/assets/img/';
  function applyTornEdge(img, seed) {
    var u = 'url("' + IMG_BASE + 'frame-' + ((seed % FRAME_COUNT) + 1) + '.png")';
    var st = img.style;
    st.webkitMaskImage = u;            st.maskImage = u;
    st.webkitMaskSize = '100% 100%';   st.maskSize = '100% 100%';
    st.webkitMaskRepeat = 'no-repeat'; st.maskRepeat = 'no-repeat';
    st.webkitMaskPosition = 'center';  st.maskPosition = 'center';
  }

  // Feed: give each picture its own torn frame, and relayout as pictures finish
  // loading (aspect ratios become known for the justified layout).
  if (!isPoetry) {
    var seed = 0;
    containers.forEach(function (container) {
      Array.prototype.forEach.call(
        container.querySelectorAll('img.card-image'),
        function (img) {
          applyTornEdge(img, seed++);      // a torn frame doesn't need the aspect ratio
          if (!(img.complete && img.naturalWidth)) {
            img.addEventListener('load', layoutAll);
            img.addEventListener('error', layoutAll);
          }
        }
      );
    });
  }

  layoutAll();
  // Final settle: once every image has finished (and the scrollbar state is
  // its final, permanent one) relayout a last time so the packing converges to
  // the same rows on every load, regardless of the order images arrived in.
  window.addEventListener('load', layoutAll);
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(layoutAll, 120);
  });

  // First visit: the collage is laid out while #page is still hidden behind the
  // intro. Revealing it adds the permanent scrollbar and shifts the available
  // width, so relayout the moment `.revealed` lands on <html>.
  var docEl = document.documentElement;
  if (!docEl.classList.contains('revealed')) {
    var obs = new MutationObserver(function () {
      if (docEl.classList.contains('revealed')) { obs.disconnect(); layoutAll(); }
    });
    obs.observe(docEl, { attributes: true, attributeFilter: ['class'] });
  }
})();
