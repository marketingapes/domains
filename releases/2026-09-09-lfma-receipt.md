# Release report — LFMA brief receipt v1.1 + all-domain inventory

**2026-09-09 · Claude (builder seat) · unattended session · target: Sept 9 launch review**

Scope executed: `all-domain-launch-handoff` v1.1. No ads started, no budgets changed, no
credits bought, no billable infrastructure created, no card charged, no blast sent, no
customer call or text enabled, no DNS/email/security change.

---

## 1. What shipped (LIVE-VERIFIED)

`lawfirmmarketingapes.com/campaign/` — the three defects ChatGPT found in
blob `670fe1e2d0a1d4290dad8266e0bc08a3e8c19de6` are fixed and verified against **deployed bytes**.

| Defect | Before | After | Evidence |
|---|---|---|---|
| Blind success after failure | `.catch(function(){}).then(show success)` | Failure shows reference + "do not submit or pay again" | Aborted-request run: `sent` stays hidden, error box carries `MAO-…` |
| Media dollars in `daily_cap` | `daily_cap = media/14` | `daily_cap` empty; `media_budget_usd` + `media_daily_budget_usd` | $10,000 run: `daily_cap=""`, `media_budget_usd=10000`, `media_daily_budget_usd=714.29` |
| No contact phone / reuse risk | field absent | `phone=""`, transfer line kept separate | Same run: `phone=""`, `transfer_number="(602) 555-0148"` |

Commits: `a0ff77c4` adapter · `d3636219` client · `ea4c1903` page.

Also verified: single POST per submission (second attempt does not re-send), no JS errors,
`submission_id` present as `MAO-<uuid>` and echoed into `notes` for Buyer Board matching.

### Deviations from the bundle, and why
- `order-intake-client.mjs`: the control-character validation regex was rewritten from a literal
  class to `new RegExp('[\\u0000-…]')`. The literal form transported as raw control bytes.
  Behaviour proven identical across code points 0–255. Deployed file now has **0 control bytes**.
- `campaign/index.html`: dropped a `DELIVERY` map left unused after the adapter took over, and
  added styling for the injected `#lfmaReceiptError` element so the failure state is legible.
- `shared/` canonical copies were **not** committed. Only LFMA is patched, so a single served
  copy exists and cannot diverge. Commit `shared/` when MA is patched.

### Preconditions proven before deploying
- Render serves `.mjs` as `application/javascript` (probe file `lfma/assets/_mime-probe.mjs`).
  Without this the dynamic `import()` would have failed and killed the form entirely.
- Make scenario **6145362 already contains module 4 `gateway:WebhookRespond`** returning
  `{"ok":true}` with `Content-Type: application/json` and `Access-Control-Allow-Origin: *`.
  This is exactly what the adapter requires. **No Make change was needed or made.**
- Hook preserved: `dwzmtn5xbkdrt6pjvli9jgy3auppobbi`, one occurrence, no second lane.
- Bundle tests: **68/68 Node pass**, **8/8 offline DOM pass**, re-run after the regex change.

---

## 2. All-domain inventory (live, 2026-09-09)

Every Render preview returns 200 — **all 15 sites are built and serving.** The gap is DNS.

| Domain | Custom domain | On Render | Index | Status |
|---|---|---|---|---|
| nearestinjurylawyers.com | 200 | YES | ok | LIVE-VERIFIED |
| marketingapes.com | 200 | YES | ok | LIVE-VERIFIED |
| lawfirmmarketingapes.com | 200 | YES | ok | LIVE-VERIFIED |
| doihaveaclaim.ai | 200 | YES | ok | LIVE-VERIFIED |
| kylegosselin.com | 200 | YES | ok | LIVE-VERIFIED |
| besttortlawyers.com | 202 | no (nginx) | **noindex** | BLOCKED — DNS + Phillips mirror |
| legalevolutionengine.com | **502** | no | ok | BLOCKED — DNS resolves, host failing |
| discountdealme.com | **502** | no | ok | QA-PASSED-BUILT-NOT-LIVE |
| researchinvestigation.com | **502** | no | ok | QA-PASSED-BUILT-NOT-LIVE |
| tosssports.com | **502** | no | ok | QA-PASSED-BUILT-NOT-LIVE |
| crazygolfgame.com | 202 | no | **noindex** | QA-PASSED-BUILT-NOT-LIVE |
| pillowexchange.com | 202 | no | **noindex** | QA-PASSED-BUILT-NOT-LIVE |
| smartlifeinsurancequote.com | 202 | no | **noindex** | QA-PASSED-BUILT-NOT-LIVE |
| tonedntasty.com | 202 | no | **noindex** | QA-PASSED-BUILT-NOT-LIVE |
| forpetslikeblue.com | 200 | no (other host) | ok | NEEDS VERIFICATION — serving elsewhere |

### Corrections to CURRENT-BRIEF (was stale as of 2026-09-05)
- `lawfirmmarketingapes.com/engine/` — brief said 404. **Now 200 on Render.**
- `marketingapes.com/order/` — brief said 404. **Now 200 on Render.**
- `besttortlawyers.com` — brief said "YES, already on the live face". **Actually 202 SiteGround
  captcha, `noindex`, not on Render.** It cannot receive a click or be crawled.
- `legalevolutionengine.com` — brief said "not registered". **DNS resolves; returns 502.**
  Registered, pointing at a failing host.

---

## 3. Payment and campaign state — kept separate

| State | Status | Basis |
|---|---|---|
| brief_submitted | **WORKING** | Verified against deployed bytes, reference issued |
| invoice_created | NOT PROVEN | `price_usd: 2500` is a page-configured request, not an invoice |
| payment_verified | **NONE** | No provider record read. No card charged. No test payment |
| build_started | NONE | — |
| campaign_live | NONE | Ads remain off |

The $5,000 AI-prequalification upgrade is **not enabled**: the form marks it
"REQUESTED - quote separately; not included or activated". Sofia's outbound opener remains
unfixed (0 transfers since 8/31, median 9–23s on answered calls), so that tier is not sellable.

---

## 4. Not done / not verified in this session

- **No live submission was made.** No Buyer Board row was created; no notification email sent.
  The one authorized marked test is left for Kyle so a real row can be matched to a reference.
- Codex's `OWN-CAMPAIGNS-START-HERE.md` and sprint-builder are **not in `marketingapes/domains`**
  (searched the full checkout). They live in another repo or only in Codex's sandbox. Its remote
  ref is still unestablished. **Codex being out of credits is not a reason to buy credits or rebuild.**
- `ma-control` and `kg-control` remain `not_ready` (`openai:false`, `event_sink:false`). Render's
  API can write env vars but not read them, so the values cannot be copied from working `nil-intake`.
- `ma-site` (`ma-site-f6zf`) serves 590 bytes of scaffolding titled "Document". It does **not**
  serve marketingapes.com, which is served correctly from elsewhere on Render.
- No GA4/GTM delivery was verified downstream — a fired dataLayer event is not a received record.
- `lfma/assets/_mime-probe.mjs` is a leftover 21-byte probe. Harmless; delete when convenient.

---

## 5. Rollback

- Page: revert `ea4c1903` (restores blob `670fe1e2…`).
- Modules: `lfma/assets/*.mjs` are additive; deleting them plus reverting the page restores prior behaviour.
- Baseline backup `.lfma-campaign-receipt-baseline.html` was written locally by the patch tool and
  **deliberately not committed**, per the bundle instruction.
- No Make, Render service, DNS, QuickBooks or ad-account state was modified, so nothing else to roll back.
