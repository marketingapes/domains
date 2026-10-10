# kg-site — kylegosselin.com

Kyle Gosselin's personal site. Static HTML, no build step, no framework. Render static site `kg-site`
publishes this folder; **any merge to `main` that touches `kg/` deploys live.**

## Story build (Oct 2026)

| Path | Purpose |
|---|---|
| `index.html` | Homepage as a scrolling story in 9 chapters, ending in "Work with me" |
| `now/index.html` | Running log (October 2026) |
| `assets/story.css`, `assets/story.js` | Shared styles (bronze palette, system fonts) and CTA tracking, reveal, chapter index |
| `assets/kyle-headshot-*.webp/jpg` | Hero photo (from `lfma/assets/kyle-headshot.png`) |
| `assets/og-kyle.jpg` | 1200×630 OG/Twitter card |
| `privacy/`, `pay/`, `snake/`, `404.html` | Unchanged pages (AdSense script removed from privacy and snake) |
| `robots.txt` / `sitemap.xml` | Allow all; sitemap refreshed 2026-10-09 |

Unlisted, left as is: `hey-mom/`, `i-am-here/`, `love/`, `campaigns/`, `preview/`, `social-preview/`
(the latter still serves CSS and images used by older pages), `publishing-check-20260907/`.
Retired: `rizeup/`, `dispatch/`. Their original content is gone; each folder now holds only a noindex
stub that redirects to `/`.

**Why the stubs exist:** Render static sites keep serving files from earlier deploys when a later deploy
simply deletes them (kg-site's build is `echo "kg static"`, publish path `kg`, and deleted paths kept
returning the Oct 2 copy). Overwriting a path with new content is what replaces it. To retire a page,
replace its `index.html` with a redirect stub; don't just delete the folder. A Render dashboard
redirect rule (`/rizeup/*` and `/dispatch/*` to `/`) would also work, but kg-site isn't declared in `render.yaml`.

## Measurement

- GA4 `G-2KRKVE3Y3R` (gtag) and GTM `GTM-W3CTJQ`, with `ee_page_context` pushed before GTM.
- Any element with `data-cta` fires a GA4 event and an `ee_cta_click` dataLayer push.
  GA4 event names: `call_my_ai` (tel:+12138787408), `book_call` (Google Calendar booking), `follow_x` (x.com/kylepractor),
  and `cta_<name>` for the rest. `data-loc` is sent as `cta_location`.
- Mark `call_my_ai`, `book_call`, and `follow_x` as key events in GA4 to count conversions.
