# LFMA four-preview publication

Explicit user approval: Kyle agreed to separate LFMA preview links for comparing the four alternatives on his phone (October9 12:43UTC). This publication is additive under `lfma/perspective-options/`, from reviewed source38be7e93d3b38537d244d698d640baccd7ae046c. Existing homepage, perspective-demo, perspective-preview, portals and campaigns are unchanged.

The existing LFMA Render service is static (`srv-da5m28ijobas73f5s6t0`, repo marketingapes/domains, main, build `sh build.sh`, publish `lfma`, automatic deploy after checks pass). No new service, API, credential, database, DNS or service setting is needed or changed.

## Deployment adaptation

The reviewed local build depended on a loopback-only Node API. Publishing that transport would leave its draft controls unusable. The explicitly allowed browser-only mode instead ports the reviewed DraftStore to tab memory, replacing Node random/hash helpers with Web Crypto and serializing commands while the hash resolves. Validation, derived artifacts, confirmation requirements, frozen illustrative review, replay/cancellation and expiry remain the same. A parity test verifies equal hashes/artifacts/offer against the exact reviewed Node store fixture. No answer or action is sent to a backend. No bearer or business answers are stored in browser persistence. Leaving/reloading clears the tab's engine; another tab starts independently.

Only the draft transport, lifecycle clear, browser-only labels and corrected exit links are adapted. Four reviewed narratives, historical caveats, scoped claims, engagement structures and illustrative pricing are preserved. The existing demo links go to the untouched /perspective-preview/, and the logo goes to the existing homepage. The ape logo is reused from existing public assets. Source hashes are recorded in source-provenance.json; public asset hashes are in release.json.

Browser-only draft review does not accept an order, create an invoice, confirm payment, provision or launch anything. Voice/QuickBooks actions remain disabled. Scripted Sofia/receptionist statuses stay explicitly simulated, with no phone receipts. The historical LA figures are CRM-reported, retainer-unaudited, with no guarantee or AI-causation claim. Named firm, claimant or private source records are not served. The operator's offline Ibay/Manny asset sample and private voice/config files are not part of this public package.

## Checks before merge

- Six new unit checks: Node/browser parity, validation/scope, stale/repeated operations, cancellation/review invalidation, expiry/isolation, command serialization/clear, and absence of network/persistence/provider code.
- Nine Chromium scenario groups: four pages ×360/390/768/1440, working drafts with all API paths blocked, safe personalization/review, scope/markup validation, fictional consent paths, shared comparison/Back, opener/reload isolation, cancellation/repeated actions, expiry and no API/POST/external requests or page errors.
- Full existing repository build/foundation/unit and required GitHub workflow checks before merge.
- Existing public-route hashes captured before publication. Four new URLs were404. After Render is live at the merge SHA, verify every package asset hash, all four HTTPS pages/mobile journeys and unchanged existing routes.

Live voice, payment/invoicing, provider handoff, ads and email are outside this publication. No blocked Library upload is attempted.
