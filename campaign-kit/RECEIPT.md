# BTL onboarding build receipt

Date: **2026-10-27** (America/Los_Angeles)  
Status: **BUILT-NOT-LIVE / REVIEW REQUIRED**  
Repository: `marketingapes/domains`  
Branch: `codex/btl-campaign-onboarding-20261027`  
Base commit: `7096cf5bdd2429faf4f446ce50e7ed867549f4b3`

## Delivered

- Existing `build.mjs` extended with `--onboarding`; `--all` includes the firm request preview.
- Four request steps: program, key qualifiers, firm/intake, scope/review.
- Four models: managed campaign, qualified-inquiry program, proposed membership, custom founding partner.
- Standalone offline HTML at `out/onboarding/preview/index.html`, with strict no-network CSP and local draft export.
- Shared deterministic request validator and trusted-server state reducer in `order-contract.mjs`.
- Payment/quote/build/revision/release guards, including duplicate/reversed/conflicting payment handling and no replacement of an already-bound invoice.
- Complete system and adapter specification in `ONBOARDING.md`.
- Existing conversions gate remains mandatory, with wording corrected to verify approved selected-channel measurement and document policy-disabled channels.

## Checks actually completed

| Check | Result | Evidence |
|---|---|---|
| Existing generator `node campaign-kit/build.mjs --all` | PASS | Both shipped campaign previews plus onboarding generated |
| Full kit unit suite | **33 tests PASS, 0 failures** | `node --test --test-isolation=none campaign-kit/test/*.test.mjs` |
| Browser test syntax | PASS | `node --check tests/campaign-kit.browser.cjs` |
| Desktop browser interaction | PASS | Empty required fields rejected; four-step synthetic draft; clearly labeled DRAFT reference; JSON download produced; revise works; membership removes managed fee/media totals |
| Mobile render and step review | PASS | Real browser with 390px frame (375px content plus scrollbar); each reviewed step fits without horizontal overflow |
| Independent contract review | FIXED + RETESTED | Reviewer found requote/reissue after a payment hold could replace a bound invoice; guards added to both transitions and regression passed |
| Full existing automated browser suite in local executor | **BLOCKED BY ENVIRONMENT** | `listen EPERM: operation not permitted 127.0.0.1`; no browser-suite pass claimed |
| Automated browser coverage in PR | ADDED; CI result separate | Existing suite now exercises onboarding at 390/1280, invalid inputs, exact cents, download, revisions, all proposed models and network/storage isolation |

The normal Node test worker-isolation path is restricted in this executor. The explicit no-isolation run executes all 33 named tests; a one-file runner summary is not used as the test-count receipt. No dependency/browser installation or sandbox escalation was performed to bypass the local browser-server restriction. Interactive UI checks used the supported preview environment.

## Important limits

This is an offline front end and pure state contract. It is not a deployed transaction service. The trusted adapter still must authenticate users and Intuit signatures, re-fetch provider payment truth, enforce tenant authorization and atomically persist state plus unique inbox/outbox entries. The reducer does not supply those integrations.

No Make scenario was edited or run. No invoice, subscription, payment link, customer email, claimant call, ad campaign activation, production deployment or main-branch change was performed. No live network membership, qualification, legal approval or campaign outcome is claimed.

A state named `live` in a synthetic unit fixture only tests a reducer transition; it is not a release receipt. Payment alone never authorizes live actions. PPL, membership and founding-partner requests cannot reach invoice-draft state through the standard managed-campaign adapter.

The current campaign configurations and the existing production page tree are unchanged. Legacy regenerated changes are the measurement-gate label in `BRIEF.md` and the two campaign `LAUNCH.md` files. Browser-synthetic details are the only submitted test inputs.

## Source hashes

SHA-256, before this receipt is committed:

| File | Hash |
|---|---|
| `build.mjs` | `85702e4fc5bc3fbd5617e5294514e807fdfc4ceaf64e33f453e88cba76a9f57c` |
| `order-contract.mjs` | `98dad065fada989defd5857cd757cb3d72a7fcd3346c1a66d3d0dd06964dccca` |
| `onboarding.css` | `3d448387febe65d3e3d3def9c59b0daf1da688faf6406df82ae0618cda6ee313` |
| `out/onboarding/preview/index.html` | `84f34110ec6d9a356f3236880ed923bb7f45576e0137c0e1cc6be8af85e60ce2` |
| `test/order-contract.test.mjs` | `3c1e7ca6fdac855a0a497e819086de6030fb433730ddeeab8032c5241089b688` |
| `test/onboarding.test.mjs` | `11f3f2f776c2865c9562f728e02002d228806f323fa98526d7df2f2598dcc96a` |
| `../tests/campaign-kit.browser.cjs` | `a3f9c5e0383a2e10be68857906666445af0cef9d40f58997a27e249882e4ac8f` |

## Restart point

Review the PR and commercial/network blueprint. Next implementation work belongs in the existing Render application and approved provider adapters: authenticated order storage, invoice reconciliation, payment-to-build outbox and owner review queue. Before any live test, resolve the firm/criteria/real intake route, payment account capability, approved commercial scope, data permissions and jurisdiction-specific routing model. Stop at PR review; release remains Kyle's decision.
