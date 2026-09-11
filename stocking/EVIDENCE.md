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
| Raw hook URLs removed | `git ls-files` scan for Zapier catch-hook URLs and Make hook URLs (`tools/scan-secrets.mjs`): 0 files (was 17 occurrences across 16 files incl. `lee/domain.json`). Pages resolve by name via `EE.hooks.url(name)`; `build.sh` writes `<tenant>/ee/runtime.js` (gitignored, `git check-ignore` = 0) from `EE_HOOK_<TENANT>_<NAME>`. Build test: `EE_HOOK_NIL_INTAKE` reaches only `nil/ee/runtime.js`; `cgg` gets `{}`; non-https value dropped; quotes escaped. Chromium with a built runtime: `EE.hooks.url('intake') = https://hooks.example.test/nil-intake` on NIL, `null` on LFMA. Unconfigured hook → `ee_hook_missing` + page error state, nothing sent (vm test). |
| Suite | `node --test tests/*.test.mjs` → 41 pass, 0 fail (16 original + 13 stocking + 12 repair). `node tools/stock-domains.mjs --check` → no drift. `python3 tools/verify-foundation.py` → PASS, 17/17 hashes byte-identical. |

Not performed: setting `EE_HOOK_*` env vars on Render (human), any deploy, any DNS, any Foundation edit.

## QA/QC round 2 — 2026-09-11

| finding | repair | evidence |
|---|---|---|
| F1 LFMA form regression / EE API collision | LFMA pages load `/assets/js/tracking.js` locally (byte-identical copy of the DIHAC source, generated); the bootstrap keeps a pre-existing legacy `window.EE` under `EE.legacy`; `lfma/contact.html` calls `EE.legacy.sendToWebhook`; the brief adapter resolves a function endpoint at submit | unit: legacy-before-bootstrap and legacy-after-bootstrap both keep `EE.hooks`/`EE.legacy.sendToWebhook`. Browser: LFMA contact submit → exactly 1 request to the fake order hook, body carries the form, no TypeError, consent evidence event present |
| F2 BTL Rhode Island | `lead_destination:WEBHOOK_URL` (undefined) → `'ee:hook:lead'`; one submit handler, one success path | browser (gate fixture `live`): 1 lead request, `okmsg` shown, 0 alerts, 1 `ee_lead_submit_success`, 0 `ee_lead_submit_error`, no ReferenceError |
| F3 tracking.js overwrote `window.EE` | `tracking.js` registers via `EE.registerLegacy(api)` (or claims `window.EE` only when no bootstrap exists); `window.EE` is non-writable and frozen | browser: DIHAC contact (deferred tracking.js) keeps `EE.hooks.url`, `EE.safety.consent.record`, gains `EE.legacy.sendToWebhook` |
| F4 hook secret material in tracked tree | the only remaining match was the literal pattern text in this evidence file; reworded. `tools/scan-secrets.mjs` (9 patterns, `git ls-files`) added and wired into the suite | `SECRET SCAN: clean (1024 tracked files, 9 patterns)` |
| F5 suite vs committed tree | `package.json` defines the complete suite (`npm test` = tests + campaign-system tests); round-2 suite run in a clean `git worktree` of the committed HEAD (see commit message) | 71 pass / 0 fail / 0 skipped on the working tree; clean-tree run recorded below |
| F6 gate controls real sends | `EE.hooks.url()` runs the outbound gate; unknown kill-switch / suppression truth fails closed; every form records consent evidence first; legacy beacons gated | unit: 3 tests; browser: NIL hook null before consent, resolves after, null after trip, `post` rejects `OutboundBlocked`, 1 captured request total |
| F7 reserved context immutable | reserved keys stripped from props (`ee_rejected_props`), `EE.context` frozen snapshot, `window.EE` non-writable + deep-frozen | unit + browser: forged `tenant_id`/`session_id`/`consent_state` rejected; `window.EE = {}` and `EE.hooks.url = ...` have no effect |
| F10 runtime identity | `EE_RUNTIME.tenant_id` must equal `EE_SITE.tenant_id`; missing/invalid `EE_SITE` ⇒ `__stocked:false`, nothing emitted; `kill_switch` must be exactly ON/OFF | unit + browser fixtures: no-site page emits nothing; mismatched runtime → `ee_runtime_mismatch`, url null; kill ON page silent |
| F9 NIL readiness | `deployed_path` axis; NIL = DIVERGED (live site served from marketingapes/nil-site) ⇒ PARTIAL | `stocking/REPORT.md` |

Browser harness: `tests/browser/cdp.mjs` (Chrome DevTools Protocol, no npm deps). Every request is intercepted; `https://hooks.invalid.test` is answered locally (200 + CORS); all other off-origin requests are failed `BlockedByClient`. No real hook was contacted.

## QA/QC round 3 — 2026-09-11 (G1–G4)

| finding | repair | evidence |
|---|---|---|
| G1 LFMA /campaign/ lazy-client lifecycle | `bindLfmaBrief()` returned `getState: client.getState` while `client` was still null → TypeError at bind → "form could not load". Explicit lifecycle (IDLE → SUBMITTING → ACKNOWLEDGED / UNKNOWN); `state()` guards the null client; blocked/missing endpoint is an explicit failure with retry; second submit never sends | unit: bind with a null endpoint does not throw, IDLE, submit → failure path, retry allowed; configured: exactly one send, later submits ignored. Browser (real config): page loads, button usable, blocked path visible, 0 sends, 0 exceptions. Browser (connected spine): 1 send, success shown, repeated clicks/submit events → still 1 |
| G2 LFMA /contact.html | timer-based redirect removed; `idle → sending → sent` state; POST only through the gated hook; redirect only after `res.ok`; `fail()` shows a visible status and re-enables the button | browser: real config → visible failure, 0 sends, no redirect, retry allowed; connected spine → double-click + extra submit event = 1 POST; HTTP 500 → failure + retry → exactly one more POST → redirect to thank-you; kill switch tripped → 0 sends, visible reason |
| G3 bare hook token in `releases/2026-09-09-lfma-receipt.md` | line redacted (no reproduction anywhere). Scanner: bare Make-style token heuristic (32-char lowercase alnum, not pure hex, not in hash context), bare Zapier catch-path fragment, and a SHA-256 digest denylist of the six historically exposed tokens; scans tracked + untracked-unignored files | unit: synthetic bare token flagged, md5/sha/uuid/commit ids not flagged, digest mechanism proven with a synthetic digest; `node tools/scan-secrets.mjs` → clean |
| G4 fail-closed safety contract | gate requires consent store CONNECTED + evidence recorded + suppression source CONNECTED + completed clear check + kill switch exactly OFF + gate live + tenant-matched runtime; `NOT_APPLICABLE` blocks; no exemption added | adversarial unit: 9 consent-store variants × repeated `consent.record()` → blocked; 9 suppression-source variants × page-registered clearing checker → blocked; property/`EE_SITE`/`window.EE` mutation attacks → blocked; all 14 real tenant configs → every hook blocked. Browser: real NIL page, 3× `consent.record()` + clearing checker → still `consent store not connected: MISSING`, 0 requests |

Connected-spine fixtures used for success-path proofs live only in the browser test's temp tree (`/spine/…`): the same page bytes with `consent_store`/`suppression_source` flipped to `VERIFIED` and a clearing checker registered by the test. No real page or manifest was changed to make demos send.

## QA/QC round 4 — 2026-09-11 (H1 authoritative suppression)

**Reproduced on `506a969` before any change:** `EE.safety.suppression.use(fn)` with `fn` returning `{suppressed:false}`, `{}`, `undefined`, `null`, a Promise resolving to `{suppressed:true}`, or a rejected Promise all produced `outbound.allowed() = true` and a resolved hook URL; a suppressing checker replaced by a clearing one flipped to allowed; `hooks.url(name)` with no identity resolved; the rejected Promise also surfaced as an unhandled rejection. Root cause: `check()` treated any page-registered function's return as authoritative and defaulted missing fields to clear (`Object.assign({checked:true, suppressed:false}, r || {})`).

| item | repair | evidence |
|---|---|---|
| authoritative contract | page checker API removed (`use()` throws + `ee_suppression_page_checker_rejected`); clearance only from a completed lookup against `EE_RUNTIME.suppression_endpoint` answering `{checked:true, suppressed:false}` for the identity fingerprint; cached per identity for 10 min; no endpoint ⇒ `BLOCK — authoritative suppression check unavailable` | unit: 13 blocking answer shapes (undefined, null, {}, suppressed:true, checked:false, string/null types, HTTP 500, non-JSON, malformed JSON, rejection, non-Response) + timeout ⇒ all BLOCK, nothing sent |
| page-code bypass | no registration path; `status()`/`check()`/`outbound.check`/`hooks.resolve` frozen; runtime captured once at init (post-load `window.EE_RUNTIME` and `window.fetch` replacement have no effect on a cached suppressed result); `hooks.url(name)` without identity, with a junk identity, or with a different identity never inherits a clearance | unit + browser: fake page checkers (5 shapes) rejected; suppressed result survives 7 replacement attacks; missing identity blocks |
| runtime validation | `EE.outbound.allowed()` denies a missing or mismatched runtime first; a mismatched runtime's endpoint is never called | unit + browser (`f10-mismatch` fixture through `outbound.allowed()` and `outbound.check()`) |
| pages | every form and the legacy tracker resolve through the async `EE.hooks.resolve(name, identity)`; the LFMA brief adapter awaits a Promise-returning endpoint | round-4 static test; G1/G2/F1/F2/F6 browser scenarios re-run on the spine fixtures with the interceptor answering the authoritative endpoint |
| build | `EE_SUPPRESSION_<TENANT>_ENDPOINT` ⇒ `runtime.js` `suppression_endpoint` (https only, else `null`) | build test + browser fixtures |

Connected-spine fixtures (test tree only) now simulate the engine adapter: the built `runtime.js` carries a suppression endpoint under the fake host and the interceptor answers it locally. No page-side clearance exists anywhere.

## QA/QC round 5 — 2026-09-11 (provider isolation; rejected SHA `450fb05`)

**Reproduced on `450fb05` before any change:** `build.sh` wrote every `EE_HOOK_<TENANT>_<NAME>` value verbatim into the
publicly served `<tenant>/ee/runtime.js` as `window.EE_RUNTIME.hooks`. Any page script (or anyone loading
`/ee/runtime.js`) could read the provider webhook URL and `fetch()` it directly, bypassing the kill switch, production
gate, consent and suppression gates entirely. The page-side gate guarded `EE.hooks.url()`, not the destination. Round-4
claims that hook URLs were "safely injected" into `runtime.js` were wrong and are withdrawn.

| item | repair | evidence |
|---|---|---|
| contract | page → named action → Evolution Engine governed server-side adapter → provider. `runtime.js` carries `{tenant_id, actions:[names], actions_endpoint, suppression_endpoint}` only. The only URL `EE.hooks.*` can produce is `<actions_endpoint>/<TENANT>/<action>` (names validated `[a-z0-9_]{1,40}`, must be listed; endpoint https only, slashes normalised). The engine is the enforcement boundary; the browser is not trusted for it | round-5 unit (9 tests) + round-5 browser (4 tests); all prior suites re-run on the new shape |
| build | `build.sh` reads `EE_ACTIONS_<TENANT>_ENDPOINT` / `EE_ACTIONS_<TENANT>_NAMES` / `EE_SUPPRESSION_<TENANT>_ENDPOINT`; a legacy `EE_HOOK_*` value contributes its name only and is discarded with a warning to stderr | build test: with a provider URL in env, no served file (find -type f over the built tree) contains it; NIL/LFMA/CGG runtime shapes asserted |
| page holds nothing | browser: `/ee/runtime.js` text, page HTML, live DOM, `JSON.stringify(window.EE_RUNTIME)` and every string reachable from `window` (own property walk incl. function sources) contain no provider host, on NIL, LFMA, DIHAC and BTL pages, before and after full clearance | R5 browser tests 1–2; the fake provider host is never requested in any browser test (harness assertion) |
| direct fetch impossible | there is no provider URL to fetch; a runtime carrying the rejected `hooks:{}` shape is ignored; `resolve`/`post` yield only the tenant's engine route; the engine receives the governed envelope (identity, consent evidence, suppression status, payload, `X-EE-Tenant`/`X-EE-Action`, `credentials:'omit'`) | unit: envelope asserted field by field; browser: 1 request to `…/actions/NIL/intake`, 0 to the provider |
| gates in front of the route | tenant mismatch, no runtime, kill switch ON/UNKNOWN, preview, consent store not connected, no evidence, suppression source not connected, no suppression endpoint, suppressed:true, malformed lookup, no/junk identity, malformed or unlisted action name, non-https/missing actions endpoint ⇒ `post()` rejects, nothing sent | unit (round 5 gate matrix) + browser (mismatch, kill, preview on real BTL, real NIL config, no evidence, suppressed, no identity, 7 malformed names) |
| fetch stub after load | `window.fetch` replaced by a clearing stub after load: stub never called, authoritative endpoint still asked, suppressed identity stays blocked, send still targets the engine route. Documented as defense in depth only | unit + browser |
| pages | nil, btl (index, RI, 404), dihac contact + tracking.js, lfma contact/engine, ma order ⇒ `EE.hooks.post(action, …)`; lfma campaign keeps `EE.hooks.resolve('order')` feeding the intake client, whose `validateEndpoint` now accepts only `…/<TENANT>/order` and rejects provider hosts; tracking.js sends no beacon to any URL | round-5 static test; G1/G2/F1/F2/F6/H1 browser scenarios re-run |
| docs | README §5, DOMAINS.md, this file and the reconciliation no longer claim hook URLs are injected into `runtime.js` | round-5 static test greps tracked html/js/mjs/md (tests excluded) |

What this round does **not** claim: no engine actions endpoint exists yet, so on every real tenant `EE.hooks.post()`
answers `HookMissing: governed actions endpoint unavailable` (after the consent-store block on the real manifests).
The browser suite simulates the engine (`https://engine.invalid.test/actions/*` answered locally by the CDP
interceptor); the real adapter — routing, provider forwarding, server-side re-validation — is engine work.
