# Phillips 5-Lane — Build Spec (manifest v5.0, locked 2026-09-29)

Source of truth for every seat building the 5 lanes. Starts from PR #143
(`staged/phillips-overnight-build-2026-09-29/`) — reuse its lane content, fix what fails.

## Why #143's pages were rebuilt in place (audit 2026-09-29)

| Check | #143 result |
|---|---|
| BTL/NIL branding | FAIL — all 5 lanes use one generic "Phillips Law Group" template (#1d5c3f), BTL and NIL identical |
| GTM / Meta / GA4 | FAIL — `{{TRACKING_IDS}}` placeholder comment only |
| TikTok slot | partial — mentioned on 9 pages, no slot |
| Sofia CTA on landing | FAIL — landing pages never link to `./talk-to-sofia/` |
| Public copy | FAIL — internal ops metrics in hero ("reconciled 18 signed matters at a 29% segment conversion…") |
| Served path | pages live under `staged/…`, not served by Render |

## Lanes → served paths

| # | Lane | Tenant | Path | Domain |
|---|---|---|---|---|
| 1 | Nationwide MVA/PI | NIL | `nil/mva-pi/` | nearestinjurylawyers.com |
| 2 | LA County Sex Abuse | BTL | `btl/sex-abuse-la-county/` | besttortlawyers.com |
| 3 | CA Women's Prison Sex Abuse | BTL | `btl/sex-abuse-ca-womens-prisons/` | besttortlawyers.com |
| 4 | Rideshare Sex Abuse (TARGETED) | BTL | `btl/rideshare-sex-abuse/` | besttortlawyers.com |
| 5 | Rideshare Sex Abuse (OPEN) | NIL | `nil/rideshare-sex-abuse/` | nearestinjurylawyers.com |

Each lane: `index.html` (landing), `quiz/index.html`, `talk-to-sofia/index.html` = 15 pages.

## Identity separation (hard rule)

BTL pages may only reference BTL assets/IDs; NIL pages only NIL. No file is shared
across `btl/` and `nil/`. Enforced by `tests/phillips-5-lane-separation.test.mjs`.

| | BTL | NIL |
|---|---|---|
| Brand | Best Tort Lawyers (seal `/assets/btl-seal.svg`, tokens in `btl/brand.json`) | Nearest Injury Lawyers (tokens from `nil/index.html`) |
| GTM web | `GTM-PHC7459M` | `GTM-NKLD8KST` |
| GA4 | property `423835322`; measurement ID **MISSING → placeholder** (fires via GTM) | property `530695235`, measurement `G-00VYXSCGR8` |
| Meta pixel / dataset | **MISSING → placeholder** | `1464576608376747` |
| TikTok pixel | **slot, empty** | **slot, empty** |
| Phone | placeholder `(888) 888-8888` — NOT 202-932-9700 until Kyle says "bind it" | placeholder `(888) 888-8888` — 602-693-1461 only on Kyle's word |

## Tracking contract (every page)

1. GTM snippet in `<head>` + `<noscript>` iframe after `<body>` for the tenant's container.
2. A lane config block, before GTM:
   ```html
   <script>window.EE_LANE={tenant:"BTL",lane:"btl-rideshare-sex-abuse",page:"landing",
     gtm:"GTM-PHC7459M",ga4_property:"423835322",ga4_measurement:null,
     meta_pixel:null,tiktok_pixel:null,phone_tel:null,phone_status:"placeholder",
     disclaimer_status:"pending-attorney-review",criteria_status:"assumed"};</script>
   ```
3. Meta pixel base code loads ONLY when `EE_LANE.meta_pixel` is non-null (so the BTL
   slot is inert until an ID exists). TikTok base code loads ONLY when `EE_LANE.tiktok_pixel`
   is non-null. Both slots must be present in the markup.
4. dataLayer events (non-identifying only — never names, phones, emails, answers):
   `ee_page_view`, `ee_quiz_start`, `ee_qualification_complete`, `ee_qualified`,
   `ee_disqualified`, `ee_sofia_start`, `ee_call_request`.
   Payload: `{event, tenant, lane, page}`.
   `transfer` and `signed_case` are server-side (Vapi end-of-call + CRM) — not page events.
5. `<meta name="ee-disclaimer-status" content="pending-attorney-review">` and
   `<meta name="ee-state-disclaimer-status" content="pending-attorney-review">` on every page.

## Copy rules

- Say "may potentially qualify" — never "you qualify", never outcome/dollar/win-rate claims.
- No internal metrics, conversion rates, "proof", or buyer names in public copy.
- Footer: ATTORNEY ADVERTISING; brand is a matching service, not a law firm; no legal advice;
  Sofia is AI; review is free; no attorney-client relationship. Follow Paraquat's footer.
- Referral language: "an independent law firm" (as Paraquat). Naming Phillips Law Group on
  the page is an attorney-review gate — do not name the firm in page copy.

## Survivor lanes (2, 3, 4, 5) — trauma-informed

- NEVER ask what happened, how, or any assault detail. No free-text "describe" fields.
- Allowed quiz questions: age at the time (minor/adult), where (county / facility type /
  rideshare company), approximate year, whether they've hired a lawyer for this, best
  contact method + safe time to call.
- Every step: "Skip" / "Prefer not to say" option; "You can stop at any time."
- Sofia intro on these pages: "You don't need to describe what happened."
- Include a quiet support line: RAINN 1-800-656-4673 (24/7, confidential).
- Imagery: calm, dignified, no people in distress.

## Criteria (all ASSUMED — label as such)

- **MVA/PI (NIL):** injured in a vehicle accident in the US in the last ~2 years, got medical
  treatment, wasn't mainly at fault, no lawyer yet. SOL varies by state.
- **LA County (BTL):** sexual abuse as a minor at an institution/facility in LA County
  (juvenile hall/camp, foster placement, school, youth program), no lawyer yet.
- **CA Women's Prison (BTL):** sexual abuse by staff while incarcerated at a California
  women's facility (e.g. CCWF Chowchilla, CIW Corona, FCI Dublin). Revival-window timing
  (AB 2777 window 2023–2025) needs attorney confirmation — flagged.
- **Rideshare (BTL + NIL):** sexual assault or misconduct by a driver during a ride booked
  through Uber or Lyft in the US, no lawyer yet.

## Intake

No live endpoint exists for these lanes. Forms validate and fire events, then show a
"Call Sofia" fallback; `EE_LANE.intake_endpoint = null`. Listed as a blocker.
