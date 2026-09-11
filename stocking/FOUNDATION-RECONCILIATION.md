# FOUNDATION RECONCILIATION REQUIRED

Provider evidence read on 2026-09-11 (GA4 Admin API, Meta Graph API, read-only) contradicts facts
frozen in Foundation v1.2 (`c8c04430`). **Nothing below was changed in any `domain.json`.** These are
Kyle / Foundation decisions: update the manifest, re-run `tools/verify-foundation.py`, and update
`foundation.sha256` in the same commit. Site code was corrected only where the *page* loaded an
identity the provider proves belongs to another tenant (see `stocking/EVIDENCE.md`).

| # | tenant | Foundation says | Provider evidence | Reconcile |
|---|---|---|---|---|
| 1 | BTL | `paid_media.meta_dataset` MISSING | Meta pixel `673552078259404` is named "Best Tort Lawyers", owner business Marketing Apes (271597869839201), last fired 2026-09-09; BTL homepage loads it | claim the pixel as BTL-owned (`CURRENT`/`VERIFIED`) |
| 2 | BTL | `measurement.ga4_measurement` MISSING; `ga4_property` 423835322 | property 423835322 "Best Tort Lawyers" has web stream `G-CTY3Z0DZ5K` | record the measurement id |
| 3 | BTL | `measurement.gtm_web` GTM-PHC7459M VERIFIED | BTL homepage does not load any GTM container (pixels only); NIL's page had been loading GTM-PHC7459M (now removed) | confirm who GTM-PHC7459M belongs to (BTL, or the legacy Evolution Engine container) and whether BTL's face should load it |
| 4 | DIHAC | `measurement.ga4_measurement` MISSING; `ga4_property` 529255120 | property 529255120 "doihaveaclaim.ai" (account "Kyle Gosselin" 74562400) has web stream `G-9HSY1GEXZ6`; `dihac/config.js` loads it | record the measurement id; note the property sits under the KG account, not Marketing Apes |
| 5 | LFMA | `measurement.ga4_measurement` MISSING; `ga4_property` 530695424 | property 530695424 "Law Firm Marketing Apes" has web stream `G-RQ8EWFTVSW` | record the measurement id (site code now loads it instead of DIHAC's) |
| 6 | MA | `measurement.gtm_web` MISSING; `ga4_property` null | GA4 property 250038806 "Marketing Apes" exists with stream `G-YDLBPP1QM0`; site code has `GTM-PENDING` and no GA4 | record property + stream; decide the MA container |
| 7 | KG | `measurement.ga4_property` null | GA4 property 397076304 "Kyle Gosselin - GA4" exists | record it |
| 8 | CGG / PX / RI / SLIQ / TNT | `measurement.ga4_property` MISSING | properties exist: CGG 397071360, PX 531134865, RI 429267100, SLIQ 543987747, TNT 396707913 (DDM / TOSS / FPLB: GA4 account exists, no property found) | record property ids; measurement ids not read yet |
| 9 | BTL, DIHAC, LFMA vs MA, NIL | `communications.phone` MISSING on BTL/DIHAC/LFMA; MA `+16197360356` and NIL `+16026931461` have `shared_with: []` | BTL, DIHAC and LFMA page code presents NIL's Sofia line and/or MA's number as their own | either claim the share from both ends (owner `shared_with` + user `owner_tenant_id`) or provision own numbers; page code left untouched pending that decision |
| 10 | NIL | `measurement.canonical_events` CURRENT/ON, `gtm_web` GTM-NKLD8KST VERIFIED | NIL page had been loading GTM-PHC7459M (BTL's per Foundation); corrected to GTM-NKLD8KST | verify GTM-NKLD8KST is published with the GA4 (`G-00VYXSCGR8`) and `ee_*` tags before ads; property 530695235 stream confirmed `G-00VYXSCGR8` |
| 11 | LEE (excluded) | `lee/domain.json` (not frozen) carried a raw Make hook URL | replaced by `hook_ref: EE_HOOK_LEE_ORDER` | none for Foundation; LEE stays excluded |

Hook lanes (not Foundation, Render env): forms on NIL, BTL, DIHAC, LFMA, MA and LEE now resolve their
webhook by name from `EE_HOOK_<TENANT>_<NAME>` and fail closed until set. Setting those env vars on each
Render static site is a human production action and was **not** performed.
