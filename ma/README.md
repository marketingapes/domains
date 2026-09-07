# Marketing Apes — marketingapes.com

Static files served from the `ma/` folder of `marketingapes/domains`. The homepage
preserves the Evolution Engine design and content captured from the live
marketingapes.com site on September 6, 2026, with a canonical URL and an explicit
email contact flow replacing the original nonfunctional demo form.

## Demo requests

Homepage demo buttons navigate to `#contact`. The contact section opens the
visitor's email app with a message addressed to `kyleg@marketingapes.com` and the
subject `Marketing Apes Demo Request`. Visitors must send that email themselves.
The address is also visible so visitors can copy it into their preferred email
service. Kyle handles requests manually; the homepage has no form endpoint,
automatic call, CRM enrollment, or submission-success message.

## Files and visibility

| Path | Purpose |
|---|---|
| `index.html` | Public Evolution Engine homepage with manual email demo requests |
| `robots.txt` | Allows the homepage; excludes unfinished pricing, order, anti-agency, and privacy routes |
| `sitemap.xml` | Lists only the public homepage |
| `privacy/index.html` | Existing preview policy; still noindex and excluded from the sitemap pending review |
| `pricing/index.html`, `order/index.html`, `anti-agency/index.html` | Existing unfinished pages; retain their noindex directives and remain outside the sitemap |
| `404.html` | Existing not-found page |
| `favicon.svg`, `site.webmanifest` | Existing supporting assets |

The imported homepage uses Tailwind's CDN script, Google Fonts, inline styles,
and inline JavaScript for visual effects. It has no build step. It does not
include the preview pages' Evolution Engine tracking code or an active analytics
integration. Existing preview pages still contain their guarded `GTM-PENDING`
configuration.

The live-source footer's placeholder links are preserved. The privacy policy
still has a preview banner and describes analytics and demo communications that
do not match the homepage's manual email flow; review it before promoting it or
adding it to the sitemap. The preview pages remain reachable directly;
robots.txt controls crawling, not access.

## Render hosting

- Static site: `ma-site`, repository `marketingapes/domains`, branch `main`.
- Build command: `echo "ma static"`; publish path: `ma`.
- Folder index files provide clean URLs; `404.html` handles missing paths.
- Public canonical URL: `https://marketingapes.com/`.
- Custom-domain, DNS, and TLS status must be verified separately during cutover.

## Static verification

Check inline JavaScript syntax, every nonempty local fragment target, the exact
demo email URL, the canonical URL, sitemap XML, and crawler rules. Preserve the
noindex directives on unfinished pages. Compare the homepage with the captured
live source to confirm that changes stay limited to canonical metadata and the
contact flow. Browser layout and Render/domain verification follow deployment.
