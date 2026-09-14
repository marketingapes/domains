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
  test -s "$dst"
}

while IFS= read -r path; do
  case "$path" in
    ''|'#'*) continue ;;
  esac
  fetch_one "$path"
done < "$MANIFEST"

# The Drive archive contains a placeholder key; the live SiteGround copy must not.
if grep -q 'REPLACE_WITH_YOUR_GOOGLE_API_KEY' "$OUT/js/calendar-live.js"; then
  echo 'ERROR: live calendar JavaScript still contains the placeholder API key.' >&2
  exit 31
fi

# Keep the public hostname/canonical intact during the host migration.
grep -q 'https://rbvvolleyball.tonedntasty.com/' "$OUT/index.html"
grep -q 'GTM-WTQSXG' "$OUT/index.html"
grep -q 'GTM-WTQSXG' "$OUT/schedule.html"

# Preserve a deploy-time evidence manifest for zero-change QA.
(
  cd "$OUT"
  find . -type f -print0 | sort -z | xargs -0 sha256sum > .migration-sha256.txt
)

echo "RBV snapshot complete: $(find "$OUT" -type f | wc -l | tr -d ' ') files"
