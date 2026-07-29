// Selection helper (poetry page). Toggle "select" on, then click tiles to
// collect their titles into a list you can copy. When off, tiles open normally.
// Self-contained (injects its own styles) so it's easy to remove later.
(function () {
  if (!document.body.classList.contains('poetry')) return;

  var css = document.createElement('style');
  css.textContent = [
    '.select-toggle{position:fixed;top:1rem;left:1rem;z-index:70;padding:.5rem .9rem;',
    'font-family:var(--font);font-size:1.05rem;background:#17161f;border:1px solid #33313f;',
    'color:#e8e6ea;cursor:pointer}',
    '.select-toggle.on{background:#2a2740;border-color:#6a5acd}',
    '.select-panel{position:fixed;left:1rem;bottom:1rem;z-index:70;width:280px;max-height:55vh;',
    'display:flex;flex-direction:column;background:rgba(20,19,27,.96);border:1px solid #33313f;',
    'color:#e8e6ea;font-family:var(--font)}',
    '.select-head{padding:8px 10px;border-bottom:1px solid #33313f;font-size:.9rem;color:#928fa0}',
    '.select-list{overflow-y:auto;padding:6px 10px}',
    '.select-list div{padding:2px 0;font-size:.98rem}',
    '.select-list:empty::before{content:"click tiles to add\\2026";color:#928fa0}',
    '.select-actions{display:flex;gap:6px;padding:8px 10px;border-top:1px solid #33313f}',
    '.select-actions button{flex:1;padding:6px;background:#17161f;border:1px solid #33313f;',
    'color:#e8e6ea;cursor:pointer;font-family:var(--font)}',
    '.select-actions button:hover{background:#201e2b}',
    'body.poetry.selecting .poem-tile{cursor:copy}',
    'body.poetry .poem-tile.selected{background:#2f2a4a;border-color:#6a5acd;color:#fff}'
  ].join('');
  document.head.appendChild(css);

  var toggle = document.createElement('button');
  toggle.className = 'select-toggle';
  toggle.type = 'button';
  toggle.textContent = 'select';

  var panel = document.createElement('div');
  panel.className = 'select-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="select-head">selected (<span class="select-count">0</span>)</div>' +
    '<div class="select-list"></div>' +
    '<div class="select-actions"><button class="select-copy" type="button">copy</button>' +
    '<button class="select-clear" type="button">clear</button></div>';

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  var list = panel.querySelector('.select-list');
  var count = panel.querySelector('.select-count');
  var selecting = false;
  var selected = [];   // titles, in click order

  function render() {
    list.innerHTML = '';
    selected.forEach(function (t) {
      var d = document.createElement('div');
      d.textContent = t;
      list.appendChild(d);
    });
    count.textContent = selected.length;
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    selecting = !selecting;
    document.body.classList.toggle('selecting', selecting);
    toggle.classList.toggle('on', selecting);
    panel.hidden = !selecting;
  });

  // Capture-phase: intercept tile clicks in select mode before blog.js opens them.
  document.addEventListener('click', function (e) {
    if (!selecting) return;
    var tile = e.target.closest && e.target.closest('.poem-tile');
    if (!tile) return;
    e.stopPropagation();
    e.preventDefault();
    var title = tile.querySelector('.card-title').textContent.trim();
    var i = selected.indexOf(title);
    if (i >= 0) { selected.splice(i, 1); tile.classList.remove('selected'); }
    else { selected.push(title); tile.classList.add('selected'); }
    render();
  }, true);

  panel.querySelector('.select-copy').addEventListener('click', function (e) {
    e.stopPropagation();
    var text = selected.join('\n');
    var btn = e.target;
    var done = function () { btn.textContent = 'copied!'; setTimeout(function () { btn.textContent = 'copy'; }, 1200); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy:', text); });
    else window.prompt('Copy:', text);
  });

  panel.querySelector('.select-clear').addEventListener('click', function (e) {
    e.stopPropagation();
    selected = [];
    Array.prototype.forEach.call(document.querySelectorAll('.poem-tile.selected'),
      function (t) { t.classList.remove('selected'); });
    render();
  });
})();
