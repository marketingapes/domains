# DDM deal-checker lookup

**Deployed Nov 15, 2026 (Kyle approved), free plan:** https://ddm-deal-checker.kyleg-188.workers.dev (workers.dev only, no route on discountdealme.com, no DNS change). Secrets `CJ_API_TOKEN` and `CJ_COMPANY_ID` are Worker secrets.

`/deal-checker/` works today without this: it searches the static price log at
`/data/price-check.json` (built by `coupons_refresh.py` from CJ product search on every refresh).

This Worker adds a **live** lookup for items the static log does not have yet. It is the lightest option:
a free-tier Cloudflare Worker (DDM is already behind Cloudflare), no database, no paid plan.

- `GET /check?q=<name or URL>` searches CJ product search across joined advertisers, keeps only stores
  that have a `/coupons/` page (the brand-safety list is applied at build time), and returns the same
  row shape the page uses. The CJ token stays in Worker secrets.
- No history is invented: a live result has one observation (today). History only grows from the daily log.
- Optional `ai_note` (Workers AI, off by default) is one sentence built only from the returned rows. The page labels it "AI summary".
- Rate limited (30/min per IP). Logs nothing.

## Redeploying
Run `python3 make_stores.py` after a coupon refresh if the store list changed, then `npx wrangler deploy` (secrets persist).

## Original setup steps
1. `cd tools/ddm-deal-checker-worker && npx wrangler secret put CJ_API_TOKEN` and `CJ_COMPANY_ID`.
2. `npx wrangler deploy`, then add a route such as `api.discountdealme.com/*` (or `discountdealme.com/api/*`).
3. Set `CHECKER_API` in `tools/adsense-builders/ddm/coupons.py` to that URL, rebuild, open a PR.

Amazon: the page links to an Amazon search with the TNT tag (`tonedntastyne-20`, Kyle's call for now) and says we don't track Amazon prices. No Product Advertising API keys exist in the Render env groups, so Amazon prices are not used.
If keys are added later, the Worker is the place to call it (server-side signing), and results must still
be labelled with their source and time.
