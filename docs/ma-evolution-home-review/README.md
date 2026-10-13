# Marketing Apes homepage — authorized homepage release

Kyle subsequently authorized actual Claude to tell the Evolution Engine story and launch the homepage live. This release retains the reviewed visual design and manual contact route. Only homepage source/assets and their verification/documentation are included; the staged inquiry backend remains on a separate unpublished branch.

Claude authored the six final public copy blocks in an independent authenticated session: https://claude.ai/chat/acba6e63-801a-416f-ba32-8433031f732c . The exact response is preserved in `claude-story.json`; the page uses those values. The LFMA task's Claude conversation was not modified. Dynamic branding is framed as coordinated audience-aware drafts, preserving brand identity and requiring review before live changes.

The following original review handoff records the inspected contracts and preparations. Its initial release-approval gate was superseded by Kyle's explicit homepage launch instruction; backend deployment and automatic Make inquiry delivery remain separately gated.

# Original review handoff

Built in an independent clone of marketingapes/domains, branch `review/ma-evolution-home`, based on `a3cba29f757c394a7cf7ad98156b47aea9b92f4d` (includes Tom's published page). No push, PR, merge, deployment, account change, automated message, call or Make execution is part of this work.

## What changed

The homepage leads with marketing optimization and ROI as the objective. The Evolution Engine connects advertising, websites, AI voice/chat, intake/routing, CRM follow-up and verified outcomes. Three concrete engagement examples: a campaign test, a connected conversation, or a scoped system on the customer's domain. Direct and white-label delivery are scoped individually; no fixed price, performance guarantee or implied turnkey integration.

Primary destinations are exactly one LFMA link (`https://lawfirmmarketingapes.com/`) and one LeadApes link (`https://leadapes.com/`). LeadApes' canonical URL is confirmed in `leadapes/index.html` and the public URL returned HTTP 200 on 2026-10-13. Neither destination source changed.

Visual direction: an editorial connection diagram. Warm monochrome, authentic existing black-and-white ape logo, large sans-serif typography with serif emphasis, generous spacing and a dark customer-journey band. Alternatives considered: a cinematic AI/avatar showcase (would overemphasize the persona), a dashboard concept (would require invented metrics), and this connection diagram (makes the business process concrete without manufacturing proof). Kyle's existing portrait is reused in grayscale via CSS; no new brand assets or image generation.

## Preserved contracts

- Canonical homepage `https://marketingapes.com/`, MA tenant, `ee_page_context` and live GTM `GTM-NMVJ33` preserved. JavaScript loads production GTM only on marketingapes.com/www. Existing noscript GTM fallback retained; local no-JS QA blocks it.
- Existing `kyleg@marketingapes.com` and `tel:+16197360356` contact routes retained. No telephone routing or email-account configuration changed.
- Existing Tex demonstration and launch form remain at `/tex/`. The redesigned homepage no longer promotes launch-list enrollment or the dated launch pricing. Legacy pages and their forms remain unchanged.
- Social footer uses the parent task's authenticated audit evidence: Facebook `https://www.facebook.com/137455619624058`, Instagram `https://www.instagram.com/marketingapes/`, LinkedIn `https://www.linkedin.com/company/marketing-apes`. Links do not claim API publishing readiness. No other brand profiles were verified.
- Foundation manifests, Tom, all LFMA/LeadApes files and every other domain unchanged. No Bri route exists in this checked-out commit; all files other than the explicit changed-file list are preserved.
- Static HTML/CSS and a small progressive module; no site runtime dependencies, external fonts, new platform or backend.

## Inquiry form and Make handoff — release blocker for automatic delivery

The review form validates name, email, business, direct/white-label engagement and the bottleneck. It prepares a visible summary and a mailto message; visitors must send it. Status explicitly says nothing has been sent. It never POSTs, calls, enrolls or fires a lead event. Personal answers remain in memory, with only a UUID reference stored in sessionStorage; nothing is copied to analytics. The button starts disabled until JavaScript initializes; no-JS visitors use the direct email link.

Read-only Make inspection on 2026-10-13 resolved the existing MA scenario:

- Team 2008339, zone us2.make.com.
- Scenario **6145362**, `MA — Campaign Order Intake (order page → Buyer Board → notify Kyle)`, active, zero incomplete executions.
- Flow: webhook → Sheets addRow → email → webhook response. Connections 10704442 and 10705689 reported `ok`.
- Sheets filter requires `email` and `buyer_name` or `firm`, labeled "Real order only".
- Response module 4 returns HTTP 200 with `{"ok":true}` and permissive CORS. There is no deduplication module or durable inquiry receipt in the inspected flow.

The broader inquiry must NOT be silently treated as a campaign order or Tex launch subscription. No scenario was edited or executed. Existing raw hook URLs are not copied into new source or review artifacts.

`ma/inquiry-form.mjs` exports validated payload generation and a future same-origin relay transport, but the page never calls that transport. Before enabling automatic form submission, reuse the existing MA infrastructure with an explicitly scoped inquiry branch/adapter:

1. Resolve the intended MA inquiry storage and Kyle notification route. Preserve the existing order behavior; do not borrow the LFMA or legal intake lane.
2. Keep the Make hook server-side. Select a real deployed relay path before setting it; `/api/inquiry` in unit fixtures is synthetic, not a provisioned endpoint.
3. Accept schema `ma.system_inquiry/v1`: `submission_id` UUID prefixed `ma-inquiry-`, `tenant_id: MA`, `domain_id: marketingapes.com`, `product: system-inquiry`, `type: ma_system_inquiry`, `lead_source: ma_home_inquiry`, validated `contact_name`, `email`, `company`, `engagement`, `notes`, timestamp and explicit contact authority. Server must validate identity, field lengths, rate limits and origin independently.
4. Durably dedupe on tenant + submission_id before downstream notifications; return the original receipt on retry, and reject a changed payload under the same accepted ID with HTTP 409. Create a new ID only for a genuinely new request after confirmed acceptance.
5. Return `{"status":"accepted|duplicate","submission_id":"matching-id","receipt_id":"durable-id"}` only after durable storage. Queue acceptance is not email delivery. Track notification failure separately; don't ask the browser to resend after an accepted receipt.
6. Use timeout/abort, one in-flight request, retain the same reference on uncertain failure and show a recoverable error without erasing answers. Server validates reply authority before any call/text enrollment; homepage inquiry alone authorizes neither.
7. Verify with suppressed synthetic data and a matching storage receipt, dedupe retry, timeout, invalid email, rate-limit, rejected origin, downstream notification failure and no-PII analytics tests. Live sends and activation remain separately gated.

## Verification

- `sh build.sh`, frozen foundation verification and all 318 repository unit tests passed after the final inquiry implementation.
- Chromium QA at 360, 390, 768 and 1440px: no horizontal overflow, broken local links/images or browser errors. WCAG 2 A/AA + 2.1 AA axe scan: zero violations at each width. Keyboard skip link and no-JavaScript content/contact pass.
- Form tests use `qa@example.invalid` and synthetic text. Repeated preparation retains the same reference, shows no sent state, and makes no outbound request. Relay unit tests reject absent/mismatched receipts and exercise accepted/duplicate, HTTP failure and network failure using mock fetch only.
- External requests blocked during local QA. No production inquiry, email, webhook test, phone call or ad change occurred.
- Desktop and mobile screenshot pixels were inspected. Portrait sizing corrected after the first pass. CSS respects reduced motion and visible keyboard focus.
- Existing homepage-specific tests were updated for the authorized redesign; legacy Tex/intro behavior remains covered.

## Changed source files

- `ma/index.html`
- `ma/evolution-home.css`
- `ma/inquiry-form.mjs`
- `tests/ma-evolution-home.test.mjs`
- `tests/ma-evolution-home.browser.cjs`
- `tests/ma-intro.test.mjs`
- `tests/ma-tex-teaser.test.mjs`
- `tests/ma-tex-talk.test.mjs`
- `docs/ma-evolution-home-review/README.md`

Review screenshots, test receipts and the standalone HTML artifact are local deliverables under `review-artifacts/`; raw live baselines are internal only and contain legacy hook URLs, so are not committed or uploaded.

## Exact preview and release steps

From this clone:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory ma
# Open http://127.0.0.1:8765/
```

Open `review-artifacts/marketing-apes-homepage-review.html` directly for a self-contained preview with embedded images/CSS/form logic and no production analytics. Its email composition works in a normal browser; sandboxed Library HTML previews may suppress JavaScript, so use the local browser for form review.

Reproduce browser QA with temporary tooling (not a site dependency):

```sh
npm install --prefix /tmp/ma-review-tools --no-audit --no-fund playwright@1.56.1 @axe-core/playwright
# Set MA_QA_CHROMIUM to an installed Chromium executable if needed.
MA_QA_MODULES=/tmp/ma-review-tools/node_modules node tests/ma-evolution-home.browser.cjs
```

**Do not run release operations until Kyle approves the reviewed design.** After approval and resolving automatic form delivery if requested for launch:

1. Fetch origin/main inside this isolated clone; inspect concurrent changes to `ma/index.html` and preserve newer Tom/Bri/LFMA content. Do not reset or switch the other task's checkout.
2. Create a new release branch from the latest origin/main, cherry-pick the review commit listed in the final handoff, and resolve only this homepage's explicit changed files. Stop on unexpected domain changes.
3. Run `bash tools/check-release.sh` and the browser QA. Check `git diff origin/main --name-only` against the list above. Obtain final approval if the reviewed page changes materially during reconciliation.
4. Push that release branch and create a PR containing the review screenshots, verified checks and form limitations. Merge only with explicit release authorization. `ma-site` is configured for main-branch commit deployment per `ma/README.md`; avoid pushing to main during review.
5. Verify the published homepage and both destinations, logo, form mode, social links and tracking identity after the authorized deployment. Do not submit a real inquiry without separate authorization.
6. If rollback is needed, revert only this review commit on a separate branch, preserving intervening Tom/Bri/domain work; re-run checks and use the approved release process.
