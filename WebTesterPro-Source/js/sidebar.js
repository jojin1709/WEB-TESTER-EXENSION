// WebTester Pro - Sidebar Script
// Author: Jojin John | Version: 1.0.0
// Extracted from sidebar.html — AMO compliant (no inline scripts)

(async function() {
  var allPayloads = [];
  var favorites   = [];
  var activeCat   = 'all';
  var activeTab   = 'payloads';
  var searchQ     = '';

  // Load data
  allPayloads = await PayloadDB.getAllWithCustom();
  favorites   = await PayloadDB.getFavorites();
  var notes   = await Store.get('notes', []);

  // Apply theme
  var theme = await Store.get('theme', 'dark');
  if (theme === 'light') document.body.classList.add('light');

  // Tab switching
  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.sb-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.sbtab === tab);
    });
    document.querySelectorAll('.sb-panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'sb-' + tab);
    });
    if (tab === 'payloads')  renderPayloads();
    if (tab === 'favorites') renderFavs();
    if (tab === 'notes')     renderNotes();
  }

  document.querySelectorAll('.sb-tab').forEach(function(t) {
    t.addEventListener('click', function() { switchTab(t.dataset.sbtab); });
  });

  // Build a payload item using DOM (no innerHTML)
  function makeItem(p) {
    var d = document.createElement('div');
    d.className = 'sb-payload';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0';

    var nm = document.createElement('div'); nm.className = 'sb-p-name'; nm.textContent = p.name;
    var ct = document.createElement('div'); ct.className = 'sb-p-cat';  ct.textContent = p.category;
    info.appendChild(nm);
    info.appendChild(ct);

    var btn = document.createElement('button');
    btn.className = 'sb-copy';
    btn.title = 'Copy';

    // SVG copy icon via DOM
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '12'); svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    var r1 = document.createElementNS(svgNS, 'rect');
    r1.setAttribute('width','14'); r1.setAttribute('height','14');
    r1.setAttribute('x','8'); r1.setAttribute('y','8'); r1.setAttribute('rx','2');
    var pt = document.createElementNS(svgNS, 'path');
    pt.setAttribute('d', 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2');
    svg.appendChild(r1); svg.appendChild(pt);
    btn.appendChild(svg);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      Utils.copyToClipboard(p.payload).then(function() {
        PayloadDB.addRecentlyUsed(p.id);
        Utils.showToast('Copied!', 'success', 1200);
      });
    });

    d.appendChild(info);
    d.appendChild(btn);
    return d;
  }

  // Empty state helper
  function setEmpty(el, msg) {
    el.replaceChildren();
    var div = document.createElement('div');
    div.style.cssText = 'text-align:center;padding:16px;color:var(--text3);font-size:12px';
    div.textContent = msg;
    el.appendChild(div);
  }

  function renderPayloads() {
    var p = allPayloads.slice();
    if (activeCat !== 'all') p = p.filter(function(x) { return x.id.indexOf(activeCat + '_') === 0; });
    if (searchQ) p = PayloadDB.search(p, searchQ);
    p = p.slice(0, 40);

    var el = document.getElementById('sbPayloadList');
    if (!el) return;
    el.replaceChildren();
    if (!p.length) { setEmpty(el, 'No payloads'); return; }
    p.forEach(function(x) { el.appendChild(makeItem(x)); });
  }

  function renderFavs() {
    var favPayloads = allPayloads.filter(function(p) { return favorites.indexOf(p.id) >= 0; });
    var el = document.getElementById('sbFavList');
    if (!el) return;
    el.replaceChildren();
    if (!favPayloads.length) { setEmpty(el, 'No favorites yet'); return; }
    favPayloads.forEach(function(x) { el.appendChild(makeItem(x)); });
  }

  function renderNotes() {
    var el = document.getElementById('sbNoteList');
    if (!el) return;
    el.replaceChildren();
    var slice = notes.slice(0, 20);
    if (!slice.length) { setEmpty(el, 'No notes'); return; }
    slice.forEach(function(n) {
      var item = document.createElement('div'); item.className = 'sb-note';
      var ttl = document.createElement('div'); ttl.className = 'sb-note-title'; ttl.textContent = n.title || 'Untitled';
      var prv = document.createElement('div'); prv.className = 'sb-note-preview'; prv.textContent = Utils.truncate(n.content || '', 60);
      item.appendChild(ttl); item.appendChild(prv);
      el.appendChild(item);
    });
  }

  // Search
  var sbSearch = document.getElementById('sbSearch');
  if (sbSearch) {
    sbSearch.addEventListener('input', Utils.debounce(function(e) {
      searchQ = e.target.value;
      renderPayloads();
    }, 200));
  }

  // Category filter
  var sbCats = document.getElementById('sbCats');
  if (sbCats) {
    sbCats.addEventListener('click', function(e) {
      var cat = e.target.dataset.cat;
      if (!cat) return;
      activeCat = cat;
      document.querySelectorAll('.sb-cat').forEach(function(c) {
        c.classList.toggle('active', c.dataset.cat === cat);
      });
      renderPayloads();
    });
  }

  // Open workspace buttons — event listeners, not onclick attributes
  function doOpenWorkspace() {
    if (browserAPI) {
      browserAPI.runtime.sendMessage({ action: 'openWorkspace' }).catch(function() {});
    }
  }
  var openWsBtn = document.getElementById('sbOpenWorkspace');
  if (openWsBtn) openWsBtn.addEventListener('click', doOpenWorkspace);
  var openWsBtn2 = document.getElementById('sbOpenWorkspace2');
  if (openWsBtn2) openWsBtn2.addEventListener('click', doOpenWorkspace);

  renderPayloads();
}());
