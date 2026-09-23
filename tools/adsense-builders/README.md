# AdSense site generators

One folder per brand. Each `build.py` regenerates that brand's static content site
(home, articles, about/contact/privacy/terms, SVG illustrations, robots, sitemap)
into `<slug>/` at the repo root, per `docs/ADSENSE-SITE-SPEC.md`.

Run from the repo root, e.g. `python3 tools/adsense-builders/cgg/build.py`, then
`ADSENSE_BRANDS=cgg node --test tests/adsense-sites.test.mjs`.

Some scripts were written with an absolute output path (`/home/user/domains/<slug>`);
adjust `OUT`/`ROOT` at the top of the script if your checkout lives elsewhere.
Hand edits made after generation (e.g. copy fixes) must be mirrored in the script.
