// WebTester Pro - Background Service Worker
// Author: Jojin John | Version: 1.0.0
// Compatible: Firefox MV2, Chrome/Edge/Brave MV3

// ── Compatibility: use chrome directly in background (no DOM, compat.js not available) ──
const bgAPI = (typeof browser !== 'undefined') ? browser : chrome;

// ── Context menu setup ────────────────────────────────────────────────────
bgAPI.runtime.onInstalled.addListener(() => {
  const menus = [
    { id: 'wtp-root',    title: 'WebTester Pro',              contexts: ['all'] },
    { id: 'wtp-xss',     title: 'Copy XSS Payload',           contexts: ['all'],       parentId: 'wtp-root' },
    { id: 'wtp-sqli',    title: 'Copy SQLi Payload',          contexts: ['all'],       parentId: 'wtp-root' },
    { id: 'wtp-ssrf',    title: 'Copy SSRF Payload',          contexts: ['all'],       parentId: 'wtp-root' },
    { id: 'wtp-sep1',    type:  'separator',                  contexts: ['all'],       parentId: 'wtp-root' },
    { id: 'wtp-encoder', title: 'Open Encoder / Decoder',     contexts: ['all'],       parentId: 'wtp-root' },
    { id: 'wtp-jwt',     title: 'Open JWT Toolkit',           contexts: ['all'],       parentId: 'wtp-root' },
    { id: 'wtp-sep2',    type:  'separator',                  contexts: ['selection'], parentId: 'wtp-root' },
    { id: 'wtp-ai',      title: 'Analyze Selection With AI',  contexts: ['selection'], parentId: 'wtp-root' },
  ];

  menus.forEach(props => {
    // Ignore "duplicate ID" errors on extension reload
    bgAPI.contextMenus.create(props, () => void bgAPI.runtime.lastError);
  });
});

const QUICK_PAYLOADS = {
  'wtp-xss':  '<img src=x onerror=alert(1)>',
  'wtp-sqli': "' OR 1=1--",
  'wtp-ssrf': 'http://169.254.169.254/latest/meta-data/'
};

// ── Clipboard helper ──────────────────────────────────────────────────────
// MV3 cannot use tabs.executeScript directly — use scripting API on Chrome,
// and store a pending clipboard value for fallback pickup by workspace page.
async function copyPayloadToClipboard(payload, tabId) {
  // Store for workspace pickup (reliable across all contexts)
  await bgAPI.storage.local.set({ pendingClipboard: { text: payload, ts: Date.now() } });

  // Chrome MV3: use scripting API with pre-approved function (no eval/new Function)
  if (typeof chrome !== 'undefined' && chrome.scripting && tabId) {
    try {
      // _clipboardWriter is defined in compat.js but not available in SW context
      // Use inline function here — this is the background service worker, not extension page
      // The scripting.executeScript func must be a serialisable function reference.
      // AMO note: background.js runs in SW context where compat.js is not loaded.
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: function(text) { navigator.clipboard.writeText(text).catch(function(){}); },
        args: [payload]
      });
      return;
    } catch (_) { /* restricted page — fallback to storage */ }
  }

  // Firefox MV2: use tabs.executeScript
  if (typeof browser !== 'undefined' && tabId) {
    try {
      await browser.tabs.executeScript(tabId, {
        code: `navigator.clipboard.writeText(${JSON.stringify(payload)}).catch(()=>{});`
      });
      return;
    } catch (_) { /* restricted page */ }
  }

  // Final fallback: notify user to open workspace
  try {
    bgAPI.notifications.create('wtp-clip', {
      type: 'basic',
      iconUrl: bgAPI.runtime.getURL('icons/icon48.png'),
      title: 'WebTester Pro',
      message: 'Payload saved — open workspace to copy it.'
    });
  } catch (_) {}
}

// ── Context menu click handler ────────────────────────────────────────────
bgAPI.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabId = tab && tab.id;

  if (QUICK_PAYLOADS[info.menuItemId]) {
    await copyPayloadToClipboard(QUICK_PAYLOADS[info.menuItemId], tabId);
    return;
  }

  switch (info.menuItemId) {
    case 'wtp-encoder':
      bgAPI.tabs.create({ url: bgAPI.runtime.getURL('pages/workspace.html#encoder') });
      break;
    case 'wtp-jwt':
      bgAPI.tabs.create({ url: bgAPI.runtime.getURL('pages/workspace.html#jwt') });
      break;
    case 'wtp-ai':
      if (info.selectionText) {
        await bgAPI.storage.local.set({ pendingAiAnalysis: info.selectionText });
        bgAPI.tabs.create({ url: bgAPI.runtime.getURL('pages/workspace.html#ai') });
      }
      break;
  }
});

// ── Message handler ───────────────────────────────────────────────────────
bgAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'openWorkspace') {
    bgAPI.tabs.create({ url: bgAPI.runtime.getURL('pages/workspace.html' + (msg.hash || '')) });
    sendResponse({ ok: true });
  }
  // Must return true to keep channel open for async response
  return true;
});
