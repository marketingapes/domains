# Domain stocking v1 — evidence (2026-09-10)

All commands run from the repo root on the feature branch, after generation.

| check | command | result |
|---|---|---|
| Foundation frozen hashes + frozen validator + schema | `python3 tools/verify-foundation.py` | `FOUNDATION VERIFY: PASS` — 17/17 artifacts byte-identical, tenant set EXACT 14/14, schema conformance 14/14 |
| Existing suite + stocking guard | `node --test tests/*.test.mjs` | 29 pass, 0 fail (16 pre-existing + 13 new) |
| Generated outputs in sync with source | `node tools/stock-domains.mjs --check` | `no drift` |
| Site build | `sh build.sh` in a throwaway copy of the 14 folders (inside the test) | every publish path serves `index.html` and `/ee/bootstrap.js`; NIL `*.b64` assets decode |
| Headless Chromium smoke (served over HTTP, `?utm_source=smoke&campaign_id=SMOKE-1`) | `chrome --headless=new --dump-dom` on `cgg/`, `nil/`, `kg/` | CGG: `ee_page_context {tenant_id:CGG, domain_id:crazygolfgame.com, session_id, landing_page_url, campaign_id:SMOKE-1, utm_source:smoke}`, socket present, `EE.__stocked` true. NIL: legacy `ee_page_view`/`ee_form_view` fire unchanged first, then the bootstrap `ee_page_context`. KG: legacy inline `ee_page_context` kept, bootstrap emits `ee_context_update` — no double. No bootstrap console errors. |

What was NOT tested: live Render deploys (feature branch only; autodeploy is on `main`), DNS, any provider capability.
