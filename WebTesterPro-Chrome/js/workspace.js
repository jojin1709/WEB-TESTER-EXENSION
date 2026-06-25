// WebTester Pro - Full Workspace Script

// ─── CHECKLISTS must be defined at module scope (before async IIFE) ──────
// This prevents TDZ errors when hash-based navigation triggers renderChecklists()
// before the const would have been reached inside the IIFE.
const CHECKLISTS = {
  XSS: [
    'Reflected XSS in all input fields', 'Stored XSS in user-supplied content',
    'DOM-based XSS in client-side JS', 'XSS via HTTP response headers',
    'XSS via SVG/XML upload', 'CSP header present and effective',
    'Test event handlers in HTML context', 'Test URL fragment (#) injection',
    'Test JavaScript context injection', 'Test attribute context injection'
  ],
  SQLi: [
    'Error-based detection', 'Boolean-based blind', 'Time-based blind',
    'Union-based extraction', 'Out-of-band (DNS/HTTP)', 'Second-order injection',
    'Stacked queries', 'NoSQL injection', 'ORM injection patterns', 'WAF bypass techniques'
  ],
  SSRF: [
    'Internal AWS metadata (169.254.169.254)', 'Internal GCP metadata',
    'Azure IMDS endpoint', 'Internal network scanning', 'File:// protocol access',
    'Gopher/dict protocol', 'Open redirect SSRF chain', 'DNS rebinding',
    'Blind SSRF (out-of-band)', 'SSRF via XML (XXE chain)'
  ],
  XXE: [
    'Basic external entity file read', 'SSRF via XXE', 'Blind XXE (OOB DNS)',
    'XXE via file upload (SVG/DOCX)', 'XInclude injection',
    'XXE in SOAP endpoints', 'XXE via content-type confusion', 'Billion laughs DoS'
  ],
  LFI: [
    'Directory traversal with ../', 'Null byte bypass', 'PHP filter wrapper',
    'php://input/stdin execution', 'Log poisoning (Apache/Nginx)',
    'Session file inclusion', 'Zip/Phar wrapper RCE', 'Environment variables disclosure'
  ],
  JWT: [
    'alg:none bypass', 'RS256 to HS256 confusion', 'JWK header injection',
    'jku header SSRF', 'kid path traversal', 'kid SQL injection',
    'Weak secret brute-force', 'Expired token acceptance',
    'Missing signature validation', 'Claim manipulation (role, admin)'
  ],
  OAuth: [
    'State parameter CSRF', 'Redirect URI bypass', 'Scope escalation',
    'Token leakage in URL', 'PKCE missing/downgrade',
    'Refresh token rotation bypass', 'Client secret exposure', 'Implicit flow token theft'
  ],
  CORS: [
    'Null origin reflection', 'Arbitrary origin reflection', 'Subdomain bypass',
    'Wildcard with credentials', 'HTTP origin for HTTPS endpoint', 'Unintended origin trusted'
  ],
  IDOR: [
    'Horizontal privilege escalation', 'Vertical privilege escalation', 'Mass assignment',
    'UUID prediction/enumeration', 'IDOR in API responses', 'IDOR via GraphQL',
    'IDOR in file download', 'IDOR in batch operations'
  ],
  GraphQL: [
    'Introspection enabled', 'Batch query attacks', 'Alias-based rate limit bypass',
    'Deeply nested query DoS', 'IDOR via object IDs', 'Mutation privilege escalation',
    'Injection via variables', 'SSRF via URL fields'
  ],
  'API Security': [
    'Authentication bypass', 'Broken object level auth', 'Mass assignment',
    'Excessive data exposure', 'Rate limiting absent', 'Verb tampering',
    'Version downgrade', 'Content-type confusion', 'JWT abuse', 'API key exposure'
  ]
};

// PAGE_SIZE — hoisted to module scope to prevent TDZ
const PAGE_SIZE = 30;
// HTML_ENTITIES — hoisted to module scope to prevent TDZ
const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// HTML_DECODE_MAP — hoisted to module scope to prevent TDZ
const HTML_DECODE_MAP = Object.fromEntries(Object.entries(HTML_ENTITIES).map(([k,v]) => [v,k]));
// REGEX_PATTERNS — hoisted to module scope to prevent TDZ
const REGEX_PATTERNS = [
  { name: "Email Address", cat: "Detection", desc: "Match email addresses", pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}" },
  { name: "URL (HTTP/HTTPS)", cat: "Detection", desc: "Match HTTP/HTTPS URLs", pattern: "https?:\\/\\/[^\\s\"<>]+" },
  { name: "IP Address (IPv4)", cat: "Detection", desc: "Match IPv4 addresses", pattern: "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b" },
  { name: "AWS Access Key", cat: "Secrets", desc: "AWS access key ID pattern", pattern: "(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}" },
  { name: "AWS Secret Key", cat: "Secrets", desc: "AWS secret access key", pattern: "aws_?(?:secret)?_?(?:access)?_?key[\\s]*[=:][\\s]*([a-z0-9\\/+]{40})" },
  { name: "JWT Token", cat: "Tokens", desc: "Match JWT tokens", pattern: "eyJ[a-zA-Z0-9_\\-]+\\.eyJ[a-zA-Z0-9_\\-]+\\.[a-zA-Z0-9_\\-]+" },
  { name: "Generic API Key", cat: "Secrets", desc: "Generic API key patterns", pattern: "api[_\\-\\s]?key[\\s]*[=:][\\s]*([a-z0-9\\-_]{20,50})" },
  { name: "Generic Secret", cat: "Secrets", desc: "Generic secret patterns", pattern: "(?:secret|password|passwd|token|credential)[\\s]*[=:][\\s]*([^\\s]{8,})" },
  { name: "Private Key Header", cat: "Secrets", desc: "PEM private key", pattern: "-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----" },
  { name: "GitHub Token", cat: "Tokens", desc: "GitHub personal access token", pattern: "ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}" },
  { name: "Slack Token", cat: "Tokens", desc: "Slack API token", pattern: "xox[baprs]-[0-9A-Za-z\\-]+" },
  { name: "Google API Key", cat: "Tokens", desc: "Google API key", pattern: "AIza[0-9A-Za-z\\-_]{35}" },
  { name: "Stripe Key", cat: "Tokens", desc: "Stripe secret/publishable key", pattern: "sk_(?:live|test)_[a-zA-Z0-9]{24,99}|pk_(?:live|test)_[a-zA-Z0-9]{24,99}" },
  { name: "Twilio SID", cat: "Tokens", desc: "Twilio Account SID", pattern: "AC[a-f0-9]{32}" },
  { name: "Heroku API Key", cat: "Tokens", desc: "Heroku API key", pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" },
  { name: "UUID v4", cat: "Detection", desc: "Match UUID v4", pattern: "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}" },
  { name: "Credit Card (Visa)", cat: "PII", desc: "Visa credit card number", pattern: "4[0-9]{12}(?:[0-9]{3})?" },
  { name: "S3 Bucket URL", cat: "Cloud", desc: "AWS S3 bucket URL", pattern: "s3\\.amazonaws\\.com\\/[a-z0-9\\-\\.]+|[a-z0-9\\-\\.]+\\.s3\\.amazonaws\\.com" },
  { name: "Internal IP", cat: "Detection", desc: "RFC 1918 private IP ranges", pattern: "(?:10|172\\.(?:1[6-9]|2[0-9]|3[01])|192\\.168)\\.[0-9]{1,3}\\.[0-9]{1,3}" },
  { name: "Base64 Blob", cat: "Detection", desc: "Large base64 blob detection", pattern: "[A-Za-z0-9+\\/]{50,}={0,2}" }
];
// RECON_TOOLS — hoisted to module scope to prevent TDZ
const RECON_TOOLS = [
  { name: 'Amass', type: 'Subdomain Enum', desc: 'Comprehensive DNS enumeration with many data sources', cmd: 'amass enum -d target.com -o amass-out.txt\namass enum -passive -d target.com -o amass-passive.txt' },
  { name: 'Subfinder', type: 'Subdomain Enum', desc: 'Fast passive subdomain enumeration', cmd: 'subfinder -d target.com -o subfinder-out.txt\nsubfinder -d target.com -silent | httpx -silent -o live-subs.txt' },
  { name: 'Assetfinder', type: 'Subdomain Enum', desc: 'Find assets belonging to a domain', cmd: 'assetfinder --subs-only target.com | tee assetfinder-out.txt' },
  { name: 'Findomain', type: 'Subdomain Enum', desc: 'Cross-platform subdomain finder', cmd: 'findomain -t target.com -o\nfindomain -t target.com --output' },
  { name: 'Gau', type: 'URL Discovery', desc: 'Fetch known URLs from AlienVault, Wayback, Common Crawl', cmd: 'gau target.com | tee gau-urls.txt\ngau target.com --mc 200 | grep -E "\\.(js|json|php|asp)"' },
  { name: 'Waybackurls', type: 'URL Discovery', desc: 'Fetch URLs from the Wayback Machine', cmd: 'echo target.com | waybackurls | tee wayback-urls.txt\nwaybackurls target.com | grep "?"' },
  { name: 'Katana', type: 'Crawler', desc: 'Next-generation web crawler', cmd: 'katana -u https://target.com -o katana-out.txt\nkatana -u https://target.com -d 3 -jc -jsl' },
  { name: 'Hakrawler', type: 'Crawler', desc: 'Fast web crawler for bug hunting', cmd: 'echo https://target.com | hakrawler -depth 3 | tee hakrawler-out.txt' },
  { name: 'LinkFinder', type: 'JS Analysis', desc: 'Find endpoints in JavaScript files', cmd: 'python3 linkfinder.py -i https://target.com/app.js -o cli\npython3 linkfinder.py -i https://target.com -d -o cli' },
  { name: 'SecretFinder', type: 'JS Analysis', desc: 'Discover secrets/credentials in JS files', cmd: 'python3 SecretFinder.py -i https://target.com -e -o cli\npython3 SecretFinder.py -i https://target.com/app.js -o results.html' },
  { name: 'Httpx', type: 'Probing', desc: 'HTTP probing with detailed analysis', cmd: 'httpx -l subs.txt -o live.txt -title -tech-detect -status-code\ncat subs.txt | httpx -silent -mc 200,301,302,403' },
  { name: 'Nuclei', type: 'Scanning', desc: 'Template-based vulnerability scanner', cmd: 'nuclei -u https://target.com -t exposures/ -o nuclei-out.txt\nnuclei -l live.txt -t cves/ -severity critical,high' },
  { name: 'FFuf', type: 'Fuzzing', desc: 'Fast web fuzzer for directory/parameter discovery', cmd: 'ffuf -u https://target.com/FUZZ -w wordlist.txt -mc 200,301,302\nffuf -u https://target.com/?FUZZ=test -w params.txt' },
  { name: 'Dalfox', type: 'XSS', desc: 'Fast parameter analysis and XSS scanner', cmd: 'dalfox url https://target.com/?q=test\ncat urls.txt | dalfox pipe --skip-bav' },
];
// REPORT_TEMPLATES — hoisted to module scope to prevent TDZ
const REPORT_TEMPLATES = {
  hackerone: (d) => `# ${d.title}\n\n**Severity:** ${d.severity}\n**CVSS:** ${d.cvss || 'N/A'}\n**CWE:** ${d.cwe || 'N/A'}\n\n## Summary\n\n${d.summary}\n\n## Target\n\n\`${d.target}\`\n\n## Steps to Reproduce\n\n${d.steps}\n\n## Impact\n\n${d.impact}\n\n## Recommendation\n\n${d.recommendation}\n`,
  bugcrowd: (d) => `## Vulnerability Report\n\n**Title:** ${d.title}\n**Priority:** ${d.severity}\n**Target:** \`${d.target}\`\n**CVSS Score:** ${d.cvss || 'N/A'}\n**CWE:** ${d.cwe || 'N/A'}\n\n### Description\n\n${d.summary}\n\n### Steps to Reproduce\n\n${d.steps}\n\n### Impact\n\n${d.impact}\n\n### Remediation\n\n${d.recommendation}\n`,
  intigriti: (d) => `# ${d.title}\n\n| Field | Value |\n|---|---|\n| Severity | ${d.severity} |\n| CVSS | ${d.cvss || 'N/A'} |\n| CWE | ${d.cwe || 'N/A'} |\n| Endpoint | \`${d.target}\` |\n\n## Description\n\n${d.summary}\n\n## Proof of Concept\n\n${d.steps}\n\n## Business Impact\n\n${d.impact}\n\n## Mitigation\n\n${d.recommendation}\n`,
  yeswehack: (d) => `# ${d.title}\n\n**Severity:** ${d.severity}\n**CVSS:** ${d.cvss || 'N/A'}\n**Affected Endpoint:** \`${d.target}\`\n\n## Description\n\n${d.summary}\n\n## Reproduction Steps\n\n${d.steps}\n\n## Impact\n\n${d.impact}\n\n## Suggested Fix\n\n${d.recommendation}\n`
};
// AI_DEFAULTS — hoisted to module scope to prevent TDZ
const AI_DEFAULTS = {
  openrouter: { url: 'https://openrouter.ai/api/v1', model: 'mistralai/mixtral-8x7b-instruct' },
  groq: { url: 'https://api.groq.com/openai/v1', model: 'llama3-70b-8192' },
  ollama: { url: 'http://localhost:11434/v1', model: 'llama3' },
  lmstudio: { url: 'http://localhost:1234/v1', model: 'local-model' },
  custom: { url: '', model: '' }
};

(async () => {
  'use strict';

  // Safe event binding — silently skips if element doesn't exist (prevents TypeError)
  const on = (id, evt, fn) => {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.addEventListener(evt, fn);
  };
  const onAll = (sel, evt, fn) => {
    document.querySelectorAll(sel).forEach(el => el.addEventListener(evt, fn));
  };
  // Safe DOM getter — returns null-safe proxy so .prop = val never throws
  const $ = id => document.getElementById(id);
  const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
  const setTxt  = (id, txt)  => { const el = $(id); if (el) el.textContent = txt; };
  const setVal  = (id, v)    => { const el = $(id); if (el) el.value = v; };
  const show    = (id, d)    => { const el = $(id); if (el) el.style.display = d || ''; };
  const hide    = id         => { const el = $(id); if (el) el.style.display = 'none'; };

  // ─── State ───────────────────────────────────────────────────────────
  let allPayloads = [];
  let favorites = [];
  let recentIds = [];
  let activeModule = 'dashboard';
  let payloadPage = 0;

  let payloadFilter = { search: '', category: '', favOnly: false };
  let editingPayloadId = null;
  let notes = [];
  let activeNoteId = null;
  let checklistState = {};
  let activeChecklist = 'XSS';
  let aiHistory = [];
  let aiSettings = {};
  let wordlists = {};
  let regexSearch = '';
  let regexCat = '';

  // ─── Init ────────────────────────────────────────────────────────────
  try {
    const theme = await Store.get('theme', 'dark');
    if (theme === 'light') document.body.classList.add('light');
    aiSettings = await Store.get('ai_settings', {});

    allPayloads = await PayloadDB.getAllWithCustom();
    favorites = await PayloadDB.getFavorites();
    recentIds = await PayloadDB.getRecentlyUsed();
    notes = await Store.get('notes', []);
    checklistState = await Store.get('checklist_state', {});
    wordlists = await Store.get('wordlists', {});

    // Pending clipboard from context menu (cross-browser fallback)
    const pendingClip = await Store.get('pendingClipboard', null);
    if (pendingClip && pendingClip.text && (Date.now() - pendingClip.ts < 30000)) {
      await Store.remove('pendingClipboard');
      await Utils.copyToClipboard(pendingClip.text);
      Utils.showToast('Payload copied from context menu!');
    }

    // Check for pending AI analysis from context menu
    const pendingAi = await Store.get('pendingAiAnalysis', null);
    if (pendingAi) {
      await Store.remove('pendingAiAnalysis');
      window.location.hash = '#ai';
      setTimeout(() => {
        const aiEl = document.getElementById('aiInput');
        if (aiEl) aiEl.value = `Analyze this selected text from a security perspective:\n\n${pendingAi}`;
      }, 300);
    }
  } catch (initErr) {
    console.warn('[WebTester Pro] Init warning:', initErr.message);
  }

  // Hash-based navigation
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`module-${hash}`)) {
    switchModule(hash);
  }

  // ─── Navigation ───────────────────────────────────────────────────────
  document.querySelectorAll('.nav-item[data-module]').forEach(el => {
    el.addEventListener('click', () => switchModule(el.dataset.module));
  });

  function switchModule(name) {
    activeModule = name;
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const mod = document.getElementById(`module-${name}`);
    if (mod) mod.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-module="${name}"]`);
    if (nav) nav.classList.add('active');
    renderModule(name);
    window.location.hash = name;
    const mc = document.getElementById('mainContent'); if (mc) mc.scrollTop = 0;
  }

  function renderModule(name) {
    switch (name) {
      case 'dashboard': renderDashboard(); break;
      case 'payloads': renderPayloads(); break;
      case 'encoder': break;
      case 'jwt': break;
      case 'regex': renderRegex(); break;
      case 'notes': renderNoteList(); break;
      case 'checklists': renderChecklists(); break;
      case 'wordlists': renderWordlists(); break;
      case 'recon': renderRecon(); break;
      case 'reports': break;
      case 'settings': renderSettings(); break;
      case 'ai': renderAiQuickActions(); break;
    }
  }

  // ─── Dashboard ───────────────────────────────────────────────────────
  function renderDashboard() {
    const stats = [
      { label: 'Total Payloads', value: allPayloads.length, icon: '📦', color: '#9c27ff' },
      { label: 'Favorites', value: favorites.length, icon: '⭐', color: '#ffea00' },
      { label: 'Notes', value: notes.length, icon: '📝', color: '#2979ff' },
      { label: 'Checklists', value: Object.keys(CHECKLISTS).length, icon: '✅', color: '#00e676' }
    ];
    setHTML('dashStats', stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${s.color}22;color:${s.color};font-size:20px">${s.icon}</div>
        <div>
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
        </div>
      </div>`).join(''));

    const favPayloads = allPayloads.filter(p => favorites.includes(p.id)).slice(0, 6);
    setHTML('dashFavs', favPayloads.length
      ? favPayloads.map(p => miniPayloadHtml(p)).join('')
      : '<div class="empty-state"><p>No favorites yet</p></div>');

    const recentPayloads = recentIds.map(id => allPayloads.find(p => p.id === id)).filter(Boolean).slice(0, 6);
    setHTML('dashRecent', recentPayloads.length
      ? recentPayloads.map(p => miniPayloadHtml(p)).join('')
      : '<div class="empty-state"><p>No recent payloads</p></div>');

    document.querySelectorAll('.dash-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = allPayloads.find(x => x.id === btn.dataset.id);
        if (p) { await Utils.copyToClipboard(p.payload); Utils.showToast('Copied!'); }
      });
    });
    const navPEl = document.getElementById('navPayloadCount'); if (navPEl) navPEl.textContent = allPayloads.length;
    const navNoteEl = document.getElementById('navNoteCount'); if (navNoteEl) navNoteEl.textContent = notes.length;
  }

  function miniPayloadHtml(p) {
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.sanitize(p.name)}</div>
        <div style="font-size:11px;color:var(--accent3)">${Utils.sanitize(p.category)}</div>
      </div>
      <button class="btn btn-sm btn-icon dash-copy" data-id="${p.id}" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      </button>
    </div>`;
  }

  // ─── Payload Browser ─────────────────────────────────────────────────
  const catFilterSelect = document.getElementById('categoryFilter');
  if (catFilterSelect) {
    PayloadDB.CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = PayloadDB.CAT_LABELS[cat] || cat;
      catFilterSelect.appendChild(opt);
    });
  }

  on('payloadSearch', 'input', Utils.debounce(e => {
    payloadFilter.search = e.target.value;
    payloadPage = 0;
    renderPayloads();
  }, 200));

  on(catFilterSelect, 'change', e => {
    payloadFilter.category = e.target.value;
    payloadPage = 0;
    renderPayloads();
  });

  on('favOnlyFilter', 'change', e => {
    payloadFilter.favOnly = e.target.checked;
    payloadPage = 0;
    renderPayloads();
  });

  function getFilteredPayloads() {
    let p = allPayloads;
    if (payloadFilter.favOnly) p = p.filter(x => favorites.includes(x.id));
    if (payloadFilter.category) {
      p = p.filter(x => x.id.startsWith(payloadFilter.category + '_') ||
        x.category.toLowerCase().replace(/\s+/g,'') === PayloadDB.CAT_LABELS[payloadFilter.category]?.toLowerCase().replace(/\s+/g,''));
    }
    if (payloadFilter.search) p = PayloadDB.search(p, payloadFilter.search);
    return p;
  }

  function renderPayloads() {
    const filtered = getFilteredPayloads();
    const total = filtered.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    const slice = filtered.slice(payloadPage * PAGE_SIZE, (payloadPage + 1) * PAGE_SIZE);

    setTxt('payloadCount',
      `Showing ${slice.length} of ${total} payloads`);

    const list = document.getElementById('payloadList');
    list.replaceChildren();
    if (!slice.length) {
      const emp = document.createElement('div');
      emp.className = 'empty-state';
      const ep = document.createElement('p');
      ep.textContent = 'No payloads found';
      emp.appendChild(ep);
      list.appendChild(emp);
    } else {
      slice.forEach(p => {
        const isFav = favorites.includes(p.id);
        const div = document.createElement('div');
        div.className = 'payload-item';

        // Header
        const hdr = document.createElement('div'); hdr.className = 'payload-header';
        const hdrL = document.createElement('div');
        const nm = document.createElement('div'); nm.className = 'payload-name'; nm.textContent = p.name;
        const ds = document.createElement('div'); ds.className = 'payload-desc'; ds.textContent = p.description || '';
        hdrL.appendChild(nm); hdrL.appendChild(ds);
        const catBadge = document.createElement('span'); catBadge.className = 'payload-category badge'; catBadge.textContent = p.category;
        hdr.appendChild(hdrL); hdr.appendChild(catBadge);

        // Tags
        const tagsDiv = document.createElement('div'); tagsDiv.className = 'payload-tags';
        (p.tags || []).forEach(t => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; tagsDiv.appendChild(s); });

        // Code
        const codeDiv = document.createElement('div'); codeDiv.className = 'payload-code'; codeDiv.textContent = p.payload;

        // Actions
        const actDiv = document.createElement('div'); actDiv.className = 'payload-actions';
        const cpBtn = document.createElement('button'); cpBtn.className = 'btn btn-sm p-copy'; cpBtn.dataset.id = p.id; cpBtn.textContent = 'Copy';
        const fvBtn = document.createElement('button');
        fvBtn.className = 'btn btn-sm btn-icon p-fav' + (isFav ? ' btn-primary' : '');
        fvBtn.dataset.id = p.id; fvBtn.title = isFav ? 'Unfavorite' : 'Favorite'; fvBtn.textContent = isFav ? '★' : '☆';
        actDiv.appendChild(cpBtn); actDiv.appendChild(fvBtn);
        if (p.custom) {
          const edBtn = document.createElement('button'); edBtn.className = 'btn btn-sm btn-icon p-edit'; edBtn.dataset.id = p.id; edBtn.title = 'Edit'; edBtn.textContent = '✏';
          const dlBtn = document.createElement('button'); dlBtn.className = 'btn btn-sm btn-icon btn-danger p-del'; dlBtn.dataset.id = p.id; dlBtn.title = 'Delete'; dlBtn.textContent = '✕';
          actDiv.appendChild(edBtn); actDiv.appendChild(dlBtn);
        }

        div.appendChild(hdr); div.appendChild(tagsDiv); div.appendChild(codeDiv); div.appendChild(actDiv);
        list.appendChild(div);
      });

      list.querySelectorAll('.p-copy').forEach(btn => {
        btn.addEventListener('click', async () => {
          const p = allPayloads.find(x => x.id === btn.dataset.id);
          if (p) { await Utils.copyToClipboard(p.payload); await PayloadDB.addRecentlyUsed(p.id); Utils.showToast('Copied!'); }
        });
      });
      list.querySelectorAll('.p-fav').forEach(btn => {
        btn.addEventListener('click', async () => {
          favorites = await PayloadDB.toggleFavorite(btn.dataset.id);
          renderPayloads();
        });
      });
      list.querySelectorAll('.p-edit').forEach(btn => {
        btn.addEventListener('click', () => openPayloadModal(btn.dataset.id));
      });
      list.querySelectorAll('.p-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this payload?')) return;
          await PayloadDB.deleteCustom(btn.dataset.id);
          allPayloads = await PayloadDB.getAllWithCustom();
          renderPayloads();
        });
      });
    }

    // Pagination
    const pg = document.getElementById('payloadPagination');
    pg.replaceChildren();
    if (pages > 1) {
      for (let i = 0; i < pages; i++) {
        const b = document.createElement('button');
        b.className = `btn btn-sm ${i === payloadPage ? 'btn-primary' : ''}`;
        b.textContent = i + 1;
        b.addEventListener('click', () => { payloadPage = i; renderPayloads(); document.getElementById('mainContent').scrollTop = 0; });
        pg.appendChild(b);
      }
    }
  }

  // Payload modal
  function openPayloadModal(id = null) {
    editingPayloadId = id;
    setTxt('payloadModalTitle', id ? 'Edit Payload' : 'Add Payload');
    if (id) {
      const p = allPayloads.find(x => x.id === id);
      if (p) {
        setVal('pmName', p.name);
        setVal('pmCategory', p.category);
        setVal('pmDesc', p.description || '');
        setVal('pmPayload', p.payload);
        setVal('pmTags', (p.tags||[]).join(', '));
      }
    } else {
      ['pmName','pmCategory','pmDesc','pmPayload','pmTags'].forEach(id => { document.getElementById(id).value = ''; });
    }
    show('payloadModal', 'flex');
  }

  on('addPayloadBtn', 'click', () => openPayloadModal());
  on('closePayloadModal', 'click', () => { hide('payloadModal'); });
  on('cancelPayloadModal', 'click', () => { hide('payloadModal'); });

  on('savePayloadModal', 'click', async () => {
    const name = document.getElementById('pmName').value.trim();
    const category = document.getElementById('pmCategory').value.trim();
    const payload = document.getElementById('pmPayload').value.trim();
    if (!name || !category || !payload) { Utils.showToast('Name, category and payload are required', 'error'); return; }
    const tags = document.getElementById('pmTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const data = { name, category, description: document.getElementById('pmDesc').value.trim(), payload, tags };
    if (editingPayloadId) {
      await PayloadDB.updateCustom(editingPayloadId, data);
    } else {
      await PayloadDB.addCustom(data);
    }
    allPayloads = await PayloadDB.getAllWithCustom();
    hide('payloadModal');
    renderPayloads();
    Utils.showToast(editingPayloadId ? 'Payload updated' : 'Payload added');
  });

  // Import/Export
  on('importPayloadsBtn', 'click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      try {
        const text = await Utils.readFileAsText(input.files[0]);
        const data = JSON.parse(text);
        if (!Utils.validatePayloadPack(data)) { Utils.showToast('Invalid payload pack format', 'error'); return; }
        for (const p of data) await PayloadDB.addCustom(p);
        allPayloads = await PayloadDB.getAllWithCustom();
        renderPayloads();
        Utils.showToast(`Imported ${data.length} payloads`);
      } catch { Utils.showToast('Import failed', 'error'); }
    };
    input.click();
  });

  on('exportPayloadsBtn', 'click', async () => {
    const custom = await PayloadDB.getCustom();
    Utils.downloadJson(custom, 'custom-payloads.json');
  });

  // ─── Encoder / Decoder ───────────────────────────────────────────────



  function encode(type, input) {
    try {
      switch (type) {
        case 'url_enc': return encodeURIComponent(input);
        case 'url_dec': return decodeURIComponent(input);
        case 'b64_enc': return btoa(unescape(encodeURIComponent(input)));
        case 'b64_dec': return decodeURIComponent(escape(atob(input)));
        case 'html_enc': return input.replace(/[&<>"']/g, c => HTML_ENTITIES[c] || c);
        case 'html_dec': return input.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, c => HTML_DECODE_MAP[c] || c);
        case 'uni_enc': return [...input].map(c => c.charCodeAt(0) > 127 || true ? `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}` : c).join('');
        case 'uni_dec': return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        case 'hex_enc': return [...input].map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
        case 'hex_dec': return (input.match(/.{1,2}/g)||[]).map(h => String.fromCharCode(parseInt(h,16))).join('');
        default: return input;
      }
    } catch (e) { return 'Error: ' + e.message; }
  }

  document.querySelectorAll('[data-enc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('encInput').value;
      setVal('encOutput', encode(btn.dataset.enc, input));
    });
  });

  on('copyEncOutput', 'click', () => {
    const val = document.getElementById('encOutput').value;
    if (val) { Utils.copyToClipboard(val); Utils.showToast('Copied!'); }
  });

  // ─── JWT Toolkit ─────────────────────────────────────────────────────
  on('decodeJwtBtn', 'click', () => {
    const token = document.getElementById('jwtInput').value.trim();
    if (!token) { Utils.showToast('Enter a JWT token', 'error'); return; }
    const parts = token.split('.');
    if (parts.length < 2) { Utils.showToast('Invalid JWT format', 'error'); return; }
    try {
      const header = JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      const sig = parts[2] || '';
      const now = Math.floor(Date.now() / 1000);
      const expired = payload.exp && payload.exp < now;
      const expDate = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A';
      const iatDate = payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A';

      const jwtInfoEl = document.getElementById('jwtInfo'); if (!jwtInfoEl) return;
      jwtInfoEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
          <div>Algorithm: <strong style="color:var(--accent3)">${Utils.sanitize(header.alg || 'N/A')}</strong></div>
          <div>Type: <strong>${Utils.sanitize(header.typ || 'N/A')}</strong></div>
          <div>Subject: <strong>${Utils.sanitize(String(payload.sub || 'N/A'))}</strong></div>
          <div>Issuer: <strong>${Utils.sanitize(String(payload.iss || 'N/A'))}</strong></div>
          <div>Issued At: <strong>${Utils.sanitize(iatDate)}</strong></div>
          <div>Expires: <strong style="color:${expired ? 'var(--red)' : 'var(--green)'}">${Utils.sanitize(expDate)} ${expired ? '(EXPIRED)' : '(valid)'}</strong></div>
          <div>Has Signature: <strong style="color:${sig ? 'var(--green)' : 'var(--red)'}">${sig ? 'Yes' : 'No (alg:none risk!)'}</strong></div>
          ${header.alg === 'none' ? '<div class="badge badge-red">⚠ alg:none detected!</div>' : ''}
          ${header.jwk ? '<div class="badge badge-red">⚠ Embedded JWK!</div>' : ''}
          ${header.jku ? '<div class="badge badge-red">⚠ jku header!</div>' : ''}
        </div>`;

      const jwtPartsEl = document.getElementById('jwtParts'); if (!jwtPartsEl) return;
      jwtPartsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div class="jwt-part"><div class="jwt-part-label jwt-header-label">Header</div><pre>${Utils.sanitize(JSON.stringify(header,null,2))}</pre></div>
          <div class="jwt-part"><div class="jwt-part-label jwt-payload-label">Payload</div><pre>${Utils.sanitize(JSON.stringify(payload,null,2))}</pre></div>
          <div class="jwt-part"><div class="jwt-part-label jwt-sig-label">Signature</div><pre style="word-break:break-all">${Utils.sanitize(sig || '(empty)')}</pre></div>
        </div>`;
    } catch (e) { Utils.showToast('Failed to decode JWT: ' + e.message, 'error'); }
  });

  // ─── Regex Library ───────────────────────────────────────────────────


  function renderRegex() {
    const sel = document.getElementById('regexCatFilter');
    const listEl = document.getElementById('regexList');
    // Guard: both elements must exist (module panel may not be active)
    if (!sel || !listEl) return;

    // Populate category filter once
    if (sel.options.length <= 1) {
      const cats = [...new Set(REGEX_PATTERNS.map(r => r.cat))];
      cats.forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        sel.appendChild(o);
      });
    }

    const q = regexSearch.toLowerCase();
    const filtered = REGEX_PATTERNS.filter(r =>
      (!q || r.name.toLowerCase().includes(q) ||
             r.pattern.toLowerCase().includes(q) ||
             r.desc.toLowerCase().includes(q)) &&
      (!regexCat || r.cat === regexCat)
    );

    listEl.innerHTML = filtered.map(r => `
      <div class="regex-item">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <strong style="font-size:13px">${Utils.sanitize(r.name)}</strong>
          <span class="badge">${Utils.sanitize(r.cat)}</span>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${Utils.sanitize(r.desc)}</div>
        <div class="regex-pattern">${Utils.sanitize(r.pattern)}</div>
        <button class="btn btn-sm" data-pattern="${Utils.sanitize(r.pattern)}">Copy Pattern</button>
      </div>`).join('');

    listEl.querySelectorAll('[data-pattern]').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.copyToClipboard(btn.dataset.pattern);
        Utils.showToast('Pattern copied!');
      });
    });
  }

  on('regexSearch', 'input', Utils.debounce(e => { regexSearch = e.target.value; renderRegex(); }, 200));
  on('regexCatFilter', 'change', e => { regexCat = e.target.value; renderRegex(); });

  // ─── Notes Manager ───────────────────────────────────────────────────
  function renderNoteList() {
    const navNoteEl = document.getElementById('navNoteCount'); if (navNoteEl) navNoteEl.textContent = notes.length;
    const q = document.getElementById('noteSearch').value.toLowerCase();
    const filtered = notes.filter(n =>
      !q || n.title.toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q) || (n.tags||[]).some(t => t.toLowerCase().includes(q))
    );
    const el = document.getElementById('noteList');
    el.replaceChildren();
    if (!filtered.length) {
      const emp = document.createElement('div'); emp.className = 'empty-state';
      const ep = document.createElement('p'); ep.textContent = 'No notes found';
      emp.appendChild(ep); el.appendChild(emp);
    } else {
      filtered.forEach(function(n) {
        const item = document.createElement('div');
        item.className = 'note-item'; item.dataset.nid = n.id;
        const ttl = document.createElement('div'); ttl.className = 'note-title'; ttl.textContent = n.title || 'Untitled';
        const prv = document.createElement('div'); prv.className = 'note-preview'; prv.textContent = Utils.truncate(n.content || '', 100);
        const tgs = document.createElement('div'); tgs.className = 'note-tags';
        (n.tags||[]).forEach(function(t){ const s=document.createElement('span');s.className='tag';s.textContent=t;tgs.appendChild(s); });
        const meta = document.createElement('div'); meta.className = 'note-meta';
        meta.textContent = (n.target ? '🎯 ' + n.target : '') + ' · ' + Utils.relativeTime(n.updated || n.created);
        item.appendChild(ttl); item.appendChild(prv); item.appendChild(tgs); item.appendChild(meta);
        item.addEventListener('click', function() { openNote(item.dataset.nid); });
        el.appendChild(item);
      });
    }
  }

  function openNote(id) {
    activeNoteId = id;
    const n = notes.find(x => x.id === id);
    if (!n) return;
    show('noteEditor', 'flex');
    hide('noteEmpty');
    setVal('noteTitleInput', n.title || '');
    setVal('noteContent', n.content || '');
    setVal('noteTagsInput', (n.tags||[]).join(', '));
    setVal('noteTargetInput', n.target || '');
    showNoteTab('edit');
  }

  function showNoteTab(tab) {
    document.querySelectorAll('[data-notetab]').forEach(t => t.classList.toggle('active', t.dataset.notetab === tab));
    show('noteContent', tab === 'edit' ? 'block' : 'none');
    show('notePreview', tab === 'preview' ? 'block' : 'none');
    if (tab === 'preview') {
      setHTML('notePreview', Utils.markdownToHtml($('noteContent') ? $('noteContent').value : ''));
    }
  }

  document.querySelectorAll('[data-notetab]').forEach(t => {
    t.addEventListener('click', () => showNoteTab(t.dataset.notetab));
  });

  on('addNoteBtn', 'click', async () => {
    const n = { id: Utils.uid(), title: 'New Note', content: '', tags: [], target: '', created: Date.now(), updated: Date.now() };
    notes.unshift(n);
    await Store.set('notes', notes);
    renderNoteList();
    openNote(n.id);
  });

  on('saveNoteBtn', 'click', async () => {
    if (!activeNoteId) return;
    const idx = notes.findIndex(n => n.id === activeNoteId);
    if (idx < 0) return;
    notes[idx] = {
      ...notes[idx],
      title: document.getElementById('noteTitleInput').value.trim() || 'Untitled',
      content: document.getElementById('noteContent').value,
      tags: document.getElementById('noteTagsInput').value.split(',').map(t => t.trim()).filter(Boolean),
      target: document.getElementById('noteTargetInput').value.trim(),
      updated: Date.now()
    };
    await Store.set('notes', notes);
    renderNoteList();
    Utils.showToast('Note saved');
  });

  on('deleteNoteBtn', 'click', async () => {
    if (!activeNoteId || !confirm('Delete this note?')) return;
    notes = notes.filter(n => n.id !== activeNoteId);
    await Store.set('notes', notes);
    activeNoteId = null;
    hide('noteEditor');
    show('noteEmpty', 'block');
    renderNoteList();
  });

  on('exportNoteBtn', 'click', () => {
    if (!activeNoteId) return;
    const n = notes.find(x => x.id === activeNoteId);
    if (n) Utils.downloadFile(n.content || '', (n.title || 'note') + '.md');
  });

  on('noteSearch', 'input', Utils.debounce(() => renderNoteList(), 200));

  // ─── Checklists ──────────────────────────────────────────────────────
  // CHECKLISTS is defined at module scope above the IIFE (see top of file)

  function renderChecklists() {
    const nav = document.getElementById('checklistNav');
    nav.replaceChildren();
    Object.keys(CHECKLISTS).forEach(function(k) {
      const ni = document.createElement('div');
      ni.className = 'nav-item' + (k === activeChecklist ? ' active' : '');
      ni.dataset.cl = k;
      ni.textContent = k;
      nav.appendChild(ni);
    });
    nav.querySelectorAll('[data-cl]').forEach(el => {
      el.addEventListener('click', () => { activeChecklist = el.dataset.cl; renderChecklists(); });
    });
    renderChecklistContent();
  }

  function renderChecklistContent() {
    const items = CHECKLISTS[activeChecklist] || [];
    const key = `cl_${activeChecklist}`;
    const state = checklistState[key] || {};
    const done = items.filter((_, i) => state[i]).length;
    const pct = items.length ? Math.round(done / items.length * 100) : 0;

    const clContainer = document.getElementById('checklistContent');
    if (!clContainer) return;
    clContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <strong style="font-size:15px">${Utils.sanitize(activeChecklist)}</strong>
        <span class="badge badge-green">${done}/${items.length} (${pct}%)</span>
      </div>
      <div class="progress-bar" style="margin-bottom:16px"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div id="clItems">
        ${items.map((item, i) => `
          <div class="checklist-item">
            <input type="checkbox" data-cl="${activeChecklist}" data-i="${i}" ${state[i] ? 'checked' : ''}>
            <span class="checklist-text ${state[i] ? 'done' : ''}">${Utils.sanitize(item)}</span>
          </div>`).join('')}
      </div>`;

    document.querySelectorAll('input[data-cl]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const clKey = `cl_${cb.dataset.cl}`;
        if (!checklistState[clKey]) checklistState[clKey] = {};
        checklistState[clKey][cb.dataset.i] = cb.checked;
        await Store.set('checklist_state', checklistState);
        renderChecklistContent();
      });
    });
  }

  on('resetChecklistsBtn', 'click', async () => {
    if (!confirm('Reset all checklists?')) return;
    checklistState = {};
    await Store.set('checklist_state', {});
    renderChecklistContent();
  });

  // ─── Wordlists ───────────────────────────────────────────────────────
  function renderWordlists() {
    const sel = document.getElementById('wordlistSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select a wordlist…</option>';
    Object.keys(wordlists).forEach(name => {
      const o = document.createElement('option');
      o.value = name; o.textContent = name;
      sel.appendChild(o);
    });
  }

  on('uploadWordlistBtn', 'click', () => {
    document.getElementById('wordlistFileInput').click();
  });

  on('wordlistFileInput', 'change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await Utils.readFileAsText(file);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    wordlists[file.name] = lines;
    await Store.set('wordlists', wordlists);
    renderWordlists();
    setVal('wordlistSelect', file.name);
    showWordlistEntries(file.name, '');
    Utils.showToast(`Loaded ${lines.length} entries`);
    e.target.value = '';
  });

  on('wordlistSelect', 'change', e => {
    showWordlistEntries(e.target.value, document.getElementById('wordlistSearch').value);
  });

  on('wordlistSearch', 'input', Utils.debounce(e => {
    showWordlistEntries(document.getElementById('wordlistSelect').value, e.target.value);
  }, 200));

  function showWordlistEntries(name, q) {
    if (!name || !wordlists[name]) { setTxt('wordlistEntries', ''); return; }
    const lines = wordlists[name];
    const filtered = q ? lines.filter(l => l.toLowerCase().includes(q.toLowerCase())) : lines;
    setTxt('wordlistMeta', `${filtered.length} entries${q ? ' (filtered)' : ''} · ${lines.length} total`);
    setTxt('wordlistEntries', filtered.slice(0, 1000).join('\n')) + (filtered.length > 1000 ? `\n… (${filtered.length - 1000} more)` : '');
  }

  // ─── Recon Toolkit ───────────────────────────────────────────────────


  function renderRecon() {
    const q = document.getElementById('reconSearch').value.toLowerCase();
    const filtered = RECON_TOOLS.filter(t =>
      !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
    );
    const reconContainer = document.getElementById('reconList'); if (!reconContainer) return;
    reconContainer.innerHTML = filtered.map(t => `
      <div class="recon-tool">
        <div class="recon-tool-header">
          <span class="recon-tool-name">${Utils.sanitize(t.name)}</span>
          <span class="badge badge-blue">${Utils.sanitize(t.type)}</span>
        </div>
        <div class="recon-tool-desc">${Utils.sanitize(t.desc)}</div>
        ${t.cmd.split('\n').map(c => `<div class="recon-tool-cmd">${Utils.sanitize(c)}</div>`).join('')}
        <button class="btn btn-sm" data-rcmd="${Utils.sanitize(t.cmd)}">Copy Commands</button>
      </div>`).join('');
    document.querySelectorAll('[data-rcmd]').forEach(btn => {
      btn.addEventListener('click', () => { Utils.copyToClipboard(btn.dataset.rcmd); Utils.showToast('Copied!'); });
    });
  }

  on('reconSearch', 'input', Utils.debounce(() => renderRecon(), 200));

  // ─── Report Generator ────────────────────────────────────────────────


  on('generateReportBtn', 'click', () => {
    const d = {
      title: document.getElementById('reportTitle').value,
      severity: document.getElementById('reportSeverity').value,
      target: document.getElementById('reportTarget').value,
      summary: document.getElementById('reportSummary').value,
      steps: document.getElementById('reportSteps').value,
      impact: document.getElementById('reportImpact').value,
      cvss: document.getElementById('reportCvss').value,
      cwe: document.getElementById('reportCwe').value,
      recommendation: document.getElementById('reportRecommendation').value
    };
    const platform = document.getElementById('reportPlatform').value;
    const tmpl = REPORT_TEMPLATES[platform] || REPORT_TEMPLATES.hackerone;
    setVal('reportOutput', tmpl(d));
    Utils.showToast('Report generated');
  });

  on('copyReportBtn', 'click', () => {
    const v = document.getElementById('reportOutput').value;
    if (v) { Utils.copyToClipboard(v); Utils.showToast('Copied!'); }
  });

  on('exportReportBtn', 'click', () => {
    const v = document.getElementById('reportOutput').value;
    if (v) { Utils.downloadFile(v, 'report.md'); }
  });

  // ─── AI Assistant ─────────────────────────────────────────────────────


  function renderAiQuickActions() {
    const actions = [
      'Explain this XSS payload', 'What is SSRF and how to exploit it?',
      'How to test JWT vulnerabilities?', 'Suggest next testing steps',
      'Explain HTTP request smuggling', 'How to bypass WAF for SQL injection?'
    ];
    setHTML('aiQuickActions', actions.map(a =>
      `<button class="btn btn-sm ai-quick" data-q="${Utils.sanitize(a)}">${Utils.sanitize(a)}</button>`
    ).join(''));
    document.querySelectorAll('.ai-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        setVal('aiInput', btn.dataset.q);
        sendAiMessage();
      });
    });
  }

  async function sendAiMessage() {
    const input = document.getElementById('aiInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    appendAiMessage('user', msg);
    aiHistory.push({ role: 'user', content: msg });

    const cfg = await Store.get('ai_settings', {});
    if (!cfg.provider) {
      appendAiMessage('assistant', '⚠️ Please configure your AI provider first. Click the **Configure AI** button above.');
      return;
    }

    const defaults = AI_DEFAULTS[cfg.provider] || {};
    const baseUrl = cfg.url || defaults.url;
    const model = cfg.model || defaults.model;
    const apiKey = cfg.apiKey || '';

    const thinkingEl = appendAiMessage('assistant', '…');
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(cfg.provider === 'openrouter' ? { 'HTTP-Referer': 'moz-extension://webtester-pro' } : {})
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an expert bug bounty hunter and web application security researcher. Provide detailed, technical, accurate security advice. Focus on practical exploitation techniques for authorized testing.' },
            ...aiHistory
          ]
        })
      });
      if (!res.ok) { const err = await res.text(); throw new Error(err); }
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'No response.';
      thinkingEl.textContent = reply;
      aiHistory.push({ role: 'assistant', content: reply });
      if (aiHistory.length > 20) aiHistory = aiHistory.slice(-20);
    } catch (e) {
      thinkingEl.textContent = `❌ Error: ${e.message}. Check your AI settings and ensure the provider is accessible.`;
    }
    document.getElementById('aiMessages').scrollTop = document.getElementById('aiMessages').scrollHeight;
  }

  function appendAiMessage(role, text) {
    const el = document.createElement('div');
    el.className = `ai-msg ${role}`;
    el.textContent = text;
    document.getElementById('aiMessages').appendChild(el);
    document.getElementById('aiMessages').scrollTop = document.getElementById('aiMessages').scrollHeight;
    return el;
  }

  on('aiSendBtn', 'click', sendAiMessage);
  on('aiInput', 'keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
  });
  on('aiClearBtn', 'click', () => {
    aiHistory = [];
    setHTML('aiMessages', '<div class="ai-msg assistant">Chat cleared. How can I help you?</div>');
  });

  // AI Config modal
  on('aiConfigBtn', 'click', async () => {
    const cfg = await Store.get('ai_settings', {});
    setVal('aiModalProvider', cfg.provider || 'openrouter');
    setVal('aiModalKey', cfg.apiKey || '');
    setVal('aiModalUrl', cfg.url || '');
    setVal('aiModalModel', cfg.model || '');
    show('aiConfigModal', 'flex');
  });
  on('closeAiConfigModal', 'click', () => { hide('aiConfigModal'); });
  on('cancelAiConfigModal', 'click', () => { hide('aiConfigModal'); });
  on('saveAiConfigModal', 'click', async () => {
    const cfg = {
      provider: document.getElementById('aiModalProvider').value,
      apiKey: document.getElementById('aiModalKey').value.trim(),
      url: document.getElementById('aiModalUrl').value.trim(),
      model: document.getElementById('aiModalModel').value.trim()
    };
    await Store.set('ai_settings', cfg);
    hide('aiConfigModal');
    Utils.showToast('AI settings saved');
  });

  // ─── Settings ─────────────────────────────────────────────────────────
  async function renderSettings() {
    const cfg = await Store.get('ai_settings', {});
    const thm = await Store.get('theme', 'dark');
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('settingTheme',      thm);
    setVal('settingAiProvider', cfg.provider || 'openrouter');
    setVal('settingAiKey',      cfg.apiKey   || '');
    setVal('settingAiUrl',      cfg.url      || '');
    setVal('settingAiModel',    cfg.model    || '');
  }

  on('settingTheme', 'change', async e => {
    await Store.set('theme', e.target.value);
    document.body.classList.toggle('light', e.target.value === 'light');
  });

  on('saveSettingsBtn', 'click', async () => {
    const cfg = {
      provider: document.getElementById('settingAiProvider').value,
      apiKey: document.getElementById('settingAiKey').value.trim(),
      url: document.getElementById('settingAiUrl').value.trim(),
      model: document.getElementById('settingAiModel').value.trim()
    };
    await Store.set('ai_settings', cfg);
    Utils.showToast('Settings saved');
  });

  on('testAiBtn', 'click', async () => {
    Utils.showToast('Testing connection…', 'success', 1000);
    const cfg = await Store.get('ai_settings', {});
    const defaults = AI_DEFAULTS[cfg.provider] || {};
    try {
      const res = await fetch(`${cfg.url || defaults.url}/models`, {
        headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}
      });
      if (res.ok) Utils.showToast('Connection successful!');
      else Utils.showToast('Connected but got status ' + res.status, 'error');
    } catch (e) { Utils.showToast('Connection failed: ' + e.message, 'error'); }
  });

  on('exportAllBtn', 'click', async () => {
    const all = await Store.getAll();
    Utils.downloadJson(all, 'webtester-pro-backup.json');
  });

  on('importAllBtn', 'click', () => {
    document.getElementById('importBackupFile').click();
  });

  on('importBackupFile', 'change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await Utils.readFileAsText(file);
      const data = JSON.parse(text);
      for (const [k, v] of Object.entries(data)) await Store.set(k, v);
      Utils.showToast('Backup restored. Reloading…');
      setTimeout(() => window.location.reload(), 1200);
    } catch { Utils.showToast('Import failed', 'error'); }
    e.target.value = '';
  });

  on('clearAllBtn', 'click', async () => {
    if (!confirm('Clear ALL data? This cannot be undone!')) return;
    await Store.clear();
    Utils.showToast('Data cleared. Reloading…');
    setTimeout(() => window.location.reload(), 1200);
  });

  // ─── Initial render ───────────────────────────────────────────────────
  renderDashboard();

  // Populate nav sidebar counts per category
  (async () => {
    try {
      const counts = await PayloadDB.getCategoryCounts();
      // Update navPayloadCount with total
      const totalEl = document.getElementById('navPayloadCount');
      if (totalEl) totalEl.textContent = allPayloads.length;
      // Update navNoteCount
      const noteEl = document.getElementById('navNoteCount');
      if (noteEl) noteEl.textContent = notes.length;
      // Attach per-category tooltip to nav items if present
      Object.entries(counts).forEach(([cat, count]) => {
        const label = PayloadDB.CAT_LABELS[cat] || cat;
        const navItem = document.querySelector(`.nav-item[data-module="payloads"]`);
        if (navItem) navItem.title = `${allPayloads.length} total payloads`;
      });
    } catch (_) { /* non-fatal */ }
  })();

})();