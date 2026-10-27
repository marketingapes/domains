# Campaign kit — one config, one complete BTL lane

**Read `BRIEF.md` first.** It is the single coordination brief for every AI seat and holds the generated working/missing checklist.

Built 2026-10-26 overnight by Claude. Campaign comes in → write one JSON → run one command → the whole lane is staged.

    node campaign-kit/build.mjs --all            # pages, bundles, BRIEF.md checklist
    node campaign-kit/build.mjs --onboarding     # offline firm/network request preview only
    node --test campaign-kit/test/*.test.mjs
    node tests/campaign-kit.browser.cjs          # real browser; SHOTS=dir saves screenshots

## Firm onboarding and proposed network

See `ONBOARDING.md` for the complete request → scope → invoice → verified payment → staged build → client review → owner launch queue workflow, the proposed directory/membership/inquiry models, and the exact Make/Render boundaries.

`--onboarding` writes a standalone HTML form to `out/onboarding/preview/index.html`; `--all` includes it. It has no network calls, browser persistence, invoice sending, subscriptions or payment actions. Four proposed commercial models share one request contract. Only a managed campaign has draft fee/media lines; membership, inquiry and founding-partner amounts remain unapproved and require a quote. A `DRAFT-` reference is local planning output, never a submission/payment receipt.

`order-contract.mjs` contains shared request validation and a pure server-side state reducer. It is not an HTTP API or persistent workflow. A trusted adapter must authenticate people/provider events, re-fetch payment state and atomically store state plus unique inbox/outbox keys. The browser receives only draft validation helpers. Provider, client and Kyle approvals must bind to the current order/artifact version. A bound invoice cannot be silently replaced.

`RECEIPT.md` records what was tested and which integration work remains.

## Preview vs live

Every config builds as a **preview** unless `"status": "live"`, and the build refuses `live` until all nine gates in `BRIEF.md` carry `{by, at, evidence}`. A preview has no GTM, TrustedForm, dialable phone link or webhook, plus a `connect-src 'none'` CSP; the browser test fails if a preview requests any host but itself and Google Fonts.

## Receipts

Live pages show "Received" only when the webhook answers 2xx JSON `{status: received|accepted|duplicate, receipt_id}`. The submission_id is reused across retries; the receipt is kept for 24h so a reload shows the reference. The intake scenario must store the lead before it answers (see `perspective.json → make_intake_scenario`).

## Transfer destinations

`delivery.transfer = {number, kind: firm|internal|demo, label, source}` is what Sofia's Vapi transfer tool actually dials, read back from Vapi. It may not be a Sofia inbound line. Only `kind: "firm"` is handed to provision-bot or allowed live.

## What one config produces

| Output | Where | Live? |
|---|---|---|
| Hub + 3 doors (quiz, Talk to Sofia, callback form) + ads page | `btl/c/<slug>/` → besttortlawyers.com/c/&lt;slug&gt;/ | Deploys on merge, always `noindex`, unlinked |
| Meta (3 ads, one per door), Google Search RSA + keywords, TikTok, ChatGPT ads | `out/<slug>/{meta,google-search,tiktok,openai-ads}.json` | PAUSED drafts. Nothing calls an ad API |
| Sofia/Vapi: provision-bot input + criteria prompt block | `out/<slug>/sofia.json` | Draft. Run `services/provision-bot` with DRY_RUN first |
| Delivery: live transfer / scheduled callback / buyer API webhook / email | `out/<slug>/delivery.json` | Config only |
| Portal: Make intake spec, legal-web-lead overview entry, Perspective BASIC_PORTALS entry | `out/<slug>/perspective.json` | Paste-ready, not applied |
| Tracking contract: events, join keys, click IDs, consent fields | `out/<slug>/tracking.json` | — |
| Working / missing checklist with evidence | `out/<slug>/LAUNCH.md` + `BRIEF.md` | — |
| Creative manifest: ACTUAL (measured) / Meta-only / PLACEHOLDER / WRONG SIZE / MISSING | `out/<slug>/assets.json` | — |

`"publish": false` renders the pages to `out/<slug>/preview/` instead of `btl/c/` — used for the two parity ports below, whose real lanes already live elsewhere.

## Wire contract (same as the live Paraquat lane)

Live pages POST `payload=<json>&submission_id=<uuid>` (form-encoded, so Make gets it without a CORS preflight) with `schema: "btl.intake.web/v1"`: `contact{}`, `screening{…answers, web_outcome: QUALIFIED|FIRM_REVIEW|NOT_A_FIT, quiz_version}`, `consent{version, calls{granted,text}, sms{granted,text}}`, `trustedform_cert_url`, `attribution{utm_*, gclid, gbraid, wbraid, fbclid, ttclid, fbp, fbc, landing_path, referrer_host}`. `request_type`: form `web_inquiry`, quiz `quiz_inquiry`. `?ee_test=synthetic` (and every preview) adds `test.synthetic: true`.

The existing live-page GTM container is `GTM-PHC7459M`. Its configuration is not evidence that every channel's conversions work or are policy-eligible. Verify approved measurement for the selected channels and document policy-disabled channels before launch, including URL/referrer/event sensitivity. The existing dataLayer event names are `ee_page_view`, `ee_door_click`, `ee_quiz_complete`, `ee_lead_submit_attempt|success|error`; names alone do not prove safe payloads. See `ONBOARDING.md` for the internal outcome and platform-export boundaries.

## Quiz scoring

Each answer option carries a `signal`: `good`, `neutral`, `unsure` (→ FIRM_REVIEW), `bad` or `represented` (→ NOT_A_FIT). Same three outcomes as `btl/paraquat/qualifier.js`. The visitor sees a soft result line; the buyer gets the outcome.

## Shipped configs

- `glassman-bard-powerport.json` — parity port of the live Glassman lane (firm brand, images, 6 questions).
- `btl-paraquat.json` — parity port of the live Paraquat criteria on the BTL house brand (9 questions).

## Adding a campaign (the minutes version)

1. Copy a config. Set `campaign_id`, `slug`, `tenant_id`, `tort`, `geo.states`, `criteria` (buyer-approved — never invented), `quiz`, `sofia` line, `delivery`.
2. Clone Make scenario 6437227 for the intake hook; put its URL in `intake.webhook`.
3. `node campaign-kit/build.mjs …` and `node --test campaign-kit/test/*.test.mjs`.
4. Work the gates in `out/<slug>/LAUNCH.md`. Ad activation is always Kyle's call in chat.

