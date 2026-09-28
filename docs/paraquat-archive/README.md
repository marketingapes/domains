# PARAQUAT two-page build: signature log (2026-09-28)

## Pages (Kyle's pick, 2026-09-28: three variants)
| Variant | Route | page_id |
|---|---|---|
| 1: Muse (PR #130, unchanged except the logo) | `btl/paraquat/index.html` → `/paraquat/` | its own live Sofia chat |
| 2: Sofia call-first | `btl/paraquat/talk-to-sofia/index.html` → `/paraquat/talk-to-sofia/` | `btl-paraquat-call-first` |
| 3: Quiz | `btl/paraquat/quiz/index.html` → `/paraquat/quiz/` | `btl-paraquat-quiz` |

- The callback form collects only name, mobile phone and the consent/legal copy. Call consent is required; texts are optional.
- The quiz questions are adapted from the DIHAC quiz Paraquat track. Every factual question has "Not sure". No answer stops the quiz or shows "no match", because approved firm criteria aren't loaded; every path goes to human review.
- New logo: `btl/assets/btl-seal.svg` plus a serif "Best Tort Lawyers / Claim matching service" wordmark, used on all three pages. `btl-mark.svg` and the homepage are untouched.
- The form-first candidate (Page A) is archived as `candidate-form-first-page-a.html`.

Shared: `btl/paraquat/paraquat.css` and `btl/paraquat/intake.js` (used by the Sofia and Quiz pages). Sofia portrait: `btl/assets/sofia/sofia-portrait-440x784.jpg`.

## Preserved versions (not served; kept outside `btl/`)
- `2026-09-27-form-preview-1c51685.html`: the earlier form-first `/paraquat/`. Use its "Landing page" tab. The file also contains the campaign-plan and ad tabs.
- `2026-09-28-current-sofia-chat-74c26a4.html`: PR #129, Sofia chat (was live when this build started).
- `2026-09-28-live-chat-pr130-d884b76.html`: PR #130, merged to main during this build (live Sofia chat plus lawsuit and symptom sections). It conflicts with this PR; Kyle decides which /paraquat/ wins.
- `2026-09-08-studio-prequalify-449318f.html`: the campaign-studio prequalify preview.

## Fail-closed state (why neither page can submit or dial yet)
- **Intake:** `intake.js` sets `CONFIG.endpoint = null`.
  - nil-intake defines only the NIL and DIHAC tenants (`src/intake/tenant-config.js`). BTL is "not yet defined" (`docs/intake/SHARED-LEGAL-INTAKE-CONTRACT.md`).
  - The BTL homepage's Make webhook is unauthenticated, uses `no-cors` and returns no receipt, so these pages do not use it.
- **Phone:** `CONFIG.phone.verified = false`.
  - In Vapi, +12029329700 is named "Sofia Canopy After-Hours (202)". Its assistant, squad and workflow are all null.
  - The BTL Paraquat Sofia (v4 `976d64df…`) is STAGED only.
  - No numbers were rebound.
- **Consent:** channel-specific, never prechecked. The wording follows `btl/sms-terms/` "TCPA disclosure". Version `btl-paraquat-consent-2026-09-28-draft` still needs counsel sign-off.

## To go live (operator steps, each needing its own approval)
1. Add tenant BTL to nil-intake, with a browser-safe web-intake route that returns `{status, lead_id|receipt_id}`. Allow the `besttortlawyers.com` origin, then set `CONFIG.endpoint`.
2. Bind +12029329700 to the approved BTL Sofia inbound assistant, with campaign-context selection. Then set `phone.verified = true`.
3. Load the receiving firm's approved Paraquat criteria into Sofia's profile.
4. Get counsel approval of the consent text and bump `consent_version`.

## QA run (local, synthetic, outbound suppressed)
The QA endpoint was a scratchpad-only stand-in on 127.0.0.1, never shipped. It is honoured only with `?ee_test=synthetic` on local hosts.

| Test | Result |
|---|---|
| Empty submit | 7 fields flagged with `aria-invalid`; focus moves to the first; status text shown |
| Consent prechecked | none |
| 503 on first attempt | error shown; form kept; no success |
| Double-click | 1 request |
| Retry | same `Idempotency-Key`/`submission_id`; receipt shown with the reference id |
| 200 without receipt id | treated as failure |
| Callback without call consent | blocked |
| Callback (name + phone only) | a blank submit flags name, phone and call consent; success shows "Your callback request was received." with "Requested — time not yet scheduled" |
| Quiz | 7 steps, recap, then contact; "Not sure" and "no diagnosis" continue to review with no stop; the payload carries the answers as `screening`; the dataLayer gets step_index only |
| No endpoint (production default) | 0 network requests; upfront banner plus a plain notice on submit |
| Browser analytics | `ee_page_view`, `ee_form_start`, `ee_lead_submit_attempt/success/error`, `ee_callback_open`, `ee_call_click` carry only page_id, campaign_id, tenant_id and a test flag. No PII or answers |
| Third-party requests | none (no pixels or GTM) |
| Keyboard | order is skip link → fields → questions → consent → links → submit; focus ring visible |
| Controls | all labelled; tap targets ≥44px |
| Horizontal scroll at 375px | none |

Screenshots are in `screens/`.
