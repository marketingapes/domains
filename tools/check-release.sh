#!/usr/bin/env bash
# Local and CI entry point. No provider calls, credentials or deployment.
set -euo pipefail
cd "$(dirname "$0")/.."

# The existing wrapper permits a missing jsonschema installation. This release
# entry point requires it so a skipped schema check cannot produce a green run.
python3 -c 'import jsonschema' || {
  echo 'Install the release dependency: python3 -m pip install -r requirements-ci.txt' >&2
  exit 1
}

echo "Release validation: $(git rev-parse HEAD)"
sh build.sh
python3 tools/verify-foundation.py
node --test tests/*.test.mjs campaign-system/test/*.test.mjs

# Tests and asset decoding must not rewrite tracked source files. Untracked
# decoded assets are expected and are intentionally not treated as source drift.
git diff --exit-code
echo 'DOMAIN RELEASE CHECKS: PASS'
