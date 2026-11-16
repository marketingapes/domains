# ee-click: first-party click-ID capture (CORE-capture-web)

One script for every Marketing Apes domain. It is step 1 and 2 of the click ID to conversion loop.

- Captures `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`, `msclkid` and `utm_*` on landing.
- Keeps them in a first-party cookie `ee_attr` (90 days) plus localStorage, with a visitor id `ee_id` (1 year).
- Builds Meta's `_fbc` from `fbclid` and a first-party `_fbp` if missing. It loads no third-party pixel.
- Stamps `ee_id` and a source flag into affiliate sub-ID fields, keeping the existing tag:

| Network | Field | Example |
|---|---|---|
| CJ | `sid` (query or `/sid/` path) | `fplb-bf-chewy_k8b5h33wnk_g` |
| Awin | `clickref2` = ee_id, `clickref3` = flag (`clickref` kept) | `clickref=h2m-offers-zlike&clickref2=k8b5h33wnk&clickref3=g` |
| Impact | `subId2` = ee_id, `subId3` = flag (`subId1` kept) | |
| Amazon | `ascsubtag` (`tag` kept) | `tnt-recipe-x_k8b5h33wnk_g` |
| ShareASale / Rakuten | `afftrack` / `u1` | |

Flags: `g` gclid, `gb` gbraid, `wb` wbraid, `f` fbclid, `t` ttclid, `m` msclkid, `u` UTM only, `o` organic or direct.

- Adds the same fields as hidden inputs to non-search forms at submit, and exposes `window.eeClick.fields()`
  for scripts that build their own payload (FPLB, DDM, CGG and KG signup scripts merge it).
- Pushes `ee_click_ids` to `dataLayer` so GTM and GA4 can record `ee_id`.

Join key: network reports return `ee_id` in the sub-ID; signups carry `ee_id` plus the raw click IDs.
The server-side join (BigQuery `clicks_raw` / `conversions_raw`) and CAPI / Google Ads / GA4 MP sends
come next and need BigQuery access.

Run `python3 tools/ee-click/sync.py` after editing the source. It copies the file into each site and tags
new pages. Copies must stay byte-identical (`tests/ee-click.test.mjs`). BTL loads it with
`data-ee-forms="off"` so legal intake payloads are unchanged.
