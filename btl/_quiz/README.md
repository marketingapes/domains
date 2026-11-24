# BTL quiz-only template (v1)

This template is one page per campaign: the quiz, then contact details, then submit, then a thank-you page. It's form only: no calls and no Sofia. Phone and voice get layered on later.

## Files
- `_quiz/quiz.js`: the shared engine (quiz, attribution, consent, submit, dataLayer)
- `_quiz/quiz.css`: shared styles. Mobile-first and centered, with no sticky or fixed elements.
- `<firm>/<campaign>/b/index.html`: the campaign page. Its `window.BTL_CAMPAIGN` config holds the questions, the rules (`dq` means not a fit, `review` means firm review), the copy, the consent version and the endpoint.
- `<firm>/<campaign>/b/thank-you/index.html`: the only place the lead conversion fires.
- `network/index.html`: the Marketing Apes Network disclosures. This is a DRAFT; it must be approved and live before production pages link to it.

## New campaign
Copy `glassman/ssdi/b/` to a new folder, then edit:
- the page's title, meta, OG, canonical, schema and favicon
- `BTL_CAMPAIGN` (campaign_id, tenant_id, page_id, questions, copy, consent_version)
- the firm block in the footer
- the campaign_id and page_id checks in the thank-you script

## Contracts
- **Intake:** `btl.intake.web/v1`, sent to the Campaign Kit (Make 6777650), which stores the lead in BigQuery and then answers with `{status, receipt_id}`. The `request_type` is `quiz_submission` or `quiz_not_qualified`, so the Sofia callback branch never triggers.
- **dataLayer:** `quiz_start`, `quiz_step`, `quiz_qualified`, `quiz_not_qualified` and `lead_submit_*`, each with campaign_id, tenant_id and page_id. No PII.
- **Conversion:** the thank-you page pushes `generate_lead` with `lead_id` (BTLK), `campaign_id` and `tenant_id`, once, only for a real first-time qualified lead. GTM's "Client - lead receipt" trigger then sends it to Meta, Google Ads, GA4 (plus sGTM server CAPI), TikTok and OpenAI.
- **Host:** Tag Manager loads only on besttortlawyers.com. Other hosts (staging, local) load nothing, mark submissions as tests, and load TrustedForm directly.

## Verified 2026-11-23 (headless Chromium, mobile viewport, intake mocked)
- QUALIFIED reaches thank-you with `request_type` quiz_submission. NOT_A_FIT reaches the "you're on the list" thank-you with quiz_not_qualified.
- A real lead pushes exactly one `generate_lead` with its lead_id. A reload or a duplicate pushes none. No page errors.
