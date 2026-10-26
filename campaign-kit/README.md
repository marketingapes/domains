# Campaign kit — one config, one complete BTL lane

Built 2026-10-26 overnight by Claude. Campaign comes in → write one JSON → run one command → the whole lane is staged.

    node campaign-kit/build.mjs campaign-kit/campaigns/<slug>.json   # or --all
    node --test campaign-kit/test/*.test.mjs

## What one config produces

| Output | Where | Live? |
|---|---|---|
| Hub + 3 doors (quiz, Talk to Sofia, callback form) + ads page | `btl/c/<slug>/` → besttortlawyers.com/c/&lt;slug&gt;/ | Deploys on merge, always `noindex`, unlinked |
| Meta (3 ads, one per door), Google Search RSA + keywords, TikTok, ChatGPT ads | `out/<slug>/{meta,google-search,tiktok,openai-ads}.json` | PAUSED drafts. Nothing calls an ad API |
| Sofia/Vapi: provision-bot input + criteria prompt block | `out/<slug>/sofia.json` | Draft. Run `services/provision-bot` with DRY_RUN first |
| Delivery: live transfer / scheduled callback / buyer API webhook / email | `out/<slug>/delivery.json` | Config only |
| Portal: Make intake spec, legal-web-lead overview entry, Perspective BASIC_PORTALS entry | `out/<slug>/perspective.json` | Paste-ready, not applied |
| Tracking contract: events, join keys, click IDs, consent fields | `out/<slug>/tracking.json` | — |
| Launch gates (status BUILT-NOT-LIVE until every gate passes) | `out/<slug>/LAUNCH.md` | — |

`"publish": false` renders the pages to `out/<slug>/preview/` instead of `btl/c/` — used for the two parity ports below, whose real lanes already live elsewhere.

## Wire contract (same as the live Paraquat lane)

Pages POST `payload=<json>&submission_id=<uuid>` (form-encoded, so Make gets it without a CORS preflight) with `schema: "btl.intake.web/v1"`: `contact{}`, `screening{…answers, web_outcome: QUALIFIED|FIRM_REVIEW|NOT_A_FIT, quiz_version}`, `consent{version, calls{granted,text}, sms{granted,text}}`, `trustedform_cert_url`, `attribution{utm_*, gclid, gbraid, wbraid, fbclid, ttclid, fbp, fbc, landing_path, referrer_host}`. `request_type`: form `web_inquiry`, quiz `quiz_inquiry`. `?ee_test=synthetic` adds `test.synthetic: true`. Success shows only on a 2xx; failures show the phone fallback.

GTM `GTM-PHC7459M` already loads the Meta pixel, TikTok pixel, ChatGPT ads SDK, GA4, Google Ads conversion and CallRail number swap, so kit pages are tracked on every channel with no extra wiring. dataLayer events: `ee_page_view`, `ee_door_click`, `ee_quiz_complete`, `ee_lead_submit_attempt|success|error` — no personal data.

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
