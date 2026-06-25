#!/usr/bin/env python3
# WebTester Pro — Validation Script
# Author: Jojin John | Version: 1.0.0
# Usage: python3 scripts/validate.py [--zip path/to/zip]

import sys, os, json, re, subprocess, zipfile, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS = FAIL = 0

def chk(label, cond, note=''):
    global PASS, FAIL
    sym = '✓' if cond else '✗'
    suffix = f'  ({note})' if note and not cond else ''
    print(f"  {sym} {label}{suffix}")
    if cond: PASS += 1
    else:    FAIL += 1

def js_syntax(path):
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    return r.returncode == 0, r.stderr.strip()[:100]

print("\n  WebTester Pro — Production Validation")
print("  =" * 22)

# ── 1. JS Syntax ────────────────────────────────────────────────────────
print("\n── JS Syntax ──")
for f in ['compat.js', 'background.js', 'utils.js', 'payloads.js', 'popup.js', 'workspace.js']:
    ok, err = js_syntax(os.path.join(ROOT, 'js', f))
    chk(f, ok, err)

# ── 2. JSON data files ───────────────────────────────────────────────────
print("\n── Data Files ──")
data_dir = os.path.join(ROOT, 'data')
total = 0
for fn in sorted(os.listdir(data_dir)):
    try:
        d = json.load(open(os.path.join(data_dir, fn)))
        bad = [i for i, p in enumerate(d)
               if not all(k in p for k in ['name', 'category', 'payload'])]
        total += len(d)
        chk(f"{fn} ({len(d)})", not bad, f"bad entries: {bad}")
    except Exception as e:
        chk(fn, False, str(e))
print(f"  Total: {total} payloads")

# ── 3. Manifests ─────────────────────────────────────────────────────────
print("\n── Manifests ──")
for mf, mv in [('manifest.json', 2), ('manifest-chrome.json', 3)]:
    try:
        m = json.load(open(os.path.join(ROOT, mf)))
        chk(f"{mf}: version={m['manifest_version']}", m['manifest_version'] == mv)
        chk(f"{mf}: author=Jojin John", m.get('author') == 'Jojin John')
        chk(f"{mf}: version=1.0.0", m.get('version') == '1.0.0')
    except Exception as e:
        chk(mf, False, str(e))

# ── 4. Required files ─────────────────────────────────────────────────────
print("\n── File Existence ──")
required = [
    'manifest.json', 'manifest-chrome.json', 'popup.html',
    'README.md', 'CHANGELOG.md', 'RELEASE_NOTES.md',
    'js/compat.js', 'js/background.js', 'js/utils.js',
    'js/payloads.js', 'js/popup.js', 'js/workspace.js',
    'pages/workspace.html', 'pages/sidebar.html',
    'css/main.css', 'css/popup.css',
    'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
    'scripts/build.sh', 'scripts/validate.py',
]
for f in required:
    chk(f, os.path.isfile(os.path.join(ROOT, f)))

# ── 5. compat.js loaded first ─────────────────────────────────────────────
print("\n── Script Load Order ──")
for hf in ['popup.html', 'pages/workspace.html', 'pages/sidebar.html']:
    html = open(os.path.join(ROOT, hf)).read()
    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
    first = scripts[0] if scripts else 'NONE'
    chk(f"{hf}: compat.js first", 'compat.js' in first, f"got '{first}'")

# ── 6. No raw browser. refs outside background/compat ────────────────────
print("\n── browserAPI Usage ──")
for jf in ['utils.js', 'payloads.js', 'popup.js', 'workspace.js']:
    src = open(os.path.join(ROOT, 'js', jf)).read()
    hits = len(re.findall(r'(?<!\w)browser\.(?!_)', src))
    chk(f"{jf}: no raw browser.*", hits == 0, f"{hits} found")

# ── 7. DOM cross-reference ─────────────────────────────────────────────────
print("\n── DOM Cross-Reference ──")
for html_f, js_f in [('popup.html', 'js/popup.js'), ('pages/workspace.html', 'js/workspace.js')]:
    html = open(os.path.join(ROOT, html_f)).read()
    js   = open(os.path.join(ROOT, js_f)).read()
    ids  = set(re.findall(r'id=["\']([^"\']+)["\']', html))
    used = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js))
    miss = used - ids
    chk(f"{js_f}: all IDs exist", not miss, str(miss))

# ── 8. Security ───────────────────────────────────────────────────────────
print("\n── Security ──")
for jf in ['compat.js', 'background.js', 'utils.js', 'payloads.js', 'popup.js', 'workspace.js']:
    src = open(os.path.join(ROOT, 'js', jf)).read()
    # compat.js has new Function() intentionally for scripting API wrapper - that's OK
    bad_eval = bool(re.search(r'\beval\s*\(', src))
    chk(f"No eval() in {jf}", not bad_eval)

chk("CHECKLISTS before IIFE",
    open(os.path.join(ROOT, 'js/workspace.js')).read().index('const CHECKLISTS') <
    open(os.path.join(ROOT, 'js/workspace.js')).read().index('(async () => {')
)

# ── 9. ZIP validation (if --zip passed) ──────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('--zip', help='Path to ZIP file to validate')
args, _ = parser.parse_known_args()

if args.zip:
    print(f"\n── ZIP Validation: {os.path.basename(args.zip)} ──")
    try:
        with zipfile.ZipFile(args.zip) as z:
            names = z.namelist()
            chk("ZIP opens without error", True)
            chk("manifest.json present", any('manifest.json' in n and 'chrome' not in n for n in names))
            chk("js/compat.js present", any('compat.js' in n for n in names))
            chk("js/workspace.js present", any('workspace.js' in n for n in names))
            chk("data/xss.json present", any('xss.json' in n for n in names))
            chk("icons/icon48.png present", any('icon48.png' in n for n in names))
            js_count = sum(1 for n in names if n.endswith('.js'))
            json_count = sum(1 for n in names if n.endswith('.json'))
            html_count = sum(1 for n in names if n.endswith('.html'))
            print(f"  JS files: {js_count}  JSON files: {json_count}  HTML files: {html_count}")
            chk("No .git files", not any('.git' in n for n in names))
            chk("No node_modules", not any('node_modules' in n for n in names))
    except Exception as e:
        chk("ZIP valid", False, str(e))

# ── Report ────────────────────────────────────────────────────────────────
print(f"\n  {'='*42}")
print(f"  PASS: {PASS}   FAIL: {FAIL}")
score = int(PASS / (PASS + FAIL) * 100) if (PASS + FAIL) else 0
print(f"  SCORE: {score}/100")
print(f"  {'='*42}\n")
sys.exit(0 if FAIL == 0 else 1)
