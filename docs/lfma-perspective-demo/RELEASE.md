# LFMA Perspective demonstration release

Dedicated route: https://lawfirmmarketingapes.com/perspective-demo/
Existing /demo/ is occupied and is preserved. Only seven public assets belong to this route. Source is the tested local BTL demo on branch demo/btl-perspective-20261008, commit6ed1b79; publication worktree starts from actual GitHub main dc896098f395fe726c0e34ae7855236e9846a6dd.

Kyle explicitly authorized this page’s edits, push/merge and LFMA deployment on October8. No phone routing, calls, ads, spend or checkout activation is included.

## Scope and coupling

The existing Render blueprint publishes lfma/ to lfma-site with a lfma/** and build.sh filter. BTL, NIL and DIHAC have separate publish paths and filters. Neither shared build.sh, render.yaml nor another brand is changed. The actual production NIL source is separate according to docs/DOMAIN-RELEASE-CHECKS.md. The two LFMA portal files changed since the earlier local base were read over HTTPS and exactly match current GitHub main, so they are already live. No portal/home/order file is changed. Baseline existing-page hashes are saved privately alongside this receipt.

## Demo, proof and offer

Generic sample-firm branding; no named-client profile, claimant data or raw proof-document URLs are published. BTL, NIL and DoIHaveAClaim remain separate brand contexts; LFMA is the sales surface and Marketing Apes the fee provider. All browser answers/handoffs remain explicitly simulated. No numeric case-strength score or eligibility logic exists. Real media spend and firm outcomes remain unknown/unconnected.

Separate September LA County proof:62intakes/18reported signed, under the historical Litify convention; executed retainers not independently audited, no AI causation or future result guarantee.

Two-week proposal: one-time $2,500 Marketing Apes fee plus $5,000 ring-fenced media. Start date is set only after launch readiness. Verified manual contact: Kyle’s Marketing Apes business line619-736-0356; SMS delivery is untested.

## Video

Actual UI recorded locally with Playwright; 44.92-second VP8 WebM,1280×720, approximately3.1MB, silent with no audio track, burned-in readable captions, English WebVTT and expandable text transcript. No autoplay; preload none, static poster and reduced-motion styles. The Mac’s Homebrew MP4 encoder has a missing libx265.215.dylib dependency; the existing bundled encoder produced the playable WebM without installation or system changes. WebM playback is verified in Chromium; iOS/Safari device playback is not directly tested.

## Payment and phone gates

Existing LFMA Paraquat offer references QuickBooks but leaves CHECKOUT_URL=null. No merchant/payment link/terms for this $7,500 offer were verified. This page prepares a fail-closed QuickBooks-host check with merchantVerified=false, termsVerified=false, approved=false and paymentUrl=null. No payment action can activate it without those explicit verified configuration changes.

The existing213-513-7977route is unchanged; it is not the separate-AI handoff. The public page provides no213dial link. Isolated voice drafts remain in the local demo repository, outside this served route. Actual assistant creation, number binding, authorized inbound/audio validation and verified event ingestion remain separate approvals.

## Verification

Local dedicated-public-build Chromium:19checks passed, including complete journey, native/web capture, consent, cancel/reload/back, repeated requests/clicks, distinct attempted/connected, unavailable receiver, generic personalization escaping,390/768/1440px, no external requests or browser errors, seven-asset public data leakage check and actual video playback. New watch-tour navigation is checked before release.

Run: DEMO_BASE=http://127.0.0.1:4318 node docs/lfma-perspective-demo/verify.cjs
Public verification uses DEMO_BASE=https://lawfirmmarketingapes.com/perspective-demo. Evidence stays outside the lfma publish root.

Rollback: revert this release’s dedicated route and documentation commit; preserve every existing LFMA route. Do not alter service configuration or phone/payment bindings.
