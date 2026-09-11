# `shared/ee/` — the domain stocking layer (v1)

One shared runtime that every canonical domain loads. It sits **on top of** Foundation v1.2 and
never writes to it. `<tenant>/domain.json` says what a tenant owns; this layer makes the site able
to *use* the engine — emit canonical events, host AI-generated experiences, and honor the safety
hooks — without pretending any provider capability exists.

```
shared/ee/bootstrap.js        source of truth (copied verbatim into <tenant>/ee/bootstrap.js)
tools/stock-domains.mjs       generator + injector + auditor  →  stocking/report.{json,md}
tests/domain-stocking.test.mjs guard (drift, identity, secrets, build, Foundation hashes)
tests/domain-qaqc-*.test.mjs  regression guards for QA/QC repairs; tests/domain-browser.test.mjs = real Chromium, network capture only
tools/scan-secrets.mjs        hook/key scanner over the tracked tree (`npm run scan`)
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
- **Campaign is optional.** `campaign_id`/`variant_id` come from `?ee_campaign=` / `?ee_variant=`
  (a bare `?campaign_id=` is the ad platform's id and is ignored here), `<meta name="ee-campaign-id">`, a page-level `window.EE_PAGE = {campaign_id, variant_id}`
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

## 5. Governed actions — `EE.hooks` (PROVIDER ISOLATION: the browser never receives a provider endpoint)

A webhook URL is an unauthenticated endpoint and is treated as a secret (Foundation rule). **The page never
has one.** A hook name is a governed *action*; the only destination the page can ever produce is the Evolution
Engine's actions route for its own tenant:

```
page  →  EE.hooks.post('intake', payload, {identity})  →  <actions_endpoint>/<TENANT>/intake  →  engine adapter  →  provider
```

`/ee/runtime.js` is public, page-readable state and therefore carries **no provider destination and no credential**:
`window.EE_RUNTIME = {tenant_id, actions:[names], actions_endpoint, suppression_endpoint}`. `build.sh` writes it
(gitignored) at Render build time from `EE_ACTIONS_<TENANT>_ENDPOINT` (https, the engine), `EE_ACTIONS_<TENANT>_NAMES`
(`intake,lead,...`) and `EE_SUPPRESSION_<TENANT>_ENDPOINT`. A legacy `EE_HOOK_<TENANT>_<NAME>` variable still set on a
static site contributes its *name* only; its value is discarded with a build warning and never written into the served
tree. Provider hook URLs belong on the engine (the governed server-side adapter), which re-validates tenant, kill
switch, consent and suppression for every request before it forwards anything. **The engine is the enforcement
boundary.** The page-side gate below is a fail-closed pre-check: it stops honest pages from sending, and it is not
relied on (nor is `Object.freeze`, closure capture, naming, or any hidden global) to keep a secret, because there is no
secret in the browser to keep.

```js
EE.hooks.actions()                     // action names the engine accepts for this tenant (no gate)
EE.hooks.configured('intake')          // this tenant's runtime names the action AND carries an engine actions endpoint
EE.hooks.resolve('intake', identity)   // async: authoritative suppression lookup, then the gated ENGINE ROUTE or null (see .why)
EE.hooks.url('intake', identity)       // sync: the engine route only if an authoritative clearance for this identity is cached
EE.hooks.why('intake')                 // last block reason: 'no consent evidence recorded', 'kill_switch ON', 'action not configured', ...
EE.hooks.post('intake', payload, {identity, signal, keepalive})  // gated POST of the governed envelope; rejects OutboundBlocked / HookMissing
```

`post()` sends a JSON envelope `{ee_system_id, ee_bootstrap_version, tenant_id, domain_id, session_id, page_view_id,
action, campaign_id, variant_id, landing_page_url, page_url, identity:{email,phone}, consent, suppression, payload}`
with `X-EE-Tenant` / `X-EE-Action` headers and `credentials: 'omit'`; `URLSearchParams`/`FormData` bodies pass through
raw. The transport is captured once at init (`window.fetch` replacement after load has no effect) — defense in depth,
not the boundary. No actions endpoint ⇒ `HookMissing: governed actions endpoint unavailable`; a name the runtime does
not list, or any name outside `[a-z0-9_]{1,40}` ⇒ `HookMissing: action not configured`. A tenant whose Render service
does not run `sh build.sh` (MA uses `echo "ma static"`) has no `runtime.js` and its forms stay closed until it does.

**There is no ungated path to a route, and no path at all to a provider.** `EE.hooks.url()` itself runs
`EE.outbound.allowed()` first. The gate passes only when **every** row holds. UNKNOWN DOES NOT MEAN BORROW, and
MISSING DOES NOT MEAN SAFE.

| truth | required state | anything else ⇒ |
|---|---|---|
| kill switch | `EE_SITE.kill_switch === 'OFF'` exactly (a page may tighten with `<meta name="ee-kill-switch" content="ON">` or `EE.safety.killSwitch.trip()`) | BLOCK (`UNKNOWN` = ON) |
| production gate | `live` (Foundation: hosting matches intent, site + render ON) | BLOCK |
| consent store | `EE_SITE.consent_store` is `VERIFIED` or `CURRENT` (the tenant's consent store is CONNECTED) | BLOCK — `MISSING`, `NEEDS_AUTH`, `NOT_APPLICABLE`, `UNKNOWN`, undefined all block |
| consent evidence | `EE.safety.consent.record({surface, consent_text_id, method})` on this page view — **evidence only**; it never manufactures a connected store | BLOCK |
| suppression source | `EE_SITE.suppression_source` is `VERIFIED` or `CURRENT` (an authoritative source is CONNECTED) | BLOCK — same list as above |
| suppression check | an **authoritative** lookup against the engine endpoint (`EE_RUNTIME.suppression_endpoint`, from `EE_SUPPRESSION_<TENANT>_ENDPOINT`, captured once at init) completed for this exact identity and answered `{checked:true, suppressed:false}` — performed by `EE.hooks.resolve()` / `EE.outbound.check()` | BLOCK — no endpoint (`authoritative suppression check unavailable`), no identity, timeout, rejection, HTTP error, non-JSON, `{}`, `null`, `checked!==true`, `suppressed!==false`, `suppressed:true` |
| runtime tenant | `window.EE_RUNTIME.tenant_id === EE_SITE.tenant_id` | BLOCK (`ee_runtime_mismatch`) |

No operation-level exemption exists in this layer; `NOT_APPLICABLE` does not mean allow. **Browser/page JavaScript is
never a suppression source**: there is no API to register a checker (`EE.safety.suppression.use()` throws), the sync
`EE.hooks.url()` / `EE.outbound.allowed()` only read the cached authoritative result for that identity, and the runtime
(action names + engine endpoints) is captured once at init so a later `window.EE_RUNTIME` cannot inject a clearing
endpoint. Today every canonical tenant's consent store and suppression source are `MISSING`, and neither an engine
actions endpoint nor a suppression endpoint exists, so **every form in this repo is intentionally fail-closed** until
the engine's governed adapter and the real safety spine are connected.

Blocked resolutions emit `ee_outbound_blocked {hook, reason}`; an unconfigured action or a missing actions endpoint
emits `ee_hook_missing {hook, reason}`.
Every form in this repo records its consent evidence (the consent text it actually shows, by id) before it
asks for a hook. Legacy `tracking.js` beacons go through the same gate via `EE.legacy`.

## 6. Identity and immutability

- **No `EE_SITE`, or an invalid one ⇒ fail closed.** `window.EE` still exists (`__stocked:false`, `__failed`),
  but nothing is pushed to the dataLayer, no hook resolves, no experience mounts.
- **Reserved fields are system-owned.** `EE.track(name, props)` drops `tenant_id`, `domain_id`, `session_id`,
  `campaign_id`, `variant_id`, `consent_state`, `kill_switch`, `production_gate`, `event_id`, `event_ts`,
  `landing_page_url`, `page_*` and the other canonical fields from `props` and lists them in
  `ee_rejected_props`. `EE.context` is a frozen snapshot. `window.EE` is non-writable and deeply frozen.
- **Legacy scripts coexist, never overwrite.** A script that defined `window.EE` before the bootstrap is kept
  under `EE.legacy`; one that loads later calls `EE.registerLegacy(api)` (the shared `tracking.js` does).
  Page code that needs the old helpers uses `var L = window.EE && (window.EE.legacy || window.EE)`.
- Campaign identity on the URL is `?ee_campaign=` / `?ee_variant=`. A bare `?campaign_id=` is the ad
  platform's id and is never treated as an Evolution Engine campaign. Campaign stays optional/null.

## Rules

- Never edit `<tenant>/ee/*` or the injected blocks by hand — edit `shared/ee/bootstrap.js` or the page, then regenerate.
- Never put an identifier, hook URL, key or campaign into `EE_SITE`.
- Changing what a tenant *owns* is a Foundation change (manifest + `foundation.sha256` in one commit, verifier green), then regenerate so `site.json` follows.
- `npm run check` (drift gate + secret scan + Foundation verifier + the complete `npm test` suite) must pass on the committed tree before pushing.
