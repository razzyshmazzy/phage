// In-place reader overlay. On the feed, post bodies are pre-rendered as hidden
// #post-<slug> articles and cloned instantly. On the poetry page there are ~40+
// poems (one a 57-sonnet collection), so bodies are NOT pre-rendered — that made
// the DOM huge and scrolling laggy. Instead each poem's permalink is fetched on
// click and cached, so page load stays light.
(function () {
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var back = document.getElementById('back');
  if (!overlay || !overlayBody) return;

  var root = document.documentElement;
  var base = window.PHAGE_BASE || '';
  var current = null;
  var cache = {};

  function postEl(slug) { return document.getElementById('post-' + slug); }

  function render(html) {
    overlayBody.innerHTML = html;
    overlay.scrollTop = 0;
    back.focus();
  }

  function openPost(slug, push) {
    current = slug;
    overlay.hidden = false;
    root.classList.add('overlay-open');   // locks background scroll (CSS)
    if (push) {
      try { history.pushState({ post: slug }, '', '#' + slug); } catch (err) {}
    }

    var inline = postEl(slug);            // feed: pre-rendered body
    if (inline) { render(inline.innerHTML); return; }
    if (cache[slug]) { render(cache[slug]); return; }

    // poetry: fetch the poem's permalink lazily, then cache it.
    render('<p class="overlay-loading">…</p>');
    fetch(base + '/posts/' + encodeURIComponent(slug) + '/')
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, 'text/html');
        var el = doc.querySelector('.post-content');
        var html = el ? el.innerHTML : '<p>Not found.</p>';
        cache[slug] = html;
        if (current === slug) render(html);   // still the open poem
      })
      .catch(function () {
        if (current === slug) render('<p>Could not load this poem.</p>');
      });
  }

  function closePost(pop) {
    if (current === null) return;
    overlay.hidden = true;
    overlayBody.innerHTML = '';
    root.classList.remove('overlay-open');
    current = null;
    if (!pop && location.hash) {
      try { history.pushState('', '', location.pathname + location.search); }
      catch (err) {}
    }
  }

  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('click', function () {
      openPost(card.dataset.post, true);
    });
  });

  back.addEventListener('click', function () { closePost(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current !== null) closePost(false);
  });

  window.addEventListener('popstate', function (e) {
    var slug = (e.state && e.state.post) || slugFromHash();
    if (slug) openPost(slug, false);
    else closePost(true);
  });

  function slugFromHash() {
    return location.hash ? location.hash.slice(1) : '';
  }

  var initial = slugFromHash();
  if (initial) openPost(initial, false);
})();
