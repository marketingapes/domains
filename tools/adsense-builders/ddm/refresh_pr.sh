#!/usr/bin/env bash
# One-command DDM deal refresh: pull CJ -> rebuild feed -> build site -> release checks -> open a PR.
# Never merges. Run from anywhere; works in a temporary worktree off origin/main.
# Needs: CJ_API_TOKEN (or RENDER_API_KEY + RENDER_ENV_GROUP_ID), git push access, gh CLI.
# Options: --min-hours N (default 12)  --draft  --no-pr (build and test only)
set -euo pipefail
MIN_HOURS=12; DRAFT=""; NOPR=""
while [ $# -gt 0 ]; do case "$1" in
  --min-hours) MIN_HOURS="$2"; shift 2;;
  --draft) DRAFT="--draft"; shift;;
  --no-pr) NOPR=1; shift;;
  *) echo "unknown option $1"; exit 2;; esac; done
REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
STAMP="$(TZ=America/Los_Angeles date +%Y%m%d-%H%M)"
BRANCH="ddm/deal-refresh-$STAMP"
WT="$(mktemp -d /tmp/ddm-refresh-XXXX)"
git -C "$REPO" fetch -q origin main
git -C "$REPO" worktree add -q -b "$BRANCH" "$WT" origin/main
trap 'git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
cd "$WT"
B=tools/adsense-builders/ddm
PULL="$WT/.cj_pull.json"
python3 -B $B/cj_pull.py "$PULL"
python3 -B $B/refresh_deals.py "$PULL" --min-hours "$MIN_HOURS" | tee "$WT/.refresh.log"
rm -f "$PULL"
python3 -B $B/build.py >/dev/null
if git diff --quiet; then echo "No deal changes; nothing to do."; exit 0; fi
git add -A ddm $B/deals_feed.json
git -c user.name="${GIT_AUTHOR_NAME:-DDM deal refresh}" commit -qm "DDM: refresh live deals ($STAMP PT)"
bash tools/check-release.sh
[ -n "$NOPR" ] && { echo "Built and tested on $BRANCH (not pushed)."; trap - EXIT; echo "Worktree: $WT"; exit 0; }
git push -q -u origin "$BRANCH"
COUNT="$(python3 -c "import json;print(json.load(open('ddm/data/deals.json'))['count'])")"
BODY="Automated deal refresh from CJ link-search (property 101511733).

- Live deals: $COUNT
- Deals ending within ${MIN_HOURS}h or not started yet are left out.
- Release checks: PASS

\`\`\`
$(cat "$WT/.refresh.log")
\`\`\`

Merging deploys discountdealme.com."
gh pr create $DRAFT --repo marketingapes/domains --base main --head "$BRANCH" --title "DDM: refresh live deals ($STAMP PT, $COUNT deals)" --body "$BODY"
