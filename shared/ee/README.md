# `shared/ee/` — the domain stocking layer (v1)

One shared runtime that every canonical domain loads. It sits **on top of** Foundation v1.2 and
never writes to it. `<tenant>/domain.json` says what a tenant owns; this layer makes the site able
to *use* the engine — emit canonical events, host AI-generated experiences, and honor the safety
hooks — without pretending any provider capability exists.

```
shared/ee/bootstrap.js        source of truth (copied verbatim into <tenant>/ee/bootstrap.js)
tools/stock-domains.mjs       generator + injector + auditor  →  stocking/report.{json,md}
tests/domain-stocking.test.mjs guard (drift, identity, secrets, build, Foundation hashes)
<tenant>/ee/site.json         per-tenant capability sockets — statuses only, derived from domain.json
```

Regenerate after editing the bootstrap or any page: `node tools/stock-domains.mjs`. Generated files
are committed (same rule as `campaign-system/`) because the Render static sites have no Node build.

## What a stocked page carries

In `<head>` (one block, idempotent, replaced on regenerate):

```html
<!-- ee:stocking v1 --><script>window.EE_SITE=Object.freeze({"tenant_id":"TNT","domain_id":"tonedntasty.com", ...statuses only})</script><script src="/ee/bootstrap.js" defer></script><!-- /ee:stocking -->
```

Before `</body>` — the **dynamic experience socket**:

```html
<!-- ee:socket --><div id="ee-experience" data-ee-socket="primary" data-tenant-id="TNT" hidden></div><!-- /ee:socket -->
```

Hidden by default. Nothing visible changes on a site until an experience mounts into it.

## 1. Canonical event bootstrap — `window.EE`

```js
EE.track('ee_cta_click', { cta_id: 'hero-call' });
```

Every event pushed to `window.dataLayer` carries: `tenant_id`, `domain_id`, `session_id`,
`page_view_id`, `landing_page_url` (first URL of the session), `page_url`, `page_type`, `referrer`,
`production_gate`, `consent_state`, `kill_switch`, `event_id`, `event_ts`, and — **when present** —
`campaign_id`, `variant_id`, `utm_*`, `gclid`/`gbraid`/`wbraid`/`dclid`/`fbclid`/`ttclid`/`msclkid`/`li_fat_id`/`twclid`.

- Event names are `ee_snake_case` (matches `measurement.canonical_events.contract = "ee_*"`).
- On load it emits `ee_page_context` (existing convention). If the page already pushed one inline,
  it emits `ee_context_update` instead — never a double.
- **Campaign is optional.** `campaign_id`/`variant_id` come from `?campaign_id=`/`?ee_campaign=`,
  `?variant_id=`/`?ee_variant=`, `<meta name="ee-campaign-id">`, a page-level `window.EE_PAGE = {campaign_id, variant_id}`
  set before the bootstrap, or `EE.setCampaign(id, variant)`. They are never in `EE_SITE`: a campaign attaches to a domain, it never is the domain.
- `page_type`: `<meta name="ee-page-type">` or derived from the path.
- Delivery is whatever GTM/GA4 the page already loads. The bootstrap loads no tags, makes no network calls, stores no secrets.

## 2. Dynamic experience socket — `EE.experience`

```js
EE.experience.mount({ id: 'claim-quiz-v1', render(el, ctx) { el.innerHTML = '...'; }, requires_live: false, socket: 'primary' });
EE.experience.unmount();
```

`mount` refuses when the kill switch is ON or (`requires_live`) the production gate is not `live`,
renders into the socket, un-hides it, and emits `ee_experience_mount {experience_id}`. A page may
declare more sockets with `data-ee-socket="<name>"`. This is where future AI-generated tools/pages
attach without rewriting the site. Don't build fourteen apps; build one experience and mount it.

## 3. Safety hooks — `EE.safety`, `EE.outbound`

| hook | API | default | source of the state |
|---|---|---|---|
| consent evidence | `EE.safety.consent.record({surface, consent_text_id, consent_version, method})` → emits `ee_consent_evidence` | `state() = 'none'`, store `MISSING` | `safety.consent.connection_status` |
| suppression | `EE.safety.suppression.check(identity)`; register a source with `.use(fn)` | `{checked:false, suppressed:false}` | `safety.suppression.connection_status` |
| tenant kill switch | `EE.safety.killSwitch.state()` / `.trip(reason)`; config `EE_SITE.kill_switch` or `<meta name="ee-kill-switch" content="ON">` | `OFF` | `safety.kill_switch.connection_status` |
| production gate | `EE.safety.productionGate.state()` → `preview` \| `live` | `live` only when hosting matches intent and site + render are ON | `hostname` + `web` |

`EE.outbound.allowed(identity)` is the single gate any future outbound action (email, SMS, call,
webhook) must pass: kill switch OFF **and** gate `live` **and** not suppressed **and** consent
recorded. Today it returns `allowed:false` on every domain. The hook exists; the capability does not.

Kill switch ON: no dataLayer pushes, no mounts, no outbound. `EE.track` still returns the payload
with `ee_blocked:true` so page code keeps working.

## 4. Capability sockets — `<tenant>/ee/site.json`

Twenty-seven sockets (web/dynamic experience, human/transactional/bulk email, SMS, phone,
Vapi/Sofia, Facebook, Instagram, TikTok, YouTube, LinkedIn, X, Threads, Pinterest, Meta Ads,
Google Ads, TikTok Ads, affiliate/API feeds, commerce, GA4/GTM, BigQuery, Drive, consent,
suppression, kill switch, production gate). Each carries the Foundation's two axes unchanged —
`connection_status` ∈ VERIFIED · CURRENT · MISSING · NEEDS_AUTH · NOT_APPLICABLE and
`activation_state` ∈ ON · OFF · NOT_APPLICABLE — plus the manifest path it was read from.

**A socket existing does not mean the capability is active. UNKNOWN DOES NOT MEAN BORROW.**
`site.json` carries statuses only. Identifiers stay in `domain.json`; a shared value is referenced
by `shared_from: <owner>` and never copied. Nothing in this layer is ever taken from NIL (or any
other tenant) to make another tenant look complete.

## 5. Hooks — `EE.hooks` (hook URLs never live in the repo)

A webhook URL is an unauthenticated endpoint and is treated as a secret (Foundation rule). Pages
therefore reference hooks **by name** and never carry a URL:

```js
EE.hooks.url('intake')                 // -> https://... or null
EE.hooks.post('intake', payload)       // JSON POST with tenant_id/domain_id/session_id; rejects HookMissing when unconfigured
```

`build.sh` writes `<tenant>/ee/runtime.js` (gitignored) at Render build time from env vars named
`EE_HOOK_<TENANT>_<NAME>` — e.g. `EE_HOOK_NIL_INTAKE`, `EE_HOOK_BTL_LEAD`, `EE_HOOK_BTL_CAMPAIGN_REQUEST`,
`EE_HOOK_DIHAC_CONTACT`, `EE_HOOK_DIHAC_LEAD`, `EE_HOOK_DIHAC_TRACKING`, `EE_HOOK_LFMA_ORDER`,
`EE_HOOK_MA_ORDER`, `EE_HOOK_LEE_ORDER`. Only variables carrying a tenant's own prefix reach that
tenant's file. Non-https values are dropped. An unconfigured hook fails closed: the page emits
`ee_hook_missing`, shows its error state, and sends nothing. A tenant whose Render service does not
run `sh build.sh` (MA uses `echo "ma static"`) has no `runtime.js` and its forms stay closed until it does.

Campaign identity on the URL is `?ee_campaign=` / `?ee_variant=`. A bare `?campaign_id=` is the ad
platform's id and is never treated as an Evolution Engine campaign.

## Rules

- Never edit `<tenant>/ee/*` or the injected blocks by hand — edit `shared/ee/bootstrap.js` or the page, then regenerate.
- Never put an identifier, hook URL, key or campaign into `EE_SITE`.
- Changing what a tenant *owns* is a Foundation change (manifest + `foundation.sha256` in one commit, verifier green), then regenerate so `site.json` follows.
- `node tools/stock-domains.mjs --check` must print `no drift`; `node --test tests/*.test.mjs` and `python3 tools/verify-foundation.py` must pass before pushing.
