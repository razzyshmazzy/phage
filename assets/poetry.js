// Duskfall: the poetry page's entrance. A raven rotates in and pokes its head
// out of the lower-middle-left, feathers fall, then the bright overlay fades
// away, dissolving the feed's white background into the dusky tree page.
// Driven by CSS animation/transition end events (with timer fallbacks) so a
// backgrounded tab can't leave the page stuck mid-intro.
(function () {
  var dusk = document.getElementById('duskfall');
  var root = document.documentElement;

  // Without the overlay there is nothing to animate; just show the feed.
  if (!dusk) { root.classList.add('revealed'); return; }

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var removed = false;
  function cleanup() {
    if (removed) return;
    removed = true;
    if (dusk && dusk.parentNode) dusk.parentNode.removeChild(dusk);
  }

  var faded = false;
  function fadeOut() {
    if (faded) return;
    faded = true;
    root.classList.add('revealed');                   // tree page + feed appear
    dusk.classList.add('dim');                         // bright overlay fades out
    dusk.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 2400);                         // fallback
  }

  // Respect reduced-motion: skip straight to the dusky page.
  if (reduce) { root.classList.add('revealed'); cleanup(); return; }

  // Shed feathers from the raven's region; each drifts and spins on its own.
  function spawnFeathers(n) {
    for (var i = 0; i < n; i++) {
      var f = document.createElement('span');
      f.className = 'feather';
      f.style.left = (18 + Math.random() * 74) + 'vw';         // drift across
      f.style.width = (13 + Math.random() * 18) + 'px';
      f.style.setProperty('--dx', (Math.random() * 26 - 13) + 'vw');
      f.style.setProperty('--rot', (Math.random() * 960 - 320) + 'deg');
      f.style.animationDuration = (3.4 + Math.random() * 2.8) + 's';
      f.style.animationDelay = (0.6 + Math.random() * 2.6) + 's';
      dusk.appendChild(f);
    }
  }

  // Kick off: feathers begin to fall, then the bright overlay fades out.
  requestAnimationFrame(function () { dusk.classList.add('run'); });
  spawnFeathers(28);
  setTimeout(fadeOut, 1900);

  // Let an impatient reader skip the ceremony.
  function skip() {
    fadeOut();
    window.removeEventListener('click', skip, true);
    window.removeEventListener('keydown', skip, true);
  }
  window.addEventListener('click', skip, true);
  window.addEventListener('keydown', skip, true);
})();

// Cosmic dust: scatter slow, ephemeral motes that drift in random directions
// around the branches. Each gets its own direction, size, blur, opacity and
// (slow) timing; a negative delay staggers them so they don't pulse in unison.
(function () {
  var dust = document.querySelector('.dust');
  if (!dust) return;
  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = reduce ? 40 : 95;
  for (var i = 0; i < n; i++) {
    var m = document.createElement('span');
    m.className = 'dust-mote';
    var size = 1.5 + Math.random() * 2.6;
    var blur = Math.random() < 0.5 ? (1.4 + Math.random() * 1.8) : (Math.random() * 0.6);
    var ang = Math.random() * Math.PI * 2;              // random direction
    var mag = 45 + Math.random() * 130;                 // drift distance (px)
    var dur = 28 + Math.random() * 40;                  // 28-68s: slow float
    m.style.left = (Math.random() * 100) + 'vw';
    m.style.top = (Math.random() * 100) + 'vh';
    m.style.width = size + 'px';
    m.style.height = size + 'px';
    m.style.filter = 'blur(' + blur.toFixed(2) + 'px)';
    m.style.setProperty('--dx', (Math.cos(ang) * mag).toFixed(1) + 'px');
    m.style.setProperty('--dy', (Math.sin(ang) * mag).toFixed(1) + 'px');
    m.style.setProperty('--maxop', (0.18 + Math.random() * 0.5).toFixed(2));
    m.style.animationDuration = dur.toFixed(1) + 's';
    m.style.animationDelay = (-Math.random() * dur).toFixed(1) + 's';
    dust.appendChild(m);
  }
})();

