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

  function layoutContainer(container) {
    var cards = Array.prototype.slice.call(container.querySelectorAll('.card'));
    if (!cards.length) return;
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
        // Width fills the row (length-encoded). Height is left to the content
        // (title + small padding) so poetry tiles hug their text rather than
        // stretching to the row height.
        items[k].card.style.width = Math.floor(items[k].a * h) + 'px';
      }
    }
  }

  function layoutAll() { containers.forEach(layoutContainer); }

  // Feed: relayout as pictures finish loading (aspect ratios become known).
  if (!isPoetry) {
    containers.forEach(function (container) {
      Array.prototype.forEach.call(
        container.querySelectorAll('img.card-image'),
        function (img) {
          if (!(img.complete && img.naturalWidth)) {
            img.addEventListener('load', layoutAll);
            img.addEventListener('error', layoutAll);
          }
        }
      );
    });
  }

  layoutAll();
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(layoutAll, 120);
  });
})();
