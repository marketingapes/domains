# LFMA lead verification — review candidate

Additive route: `/lead-verification/`. Adapted from `kg/i-am-here/index.html` at base `85bdd1ad2f42d486105c272261a6a643020d4855`. Matches LFMA home colors, system typography, rounded cards, local ape logo and Kyle portrait. No existing page, report, demo, foundation, endpoint or tracking configuration is changed. Deliberately noindex until publication review; no homepage or sitemap changes.

## Source and evidence

The checked-in KG page reads UA/device/system, language, local time, screen and route hints. It includes Google Analytics and a Google Maps iframe that receives coordinates. It also queries prior permission to auto-request geolocation. Its denial path hides the button before relabeling it. There is **no IP lookup endpoint** in that source. Live KG inspection was attempted but blocked by the environment proxy; production parity is not verified.

This adaptation reads only a system hint, preferred language, viewport and local opening time. A fresh button press is required for every location request, even if permission was previously granted. No map, IP service, permission query, tracker, live lead request, storage or fingerprint identifier is added. Coordinates remain in transient page memory; clear removes the displayed value without changing browser permissions. The browser/OS may use location services, and hosting access logs are outside this page's control. CSP blocks connections, frames and form submissions.

Evidence-panel implementation references: `lfma/assets/order-intake-client.mjs` (`buildOrderPayload`, `createOrderSubmitter`, `acknowledgementEvent`): required-field and email-format validation, references, readable acknowledgement, mounted-form send guard. These are buyer-order checks, not consumer contact ownership, cross-record deduplication or measured spam filtering. `lfma/demo/mva-sprint/` is synthetic. The new fictional receipt selector represents intended review decisions, not a deployed filter.

No false-lead reduction results were provided. A production proof needs a defined false-lead metric, comparable before/after samples, false-positive review, server-side checks and firm outcome reconciliation. Health/injury history and location are not used for eligibility or fraud decisions.

## Verification

- `node --test tests/lfma-lead-verification.test.mjs` (11 focused cases, included by existing release runner).
- `bash tools/check-release.sh` (full existing release checks).
- For browser QA, serve `lfma/` locally on port 8765: `python3 -m http.server 8765 --bind 127.0.0.1 --directory lfma`.
- With Playwright available and Chromium at `/usr/bin/chromium`, run `node tests/lfma-lead-verification.browser.cjs`. Uses mocked synthetic coordinates (12.34567, 23.45678), never the owner's location. Checks 390px and 1440px, overflow, assets, no page errors, no external requests, denial/retry, unavailable, timeout, success/clear, fictional receipt changes, and no-JavaScript content. Saves screenshots under `/tmp/lfma-lead-verification-{390,1440}.png`.

Draft PR only. Parent review is required before merge or deploy. Avoid PR219; PR221's NIL files are outside this change.
