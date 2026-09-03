# kg-site — kylegosselin.com

Lite personal-brand site for Kyle Gosselin (founder, Marketing Apes). Static HTML, no build step,
no frameworks, no external CSS/JS, no raster images (SVG only). Served by Render as a static site
with folder-style clean URLs.

## Tree

| Path | Purpose |
|---|---|
| `index.html` | Front door — what I do, proof block, work-with-me CTA |
| `privacy/index.html` | Plain-English privacy policy (effective 2026-09-03) |
| `pay/index.html` | Invoice placeholder → redirects to Marketing Apes pricing; `/pay/{invoice}` resolves here |
| `404.html` | Not-found page |
| `robots.txt` | **Disallow: /** while in preview |
| `sitemap.xml` | `/`, `/privacy/`, `/pay/` |
| `favicon.svg` | KG monogram (white on navy, red dot) |
| `site.webmanifest` | PWA manifest |

Design base: the Nearest Injury Lawyers house style (same `:root` tokens, dot-grid, header/eyebrow/steps/trust/footer patterns).

## Measurement (Evolution Engine)

Every HTML page:

- `<head>`: `dataLayer.push({event:'ee_page_context', tenant_id:'KG', domain:'kylegosselin.com', page_type:'home'|'privacy'|'pay'|'404'})` **before** the GTM snippet.
- GTM container `GTM-W3CTJQ` (head script + noscript iframe first in body).
- Every element with class `cta` pushes `ee_cta_click` `{cta_id, cta_text, destination, tenant_id, domain, landing_page_url}` on click.
- The pay button (`data-pay`) additionally pushes `ee_pay_redirect` with `invoice_ref` parsed from `/pay/{invoice}`.
- Social icons push `ee_social_click` `{social_platform}`.

CTA ids: `hero_pricing`, `hero_email`, `work_pricing`, `work_email`, `pay_redirect`, `404_home`, `404_email`.
Outbound pricing links carry `utm_source=kylegosselin.com&utm_medium=site&utm_campaign=kg-home|kg-pay`.

## Render setup

- Static Site → this repo, branch `main`, publish directory `.` (no build command).
- Custom domain `kylegosselin.com` (+ `www` redirect).
- Rewrite rule so invoice links land on the placeholder: `/pay/*` → `/pay/index.html` (200 rewrite).
- Render serves `404.html` automatically for missing paths.

## Cutover checklist (preview → live)

- [ ] Remove `<meta name="robots" content="noindex,nofollow">` from every page (set to `index,follow`).
- [ ] Remove / retext the `.build-state` banner (`PREVIEW BUILD · NOT YET LIVE`) in the header of every page.
- [ ] `robots.txt`: `Disallow: /` → `Allow: /` and add `Sitemap: https://kylegosselin.com/sitemap.xml`.
- [ ] Fill in the four social links in the footer (`href="#"` placeholders: linkedin, x, instagram, youtube).
- [ ] Confirm GTM-W3CTJQ container is published with GA4 + Meta + TikTok tags reading `ee_page_context` / `ee_cta_click` / `ee_pay_redirect` / `ee_social_click`.
- [ ] Verify events in GA4 DebugView and the Evolution Engine sheet/BigQuery sink.
- [ ] Point `/pay/` at the ma-control tenant once live (replace the pricing redirect; keep `ee_pay_redirect`).
- [ ] Add DNS: Render A/CNAME + Google Search Console verification; submit sitemap.
- [ ] Add OG image (SVG-only rule lifts at cutover if a raster is needed).
