# Marketing Apes intro deck — `/intro/`

Date: 2026-09-16  
Repo: `marketingapes/domains`  
Base: `main` @ `5ae8849bf91dd29d7b8f0925ada9f4a1e95b8a65`  
Branch: `feat/ma-intro-deck`  
Live source of truth: current `ma/index.html` (not `ma/domain.json`)

## Goal

A louder, darker 8-slide intro at `https://marketingapes.com/intro/` that makes a stranger think **maybe I should talk to Kyle**. Homepage hero, planner, and contact stay as they are.

Website live ≠ lead ≠ answered call ≠ signed work ≠ collected money. This page is an intro, not a campaign, not a store.

## Audience

Anyone who lands on Marketing Apes and might pay somehow. One story, two exits: call/email Kyle, or build a starter plan.

## Out of scope

- Homepage hero replacement
- PPTX/PDF download (follow-up)
- TikTok ads, spend, or posting
- Sofia auto-call, pay links, trial prices from `ma/domain.json`
- Promoting `/pricing/`, `/order/`, `/anti-agency/`
- New GTM/pixels/placeholders
- DNS cutover or new Render services

## Visual

Darker / louder, same house tokens:

| Token | Value |
|---|---|
| Background | ink `#14241f` |
| Headlines | lime `#d2f48a` |
| Body | paper `#f7f7ef` |
| Captions | muted `#56615a` on ink, or `#aebb9f` if muted fails contrast |
| Display | Manrope |
| Body | DM Sans |
| Emphasis | Georgia italic (same as homepage `em`) |
| Logo | existing `/assets/network/ape-logo.jpg` |
| Atmosphere | existing `/assets/network/ape-future.png` as art, not fake clients |

Full-viewport slides. One idea per slide. No emoji icons. No stock photography. No invented metrics. Visible focus rings. 44px tap targets. `prefers-reduced-motion: reduce` → instant cuts, no transform choreography.

Chrome on every slide: brand home link, `01 / 08` index, prev/next. Last slide holds the CTAs.

## Copy (locked)

Drawn from live homepage language. Do not add client names, dollar results, or guarantees.

1. **Hook** — IT’S TIME FOR AN EVOLUTION. / Is your business ready for the *future?* / Connect your domain, website, advertising, and AI tools in one system built around your business.
2. **Problem** — THE USUAL MESS / Site. Ads. Creative. Follow-up. / They usually don’t share one job. Activity piles up. Nobody can say what actually happened next.
3. **Offer** — YOUR BRAND, CONNECTED. / Websites + paid ads + creative + AI + automation / From your first website to your next campaign, we help you build, launch, and improve—with AI integrated where it serves a clear purpose.
4. **How we start** — START WITH A PURPOSE / One priority. Four weeks. Real outcomes. / Pick the bottleneck. Get a practical starting point and the outcomes worth measuring. Scope, fees, and ad spend are agreed before anything runs.
5. **Sofia** — AI WITH A JOB TO DO / Meet Sofia. Your next *conversation starter.* / An assistant with a defined role and a human handoff. She is not a replacement for you.
6. **Honesty** — HONEST BY DEFAULT / No invented clients. No invented revenue. / We don’t invent case studies or guarantees. A click is not an answered call. Signed work and collected money have their own proof.
7. **Keys** — YOU KEEP THE KEYS / Your domain. Your brand. Your accounts. / Ownership stays with you. Media spend is separate from service fees unless your agreement says otherwise. We start by reviewing what already works.
8. **Ask** — READY FOR YOUR MARKETING UPLIFT? / Big plans? Let’s get to *work.* / CTAs only:
   - `tel:+16197360356` — Call Kyle · 619-736-0356
   - `/#planner` — Build my starter plan
   - `mailto:kyleg@marketingapes.com` — kyleg@marketingapes.com

Footer line (small): Marketing Apes provides marketing and automation services. It is not a law firm.

## Architecture

Static, no build, same pattern as `ma/privacy/`.

| File | Role |
|---|---|
| `ma/intro/index.html` | Slides + header + noscript fallback of all 8 texts + CTAs |
| `ma/intro/intro.css` | Intro-only styles (do not edit `home.css`) |
| `ma/intro/intro.mjs` | Keyboard, click, swipe, hash/index, reduced-motion |
| `ma/index.html` | Add nav link `Intro` → `/intro/` next to Our services. Do not change hero or planner. |
| `ma/sitemap.xml` | Add `https://marketingapes.com/intro/` |
| `ma/robots.txt` | No change needed (`Allow: /`; unfinished routes stay disallowed) |

Components:

- **Deck viewport** — one visible slide; others `hidden` or offscreen with `aria-hidden`
- **Slide** — eyebrow, h1, lede; slide 8 also has the three CTA links
- **Controls** — previous, next, 8 dots; `aria-controls` / `aria-current`
- **Hash** — `#1`…`#8` so a link can open a specific beat

No form. No fetch. No credentials. Noscript: stacked slides, all readable, CTAs work.

## Interaction

- Arrow keys, `Home`/`End`, click dots, swipe
- Clamp 1–8 (no infinite loop)
- Next on last slide stays on last slide
- Touch targets ≥ 44px
- Screen reader: live region announces “Slide 3 of 8”

## Tests (must pass before merge)

1. Homepage still has `#planner`, `tel:+16197360356`, `mailto:kyleg@marketingapes.com`
2. `/intro/` 200, HTTPS, title includes Marketing Apes
3. All 8 locked headlines present in HTML (not JS-only)
4. Slide 8 hrefs exact: `tel:+16197360356`, `/#planner`, `mailto:kyleg@marketingapes.com`
5. No `vapi`, no dollar amounts, no client names, no `GTM-PENDING`
6. Unfinished `/pricing/`, `/order/`, `/anti-agency/` not linked from intro or new nav
7. Keyboard next/prev changes `aria-current`
8. Existing domain release checks still pass; 17 frozen hashes outside `ma/` stay unchanged if those fixtures exist

## Deploy / rollback

- Isolated branch off `5ae8849`. Prefer CI-passed release. Do not merge other brands.
- Verify first on the existing MA Render static URL if apex and Render ever diverge. Do not create a new service. Do not change DNS, MX, or DKIM.
- Rollback: revert the branch (delete `ma/intro/`, restore `ma/index.html` nav and sitemap). Homepage content otherwise unchanged.

## Success

A visitor can finish the deck in under a minute and has a real call, email, or planner action. No fake proof. No spend.
