# Domain stocking report — v1

Foundation v1.2 frozen at `c8c04430efff970777c1ec8102cbbb4238a4b482` — hashes intact: **YES**. Tenants: 14/14 canonical, LEE excluded.

**STOCKED 10 · PARTIAL 4 · BLOCKED 0**

STOCKED = structurally ready (builds, identity, metadata, event bootstrap, experience socket, safety hooks). PARTIAL = a structural gap remains in existing page code that needs a content decision. BLOCKED = the site cannot serve. Missing *external* capabilities never block; they are listed per tenant.

| tenant | domain | status | gate | pages stocked | structural gaps | missing external |
|---|---|---|---|---|---|---|
| BTL | besttortlawyers.com | **PARTIAL** | preview | 8/8 | 1 | 23 |
| CGG | crazygolfgame.com | **STOCKED** | preview | 2/2 | 0 | 26 |
| DDM | discountdealme.com | **STOCKED** | preview | 2/2 | 0 | 27 |
| DIHAC | doihaveaclaim.ai | **PARTIAL** | live | 9/9 | 1 | 23 |
| FPLB | forpetslikeblue.com | **STOCKED** | preview | 2/2 | 0 | 26 |
| KG | kylegosselin.com | **STOCKED** | live | 5/5 | 0 | 23 |
| LFMA | lawfirmmarketingapes.com | **PARTIAL** | live | 10/10 | 1 | 23 |
| MA | marketingapes.com | **STOCKED** | live | 6/6 | 0 | 24 |
| NIL | nearestinjurylawyers.com | **PARTIAL** | live | 7/7 | 2 | 19 |
| PX | pillowexchange.com | **STOCKED** | preview | 2/2 | 0 | 27 |
| RI | researchinvestigation.com | **STOCKED** | preview | 2/2 | 0 | 27 |
| SLIQ | smartlifeinsurancequote.com | **STOCKED** | preview | 2/2 | 0 | 26 |
| TNT | tonedntasty.com | **STOCKED** | preview | 2/2 | 0 | 26 |
| TOSS | tosssports.com | **STOCKED** | preview | 2/2 | 0 | 27 |

## BTL — Best Tort Lawyers (besttortlawyers.com) — PARTIAL

- production gate: `preview` · pages stocked: 404.html, index.html, privacy-policy.html, privacy-policy/index.html, rhode-island-abuse/index.html, sms-terms.html, terms-and-conditions.html, terms/index.html
- structural gaps:
  - borrowed identity in page code (not claimed from both ends): NIL.e164=+16026931461
- notes:
  - campaign landing pages carry their own campaign id (legitimate — a campaign attaches to the domain): btl/rhode-island-abuse/index.html: CAMPAIGN='btl-ri-abuse-2026'
  - legacy webhook URLs are embedded in page code (3 file(s)); Foundation treats hook URLs as secrets — move to hook IDs resolved server-side: btl/404.html, btl/index.html, btl/rhode-island-abuse/index.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: siteground_noindex -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## CGG — Crazy Golf Game (crazygolfgame.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: siteground_noindex -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## DDM — Discount Deal Me (discountdealme.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: down_502 -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## DIHAC — Do I Have A Claim (doihaveaclaim.ai) — PARTIAL

- production gate: `live` (noindex) · pages stocked: about.html, arizona-mva-thank-you.html, contact.html, faq.html, index.html, privacy.html, talk-to-sofia.html, terms.html, thank-you.html
- structural gaps:
  - borrowed identity in page code (not claimed from both ends): MA.e164=+16197360356; NIL.e164=+16026931461
- notes:
  - legacy webhook URLs are embedded in page code (5 file(s)); Foundation treats hook URLs as secrets — move to hook IDs resolved server-side: dihac/about.html, dihac/contact.html, dihac/faq.html, dihac/privacy.html, dihac/terms.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING

## FPLB — For Pets Like Blue (forpetslikeblue.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: siteground_noindex -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## KG — Kyle Gosselin (kylegosselin.com) — STOCKED

- production gate: `live` · pages stocked: 404.html, index.html, now/index.html, pay/index.html, privacy/index.html
- notes:
  - outbound links to another tenant's social account (link only, not identity): MA.page_id
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING

## LFMA — Law Firm Marketing Apes (lawfirmmarketingapes.com) — PARTIAL

- production gate: `live` · pages stocked: about.html, campaign/index.html, contact.html, engine/index.html, google-ads.html, index.html, privacy.html, seo.html, talk-to-sofia.html, terms.html
- structural gaps:
  - borrowed identity in page code (not claimed from both ends): MA.e164=+16197360356; NIL.e164=+16026931461
- notes:
  - legacy webhook URLs are embedded in page code (3 file(s)); Foundation treats hook URLs as secrets — move to hook IDs resolved server-side: lfma/campaign/index.html, lfma/contact.html, lfma/engine/index.html
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING

## MA — Marketing Apes (marketingapes.com) — STOCKED

- production gate: `live` · pages stocked: 404.html, anti-agency/index.html, index.html, order/index.html, pricing/index.html, privacy/index.html
- notes:
  - legacy webhook URLs are embedded in page code (1 file(s)); Foundation treats hook URLs as secrets — move to hook IDs resolved server-side: ma/order/index.html
  - GTM-PENDING placeholder in: ma/404.html, ma/anti-agency/index.html, ma/order/index.html, ma/pricing/index.html, ma/privacy/index.html
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - vapi_sofia: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## NIL — Nearest Injury Lawyers (nearestinjurylawyers.com) — PARTIAL

- production gate: `live` · pages stocked: arizona-mva-thank-you.html, index.html, kyle.html, privacy.html, proof.html, terms.html, testing.html
- structural gaps:
  - borrowed identity in page code (not claimed from both ends): BTL.container_id=GTM-PHC7459M
  - homepage hardcodes a campaign (the domain face must not depend on one): nil/index.html: CAMPAIGN='NIL_MVA_SOFIA_V1'
- notes:
  - legacy webhook URLs are embedded in page code (1 file(s)); Foundation treats hook URLs as secrets — move to hook IDs resolved server-side: nil/index.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - vapi_sofia: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING

## PX — Pillow Exchange (pillowexchange.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: siteground_noindex -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## RI — Research Investigation (researchinvestigation.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: down_502 -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## SLIQ — Smart Life Insurance Quote (smartlifeinsurancequote.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: siteground_noindex -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## TNT — Toned N Tasty (tonedntasty.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: siteground_noindex -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## TOSS — Toss Sports (tosssports.com) — STOCKED

- production gate: `preview` (noindex) · pages stocked: 404.html, index.html
- remaining external capabilities (provider / Kyle action):
  - email_human: MISSING
  - email_transactional: MISSING
  - email_bulk: NEEDS_AUTH
  - sms: MISSING
  - phone: MISSING
  - vapi_sofia: MISSING
  - facebook: MISSING
  - instagram: MISSING
  - tiktok: MISSING
  - youtube: MISSING
  - linkedin: MISSING
  - x: MISSING
  - threads: MISSING
  - pinterest: MISSING
  - meta_ads: NEEDS_AUTH
  - google_ads: NEEDS_AUTH
  - tiktok_ads: NEEDS_AUTH
  - affiliate_api_feeds: MISSING
  - commerce: MISSING
  - ga4_gtm: MISSING
  - bigquery: MISSING
  - drive: MISSING
  - consent: MISSING
  - suppression: MISSING
  - kill_switch: MISSING
  - dns_cutover: down_502 -> render (human, DNS)
  - canonical_events: MISSING in Foundation (bootstrap now emits ee_*; flip the leaf once observed in GA4/BigQuery)

## How to re-run

```sh
node tools/stock-domains.mjs            # regenerate + re-audit
node tools/stock-domains.mjs --check    # drift gate (used by tests)
python3 tools/verify-foundation.py      # frozen hashes + frozen validator
node --test tests/*.test.mjs
```
