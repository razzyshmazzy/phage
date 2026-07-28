// Justified collage — used by both the main feed and the poetry page.
//  - Feed: each tile keeps its picture's aspect ratio (landscape wide, portrait
//    tall).
//  - Poetry: no images; each tile's size tracks the poem's length (data-weight),
//    mapped so the longest poem's tile is at most ~3x the area of the shortest.
// Either way, tiles are grouped into rows and each row's height is nudged so the
// row fills the screen width exactly — a messy, packed amalgamation.
(function () {
  var body = document.body;
  var isFeed = body.classList.contains('feed');
  var isPoetry = body.classList.contains('poetry');
  if (!isFeed && !isPoetry) return;

  var container = document.querySelector('.cards');
  if (!container) return;
  var cards = Array.prototype.slice.call(container.querySelectorAll('.card'));
  if (!cards.length) return;

  var GAP = 10;
  var TARGET = isPoetry ? 150 : 300;   // preferred row height
  var LAST_MAX = TARGET * 2;

  // Poetry: map poem length -> aspect ratio in [1, 3]. Since all tiles in a row
  // share a height, width (and thus area) scales ~linearly with length, capped
  // at 3x between the shortest and longest poem.
  if (isPoetry) {
    var ws = cards.map(function (c) { return +c.getAttribute('data-weight') || 1; });
    var mn = Math.min.apply(null, ws), mx = Math.max.apply(null, ws);
    // sqrt keeps the mapping monotonic (longer = bigger) and capped at 3x, but
    // spreads the mid-range so a couple of very long poems don't flatten the rest.
    var smn = Math.sqrt(mn), smx = Math.sqrt(mx);
    cards.forEach(function (c, i) {
      var t = smx > smn ? (Math.sqrt(ws[i]) - smn) / (smx - smn) : 0.5;
      c._aspect = 1 + 2 * t;           // 1 .. 3
    });
  }

  function aspectOf(card) {
    if (isPoetry) return card._aspect;
    var img = card.querySelector('img.card-image');
    if (img && img.naturalWidth && img.naturalHeight) {
      return img.naturalWidth / img.naturalHeight;
    }
    return 1.6;
  }

  function layout() {
    var W = container.clientWidth;
    if (!W) return;

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
      if (last && h > LAST_MAX) h = TARGET;
      for (var k = 0; k < items.length; k++) {
        items[k].card.style.width = Math.floor(items[k].a * h) + 'px';
        if (isPoetry) items[k].card.style.height = Math.floor(h) + 'px';
      }
    }
  }

  // Feed: relayout as pictures finish loading (aspect ratios become known).
  if (!isPoetry) {
    Array.prototype.forEach.call(
      container.querySelectorAll('img.card-image'),
      function (img) {
        if (!(img.complete && img.naturalWidth)) {
          img.addEventListener('load', layout);
          img.addEventListener('error', layout);
        }
      }
    );
  }

  layout();
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(layout, 120);
  });
})();
