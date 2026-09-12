#!/usr/bin/env bash
# Renders img/products/<slug>.jpg (1200×1500) for every design via headless Chrome.
# Usage: scripts/render-product-images.sh [slug ...]   (no args = all designs)
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME (set CHROME=...)"; exit 1; }
if [ $# -gt 0 ]; then SLUGS="$*"; else SLUGS=$(node -e "const vm=require('vm');console.log(vm.runInNewContext(require('fs').readFileSync('cards.js','utf8')+';CARDS',{}).map(c=>c.slug).join(' '))"); fi
mkdir -p img/products
TMP=$(mktemp -d)
for s in $SLUGS; do
  rm -f "$TMP/$s.png"
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1200,1500 --force-device-scale-factor=1 \
    --virtual-time-budget=6000 --user-data-dir="$TMP/profile" --no-first-run \
    --screenshot="$TMP/$s.png" "file://$PWD/scripts/render.html?slug=$s" >/dev/null 2>&1 &
  PID=$!
  for i in $(seq 1 30); do sleep 1; [ -s "$TMP/$s.png" ] && sleep 1 && break; kill -0 $PID 2>/dev/null || break; done
  kill $PID 2>/dev/null; wait $PID 2>/dev/null || true   # Chrome sometimes lingers after writing the file
  [ -s "$TMP/$s.png" ] || { echo "  $s → FAILED"; continue; }
  sips -s format jpeg -s formatOptions 90 "$TMP/$s.png" --out "img/products/$s.jpg" >/dev/null
  echo "  $s → img/products/$s.jpg"
done
rm -rf "$TMP"
