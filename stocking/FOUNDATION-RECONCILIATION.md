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

## FOUNDATION/HUMAN RECONCILIATION REQUIRED — round 2 (F8, F9)

| # | item | why it is not a build fix |
|---|---|---|
| R2-1 | BTL, DIHAC and LFMA pages present MA's number (`+16197360356`) and NIL's Sofia line (`+16026931461`) as their own; the owners' manifests carry `shared_with: []` and the users' manifests say `phone: MISSING` | ownership/sharing of a phone number is a Foundation claim that must be made from both ends (or numbers provisioned). Guessing would borrow identity. Left PARTIAL. |
| R2-2 | NIL: live `nearestinjurylawyers.com` is served from `marketingapes/nil-site` (root), not from this tree (`nil-site-staging`) | readiness reported as PARTIAL (`deployed_path: DIVERGED`) until the deployed path converges on this tree or an adapter/integration proves it. |
| R2-3 | BTL: live `besttortlawyers.com` is SiteGround; the Phillips funnel is not mirrored here | same rule: `deployed_path: DIVERGED`. |
| R2-4 | Production gate is `preview` for BTL and the eight preview tenants, so their forms cannot send from the Render face until hosting matches intent | by design; flipping the gate is a Foundation/DNS decision. |
| R2-5 | Every form now fails closed until `EE_HOOK_<TENANT>_<NAME>` is set on the Render static site (and MA's build command becomes `sh build.sh`) | Render env is a human production action. |

## SECURITY ROTATION REQUIRED BEFORE REUSE (history cleanup optional)

Raw hook URLs were committed to this public repository before commit `2593303`, and one bare Make hook token survived
in `releases/2026-09-09-lfma-receipt.md` until round 3 (removed, not reproduced). All of them remain in git history and in
any fork/clone; `tools/scan-secrets.mjs` now carries SHA-256 digests of the six exposed tokens so they can never re-enter
the tree. Removing them from the current tree does not revoke them: **rotate every lane below before it is reused**
as an `EE_HOOK_*` value. **Not done here** (no
history rewrite, no credential rotation — human decisions):

| lane | provider | where it lived (history) | action |
|---|---|---|---|
| NIL intake | Zapier catch hook (account 2296909) | `nil/index.html` | rotate the Zap's webhook URL, then set `EE_HOOK_NIL_INTAKE` |
| BTL campaign request | Zapier catch hook (account 2296909) | `btl/404.html` | rotate, then `EE_HOOK_BTL_CAMPAIGN_REQUEST` |
| DIHAC lead / contact / tracking | two Zapier catch hooks (account 2296909) | `dihac/*.html`, `dihac/assets/js/tracking.js` | rotate both, then `EE_HOOK_DIHAC_{LEAD,CONTACT,TRACKING}` |
| BTL lead | Make custom webhook | `btl/index.html`, `btl/rhode-island-abuse/index.html` | regenerate the Make hook address, then `EE_HOOK_BTL_LEAD` |
| MA/LFMA/LEE order lane | Make custom webhook | `ma/order/index.html`, `lfma/{engine,campaign,contact}`, `lee/index.html`, `lee/domain.json` | regenerate, then `EE_HOOK_{MA,LFMA,LEE}_ORDER` |

Optional after rotation: history rewrite (`git filter-repo`) + force-push + clone invalidation — only with Kyle's
explicit go, since it rewrites `main` history for every collaborator and every Render deploy hook.

## G4 consequence (round 3)

The outbound gate now requires a CONNECTED consent store and a CONNECTED suppression source with a completed clear
check. Every canonical manifest says both are `MISSING`, so every form in this repository is intentionally fail-closed.
Connecting the safety spine is a Foundation change (flip the two `safety` leaves once the stores exist, re-run the
verifier, update `foundation.sha256`) plus real checker wiring — not a code shortcut.
