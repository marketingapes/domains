# LFMA campaign request → staging preview

## Built
`lfma/assets/campaign-request-preview.mjs` exports `createCampaignBundle(raw)` and `mountCampaignPreview(container, raw)`.
The compiler consumes the homepage's `request_raw` fields and produces a versioned campaign brief plus three branded HTML concepts: consultation form, Sofia introduction and quiz. $10,000 total remains $2,500 service/$7,500 media. Optional CRM, destination, hours, criteria and branding are retained. Missing details are explicit. HTML content is escaped; supplied asset links are references, never fetched. Output includes no active form, phone call, script or tracker. No external request occurs.

## Homepage integration (same request; no extra outreach)
After successful local validation and creation of `env`, dispatch:
`window.dispatchEvent(new CustomEvent('lfma:campaign-request-prepared', {detail: env.request_raw}));`
Add a hidden `section#campaignPreview` and module importing `mountCampaignPreview`, listening to that event. Mount before/independently of the existing email delivery response, so users can preview even if notification delivery fails. Label email and generated concept states separately. The preview is only in this browser until the user downloads the HTML/JSON.

## Not done / exact deployment needs
- Publishing the branch makes this browser generator available; no new paid service is required.
- This is NOT a Render job, persistent campaign, launched advertisement, installed CRM or live lead destination.
- For a durable Render queue, choose an existing authenticated request endpoint and storage table; validate this v1 brief server-side, issue a server receipt/job ID, persist artifact revision, and run the same compiler in a worker. Do not substitute the current email webhook's HTTP response for a build-job receipt.
- Connect invoice/payment and account-specific provider jobs only after their scope is agreed; test storage and artifact retrieval with synthetic data first.
- Firm review is still required for legal copy, qualification rules, brand assets and intake configuration. Preview never invents those facts.

## Verification
`node --test tests/lfma-campaign-request-preview.test.mjs`
No real webhook/provider submissions are made by these tests.
