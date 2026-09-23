# AdSense Content Site Spec (non-legal brands)

Owner: Kyle Gosselin · Publisher: `pub-5194583669093303` · Written 2026-09-23

Purpose: replace the `/preview/` redirect stubs on the non-legal brands with real,
original content sites that pass Google AdSense review. **Never apply this to a
legal brand** (BTL, DIHAC, NIL, LFMA, LEE) — no AdSense on legal, by owner decision.

Enforced by `tests/adsense-sites.test.mjs`.

## Brands in scope

| slug | hostname | voice / angle | contact email |
|---|---|---|---|
| cgg | crazygolfgame.com | mini golf & fun golf: party games, backyard courses, trick shots, course design, gear for casual golfers | info@crazygolfgame.com |
| tnt | tonedntasty.com | fitness + food: high-protein recipes, meal prep, beginner training, habits | lindsay@tonedntasty.com |
| wiwc | whatisworkingcapital.com | small-business finance explained: working capital, cash flow, ratios, financing options (educational, not advice) | hello@whatisworkingcapital.com |
| fplb | forpetslikeblue.com | practical pet care for dogs & cats: training, enrichment, grooming, travel, new-pet checklists | blue@forpetslikeblue.com |
| px | pillowexchange.com | sleep & pillows: pillow types by sleep position, care, fit, sleep hygiene | hello@pillowexchange.com |
| ddm | discountdealme.com | smart shopping: how to spot a real deal, coupon stacking, price tracking, returns, budgeting | hello@discountdealme.com |
| toss | tosssports.com | adult rec sports: finding leagues, rules explainers (cornhole, kickball, pickleball, bowling), team names, game-day | hello@tosssports.com |
| sliq | smartlifeinsurancequote.com | life insurance explained plainly: term vs whole, how much cover, riders, the quote process (educational, not advice) | sofia@smartlifeinsurancequote.com |
| ri | researchinvestigation.com | "know before you buy": how to research products, companies, contractors, reviews, scams | hello@researchinvestigation.com |
| tbrew | tossedbrew.com | craft beer: styles explained, pairing, homebrew basics, glassware, brewery trips | hello@tossedbrew.com |
| h2m | hair2makeup.com | hair & makeup: event/bridal looks, booking a stylist, prep, tools, how-tos | hello@hair2makeup.com |
| tnd | thenearestdentists.com | dental health info: finding a dentist, what visits cost, procedures explained, kids' teeth, emergencies (educational, not advice) | hello@thenearestdentists.com |

Excluded on purpose: `bhs` (brand name likely trips AdSense "shocking content"),
agency sites (ma, dma, seoapes, reapes, leadapes, health, dental, kylepractor),
retired stubs (cawk, stopableed, tbrewery). `kg` only gets the AdSense head tag.

## Do not touch

`<slug>/preview/**`, `<slug>/domain.json`, `<slug>/offers/**`, `<slug>/guides/**`,
`*-checklist/**`, `practice-session-planner/**`, `ads.txt` contents. These are
covered by other tests or carry verified affiliate IDs. You MAY link to them.

## Required files per brand (all relative to `<slug>/`)

```
index.html                 real home page (NO redirect, NO "preview", NO "coming soon")
about/index.html
contact/index.html         email address + what to write about; no form
privacy/index.html         must include the AdSense cookie language below
terms/index.html
articles/index.html        list of all articles
articles/<slug>/index.html >= 12 articles, each >= 700 words of body text
assets/site.css            one shared stylesheet
assets/site.js             optional, small, no external deps
images/*.svg               original illustrations (see Images)
contact.html               keep the file; replace body with a link/refresh to /contact/
404.html                   brand-styled, noindex
robots.txt                 exact template below
sitemap.xml                every indexable page, absolute https URLs
ads.txt                    google.com, pub-5194583669093303, DIRECT, f08c47fec0942fa0
_redirects                 exact template below
```

## Every HTML page `<head>` must contain

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>… | Brand</title>
<meta name="description" content="…">
<link rel="canonical" href="https://HOST/path/">
<meta name="google-adsense-account" content="ca-pub-5194583669093303">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5194583669093303" crossorigin="anonymous"></script>
```

Plus the brand's existing GTM/GA IDs if the preview had them (copy the snippet
from `preview/index.html`). Auto ads only — do not hand-place `<ins>` ad units.
Plus Open Graph tags (`og:title`, `og:description`, `og:image` → an SVG in /images).

## robots.txt

```
User-agent: *
Allow: /
Disallow: /preview/

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://HOST/sitemap.xml
```

## _redirects

```
/preview/*  /  301
/preview    /  301
```

## Privacy policy — required AdSense language (adapt wording, keep every point)

- Third-party vendors, including Google, use cookies to serve ads based on a
  user's prior visits to this and other websites.
- Google's use of advertising cookies enables it and its partners to serve ads
  based on visits to this and/or other sites on the Internet.
- Users may opt out of personalised advertising at
  <https://adssettings.google.com> (and <https://www.aboutads.info>).
- Link: "How Google uses information from sites that use its services" →
  <https://policies.google.com/technologies/partner-sites>.
- Analytics (Google Analytics / Tag Manager) disclosure, contact email, last-updated date.

## Content rules (these are what get sites approved or rejected)

1. **Original and genuinely useful.** Write each article fresh. No spun or
   templated paragraphs repeated across pages. Specific, practical detail:
   steps, numbers that are general knowledge, examples, checklists, FAQs.
2. **No fabricated claims.** No "we tested", "hands-on", "our lab", invented
   star ratings, invented prices, invented reviews/testimonials, invented
   experts or credentials, invented statistics. Author = "The <Brand> team".
   Talk about product *categories* and how to choose, not fake product rankings.
3. **YMYL brands** (wiwc, sliq, tnd, tnt nutrition): add a short "educational
   information, not professional advice" note; stay conservative and accurate.
4. **No affiliate links you invent.** Only link to the brand's existing
   `/offers/` page if it exists. Keep any `#ad` disclosure on pages that do.
5. **Navigation** on every page: logo/home, Articles, About, Contact.
   **Footer** on every page: About, Contact, Privacy, Terms, ©2026 brand.
6. Each article: H1, intro, 4+ H2 sections, a hero illustration, at least one
   more inline figure/diagram/table/checklist, an FAQ (3+ Qs), "Related
   articles" (3 internal links), last-updated date 2026-09-23.

## Images

All images are original inline-able SVG files in `images/` (no hotlinking — the
build container cannot fetch external images, and borrowed photos are a
copyright risk). Each brand needs:

- `images/hero.svg` — big, fun, colourful home-page illustration (1600×900 viewBox)
- `images/og.svg` — 1200×630 share card with the brand name
- `images/logo.svg` — simple wordmark/icon
- one `images/<article-slug>.svg` hero per article (1200×675 viewBox),
  a genuine illustration of the topic (scenes, objects, characters, diagrams) —
  not just a title on a gradient. Use `<title>` + `role="img"` + alt text.

Photos can be swapped in later (Leonardo) without changing layout.

## Design

Fun and on-brand, not a generic template: distinct palette + Google Font pairing
per brand, playful hero, illustrated article cards, hover states, one small
interactive widget on the home page where it fits (e.g. a calculator, picker,
checklist, or random-challenge generator — plain JS, no network calls).
Mobile-first; no horizontal scroll at 360px; system dark mode optional.
Accessibility: alt text, labelled controls, contrast AA.
