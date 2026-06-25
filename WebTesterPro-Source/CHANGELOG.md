# Changelog

All notable changes to WebTester Pro are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2024-06-18

### 🎉 Initial Release

**Author:** Jojin John  
**Browsers:** Firefox · Chrome · Edge · Brave  
**Manifests:** MV2 (Firefox) · MV3 (Chrome/Edge/Brave)

---

### Added

#### Core Extension
- Cross-browser compatibility layer (`js/compat.js`) wrapping `browser` (Firefox) and `chrome` (Chromium) APIs into a unified `browserAPI` object
- Single codebase targeting Firefox MV2 and Chrome/Edge/Brave MV3
- Dual manifests: `manifest.json` (Firefox MV2) and `manifest-chrome.json` (Chrome MV3)
- Firefox sidebar panel (`pages/sidebar.html`) via `sidebar_action`
- Context menu integration: Copy XSS/SQLi/SSRF payloads, open Encoder/JWT, AI analysis
- MV3-compatible clipboard: uses `chrome.scripting.executeScript` on Chrome, `browser.tabs.executeScript` on Firefox, with storage-based fallback for restricted pages

#### Payload Browser
- 274 curated security payloads across 20 vulnerability categories:
  - XSS (25) · SQL Injection (25) · SSRF (25) · LFI (25) · XXE (15)
  - SSTI (20) · JWT (15) · CORS (12) · GraphQL (12) · IDOR (12)
  - OAuth (12) · API Testing (12) · Request Smuggling (8) · Cache Poisoning (9)
  - File Upload (12) · Open Redirect (10) · Prototype Pollution (9)
  - Host Header (8) · CRLF Injection (8) · Custom (user-defined)
- Real-time search across name, payload, description, tags, category
- Category filter with per-category payload counts
- Favorites persistence via `browser.storage.local`
- Recently used tracking (last 20)
- Custom payload CRUD: add, edit, delete
- Import / Export payload packs (JSON)
- Paginated display (30 per page)

#### Encoder / Decoder
- URL encode / decode
- Base64 encode / decode
- HTML entity encode / decode
- Unicode escape encode / decode
- Hex encode / decode
- Fully offline — no network requests

#### JWT Toolkit
- JWT decode (header, payload, signature)
- Algorithm detection (flags `alg:none`, embedded JWK, jku)
- Expiry validation with visual indicator
- Claims viewer (sub, iss, aud, iat, exp)
- Security warnings for known vulnerable configurations

#### AI Assistant
- Multi-provider support: OpenRouter, Groq, Ollama, LM Studio, Custom
- Capabilities: explain payloads, analyze HTTP requests/responses, summarize findings, suggest next steps, generate report drafts
- Graceful failure when no API key configured
- Quick-action buttons for common security questions
- Conversation history (last 20 messages)
- Configurable via Settings or in-module config modal

#### Notes Manager
- Markdown editor with live preview
- Per-target note organization
- Tag support
- Search across title, content, tags
- Import / Export notes as `.md` files
- All data persisted locally

#### Checklist Manager
- 11 security testing checklists: XSS, SQLi, SSRF, XXE, LFI, JWT, OAuth, CORS, IDOR, GraphQL, API Security
- Progress tracking with percentage display
- Persistent state across sessions
- Reset functionality

#### Report Generator
- Templates for HackerOne, Bugcrowd, Intigriti, YesWeHack
- Fields: title, severity, target, summary, PoC steps, impact, CVSS, CWE, recommendation
- One-click Markdown export

#### Regex Library
- 20 searchable patterns: emails, URLs, IPs, AWS keys, JWT tokens, API keys, secrets, GitHub/Slack/Google tokens, S3 URLs, UUIDs, internal IPs, base64 blobs
- Categorized: Detection, Secrets, Tokens, PII, Cloud
- One-click copy

#### Recon Toolkit
- Command references for 14 tools: Amass, Subfinder, Assetfinder, Findomain, Gau, Waybackurls, Katana, Hakrawler, LinkFinder, SecretFinder, Httpx, Nuclei, FFuf, Dalfox
- Searchable by tool name, description, type

#### Wordlist Manager
- Upload `.txt`/`.lst` wordlists
- Search within loaded wordlist
- Display with truncation (1000 entries shown, all exported)
- Persist wordlists in local storage

#### UI / UX
- Dark theme (default): `#050505` background, `#9c27ff` accent
- Light theme toggle
- Responsive layout with sidebar navigation
- Toast notifications
- Keyboard shortcut: Enter to send AI message (Shift+Enter for newline)

#### Security
- No `eval()` anywhere in codebase
- CSP: `script-src 'self'; object-src 'self'`
- All user content sanitized with `Utils.escapeHtml()` before rendering
- AV-safe payload storage: dangerous strings stored as Unicode escape sequences in JSON

---

### Technical

- **Manifest:** MV2 (Firefox) / MV3 (Chrome/Edge/Brave)
- **Runtime:** Pure JavaScript, no frameworks, no build step required
- **Storage:** `browser.storage.local` — all data stays on device
- **Network:** Only AI API calls (user-configured endpoints)
- **Permissions:** `storage`, `contextMenus`, `activeTab`, `tabs`, `clipboardWrite`, `clipboardRead`, `notifications` + `scripting` (Chrome MV3)

---

## [Unreleased]

### Planned
- [ ] Burp Suite collaborator integration
- [ ] Custom checklist creation
- [ ] Note export as PDF
- [ ] Payload tagging UI
- [ ] Dark/light theme per-module override
- [ ] Sync across devices via Firefox Sync / Chrome Sync
