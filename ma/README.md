# ma-site — marketingapes.com (lite)

One job: sell the Sofia 30-day trial and take the $10,000 payment. Static HTML, no build step,
no frameworks, no external CSS/JS, no raster images (SVG only). Served by Render as a static site
from the `ma/` folder of the `marketingapes/domains` repo with folder-style clean URLs.

## Tree

| Path | Purpose |
|---|---|
| `index.html` | Front door — Evolution Engine pitch, how it works, two CTAs (pricing / DEMO) |
| `pricing/index.html` | The Sofia Campaign — $10,000 / 30 days card, pay button (mailto until the QBO payment link exists), "own the machine" card, small print |
| `privacy/index.html` | Plain-English privacy policy (effective 2026-09-03) |
| `404.html` | Not-found page |
| `robots.txt` | **Disallow: /** while in preview |
| `sitemap.xml` | `/`, `/pricing/`, `/privacy/` |
| `favicon.svg` | MA monogram (white on navy, red dot) |
| `site.webmanifest` | PWA manifest |

Design base: the kylegosselin.com / Nearest Injury Lawyers house style (same `:root` tokens, dot-grid,
header / eyebrow / steps / cta-block / footer patterns).

## Measurement (Evolution Engine)

Every HTML page, in `<head>`, in this order:

1. `var EE_GTM_ID = 'GTM-PENDING';` — the **only** place the GTM container id lives.
   `EE_TENANT = {tenant_id:'MA', domain:'marketingapes.com'}` sits next to it.
2. `dataLayer.push({event:'ee_page_context', tenant_id:'MA', domain:'marketingapes.com', page_type:'home'|'pricing'|'privacy'|'404'})`.
3. The standard GTM loader, reading `EE_GTM_ID`. It is guarded and **does not load while the id is `GTM-PENDING`**,
   so the preview never 404s against googletagmanager.com. There is no `<noscript>` iframe on purpose (single source of truth).

Click events (footer script, shared by every page):

- Every element with class `cta` pushes `ee_cta_click` `{cta_id, cta_text, destination, tenant_id, domain, landing_page_url}`.
- The pay button (`data-cta-id="pay-trial"`, `data-pay`) additionally pushes `ee_pay_redirect`
  `{cta_id, destination, offer_id:'sofia-trial-30d', value:10000, currency:'USD', tenant_id, domain, landing_page_url}`.

CTA ids: `hero_pricing`, `hero_demo`, `work_pricing`, `work_demo`, `pay-trial`, `pricing_demo`, `own_talk`, `404_home`, `404_pricing`.

## Render setup

- Static Site `ma-site` → repo `marketingapes/domains`, branch `main`, build command `echo "ma static"`, publish path `ma`.
- Render serves `404.html` automatically for missing paths; folder index files give clean URLs.
- Custom domain `marketingapes.com` (+ `www` redirect) at cutover.

## Cutover checklist (preview → live)

- [ ] **Payment link — still TBD.** QuickBooks multi-use payment-link creation errored via MCP on 2026-09-03, so the "Start the trial — $10,000" button currently opens a pre-filled `mailto:` to kyleg@marketingapes.com (subject "Start the Sofia trial ($10,000)", body asks for state / what you don't take / intake line) and the page promises the secure link by reply within the hour. Kyle creates the link in QBO → Payment links, then replace that `mailto:` href in `pricing/index.html` with the real checkout URL. Keep `data-pay`, `data-offer-id`, `data-value` so `ee_pay_redirect` keeps firing.
- [ ] **GTM**: set `EE_GTM_ID` to the real container id in all four HTML files (`grep -rn "GTM-PENDING"` must return nothing). Publish the container with GA4 + Meta + TikTok tags reading `ee_page_context` / `ee_cta_click` / `ee_pay_redirect`.
- [ ] Remove `<meta name="robots" content="noindex,nofollow">` from every page (or set to `index,follow`).
- [ ] Remove / retext the `.build-state` banner (`PREVIEW BUILD · NOT YET LIVE`) in the header of every page.
- [ ] `robots.txt`: `Disallow: /` → `Allow: /` and add `Sitemap: https://marketingapes.com/sitemap.xml`.
- [ ] Verify events in GA4 DebugView and the Evolution Engine sheet / BigQuery sink; confirm `ee_pay_redirect` fires once per click.
- [ ] **DNS**: point `marketingapes.com` A / `www` CNAME at Render; add the custom domain on the `ma-site` service; wait for TLS.
- [ ] Google Search Console verification; submit sitemap.
- [ ] Add OG image (SVG-only rule lifts at cutover if a raster is needed).
