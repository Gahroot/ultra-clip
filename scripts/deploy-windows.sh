#!/usr/bin/env bash
# Deploy BatchContent to Windows desktop via WSL2
#
# Usage:
#   bash scripts/deploy-windows.sh           — fast deploy (asar + python + bin check)
#   bash scripts/deploy-windows.sh --full    — full first-time deploy (entire win-unpacked)

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
WIN_DEST="/mnt/c/Users/Groot/Desktop/BatchContent"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

FULL=false
[[ "${1:-}" == "--full" ]] && FULL=true

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step()  { echo ""; echo "▸ $*"; }
ok()    { echo "  ✔ $*"; }
fail()  { echo ""; echo "  ✗ $*" >&2; exit 1; }

copy_dir() {
  local src="$1" dst="$2" label="$3"
  local size
  size=$(du -sh "$src" 2>/dev/null | cut -f1)
  echo "  copying $label/ ($size)..."
  cp -r "$src" "$dst"
  ok "$label/"
}

# ---------------------------------------------------------------------------
# 1. Build
# ---------------------------------------------------------------------------
step "Building app (electron-vite)..."
npx electron-vite build
ok "Build complete"

# ---------------------------------------------------------------------------
# 2. Pack app.asar
# ---------------------------------------------------------------------------
step "Packing app.asar..."
ASAR_STAGE=$(mktemp -d)
trap 'rm -rf "$ASAR_STAGE"' EXIT

mkdir -p "$ASAR_STAGE/out/main" "$ASAR_STAGE/out/preload" "$ASAR_STAGE/out/renderer/assets"
cp out/main/*.js             "$ASAR_STAGE/out/main/"
cp out/preload/index.js      "$ASAR_STAGE/out/preload/"
cp out/renderer/index.html   "$ASAR_STAGE/out/renderer/"
cp out/renderer/assets/*     "$ASAR_STAGE/out/renderer/assets/"
cp package.json              "$ASAR_STAGE/"
npx asar pack "$ASAR_STAGE" dist/win-unpacked/resources/app.asar
ok "app.asar packed"

# ---------------------------------------------------------------------------
# 3a. FULL deploy — copy piece-by-piece to avoid one giant cp -r timeout
# ---------------------------------------------------------------------------
if $FULL; then
  step "Full deploy → $WIN_DEST"
  echo "  Removing old install..."
  rm -rf "$WIN_DEST"
  mkdir -p "$WIN_DEST"

  # Top-level files (exe, dlls, paks)
  echo "  copying top-level files..."
  find dist/win-unpacked -maxdepth 1 -type f -exec cp {} "$WIN_DEST/" \;
  ok "top-level files"

  # Each top-level directory separately so no single cp -r carries the whole ~465 MB
  for dir in dist/win-unpacked/*/; do
    name=$(basename "$dir")
    copy_dir "$dir" "$WIN_DEST/$name" "$name"
  done

  sync

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✔ Full deploy complete"
  echo "  Launch: $WIN_DEST\\BatchContent.exe"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ---------------------------------------------------------------------------
# 3b. FAST deploy — asar + python + ensure bin/ is present
# ---------------------------------------------------------------------------
else
  step "Fast deploy → $WIN_DEST"

  if [[ ! -f "$WIN_DEST/BatchContent.exe" ]]; then
    fail "No existing install at $WIN_DEST.\nRun with --full for first-time setup:\n  bash scripts/deploy-windows.sh --full"
  fi

  # app.asar (always)
  echo "  updating app.asar..."
  cp dist/win-unpacked/resources/app.asar "$WIN_DEST/resources/app.asar"
  ok "app.asar"

  # Python scripts (always)
  echo "  updating python scripts..."
  mkdir -p "$WIN_DEST/resources/python"
  cp python/download.py python/face_detect.py python/transcribe.py python/requirements.txt \
     "$WIN_DEST/resources/python/"
  ok "python scripts"

  # FFmpeg binaries — copy if either binary is missing
  if [[ ! -f "$WIN_DEST/resources/bin/ffmpeg.exe" ]] || \
     [[ ! -f "$WIN_DEST/resources/bin/ffprobe.exe" ]]; then
    echo "  resources/bin/ missing or incomplete — copying ffmpeg binaries..."
    mkdir -p "$WIN_DEST/resources/bin"
    cp dist/win-unpacked/resources/bin/ffmpeg.exe \
       dist/win-unpacked/resources/bin/ffprobe.exe \
       "$WIN_DEST/resources/bin/"
    ok "ffmpeg.exe + ffprobe.exe"
  else
    ok "ffmpeg binaries present — skipped"
  fi

  sync

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✔ Fast deploy complete"
  echo "  Launch: $WIN_DEST\\BatchContent.exe"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
