(function () {
  var overlay = document.getElementById('overlay');
  var overlayBody = document.getElementById('overlay-body');
  var back = document.getElementById('back');
  if (!overlay || !overlayBody) return;

  var root = document.documentElement;
  var current = null;   // slug of the post currently open, or null

  function postEl(slug) {
    return document.getElementById('post-' + slug);
  }

  // Show a post inside the overlay. `push` controls whether we add a history
  // entry (true on click, false when restoring from popstate/deep-link).
  function openPost(slug, push) {
    var src = postEl(slug);
    if (!src) return;
    overlayBody.innerHTML = src.innerHTML;
    overlay.hidden = false;
    overlay.scrollTop = 0;
    root.classList.add('overlay-open');   // locks background scroll (CSS)
    current = slug;
    if (push) {
      try { history.pushState({ post: slug }, '', '#' + slug); } catch (err) {}
    }
    back.focus();
  }

  // Close the overlay. `pop` is true when the browser already moved history
  // back for us (popstate) so we must not push another entry.
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

  // Cards open their post in place.
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('click', function () {
      openPost(card.dataset.post, true);
    });
  });

  back.addEventListener('click', function () { closePost(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current !== null) closePost(false);
  });

  // Browser back/forward: sync the overlay to the (possibly hash-carrying)
  // history entry we landed on.
  window.addEventListener('popstate', function (e) {
    var slug = (e.state && e.state.post) || slugFromHash();
    if (slug && postEl(slug)) openPost(slug, false);
    else closePost(true);
  });

  function slugFromHash() {
    return location.hash ? location.hash.slice(1) : '';
  }

  // Deep link: /#<slug> opens that post directly on load.
  var initial = slugFromHash();
  if (initial && postEl(initial)) openPost(initial, false);
})();
