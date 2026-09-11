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

## QA/QC repair — 2026-09-11

| repair | evidence |
|---|---|
| `tools/verify-foundation.py` fails CLOSED without `jsonschema` | test injects a `jsonschema.py` that raises ImportError via `PYTHONPATH`: exit code non-zero, output `FOUNDATION VERIFY: FAIL`, no `SKIPPED`. With jsonschema present: `schema conformance: 14/14`, PASS. |
| NIL hardcoded campaign removed | `nil/index.html` has no `CAMPAIGN=` constant; `campaign_id` is stamped from a lazy resolver (`EE.context.campaign_id` → `?ee_campaign=` → `null`). Resolver executed in a vm: `null` by default, `null` for a platform `?campaign_id=`, value only for `?ee_campaign=`. Headless Chromium: `ee_page_view:NIL:null`, `ee_form_view:NIL:null`, `ee_page_context:NIL` with no campaign key. |
| NIL GTM wiring | Foundation: NIL owns `GTM-NKLD8KST` (VERIFIED); `GTM-PHC7459M` is BTL's. Page corrected (script + noscript). Chromium loaded scripts: `["GTM-NKLD8KST"]`. Pixel `1464576608376747` kept — Meta Graph: name "Nearest Injury Lawyers". |
| LFMA GA4 wiring | GA4 Admin: property 530695424 "Law Firm Marketing Apes" → stream `G-RQ8EWFTVSW`; property 529255120 "doihaveaclaim.ai" → `G-9HSY1GEXZ6`. LFMA pages (6 files, 12 occurrences) swapped to `G-RQ8EWFTVSW`. Chromium loaded: `["GTM-NWVHNTVK","G-RQ8EWFTVSW"]`. |
| Raw hook URLs removed | `git ls-files` scan for `hooks.zapier.com/hooks/catch/`, `hook.*.make.com/`: 0 files (was 17 occurrences across 16 files incl. `lee/domain.json`). Pages resolve by name via `EE.hooks.url(name)`; `build.sh` writes `<tenant>/ee/runtime.js` (gitignored, `git check-ignore` = 0) from `EE_HOOK_<TENANT>_<NAME>`. Build test: `EE_HOOK_NIL_INTAKE` reaches only `nil/ee/runtime.js`; `cgg` gets `{}`; non-https value dropped; quotes escaped. Chromium with a built runtime: `EE.hooks.url('intake') = https://hooks.example.test/nil-intake` on NIL, `null` on LFMA. Unconfigured hook → `ee_hook_missing` + page error state, nothing sent (vm test). |
| Suite | `node --test tests/*.test.mjs` → 41 pass, 0 fail (16 original + 13 stocking + 12 repair). `node tools/stock-domains.mjs --check` → no drift. `python3 tools/verify-foundation.py` → PASS, 17/17 hashes byte-identical. |

Not performed: setting `EE_HOOK_*` env vars on Render (human), any deploy, any DNS, any Foundation edit.
