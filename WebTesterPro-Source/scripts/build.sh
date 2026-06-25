#!/usr/bin/env bash
# WebTester Pro — Build Script
# Author: Jojin John | Version: 1.0.0
# Usage: bash scripts/build.sh [firefox|chrome|all|source]
# Output: release/

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE="$ROOT/release"
VERSION="1.0.0"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; exit 1; }

echo ""
echo "  WebTester Pro v${VERSION} — Build System"
echo "  Author: Jojin John"
echo "  ─────────────────────────────────────"
echo ""

mkdir -p "$RELEASE"

TARGET="${1:-all}"

# ── Shared excludes ─────────────────────────────────────────────────────
EXCLUDES=(
  "*.DS_Store"
  "*/.git/*"
  "*/release/*"
  "*/builds/*"
  "*/.gitignore"
  "*/node_modules/*"
  "*/*.xpi"
  "*/scripts/"
)

zip_excludes() {
  local args=()
  for ex in "${EXCLUDES[@]}"; do
    args+=(--exclude "$ex")
  done
  echo "${args[@]}"
}

# ── Firefox build (MV2) ──────────────────────────────────────────────────
build_firefox() {
  echo "Building Firefox (MV2)..."
  local OUT="$RELEASE/WebTesterPro-Firefox.zip"
  local XPI="$RELEASE/WebTesterPro.xpi"

  rm -f "$OUT" "$XPI"

  cd "$ROOT"
  zip -r "$OUT" \
    css/ js/ pages/ data/ icons/ \
    popup.html manifest.json \
    README.md CHANGELOG.md RELEASE_NOTES.md \
    $(zip_excludes) \
    --exclude "manifest-chrome.json" \
    --exclude "scripts/" \
    -q

  cp "$OUT" "$XPI"
  ok "Firefox: $OUT  ($(du -h "$OUT" | cut -f1))"
  ok "XPI:     $XPI"
}

# ── Chrome / Edge / Brave build (MV3) ───────────────────────────────────
build_chrome() {
  echo "Building Chrome/Edge/Brave (MV3)..."
  local TMP="$RELEASE/.chrome_tmp"
  local OUT="$RELEASE/WebTesterPro-Chrome.zip"

  rm -rf "$TMP" "$OUT"
  cp -r "$ROOT" "$TMP"

  # Swap in the MV3 manifest
  cp "$TMP/manifest-chrome.json" "$TMP/manifest.json"
  rm -f "$TMP/manifest-chrome.json"

  cd "$TMP"
  zip -r "$OUT" \
    css/ js/ pages/ data/ icons/ \
    popup.html manifest.json \
    README.md CHANGELOG.md RELEASE_NOTES.md \
    $(zip_excludes) \
    --exclude "scripts/" \
    -q

  rm -rf "$TMP"
  ok "Chrome:  $OUT  ($(du -h "$OUT" | cut -f1))"
}

# ── Source archive ───────────────────────────────────────────────────────
build_source() {
  echo "Building source archive..."
  local OUT="$RELEASE/WebTesterPro-Source.zip"

  rm -f "$OUT"
  cd "$ROOT"
  zip -r "$OUT" \
    css/ js/ pages/ data/ icons/ scripts/ \
    popup.html manifest.json manifest-chrome.json \
    README.md CHANGELOG.md RELEASE_NOTES.md \
    $(zip_excludes) \
    -q

  ok "Source:  $OUT  ($(du -h "$OUT" | cut -f1))"
}

# ── Validate a built zip ─────────────────────────────────────────────────
validate_zip() {
  local zipfile="$1"
  local label="$2"
  echo ""
  echo "  Validating $label..."

  # Check zip is valid
  unzip -t "$zipfile" > /dev/null 2>&1 || err "ZIP is corrupt: $zipfile"

  # Check manifest exists inside
  if unzip -l "$zipfile" | grep -q "manifest.json"; then
    ok "manifest.json present"
  else
    err "manifest.json MISSING from $zipfile"
  fi

  # Count files
  local count
  count=$(unzip -l "$zipfile" | grep -c "\.js\|\.json\|\.html\|\.css\|\.png")
  ok "$count key files inside"
}

# ── Run ──────────────────────────────────────────────────────────────────
case "$TARGET" in
  firefox) build_firefox ;;
  chrome)  build_chrome  ;;
  source)  build_source  ;;
  all)
    build_firefox
    build_chrome
    build_source
    echo ""
    echo "  ── Validation ──"
    validate_zip "$RELEASE/WebTesterPro-Firefox.zip" "Firefox build"
    validate_zip "$RELEASE/WebTesterPro-Chrome.zip"  "Chrome build"
    validate_zip "$RELEASE/WebTesterPro-Source.zip"  "Source archive"
    echo ""
    echo "  ── Release artifacts ──"
    ls -lh "$RELEASE/"
    ;;
  *) err "Unknown target: $TARGET. Use: firefox|chrome|source|all" ;;
esac

echo ""
ok "Done."
