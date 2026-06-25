# WebTester Pro v1.0.0 — Release Notes

**Author:** Jojin John  
**Date:** 2024-06-18  
**Tag:** `v1.0.0`

---

## 🚀 What's New

WebTester Pro v1.0.0 is the first public release — a production-ready cross-browser security testing extension for Firefox, Chrome, Edge, and Brave.

Built for bug bounty hunters and web application security researchers, it combines HackBar, JWT.io, a payload library, and an AI assistant into a single lightweight extension with zero external dependencies.

---

## 📦 Release Assets

| File | Description |
|---|---|
| `WebTesterPro-Firefox.zip` | Firefox extension (unzipped for `about:debugging`) |
| `WebTesterPro.xpi` | Firefox XPI (direct install) |
| `WebTesterPro-Chrome.zip` | Chrome / Edge / Brave extension |

---

## ✨ Highlights

### 274 Payloads, 20 Categories
Curated, searchable, copy-on-click payloads for XSS, SQLi, SSRF, LFI, XXE, SSTI, JWT, CORS, GraphQL, IDOR, OAuth, API, HTTP Smuggling, Cache Poisoning, File Upload, Open Redirect, Prototype Pollution, Host Header, CRLF, and custom payloads.

### Cross-Browser Single Codebase
A unified `browserAPI` compatibility layer transparently handles:
- Firefox MV2 (`browser.*` with native Promises)
- Chrome / Edge / Brave MV3 (`chrome.*` wrapped in Promises, `scripting` API)

### AI Security Assistant
Connect OpenRouter, Groq, Ollama, or LM Studio. Ask it to explain payloads, suggest next steps, or draft reports. Fails gracefully with no API key.

### Complete Security Toolkit
- JWT Decoder with vulnerability detection
- Encoder/Decoder (URL, Base64, HTML, Unicode, Hex)
- Regex Library (secrets, tokens, cloud keys)
- Security Checklists (11 categories with progress tracking)
- Report Generator (HackerOne, Bugcrowd, Intigriti, YesWeHack)
- Recon Toolkit command references
- Markdown Notes Manager
- Wordlist Manager

---

## 🔧 Installation

### Firefox
```
1. Download WebTesterPro-Firefox.zip and extract
2. Navigate to about:debugging → This Firefox
3. Click "Load Temporary Add-on…" → select manifest.json
```
Or install `WebTesterPro.xpi` directly via **about:addons → Install Add-on From File**.

### Chrome / Edge / Brave
```
1. Download WebTesterPro-Chrome.zip and extract
2. Navigate to chrome://extensions (or edge://extensions, brave://extensions)
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" → select the extracted folder
```

---

## 🔒 Security Notes

- **No telemetry.** Zero data leaves your device (except AI API calls you configure).
- **No eval().** CSP enforced: `script-src 'self'; object-src 'self'`.
- **AV-safe.** Payload strings containing security-sensitive patterns are stored as Unicode escape sequences to prevent false positives.
- **All data is local.** Uses `browser.storage.local` only.

---

## 📋 Full Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the complete list of features.

---

## 🐛 Known Issues

- Firefox sidebar requires manual activation via View → Sidebar → WebTester Pro
- Chrome: clipboard copy on restricted pages (`chrome://`, `edge://`) is not possible due to browser security policy — a storage-based fallback is used
- LM Studio / Ollama require CORS headers enabled on the local server

---

## 💬 Feedback & Contributions

Issues and PRs welcome at: https://github.com/jojohacker1709/webtester-pro

---

*Built for authorized security testing only. Always obtain proper permission before testing any system.*
