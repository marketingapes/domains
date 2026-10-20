# BTL firm setup — local review evidence

This extends draft PR #338’s existing MASS_TORT adapter and page renderer. Start with `node campaign-system/setup-server.mjs`, then open the printed loopback URL. Operator instructions and limitations: [MASS-TORT.md](../../campaign-system/MASS-TORT.md).

Screenshots use only a synthetic firm and synthetic input; nothing was published or connected:

- [Desktop setup](evidence/setup-1440.png)
- [Mobile setup](evidence/setup-390.png)
- [Desktop generated review workspace](evidence/review-1440.png)
- [Mobile generated review workspace](evidence/review-390.png)
- [Browser QA receipt](evidence/browser-run.txt)

Real Chromium QA passed at 390px and 1440px: setup, generation, eight downloadable files including the review pack, all four previews, budget/firm/tort isolation, failed-switch rollback and recovery, reordered page/concept import/export, review-heading visibility below sticky navigation, current versus stale attestations, late-response invalidation, malicious imported text, invalid remote-logo refusal, error focus, no horizontal overflow, empty browser storage and no external requests. The browser test is `tests/mass-tort-setup.browser.cjs`; the local API test is `campaign-system/test/setup-server.test.mjs`. Existing CI runs both the normal release checks and the browser suite, preserving screenshots/logs as artifacts.

The UI is usable for local setup and review. The generated consumer pages remain the existing non-submitting demos; Sofia is scripted. Logo/image/video references are not assembled media, and creative slots are not finished creative. Providers remain unconnected in this workspace, even when a configuration contains current human attestation references.

Remaining integration work: final approved creative and logo assembly; firm-approved criteria/geography/copy/consent; verified existing bindings; Make outbound/persistent-save remediation; lead→call→outcome receipts; scheduling, handoff and opt-out tests; actual reporting; agreed fee/media terms; separate budget and activation approvals. No production routing, security configuration, deployment, ads, outreach, number purchase, automatic case acceptance or retainer sending was performed.
