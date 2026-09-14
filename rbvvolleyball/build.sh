#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="rbvvolleyball.tonedntasty.com"
ORIGIN_IP="${RBV_SOURCE_ORIGIN_IP:-35.212.31.103}"
MANIFEST="$HERE/source-manifest.txt"
OUT="$HERE/dist"

rm -rf "$OUT"
mkdir -p "$OUT"

fetch_one() {
  local path="$1"
  local dst="$OUT/$path"
  mkdir -p "$(dirname "$dst")"
  echo "RBV snapshot: $path"
  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry 3 \
    --retry-all-errors \
    --connect-timeout 15 \
    --max-time 60 \
    --resolve "${HOST}:443:${ORIGIN_IP}" \
    "https://${HOST}/${path}" \
    --output "$dst"
  if [ ! -s "$dst" ]; then
    echo "ERROR: fetched empty file: $path" >&2
    exit 21
  fi
}

while IFS= read -r path; do
  case "$path" in
    ''|'#'*) continue ;;
  esac
  fetch_one "$path"
done < "$MANIFEST"

# Zero-change migration rule: staging mirrors what is live. These checks are
# evidence/warnings only. We repair integrations only after the mirror is proven.
if grep -q 'REPLACE_WITH_YOUR_GOOGLE_API_KEY' "$OUT/js/calendar-live.js"; then
  echo 'WARN: live calendar-live.js contains the placeholder API key; preserving current live behavior for the mirror.'
else
  echo 'QA: live calendar key is configured (value not printed).'
fi

if grep -q 'https://rbvvolleyball.tonedntasty.com/' "$OUT/index.html"; then
  echo 'QA: production hostname found in index.html.'
else
  echo 'WARN: production hostname string not found in index.html.'
fi

if grep -q 'GTM-WTQSXG' "$OUT/index.html"; then
  echo 'QA: GTM found in index.html.'
else
  echo 'WARN: GTM not found in index.html.'
fi

if grep -q 'GTM-WTQSXG' "$OUT/schedule.html"; then
  echo 'QA: GTM found in schedule.html.'
else
  echo 'WARN: GTM not found in schedule.html.'
fi

# Preserve a deploy-time evidence manifest for zero-change QA.
(
  cd "$OUT"
  find . -type f -print0 | sort -z | xargs -0 sha256sum > .migration-sha256.txt
)

echo "RBV snapshot complete: $(find "$OUT" -type f | wc -l | tr -d ' ') files"
