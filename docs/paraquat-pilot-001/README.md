# PARAQUAT-PILOT-001 — implementation receipt (issue #127)

Builder: Claude (Cowork). Branch: `claude/paraquat-pilot-001`.

## Owned source paths
- `btl/paraquat/index.html` — consumer page served at https://besttortlawyers.com/paraquat/ (Render `btl-site`, `staticPublishPath: btl`). This path was removed from main in d199fbb; the live copy was a stale "Paraquat Campaign Preview" artifact. `btl/campaigns/paraquat/` (campaign studio) is untouched.
- `btl/assets/paraquat-field-usda-nrcs.jpg`, `btl/assets/paraquat-field-usda-nrcs-900.jpg`
- `lfma/paraquat-pilot/index.html`, `lfma/paraquat-pilot/btl-paraquat-preview.jpg` — firm-facing offer at https://lawfirmmarketingapes.com/paraquat-pilot/
- `docs/paraquat-pilot-001/*` — this receipt, Sofia v2 prompt, test transcripts, page QA results.

No homepage, no `btl/campaigns/**`, no PR #126 / nil-intake #34 files touched.

## Image provenance
USDA NRCS photo 20190625-NRCS-LSC-0447, "Seidenstricker Farms … Precision Land leveled fields" (rows of soybean plants), public domain (US government work).
Source: https://commons.wikimedia.org/wiki/File:Seidenstricker_Farms-Reservoir-Irrigation-Precision_Land_leveled_fields_(20190625-NRCS-LSC-0447).jpg
Context image only — no claimant, exposure event or diagnosis depicted. Credited on-page.
`btl-paraquat-preview.jpg` is a real screenshot of the new BTL page (headless Chromium, 1440×900).

## Component status
| Component | Status |
|---|---|
| BTL /paraquat/ page (design, copy, disclosures, guided intake) | Published; intake **BUILT-NOT-LIVE**: submission deliberately disabled (`SUBMIT_ENDPOINT = null`) and labelled on-page |
| BTL phone CTA | Not shown. Vapi read: +12029329700 (id 9118e295…) has assistantId/squad/workflow/server all null → no inbound route. |
| Sofia BTL Paraquat v2 | **VERIFIED-IN-STAGING (text chat only)**: assistant 2cb7dd4d-a64d-44b4-98fd-ce00372a3ff7, no tools, not phone-bound. v1 f6e04965… (other seat) left untouched; it failed opt-out (claimed contact stopped), human-help (claimed a transfer) and wrong-tenant (turned caller away). |
| LFMA /paraquat-pilot/ | Published; checkout **non-payable** (`CHECKOUT_URL = null`) until the exact QuickBooks link for $1,000 + $4,000 exists and is read back. Old $5,000 "media funded separately" link not used. |

## Privacy
BTL page loads zero third-party requests (no GTM, Meta, TikTok), uses no storage/cookies, and sends no intake data anywhere. No public Make webhook in page config.

## Remaining release gates
1. Browser-safe BTL capture endpoint with durable acknowledgment + idempotent retry (engine `/api/v1/intake/events` requires a server secret; not browser-usable). Then set `SUBMIT_ENDPOINT` and prove with stored-event readback.
2. Receiving firm's approved Paraquat criteria + geography loaded into Sofia v2 before any positive screening.
3. Route +12029329700 (or chosen line) → verified BTL assistant before showing a call action (rebinding not in this batch).
4. QuickBooks: create/confirm the matching reusable link (or named-firm invoice), read it back, set `CHECKOUT_URL`.
5. Reviewed non-sensitive telemetry allowlist before adding any tags to the BTL page.
