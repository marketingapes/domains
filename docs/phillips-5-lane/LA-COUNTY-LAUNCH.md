# LA County Sex Abuse (Phillips) — launch sheet

Lane: `btl/sex-abuse-la-county/` → besttortlawyers.com/sex-abuse-la-county/ (landing, /quiz/, /talk-to-sofia/).
Flow chosen by Kyle 2026-10-27: **auto Sofia callback → Phillips LA intake** (the May model that signed 18), not human-review-first.

```
page form ──POST──▶ legal-web-lead /api/v1/btl/web-lead ──queue──▶ executor places Vapi call
  (intake_contract btl.web-lead/v1)      stores + receipt            Sofia "LA County Abuse v1"
                                                                    └─ transfer_btl_phillips_5l ─▶ +1 602-600-6247 (CallRail) ─▶ Phillips 602-200-3960
```

## What is verified (2026-10-27, Claude)

| Item | State | Evidence |
|---|---|---|
| Pages live | 200 on all three paths, noindex | curl 2026-10-27; deployed copy is still lane.js v20261023c1 (this PR is v20261027w1) |
| SB 37 disclaimer | Top of every page, verbatim Phillips text, 12px | `.sb37` block; browser test |
| Backend BTL lane | enabled, live, Redis up, routes complex_tort → ***3960 | GET legal-web-lead.onrender.com/health |
| CORS | preflight from https://besttortlawyers.com → 204, allow content-type | OPTIONS /api/v1/btl/web-lead |
| LA assistant | "BTL Sofia — LA County Abuse v1" `d3dacc64-1710-45c0-8816-6d8a7039d1df`: AI disclosure, recorded, 4 questions (age, where, abused y/n, lawyer), consent gate, no story, Spanish | Vapi read via Make s6481786 |
| Firm transfer | tool `transfer_btl_phillips_5l` (7bd31747) → +16026006247 CallRail → Phillips Complex Tort 602-200-3960, warm transfer with one-line summary | Vapi tool read; "confirmed current by Kyle 2026-09-29" |
| Firm takes these | "we can take all types of CA sexual abuse statewide leads" (Michael Blom 2026-05-11); DID 602-200-3960 (2026-05-06) | legal-web-lead config/phillips-lane/routes.json |
| Phillips credits MA | 18 LA County converted in Litify, Source = Marketing Apes | PROOF-2026-09-23-Phillips-credit-confirmed.md (Drive) |
| Page → backend contract | name, phone, consent text + sha256 + version, tort la_county_abuse, state CA, event_id = submission id, UTMs; success only for an `MA-BTL-<uuid>` receipt with this event_id (or duplicate) and status awaiting_executor / call_created / call_ended; test, dry-run, filtered, refused → not saved | tests/btl-abuse-la.browser.mjs against a local fake (proves the page only) |

## Done 2026-10-27 (Kyle approved in chat)

- Meta ad `jordanpulaski - Copy` 120253458361700231 (404 landing) set to PAUSED.
- Render legal-web-lead `PHILLIPS_LANE_BTL_ASSISTANT_ID=d3dacc64-1710-45c0-8816-6d8a7039d1df` (merge, not replace); deploy dep-dbgedregekts73a4qlug live, /health unchanged. The AZ MVA callback path is unaffected (it uses hard-coded MVA_ASSISTANT 9fffe3f2 / MVA_PHONE 4d07e1e8).

## Blocker found 2026-10-27: nothing places the web callbacks

- The executor that dials queued web leads, Render cron `legal-web-lead-website-executor` (crn-davtbv7avr4c73dbqhrg, every 2 min), is **suspended**.
- Even when it runs, `docs/website-executor.md` says live sends are refused until something writes the suppression registry (`suppression:v1:ready`), and nothing does today.
- Its test mode can only dial a recording-only test assistant with no transfer and no tools, plus a stored attestation and approval. It cannot place a test call with the production LA assistant by design.
- So switching on the pages today would store leads and show "Sofia will call you", but no call would be placed.

## Not verified — blockers before any spend

1. ~~**Which assistant the BTL web lane dials.**~~ Set to d3dacc64 on 2026-10-27 (see above). `PHILLIPS_LANE_BTL_ASSISTANT_ID` on Render is set but not readable from here. Recent BTL lane calls went out on `9fffe3f2` "BTL Sofia — AZ MVA Outbound", which says *"Never handle a California incident"*. If that is the web-lane assistant, an LA survivor would get an accident call that refuses them. **Fix:** set `PHILLIPS_LANE_BTL_ASSISTANT_ID=d3dacc64-1710-45c0-8816-6d8a7039d1df` (Render env, legal-web-lead). This changes every BTL web-lead tort; the other BTL abuse pages (women's prisons, rideshare) are also `intake_endpoint:null` today — confirm before flipping.
2. **Which line calls out.** `PHILLIPS_LANE_BTL_PHONE_NUMBER_ID` is also unreadable. Its inbound must not be bound to the Paraquat assistant (976d64df), or a survivor calling back reaches Paraquat Sofia.
3. **One synthetic end-to-end call** (executor test mode, test callee) showing: receipt on the page → Sofia LA call → transfer rings the CallRail number. Only then flip the pages.
4. **Conversion event.** Pages push `ee_lead_saved`. GTM-PHC7459M must map it to Meta `Lead` (pixel 673552078259404) before `measurement:"on"`; otherwise Meta optimizes blind. Untested.
5. **Phillips review of page + ad** (`disclaimer_status:"pending-attorney-review"`): send to Michael per the vendor compliance agreement.

## Switches (each one needs Kyle's go in chat)

| # | Where | Change |
|---|---|---|
| 1 | Render · legal-web-lead env | `PHILLIPS_LANE_BTL_ASSISTANT_ID=d3dacc64-…` (and confirm phone id) |
| 2 | 3 pages, `window.EE_LANE` | `intake_endpoint:"https://legal-web-lead.onrender.com/api/v1/btl/web-lead"` |
| 3 | 3 pages, `window.EE_LANE` | `measurement:"on"` after GTM maps `ee_lead_saved` → Lead |
| 4 | Meta act_411567125842274 | create the ad below PAUSED, then activate at the approved budget |

## Meta (ads stay paused until #1–#3 pass)

Campaign `LA County Sex Abuse` 120248212953620231 is PAUSED, but **both of its ads point at 404 pages**:
- `Image-Ad_1` 120248212953630231 → /sex-abuse/la-county-sex-abuse/ (404)
- `jordanpulaski - Copy` 120253458361700231 → /sex-abuse/ca-detention-abuse/ (404), and it and its ad set `Open - Copy` are ACTIVE inside the paused campaign, so un-pausing the campaign would spend on a dead page at once. Pause that ad before anything else.

New ad (draft, not created):
- Ad set `Open` 120248212953640231 (CA, 21–65, pixel Lead).
- Creative: proven image hash `646f86dac1c2e85d9ae0032f9d1e1d2b` (the May unit; note the image itself misspells "JUEVENILIE").
- Link: `https://besttortlawyers.com/sex-abuse-la-county/?utm_source=facebook&utm_medium=paid&utm_campaign=la-county-sex-abuse&utm_content=image-ad-1`
- Primary text (CA): "Were you sexually abused by a staff member while you were under 18 at an LA County juvenile hall, probation camp or MacLaren Hall? A free, confidential review can tell you whether you may still have options." + the SB 37 disclaimer verbatim.
- CTA LEARN_MORE.
- Budget: $50/day, 14 days, kill if fewer than 3 new converted in Litify by day 21 (PROOF 2026-09-23). Runbook stop rules still apply: week-1 CPL > $60 → pause; "Do Not Qualify" > 40% of intakes → tighten.

## Turn-down screen (from Phillips' own notes; Sofia asks only the first three)

Under 18 at the time · abuser was facility staff (not another youth, not a foster home) · LA County juvenile hall / probation camp / MacLaren · not already signed. The firm, not Sofia, asks about felony convictions and registration.
