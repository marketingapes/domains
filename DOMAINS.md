# DOMAINS.md — how any AI operates a domain in this repo

**Foundation v1.2 (`marketingapes.domain.foundation/v1.2`). Read `FOUNDATION.md` first.**

## The one distinction everything else rests on

**A domain is a permanent tenant capability foundation.**
**A campaign is a separate job that attaches to a `tenant_id` / `domain_id`.**

A campaign must eventually attach TO a domain. **A campaign must never BE the domain.**

`<tenant>/domain.json` answers exactly one question: *what does this tenant own, and in
what state?* It never answers *what are we running right now.* Campaign state, lead lanes,
buyers, offers, budgets and routing are invalid in a manifest by shape — rejected
recursively by `additionalProperties: false`, not by keyword blocklist.

**The Universal Domain MCP (Evolution Engine) is the canonical control plane.** It is a
schema `const`. `nil-intake`, `ma-control` and `kg-control` are specialized runtime
adapters, not control planes and not sources of truth.

**A missing capability stays explicitly missing.** `MISSING` and `NEEDS_AUTH` are answers.
**UNKNOWN DOES NOT MEAN BORROW** — shared infrastructure is allowed, but it must always
carry `tenant_id`/`domain_id`, and every share must be claimed from both ends.

## The canonical 14

`portfolio.json` is the closed set — a set, not a count. LEE is excluded (its site folder
stays; it simply is not a tenant).

| tenant_id | hostname | current hosting state |
|---|---|---|
| BTL | besttortlawyers.com | siteground_noindex |
| CGG | crazygolfgame.com | siteground_noindex |
| DDM | discountdealme.com | down_502 |
| DIHAC | doihaveaclaim.ai | render |
| FPLB | forpetslikeblue.com | siteground_noindex |
| KG | kylegosselin.com | render |
| LFMA | lawfirmmarketingapes.com | render |
| MA | marketingapes.com | render |
| NIL | nearestinjurylawyers.com | render |
| PX | pillowexchange.com | siteground_noindex |
| RI | researchinvestigation.com | down_502 |
| SLIQ | smartlifeinsurancequote.com | siteground_noindex |
| TNT | tonedntasty.com | siteground_noindex |
| TOSS | tosssports.com | down_502 |

`current_hosting_state` is where a domain resolves **today**. `intended_canonical_hostname`
is where it is supposed to resolve. Never collapse the two.

## Reading a manifest

Eleven categories, 47 capability leaves per tenant:

`hostname` · `web` · `communications` · `social` · `paid_media` · `measurement` · `data` ·
`automation` · `commerce` · `intake` · `safety`

Every leaf carries two independent axes:

| axis | values | means |
|---|---|---|
| `connection_status` | VERIFIED \| CURRENT \| MISSING \| NEEDS_AUTH \| NOT_APPLICABLE | do we have it |
| `activation_state` | ON \| OFF \| NOT_APPLICABLE | is it running |

`MISSING` or `NEEDS_AUTH` ⟹ `activation_state` is `OFF` or `NOT_APPLICABLE`. **A capability
that is not connected cannot be on.** The schema enforces this; it is not a convention.

Identity-bearing capabilities carry generic ownership — `owner_tenant_id` and
`shared_with[]` — on every capability, never network-specific. A tenant that declares a
value it does not own must name the owner, and the owner must name it back. Self-declared
ownership proves nothing.

## Verify before you trust it

```sh
python3 tools/verify-foundation.py     # frozen hashes + frozen validator + schema. exit 0 = intact
node --test tests/*.test.mjs           # includes the campaign-build mutation guard
```

`validate.py` is **frozen — never edit it.** It globs `domains/*.json`; this repo stores
`<tenant>/domain.json`. `tools/verify-foundation.py` stages the layout and runs the frozen
validator unmodified. If the layouts diverge, change the wrapper.

## Prompt → action map

**"Build a `<page>` on `<domain>`"**
1. Read `<folder>/index.html` for the `<head>` measurement block and header/footer, and copy
   them verbatim. Page conventions live in the site folder, not in `domain.json` — the
   manifest tells you *which* GTM container and GA4 property are real, under `measurement`.
2. Write the page as `<folder>/<slug>/index.html` (clean URL). Single file, inline CSS/JS, SVG only.
3. Every button = `class="cta"` with `data-cta-id`. Cross-domain links carry `utm_source=<domain>`.
4. Add the URL to `<folder>/sitemap.xml`. Keep `noindex` + preview banner while the domain is
   not yet publicly launched.
5. Publish through the domain's runtime adapter (`nil_` / `kg_` / `ma_` `_create_page` /
   `_update_page`) with `{action_id, approval_message, files:[{path, content}]}`. `index.html`
   is protected: change the homepage via git. Fallback: one file per commit, `<TENANT>: <what>`.
6. Append what shipped, the commit and the URL to the domain's Drive `Website/Releases`.

**"Post across all channels for `<domain>`"**
1. Read `social` in the manifest. Only `VERIFIED`/`CURRENT` accounts are real. `MISSING` is a
   human step (Pages cannot be created by API) — **do not substitute another tenant's account.**
2. Check `owner_tenant_id` before posting. If the account is shared, you are posting as the
   owner, and the owner's `shared_with[]` must already list this tenant.
3. Draft once, adapt per channel (FB long, IG ≤2,200 + hashtags, TikTok/YT title+desc, X ≤280,
   LinkedIn pro tone). Link carries `utm_source=<platform>&utm_medium=social&utm_campaign=<tenant>-social`.
4. Approval gate: manual approval first (standing rule). Show Kyle the drafts; publish on his go.
5. Receipt: `{tenant_id, platform, post_id, url, ts}` to Drive `Social/<channel>/Receipts` + BigQuery.

**"Add a channel / number / inbox to `<domain>`"** → provisioning is a foundation change.
Flip the capability from `MISSING`/`NEEDS_AUTH` only once it actually exists, then re-run
`tools/verify-foundation.py` and update `foundation.sha256` in the same commit.

**"Run a campaign on `<domain>`"** → a campaign is a separate job carrying `tenant_id` and
`domain_id`. It reads the foundation. **It never writes to it.**

## Automation and webhooks

`automation.webhooks` stores **hook IDs only**. A hook URL is an unauthenticated endpoint and
is treated as a secret: it is never stored in a manifest, in this file, in chat, or in memory.
`safety.secrets_policy` states the rule per tenant — no API keys, tokens, webhook URLs,
passwords or private keys, ever. Resolve a hook ID to its URL in Make at the moment of use.

## Runtime adapters (one codebase, one per domain)

| domain | adapter | tool prefix | site repo/folder |
|---|---|---|---|
| NIL | nil-intake | `nil_` | marketingapes/nil-site (root) |
| KG | kg-control | `kg_` | marketingapes/domains `kg/` |
| MA | ma-control | `ma_` | marketingapes/domains `ma/` |

These are adapters. The canonical control plane is the Evolution Engine / Universal Domain MCP.

Env contract per service (names are literal, never rename): DOMAIN_ID, CANONICAL_DOMAIN,
MCP_TOOL_PREFIX, WEBSITE_VERIFY_MARKER, WEBSITE_REPO_ROOT, WEBSITE_PUBLISH_KEY, MCP_ACCESS_KEY,
NIL_GITHUB_OWNER/REPO/BRANCH/TOKEN, NIL_RENDER_SITE_SERVICE_ID,
NIL_DRIVE_{LIVE,RELEASES,ARCHIVE}_FOLDER_ID, RENDER_API_KEY, REDIS_URL,
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-gtm.json (+ that secret file).
Secrets live only in Render env.

## Rules that hold on every domain

- `tenant_id` on every event, every row, every receipt — from the first one.
- One lane per event (never Zapier + Make on the same trigger). One webhook per page. One form per campaign.
- Measurement before marketing: no spend until `page_view` + one `ee_*` event show in GA4 **and** BigQuery.
- Secrets live only in Render env. Never in `domain.json`, this file, chat, or memory.
- Preview → live is ONE cutover commit per domain: noindex off, banner off, `robots.txt` Allow + Sitemap, then DNS.
- `<tenant>/domain.json` is the source of truth for what the tenant OWNS. Change what it owns →
  change the manifest and `foundation.sha256` in the same commit, and re-run the verifier.
- Nothing that is not one of the canonical 14 gets a manifest. `LEE` is excluded by name.

## Superseded by v1.2 — do not look for these

`site.page_rules` · `channels` · `lanes` · `style` · `cta` · `campaign_studio` · any campaign
or runtime state inside `domain.json`. They are gone. Page conventions live in the site
folder; channel reality lives in `social`/`communications` with a two-axis status; automation
lives in `automation` with hook IDs; campaign state lives with the campaign.

## Stocking layer (v1) — how a site plugs into the engine

Foundation says what a tenant **owns**. The stocking layer makes the site **able to use** the engine
without pretending any capability exists. Read `shared/ee/README.md`.

- `<tenant>/ee/bootstrap.js` (verbatim copy of `shared/ee/bootstrap.js`) — `window.EE.track()` emits
  `ee_*` events with `tenant_id`, `domain_id`, `session_id`, `landing_page_url`, UTMs/click IDs, and
  `campaign_id`/`variant_id` only when a campaign exists. Campaign stays optional.
- `<div id="ee-experience" data-ee-socket="primary" hidden>` — the dynamic experience socket where
  AI-generated tools/pages mount via `EE.experience.mount()`. One socket, fourteen domains, no rewrites.
- `EE.safety.{consent, suppression, killSwitch, productionGate}` + `EE.outbound.allowed()` — hooks
  exist on every domain and are OFF until the manifest says the capability is connected.
- `<tenant>/ee/site.json` — the 27 capability sockets with the Foundation's two axes, statuses only.

Regenerate + audit: `node tools/stock-domains.mjs` → `stocking/REPORT.md` / `stocking/report.json`.
Drift gate: `node tools/stock-domains.mjs --check`. Never hand-edit `<tenant>/ee/*` or the injected blocks.
- Provider hook URLs never live in the repo **and never reach the browser**. Pages call
  `EE.hooks.post('<action>', payload, {identity})`; the only destination the page can produce is the Evolution
  Engine's governed actions route `<EE_ACTIONS_<TENANT>_ENDPOINT>/<TENANT>/<action>`. `build.sh` writes
  `<tenant>/ee/runtime.js` (gitignored, public) with action *names* + engine endpoints only; a legacy
  `EE_HOOK_<TENANT>_<NAME>` value is discarded with a warning. The engine adapter holds the provider URL and
  re-validates every request server-side. Unconfigured = fails closed.
- Even the engine route is only handed out through the outbound gate (runtime tenant matches, kill switch OFF,
  gate live, connected consent store + evidence recorded, connected suppression source + authoritative clear
  check for the identity). Unknown ⇒ fail closed. The page-side gate is a pre-check, not the security boundary.
- Complete suite: `npm test` (tests/*.test.mjs + campaign-system/test/*.test.mjs, browser tests included).

