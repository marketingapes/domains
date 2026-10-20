# SSDI Perspective — how a test lead appears (SSDI-PILOT-001)

Frontend-owned routes: `/ssdi/perspective/` and the three SSDI pages
(`/ssdi/`, `/ssdi/talk-to-sofia/`, `/ssdi/quiz/`). This view reuses the
Paraquat Perspective pattern and styling conventions. LFMA, Phillips, the
602 lane, existing intake logic, phone bindings, paid ads, Make and outbound
calls are untouched by this build.

## What the demo view shows

- Aggregate totals only: leads, Sofia calls, follow-up activity, media spend.
  Unavailable values render as "—" and **never mean zero**.
- Source totals by door (`form`, `sofia`, `quiz`) and lead-status totals using
  plain labels (`received`, `screening`, `review`, `followup`, `handed_off`,
  `not_a_fit`). Sofia calls carry plain status labels such as
  "Incomplete · caller hung up" or "Verified · firm review · transferred".
- Leads sort by **last activity**. All timestamps render as **human dates** —
  epoch seconds are converted to milliseconds before formatting (the domains
  #318 formatter behavior); raw epoch floats are never printed.
- The demo view exposes **no** claimant names, phone numbers, answers,
  transcripts, or recordings/playback. Those belong to the owner view behind
  an "Owner sign-in" (not part of this reference build).

## How an SSDI test lead would appear, door by door

In this reference build the pages run in **synthetic mode**: a submission is
never delivered anywhere. The submitted payload is kept in the browser's
sessionStorage (`ee_ssdi_last_lead`), and this page notes its presence
(labeled local-only, with the door and a human-readable submission time).
The synthetic-examples panel walks three fictional leads end to end:

1. **Form (new application)** — lead received with campaign `SSDI-PILOT-001`
   and page tag `btl-ssdi-main-form` → screening outcome (e.g. QUALIFIED)
   → "Verified · firm review" → handed off to the transfer destination.
2. **Sofia call (new application)** — call on the demo line → matter
   confirmed → verify-only checks passed → the qualification line said
   exactly once → name/callback/state/permission collected → transferred.
3. **Guided quiz (appeals path)** — quiz completed with path `appeals` →
   FIRM_REVIEW outcome → follow-up on the channel the visitor consented to.

When a real feed is wired, the same records arrive from the backend route
below with identical labels, so nothing about the presentation changes.

## Read-only aggregate contract (to be built at wiring — does NOT exist yet)

Backend-owned GET route (proposed, mirroring Paraquat PR #27 pattern):
`https://legal-web-lead.onrender.com/api/v1/portal/ssdi/overview`

`config.json` currently carries a PLACEHOLDER instead of this URL, so the
page honestly reports "not connected." Expected response shape:

```json
{
  "schema": "ssdi-perspective/v1",
  "campaign_id": "SSDI-PILOT-001",
  "synthetic": false,
  "as_of": "2026-10-20T00:00:00Z",
  "counts": {"leads": null, "calls": null, "followups": null},
  "sources": [],
  "statuses": [],
  "connections": {"intake": false, "sofia": false, "ad_spend": false}
}
```

Rules carried over from the Paraquat contract: cohorts below ten are withheld
publicly; snapshots expire after 15 minutes; only allowlisted aggregate
fields are returned; no lead records, names, email, phone, state, answers,
IDs, transcripts, audio or recording URLs; CORS allows the serving origin
without credentials; no public bearer key. Intake reconciliation must use
receipt/submission deduplication server-side, campaign `SSDI-PILOT-001`, and
page IDs `btl-ssdi-main-form`, `btl-ssdi-call-first`, `btl-ssdi-quiz`.

## Swap-in points (what a firm changes to adopt this build)

1. **Brand** — replace every "YOUR BRAND HERE" (page headers/footers, legal
   blocks, `tenant_id` in `intake.js` / `quiz.js`) and the seal asset.
2. **Criteria** — confirm the example screening rules in `qualifier.js`,
   `quiz.js` and `sofia/sofia-ssdi-config.md` (including the open scope
   question: new applications, denied-claim appeals, or both — the demo
   defaults to new applications) and confirm served states (example build is
   nationwide; SSDI is federal).
3. **Transfer destination** — replace the PLACEHOLDER in the Sofia config
   with the firm's production transfer number; the reference build demos the
   transfer on the same CallRail-recorded demo chain as PARAQUAT-PILOT-001.
4. **Sofia binding** — create/bind the firm's SSDI Sofia assistant per the
   config spec and point the talk page's demo-line number at it.
5. **Intake + feed** — set `EE_INTAKE_ENDPOINT` (and `EE_TRUSTEDFORM`) at
   go-live, build the overview route above, and replace the `config.json`
   placeholder with its URL.
6. **Copy approval** — counsel approves all page, ad and consent copy
   (consent texts in `intake.js` are marked as examples).
