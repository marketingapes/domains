# Ten toes down — clickable campaign demo

Review-only route: `/demo/ad-to-intake/`. New branch from main
`a6763aa4084860de268fcaf118bcd66f73ab4509`; independent of defective draft PR238.
Homepage, existing demos, providers, generated campaign studios and pricing model
are unchanged. No merge, deployment, outreach or live submission is authorized.

## Journey

1. Lawyer-facing entry: CAN YOUR AGENCY DO THIS? CTA: TRY THE DEMO.
   Theme: TEN TOES DOWN / READY FOR THE EVOLUTION. Marketing Apes / One gorilla + AI.
2. A clearly synthetic MVA ad for placeholder `Your Firm` opens a branded prospect
   page with the same message. No actual firm endorsement is implied.
3. Fixed sample intake answers, separate simulated permission, simulated receipt
   or decline. Changing answers clears permission and the old receipt.
4. Back to the firm: campaign category, transparent planning prices, local JSON
   brief download. Live inquiry button is disabled; no personal details collected.

## Creative decisions and provenance

Audience evidence: Kyle says recipients are mostly lawyers familiar with his work.
Hypothesis: participation makes the next buyer conversation more concrete than
another generic AI pitch. No open/click data was imported or performance claimed.
Three considered mechanisms: (a) founder-led evolution invitation, (b) follow the
prospect's click, (c) evidence-led scoreboard. Lead is Kyle's evolution invitation,
with the click journey as proof of functionality and scoreboard limitations as
support. A scoreboard-first control would test proof emphasis; no experiment runs.

Reuses `../mva-sprint/sprint.css`, `../mva-sprint/journey.svg`, LFMA ape logo,
Kyle portrait, and the existing fixed-answer/permission pattern. No live client
photo, new endorsement or generated visual is introduced. Separately prepared
creative is not yet integrated. The new route has its own small state controller;
importing sprint.mjs would initialize the old demo's DOM bindings.

Applied Evolution Landing Page and Adaptive Creative Director skills. The landing
skill's referenced creative/delivery resources were unavailable; its root guidance
was available. Repository had no AGENTS.md or local SKILL.md in inspected locations.

## Pricing authority

User's current instruction overrides the older studio's monthly management label:
**$2,500 flat campaign build fee**, media separate. Existing generated pricing and
contracts are not rewritten. Media operating amounts follow
`campaign-system/model.mjs` and `campaign-system/README.md`: MVA, personal injury,
major mass tort $10,000; standard tort/sex abuse $5,000. Tests compare all four
amounts to the canonical model. Existing approved agreements/waivers apply.
The MVA walkthrough does not claim to implement every tort's content or criteria.

## Integration blocker and safety

No verified Render intermediary for LFMA contact was found in inspected repository
source. Make6492404 is the current LFMA contact scenario found in read-only review,
with name/firm/email/phone/message/source/submitted_at fields and Kyle notification.
Do NOT copy a Make webhook into this page. PR238's selected legacy campaign-order
route is defective; none of that code or endpoint is reused here.

CSP prohibits connections and form actions. No fetch, analytics, storage, external
assets, free-text input, contact capture, calls, dispatch, invoices or ad spend.
The download is local and explicitly synthetic. There is no real conversion event.
A future live inquiry requires scope approval, verified Render endpoint/contract,
correct current Make forwarding, recipient/side-effect approval, test receipt,
and separate release authorization. No broad backend changes were made.

## Local review

From repository root:

    python3 -m http.server 8765 --directory lfma

Open http://127.0.0.1:8765/demo/ad-to-intake/ .

    node --test tests/lfma-ad-demo.test.mjs
    CHROMIUM_PATH=/usr/bin/chromium node tests/lfma-ad-demo.browser.cjs
    bash tools/check-release.sh

Browser test serves repository assets through request interception; all external
requests and non-GET requests are blocked/count as failures. It covers the four
stages at 375 and 1440px, both consent choices, changed-answer invalidation, reset,
all pricing categories, synthetic JSON download, disabled send, no overflow and
no script errors. Screenshots are written to `/tmp/lfma-ad-demo-review/`.
Desktop entry and mobile screens were visually inspected.

Leading indicators for a future authorized test: demo starts/completions and
inquiry requests. Business outcome: qualified firm conversation confirmed by Kyle.
No analytics is installed, and no lift or signed-case result is inferred here.

Poster limitation: Library `libfile_4c613a0e07408191aee37182e892858e`,
`marketing-apes-ten-toes-down.png`, could not be downloaded with the current
Library materialization helper (initial attempt and one bounded retry).
No local bytes were available to inspect; the poster was not embedded, edited,
or republished. Continue with the code-native creative and existing LFMA artwork.


## Futuristic / primal visual revision

Official MA logo inspected from `ma/assets/network/ape-logo.jpg`, the same asset
referenced by `ma/index.html` at the official marketingapes.com path. The LFMA
copy at `assets/portal/ape-logo.jpg` is byte-identical:
SHA-256 `5dcc03152b3881cd3d943bf36260c514703f07e45a452f75da1cdc77c5426dab`.
Glasses, bow tie, facial features and silhouette are preserved; CSS frames the
unchanged image with orbital lines, grid, and diagonal marks. No replacement
mascot was drawn. Main challenge and actual logo sit beside each other on desktop
and stack on mobile. One headline hierarchy; theme stays in the eyebrow.
Pale paper, black type, restrained electric lime, and 320ms step transitions.
Reduced-motion preference removes animations, transitions and hover movement.
Browser tests verify both motion modes and the official logo loading.
