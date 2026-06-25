// Helper: create empty-state div (avoids innerHTML)
function _setEmpty(el, msg) {
  el.replaceChildren();
  const d = document.createElement('div');
  d.className = 'popup-list-empty';
  d.textContent = msg;
  el.appendChild(d);
}

// WebTester Pro - Popup Script
// Author: Jojin John | Version: 1.0.0

(async () => {
  let allPayloads = [], favorites = [], recentIds = [];
  let activeCategory = 'all', searchQuery = '', catCounts = {};

  // Load theme
  const theme = await Store.get('theme', 'dark');
  if (theme === 'light') document.body.classList.add('light');

  // Load data
  allPayloads  = await PayloadDB.getAllWithCustom();
  favorites    = await PayloadDB.getFavorites();
  recentIds    = await PayloadDB.getRecentlyUsed();
  catCounts    = await PayloadDB.getCategoryCounts();

  // Update "All" button with total
  const allCat = document.querySelector('.quick-cat[data-cat="all"]');
  if (allCat) allCat.textContent = `All (${allPayloads.length})`;

  document.querySelectorAll('.quick-cat[data-cat]').forEach(el => {
    const cat = el.dataset.cat;
    if (cat && cat !== 'all' && catCounts[cat]) {
      el.title = `${catCounts[cat]} payloads`;
    }
  });

  function makeMiniItem(p) {
    const div = document.createElement('div');
    div.className = 'mini-payload';
    // Build mini payload item using DOM (no innerHTML — AMO compliant)
    const info = document.createElement('div'); info.className = 'mini-payload-info';
    const nm = document.createElement('div'); nm.className = 'mini-payload-name'; nm.textContent = p.name;
    const ct = document.createElement('div'); ct.className = 'mini-payload-cat'; ct.textContent = p.category;
    const cd = document.createElement('div'); cd.className = 'mini-payload-code'; cd.textContent = Utils.truncate(p.payload, 60);
    info.appendChild(nm); info.appendChild(ct); info.appendChild(cd);
    const cpBtn = document.createElement('button');
    cpBtn.className = 'mini-copy-btn'; cpBtn.title = 'Copy'; cpBtn.setAttribute('aria-label', 'Copy payload');
    // SVG copy icon
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width','13'); svg.setAttribute('height','13'); svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','2');
    svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round');
    const rect = document.createElementNS(svgNS,'rect'); rect.setAttribute('width','14'); rect.setAttribute('height','14'); rect.setAttribute('x','8'); rect.setAttribute('y','8'); rect.setAttribute('rx','2');
    const path = document.createElementNS(svgNS,'path'); path.setAttribute('d','M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2');
    svg.appendChild(rect); svg.appendChild(path); cpBtn.appendChild(svg);
    div.appendChild(info); div.appendChild(cpBtn);
    div.querySelector('.mini-copy-btn').addEventListener('click', async e => {
      e.stopPropagation();
      await Utils.copyToClipboard(p.payload);
      await PayloadDB.addRecentlyUsed(p.id);
      Utils.showToast('Copied!', 'success', 1500);
    });
    return div;
  }

  function renderFavorites() {
    const el = document.getElementById('favList');
    const favPayloads = allPayloads.filter(p => favorites.includes(p.id)).slice(0, 5);
    if (!favPayloads.length) {
      _setEmpty(el, 'No favorites yet — star payloads in the workspace.');
      return;
    }
    el.replaceChildren();
    favPayloads.forEach(p => el.appendChild(makeMiniItem(p)));
  }

  function renderRecent() {
    const el = document.getElementById('recentList');
    const recent = recentIds.map(id => allPayloads.find(p => p.id === id)).filter(Boolean).slice(0, 5);
    if (!recent.length) {
      _setEmpty(el, 'No recently used payloads.');
      return;
    }
    el.replaceChildren();
    recent.forEach(p => el.appendChild(makeMiniItem(p)));
  }

  function renderSearch() {
    const favSection     = document.getElementById('favSection');
    const recentSection  = document.getElementById('recentSection');
    const innerDivider   = document.getElementById('innerDivider');
    const searchDivider  = document.getElementById('searchDivider');
    const searchResults  = document.getElementById('searchResults');
    const searching = searchQuery || activeCategory !== 'all';

    if (!searching) {
      searchResults.replaceChildren();
      searchDivider.style.display = 'none';
      favSection.style.display = '';
      recentSection.style.display = '';
      innerDivider.style.display = '';
      return;
    }

    favSection.style.display = 'none';
    recentSection.style.display = 'none';
    innerDivider.style.display = 'none';
    searchDivider.style.display = 'none';

    let filtered = allPayloads;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.id.startsWith(activeCategory + '_') || p.custom);
    }
    if (searchQuery) filtered = PayloadDB.search(filtered, searchQuery);

    const total = filtered.length;
    filtered = filtered.slice(0, 25);

    searchResults.replaceChildren();
    if (!filtered.length) {
      _setEmpty(searchResults, 'No payloads found.');
      return;
    }
    const lbl = document.createElement('div');
    lbl.className = 'section-label';
    lbl.textContent = `${total} result${total !== 1 ? 's' : ''}${total > 25 ? ' (showing 25)' : ''}`;
    searchResults.appendChild(lbl);
    filtered.forEach(p => searchResults.appendChild(makeMiniItem(p)));
  }

  // Category filter
  document.getElementById('quickCats').addEventListener('click', e => {
    const cat = e.target.dataset.cat;
    if (!cat) return;
    activeCategory = cat;
    document.querySelectorAll('.quick-cat').forEach(el => el.classList.toggle('active', el.dataset.cat === cat));
    renderSearch();
  });

  // Search
  document.getElementById('searchInput').addEventListener('input',
    Utils.debounce(e => { searchQuery = e.target.value.trim(); renderSearch(); }, 180)
  );

  // Open workspace — uses browserAPI for cross-browser support
  document.getElementById('openWorkspace').addEventListener('click', () => {
    if (browserAPI) {
      browserAPI.runtime.sendMessage({ action: 'openWorkspace' }).catch(() => {
        // Fallback: open directly
        window.open(browserAPI.runtime.getURL('pages/workspace.html'), '_blank');
      });
    }
    window.close();
  });

  // Settings
  document.getElementById('openSettings').addEventListener('click', () => {
    if (browserAPI) {
      browserAPI.runtime.sendMessage({ action: 'openWorkspace', hash: '#settings' }).catch(() => {
        window.open(browserAPI.runtime.getURL('pages/workspace.html#settings'), '_blank');
      });
    }
    window.close();
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', async () => {
    const isLight = document.body.classList.toggle('light');
    await Store.set('theme', isLight ? 'light' : 'dark');
  });

  renderFavorites();
  renderRecent();
  renderSearch();
})();
