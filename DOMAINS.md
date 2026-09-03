# DOMAINS.md — how any AI operates a domain in this repo

A domain is a leg out there doing a job to make us profit. Every leg is defined by ONE file:
`<folder>/domain.json`. Read it first. It says what the domain IS, what its JOB is, how it makes
money, where its site deploys, what it measures, which channels it owns, and what is still a human step.

| tenant_id | domain | folder | job (one line) | status |
|---|---|---|---|---|
| NIL | nearestinjurylawyers.com | `nil/` (live site deploys from repo `marketingapes/nil-site`) | connect injured people with firms likely to take their claim — finds via ads, qualifies via Sofia, routes via warm transfer | LIVE |
| MA | marketingapes.com | `ma/` | sell the machine — Sofia demo in 60s, then the 30-day trial payment | preview |
| KG | kylegosselin.com | `kg/` | the builder's proof log — attention lands here, Marketing Apes converts it | preview |
| BTL | besttortlawyers.com | `btl/` | the network brand firms market under — mass tort + specialty; portal | preview |
| DIHAC | doihaveaclaim.ai | `dihac/` | AI legal directory — names the right lawyer type; NIL overflow destination | preview |
| LFMA | lawfirmmarketingapes.com | `lfma/` | firm front door — order/demo → portal | preview |

## Prompt → action map

**"Build a <page> on <domain>"**
1. Read `<folder>/domain.json` → `site.page_rules`, `style`, `cta`, `measurement`.
2. Copy the `<head>` measurement block and the header/footer from that folder's `index.html` verbatim
   (KG: `ee_page_context` push then GTM-W3CTJQ; MA: `EE_GTM_ID` constant then guarded loader).
3. Write the page as `<folder>/<slug>/index.html` (clean URL). Single file, inline CSS/JS, SVG only.
4. Every button = `class="cta"` with `data-cta-id`. Links to other domains carry `utm_source=<domain>`.
5. Add the URL to `<folder>/sitemap.xml`. Keep `noindex` + preview banner while `status` is preview.
6. Commit to `main` (GitHub tool, one file per commit, message `<TENANT>: <what>`). Render auto-deploys
   the static site for that folder (`publishPath = <folder>`). Verify: `curl -I <preview_url>/<slug>/` → 200.
7. Append a line to the domain's Drive `Website/Releases` (or the project decisions log) — what shipped, commit, URL.

**"Post across all channels for <domain>"**
1. Read `channels` in `domain.json` — only channels with `status: exists/live` are real; everything else is a human step (Pages cannot be created by API).
2. Draft once, adapt per channel (FB long, IG caption ≤2,200 + hashtags, TikTok/YT title+desc, X ≤280, LinkedIn pro tone).
   Link = the domain's page with `utm_source=<platform>&utm_medium=social&utm_campaign=<tenant>-social`.
3. Approval gate: manual approval first (standing rule). Show Kyle the drafts; publish on his go.
4. Publish through the channel's `publish_lane` in the manifest (NIL/KG: `<tenant>-control POST /social/publish` once keys exist;
   MA today: Zapier Instagram publish is reachable, Facebook Pages auth is dead — reconnect).
5. Receipt: write `{tenant_id, platform, post_id, url, ts}` to the domain's `Social/<channel>/Receipts` Drive folder + BigQuery.

**"Add a channel / number / inbox to <domain>"** → follow `claude/domain-roadmap.md` stages 0–2. Update `domain.json` when it exists.

## Wired lanes (Make — POST JSON, no AI inside)

Every `domain.json` carries these under `lanes`. Any AI on any domain fires them the same way.

- `social_post`: POST https://hook.us2.make.com/7nr6k0p9jz0m5yqj395apbfqueo170qz {tenant_id,page_id,ig_id,message,link,image_url,post_ig,template_id} → FB Page (+IG) → OUTBOUND MESSAGE LEDGER (Make 6145431)
- `email_as_sofia_nil`: POST https://hook.us2.make.com/iai2v43wxw2l4ojxzvt3pd32orolmisy {lead_uid,to,subject,body_html,template_id,tenant_id} → sofia@nearestinjurylawyers.com → ledger (Make 6144825)
- `campaign_order`: POST https://hook.us2.make.com/dwzmtn5xbkdrt6pjvli9jgy3auppobbi (form fields) → BUYER BOARD row + email Kyle (Make 6145362); page marketingapes.com/order/

Every lane writes a row to OUTBOUND MESSAGE LEDGER (sheet 1bCw7-S6gfbXSurwWmMtn1ZaIkJHc_h6Lgy4h1mHqewU). Sheets = human-read; BigQuery = system-written (mirror to BigQuery as lanes mature).

## Rules that hold on every domain
- `tenant_id` on every event, every row, every receipt — from the first one.
- One lane per event (never Zapier + Make on the same trigger). One webhook per page. One form per campaign.
- Measurement before marketing: no spend until `page_view` + one `ee_*` event show in GA4 **and** BigQuery.
- Secrets live only in Render env. IDs live in `domain.json` + Drive. Never in chat or memory.
- Preview → live is ONE cutover commit per domain: noindex off, banner off, `robots.txt` Allow + Sitemap, then DNS.
- `domain.json` is the source of truth for the leg. Change the leg → change the file in the same commit.
