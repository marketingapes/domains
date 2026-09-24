# MA Network Signal Spec v0 (all 15 sites, one schema)

Goal: every lead on every site carries the click that caused it, so conversions can be sent back to Google/Meta and every site learns from the same data.

## 1. Capture (existing Evolution Engine `assets/js/tracking.js`, upgraded to v2)
Already live on DIHAC and posting to the Zapier webhook. v2 keeps every existing behavior and adds: 90-day first + last touch (was per-session), gbraid/wbraid, Meta `_fbc`/`_fbp`, `visitor_id`, `lead_id`, tort slug (from `/campaigns/<tort>/` or `<meta name="ee-tort">`), and hidden click-ID fields on every submitted form.
Page type via `<meta name="ee-page-type" content="seo|answer|prospect|retarget|lp">`.
NIL and BTL do not load tracking.js yet; wiring them is the next PR.

## 2. Events (same names on every site)
page_view, form_start, lead_submit, click_to_call, cta_click, thank_you_view (existing names kept), then server-side: ma_lead_qualified (intake bot), ma_consult_booked, ma_case_signed.

## 3. Page cluster per tort (per domain)
seo (ranking content), answer (FAQ/"do I qualify"), prospect LP (cold paid traffic), retarget LP (warm, proof + urgency), intake/thank-you. Same tort slug on all so results roll up.

## 4. Send-back (the compounding part; needs build + account access)
- Google Ads offline conversions: upload qualified/booked/signed with gclid (gbraid/wbraid for iOS).
- Meta Conversions API: send Lead/QualifiedLead with fbc/fbp + hashed email/phone.
- Value = expected case value by tort, so bidding optimizes for signed cases, not form fills.

## 5. Rollup table (one row per lead)
lead_id, ts, site, tort, page_type, channel (derived from click ID), campaign, qualified, booked, signed, value.
Report: cost per qualified lead and per signed case by tort x channel x site x page_type.

## Honest limits
- Platforms learn per ad account/pixel; cross-site learning is OUR rollup deciding budget and creative, not Google/Meta pooling automatically.
- Meta wants ~50 optimization events per ad set per week to exit learning. Baby budgets will not hit that on signed cases, so optimize on ma_lead_qualified first.
- Attorney-advertising disclaimers on every page; no spend until Kyle approves amounts.
