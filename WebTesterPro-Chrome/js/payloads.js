// WebTester Pro - Payload Database
// Author: Jojin John | Version: 1.0.0
// Uses browserAPI.runtime.getURL for cross-browser compatibility

const PayloadDB = (() => {
  const CATEGORIES = [
    'xss', 'sqli', 'ssrf', 'lfi', 'xxe', 'ssti', 'jwt', 'cors',
    'graphql', 'idor', 'oauth', 'api', 'smuggling', 'cache_poisoning',
    'file_upload', 'open_redirect', 'prototype_pollution', 'host_header',
    'crlf', 'custom'
  ];

  const CAT_LABELS = {
    xss: 'XSS', sqli: 'SQL Injection', ssrf: 'SSRF', lfi: 'LFI',
    xxe: 'XXE', ssti: 'SSTI', jwt: 'JWT', cors: 'CORS',
    graphql: 'GraphQL', idor: 'IDOR', oauth: 'OAuth', api: 'API Testing',
    smuggling: 'Request Smuggling', cache_poisoning: 'Cache Poisoning',
    file_upload: 'File Upload', open_redirect: 'Open Redirect',
    prototype_pollution: 'Prototype Pollution', host_header: 'Host Header',
    crlf: 'CRLF Injection', custom: 'Custom'
  };

  let allPayloads = [];
  let loaded = false;

  async function loadAll() {
    if (loaded) return allPayloads;
    // Use browserAPI.runtime.getURL — works on Firefox, Chrome, Edge, Brave
    const baseUrl = browserAPI ? browserAPI.runtime.getURL('data/') : 'data/';
    const promises = CATEGORIES.map(cat =>
      fetch(`${baseUrl}${cat}.json`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(arr => arr.map((p, i) => ({
          ...p,
          id: `${cat}_${i}`,
          category: p.category || CAT_LABELS[cat] || cat,
          tags: p.tags || []
        })))
        .catch(() => [])
    );
    const results = await Promise.all(promises);
    allPayloads = results.flat();
    loaded = true;
    return allPayloads;
  }

  function search(payloads, query) {
    if (!query) return payloads;
    const q = query.toLowerCase();
    return payloads.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.payload.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  function filterByCategory(payloads, cat) {
    if (!cat || cat === 'all') return payloads;
    return payloads.filter(p =>
      p.id.startsWith(cat + '_') ||
      p.category.toLowerCase().replace(/\s+/g, '') === (CAT_LABELS[cat] || cat).toLowerCase().replace(/\s+/g, '')
    );
  }

  async function getCustom() { return await Store.get('custom_payloads', []); }

  async function addCustom(payload) {
    const existing = await getCustom();
    const newP = { ...payload, id: 'custom_' + Utils.uid(), category: payload.category || 'Custom', tags: payload.tags || [], custom: true };
    await Store.set('custom_payloads', [newP, ...existing]);
    return newP;
  }

  async function updateCustom(id, updates) {
    const existing = await getCustom();
    await Store.set('custom_payloads', existing.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  async function deleteCustom(id) {
    const existing = await getCustom();
    await Store.set('custom_payloads', existing.filter(p => p.id !== id));
  }

  async function getAllWithCustom() {
    const [base, custom] = await Promise.all([loadAll(), getCustom()]);
    return [...base, ...custom];
  }

  async function getFavorites() { return await Store.get('favorites', []); }

  async function toggleFavorite(payloadId) {
    const favs = await getFavorites();
    const idx = favs.indexOf(payloadId);
    if (idx >= 0) favs.splice(idx, 1); else favs.unshift(payloadId);
    await Store.set('favorites', favs);
    return favs;
  }

  async function isFavorite(payloadId) {
    return (await getFavorites()).includes(payloadId);
  }

  async function addRecentlyUsed(payloadId) {
    let recent = await Store.get('recently_used', []);
    recent = [payloadId, ...recent.filter(id => id !== payloadId)].slice(0, 20);
    await Store.set('recently_used', recent);
  }

  async function getRecentlyUsed() { return await Store.get('recently_used', []); }

  async function getCategoryCounts() {
    const all = await getAllWithCustom();
    const counts = {};
    CATEGORIES.forEach(cat => { counts[cat] = 0; });
    all.forEach(p => {
      const prefix = p.id.split('_')[0];
      if (prefix in counts) counts[prefix]++;
    });
    return counts;
  }

  return {
    CATEGORIES, CAT_LABELS,
    loadAll, getAllWithCustom, search, filterByCategory,
    getCustom, addCustom, updateCustom, deleteCustom,
    getFavorites, toggleFavorite, isFavorite,
    addRecentlyUsed, getRecentlyUsed, getCategoryCounts
  };
})();
