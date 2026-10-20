# SSDI-PILOT-001 — SSDI reference campaign (YOUR BRAND HERE)

A complete Social Security Disability reference campaign mirroring the proven
PARAQUAT-PILOT-001 build, so a firm adopts it by swapping in its brand, its
approved criteria, and its production transfer destination. **Reference build
only: nothing here is live, no ads run, no leads are delivered, and no
assistant has been created or changed.** Pages run in synthetic (preview)
mode — submissions stay in the visitor's browser.

## Contents

| Path | What it is |
|---|---|
| `index.html` | **Door 1 — Form.** Dropdown qualifier + contact form. Page tag `btl-ssdi-main-form`. Per-channel consent checkboxes (never prechecked); TrustedForm wired at go-live only. |
| `talk-to-sofia/index.html` | **Door 2 — Talk to Sofia.** Call-first page + callback panel. Page tag `btl-ssdi-call-first`. Demo line (202) 932-9700 (same demo chain as Paraquat). |
| `quiz/index.html` + `quiz/quiz.js` | **Door 3 — Guided quiz.** Chat-style, one question at a time, outcome shown to the visitor. Page tag `btl-ssdi-quiz`. |
| `qualifier.js` | Form-door scoring (example firm criteria): QUALIFIED / FIRM_REVIEW / NOT_A_FIT. Visitor never sees which answer mattered. |
| `intake.js` | Shared intake: consent rendering, non-PII dataLayer events only, payload build, synthetic delivery. |
| `ssdi.css` | Shared styles adapted from `/paraquat/paraquat.css` conventions. |
| `ads/facebook-previews.md` | Three Facebook ad previews (one per door), each labeled **PREVIEW — NOT LAUNCHED**. |
| `sofia/sofia-ssdi-config.md` | Sofia SSDI configuration spec: system prompt, verify-then-transfer flow, exact qualification line, `PLACEHOLDER_TRANSFER_DESTINATION`. Spec only — not applied anywhere. |
| `perspective/` | Perspective demo view + contract README: how an SSDI test lead appears, aggregate-only rules, human-date formatting, swap-ins. Feed is a placeholder — the view honestly reports "not connected." |

Campaign ID everywhere: `SSDI-PILOT-001`. Tracking follows the house
standard: GTM container `GTM-PHC7459M`, only non-identifying events to
dataLayer (page_id, campaign_id, tenant_id, step counts, result category) —
names, phone numbers, emails, states and answers are never pushed.

## Marked assumptions (from the brief — do not present as a firm's ask)

- **Scope:** whether the adopting firm wants new applications, denied-claim
  appeals, or both is **unconfirmed**. Both paths are built; every demo
  walkthrough defaults to **new applications**.
- **Geography:** SSDI is federal; the example build is nationwide. The firm
  confirms the states it actually takes.
- **Criteria:** all screening rules are published-example grade. Firm +
  counsel confirm before any live run.

## Swap-in points (adoption checklist)

1. **Brand** — "YOUR BRAND HERE" → firm brand (headers, footers, legal
   blocks, seal) and `tenant_id` in `intake.js` / `quiz.js`.
2. **Criteria** — confirm/edit the example rules in `qualifier.js`,
   `quiz/quiz.js`, and the Sofia spec (incl. the scope question above).
3. **Transfer destination** — replace `PLACEHOLDER_TRANSFER_DESTINATION` in
   `sofia/sofia-ssdi-config.md` with the firm's production transfer number.
   (Never pre-filled here; the reference build demos transfers on the
   existing CallRail demo chain.)
4. **Sofia binding** — create/bind the firm's SSDI Sofia assistant per the
   spec; point the talk page's number binding at it.
5. **Intake + Perspective feed** — set `window.EE_INTAKE_ENDPOINT` (and
   `EE_TRUSTEDFORM`) at go-live; build the overview route described in
   `perspective/README.md`; replace the placeholder in
   `perspective/config.json`.
6. **Copy approval** — counsel approves page/ad/consent copy (consent texts
   in `intake.js` are marked examples).

## Acceptance checks this build was shaped for (from the brief)

1. Inbound ladder on the demo number: call → confirm → verify → qualify
   line said exactly once → transfer → phone rings. *(Requires the Sofia
   wiring in step 4 — not performed by this build.)*
2. A test lead through each door lands in Perspective with correct
   campaign/per-door tags and status labels. *(Synthetic mode demonstrates
   the payload + presentation; live landing requires step 5.)*
3. Demo view exposes no names/answers/recordings. *(By construction —
   aggregate-only contract.)*
4. Dates render as human dates. *(Perspective synthetic examples exercise
   the seconds→ms formatter.)*
5. Three preview ads, clearly labeled, presented ads-first. *(In
   `ads/facebook-previews.md`.)*
6. No console errors / no horizontal overflow at phone width. *(Verify in a
   browser before any demo.)*

## Hard rules honored by this build

- The 602 / Phillips lane is untouched — no changes, no test calls, no
  Phillips numbers or assets anywhere in this package.
- No live ad spend, no prospect outreach, no sends to anyone.
- All copy carries attorney-advertising and "not a law firm" disclosures;
  Sofia copy discloses she is AI and gives no legal advice.

Status (Oct 20, 2026): Version A build complete; PR #328 open against main, pending Domain release checks.
