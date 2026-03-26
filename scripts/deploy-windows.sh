#!/usr/bin/env bash
# Deploy BatchContent to Windows desktop via WSL2
# Usage:
#   ./scripts/deploy-windows.sh        — fast deploy (app.asar + python scripts only)
#   ./scripts/deploy-windows.sh --full  — full deploy (entire win-unpacked folder)

set -euo pipefail

WIN_DEST="/mnt/c/Users/Groot/Desktop/BatchContent"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

FULL=false
if [[ "${1:-}" == "--full" ]]; then
  FULL=true
fi

echo "▸ Building app..."
npx electron-vite build

echo "▸ Packing app.asar..."
ASAR_STAGE=$(mktemp -d)
trap 'rm -rf "$ASAR_STAGE"' EXIT
mkdir -p "$ASAR_STAGE/out/main" "$ASAR_STAGE/out/preload" "$ASAR_STAGE/out/renderer/assets"
cp out/main/index.js "$ASAR_STAGE/out/main/"
cp out/preload/index.js "$ASAR_STAGE/out/preload/"
cp out/renderer/index.html "$ASAR_STAGE/out/renderer/"
cp out/renderer/assets/* "$ASAR_STAGE/out/renderer/assets/"
cp package.json "$ASAR_STAGE/"
npx asar pack "$ASAR_STAGE" dist/win-unpacked/resources/app.asar

if $FULL; then
  echo "▸ Full deploy — nuking and replacing entire folder..."
  echo "  (This copies ~860MB across WSL2 and will take a few minutes)"
  rm -rf "$WIN_DEST"
  cp -r dist/win-unpacked "$WIN_DEST"
else
  # Fast deploy — only copy the files that actually change
  if [[ ! -f "$WIN_DEST/BatchContent.exe" ]]; then
    echo "✗ No existing install found at $WIN_DEST"
    echo "  Run with --full for first-time deploy: ./scripts/deploy-windows.sh --full"
    exit 1
  fi

  echo "▸ Fast deploy — updating app.asar + python scripts only..."
  cp dist/win-unpacked/resources/app.asar "$WIN_DEST/resources/app.asar"
  cp python/download.py python/face_detect.py python/transcribe.py python/requirements.txt \
     "$WIN_DEST/resources/python/"
fi

sync
echo "✔ Deployed to $WIN_DEST"
