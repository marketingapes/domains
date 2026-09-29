# CLAUDE-CODE-TERMINAL — completion receipt, 2026-09-20/21

Assignment: `TASK-CLAUDE-CODE-TERMINAL.md` (Drive `1v0fOIk_jZsk9XAVPUoG2TrkPTr70cl-S`),
with `TONIGHT-DOMAIN-EMAIL-TASKS.md` and `TONIGHT-TRACKING-SOCIAL-TASKS.md`.

**Production mutated: NO.** No Make scenario edited, no post published, no email
sent, no PR merged, no DNS or provider change. All provider reads were
read-only. Work is on branch `claude/publisher-phillips-reliability-20260920`
off `origin/main` bf3c900, in a separate worktree so no other seat's checkout
was touched.

---

## Status

| Item | Status |
|---|---|
| Publisher response-before-Instagram | **Confirmed defect.** Patch designed + tested, not applied |
| Publisher per-channel receipts | **Confirmed defect**, worse than reported. Patch designed + tested |
| Make 6324097 dedup before email | **Confirmed defect.** Retry-safe pending/sent designed + tested |
| PR48 | **Reviewed — do not merge as-is.** Three blocking findings |
| PLH source / migration | Read-only finding below |
| BTL / DIHAC domain bindings | Read-only finding below. BTL has a live money-path break |

---

## 1. Shared social publisher — Make 6145431 (LIVE, hook 2770622)

Read 2026-09-20, `lastEdit 2026-09-20T22:41:31.026Z`.

Flow order is `1 → 2 FB → 4 ledger → 5 respond → 3 IG → 6 ledger`. The
readiness note was right that the response precedes Instagram. Two things it
did not capture:

**P0 — the response cannot express Instagram at all.** The body is
`{"ok":true,"fb_post_id":"..."}`. There is no IG field, so even a caller that
wanted to check has nothing to read. `ok:true` is returned identically whether
IG posted, was never requested, failed, or was silently dropped because the
tenant has no IG mapping. Seven of the fourteen FB-mapped tenants have no IG
mapping (KG, RI, CGG, TOSS, FPLB, PX, REAPES) — those callers can set
`post_ig=yes`, get `ok:true`, and nothing is posted to Instagram.

**P0 — the ledger cannot prove destination.** Row 4 records `{{1.page_id}}` and
row 6 records `{{1.ig_id}}`, both read from the *webhook input*. The real
destination is resolved by `switch(tenant_id)` inside the post modules.
Callers do not send those fields, so both columns are blank. The ledger
therefore cannot answer "which Page received this post" — which is exactly
what a per-channel receipt is for.

**P1 — the ledger cannot record failure.** Status is the literal `posted` on
both rows, and a failed channel writes no row at all. The ledger structurally
contains only successes.

**P1 — no idempotency.** A caller retry after a timeout double-posts publicly.
Out of scope for this patch; called out in `ops/make/README.md`.

Correct behaviour worth preserving: unknown tenants resolve to `""` and are
blocked by the filter, so the publisher does fail closed on identity. The
patch keeps that (test: `both models still fail closed`).

## 2. Phillips outcome reliability — Make 6324097 (LIVE)

Read 2026-09-20, `lastEdit 2026-09-18T19:33:33.547Z`. Route A, transfer
confirmations to the Phillips desks.

**P0 — the dedup marker is written before the email is attempted.** Module 4
(`Mark confirmed`) writes `xfer:{call_id}` with
`outcome: transfer_confirmation_sent`, then modules 7→10 run, then the Gmail
modules 11/12/14 fire. The Gmail modules have **no error handler**. On a Gmail
failure the execution errors, no mail reaches Phillips, and the marker is
already committed (`autoCommit: true`). The next cycle reads `exist: true` and
filters the call out. **The confirmation is lost permanently and the datastore
asserts a send that never happened.**

Root's framing was "a review finding, not a confirmed observed loss" — that is
still accurate as to whether it *has* happened. What is now confirmed is that
the code path exists and is reachable: there is no handler on the send, and the
marker precedes it. The 25 successful two-operation runs do not exercise it,
because two operations means the trigger returned nothing to process.

Consequence for the Cowork seat: delivery records carrying
`transfer_confirmation_sent` are **claims, not receipts**. They are not safe to
reconcile against Phillips buyer outcomes as proof of delivery. After the
patch they carry a `message_id` and are.

Route B (Meta CAPI) is correctly ordered — module 27 writes after module 26
sends. Only route A is wrong.

**P1 — `maxErrors: 3`.** Because the Gmail modules have no handler, three
consecutive send failures deactivate the whole scenario, taking route B (CAPI)
down with it. The resume handlers in the patch remove this.

**P2 — SQL injection surface.** Module 7 interpolates `{{6.leadgen_id}}`
directly into a query string run by `google-bigquery:writeQuery`.
`leadgen_id` is parsed out of Sofia's free-text transfer message. Sanitization
is specified in `ops/make/README.md`.

**Known gap, not fixed:** the 25-minute trigger window bounds retries to about
two cycles, so an outage longer than that still loses the confirmation. Two
options with their operations cost are in the README; the hourly sweeper is
recommended.

## 3. PR48 — `marketingapes/domains` #48 — DO NOT MERGE AS-IS

Branch `audit/attribution-consent-20260920`, 26 files, +166/−150, CI green.

The JavaScript is correct and well scoped. The guard for `steps.length === 0`,
the `#state` optional chaining, the `INTAKE_ENDPOINT || ENDPOINT` fallback and
the omission of legal-only assertions on nonlegal payloads all do what the
description says. `lead_id` / `claim_id` / `event_id` are page-load constants,
so the "stable retry identities" claim holds. This is not a code-quality
objection.

It is a blast-radius objection. **The PR's effect is to take 25 forms that
could not submit and make them submit.**

**Blocker 1 — it activates protected and retired domains.** The changed files
include `cawk/preview/intake.js` (Cawkwell), `stopableed/preview/intake.js`
(Stop A Bleed) and `tbrewery/preview/intake.js` (Tossed Brewery).
`TASK-CLAUDE-CODE-TERMINAL.md` says preserve Cawkwell and Stop A Bleed and the
retired tossedbrewery.com; `TONIGHT-DOMAIN-EMAIL-TASKS.md` says do not
provision Tossed Brewery services. Fixing a form so it starts posting is
provisioning.

**Blocker 2 — all 25 previews post to one live multi-tenant hook.** Every
`config.js` carries
`ENDPOINT: https://hook.us2.make.com/3simdd4xno0o9lh9jlsjdkc64570s3c4`. That is
Make hook 2815397, `EE Universal Site Capture (multi-tenant)` → scenario
6318694, **active**. The hook has no `authenticationMethod` (contrast hook
2757886, which requires `x-make-apikey`), and its URL sits in client-side JS.
Anyone with the URL can inject leads into the shared capture.

**Blocker 3 — NIL-namespaced identity on non-legal brands.** The payload keeps
`schema_version: 'nil.lead.v1.1'` and `lead_id: nil-…` for every domain. After
this PR a Tossed Brewery or Stop A Bleed submission enters the shared capture
labelled as a NIL lead. Each also carries `contact_consent: true` as a
hardcoded literal and a TCPA consent version string
(`TBREWERY_TCPA_2026-09-18_V1`) — a TCPA consent record on a brewery form.
The hardcoded `contact_consent: true` is **pre-existing, not introduced here**;
what the PR changes is that it now actually ships. The client-side gate does
fail closed when the checkbox is absent, but the server receives an
unconditional assertion either way.

Mitigating: every preview `robots.txt` is `User-agent: * / Disallow: /`, so
exposure is limited to whoever has the URL.

**Recommended disposition:** split. Merge the 22 non-protected previews after
confirming scenario 6318694 tenant-routes on `domain_id` rather than on the
`nil.lead.v1.1` schema. Hold `cawk`, `stopableed`, `tbrewery` behind an
explicit Kyle decision. Then, separately: authenticate the universal hook, and
stop stamping `nil.*` identity on non-legal tenants.

## 4. Read-only finding — PLH (paralegalhelper.com)

- DNS: Cloudflare (`dara`/`kayden.ns.cloudflare.com`), proxied `104.21.12.252`,
  `172.67.153.254`
- Live: HTTP 200, `server: cloudflare`, **no `rndr-id`** → not a Render origin
- Content: `<title>Under construction - Awesome site in the making!</title>`
  (~90 KB) — a hosting-provider parking page
- **No source**: no `plh/` or `paralegalhelper/` directory on `origin/main`
- **No service**: `render.yaml` declares only `btl-site`, `nil-site`,
  `dihac-site`, `lfma-site`
- **Not in the manifests**: no match in `portfolio.json` or
  `domain-foundations.json`

So there is nothing to migrate — there is no source to move. Options, in
increasing cost:

1. **Leave parked.** It is not on the revenue path and costs nothing.
2. **Generate `plh/` from the existing domain generator** (the same one that
   produced the 25 nonlegal previews), add a `plh-site` static service to
   `render.yaml`, point the Cloudflare proxied record at it. This is the
   cheapest path to a real page and matches how the other 25 were built.
3. **Treat it as a Sofia persona surface** — `TONIGHT-DOMAIN-EMAIL-TASKS.md`
   assigns `sofia@paralegalhelper.com`. Flag: "Sofia" is already the NIL and
   BTL intake identity, with separate numbers and from-addresses per brand. A
   third Sofia on a paralegal-help domain is a persona collision, and the
   publisher and call-outcome scenarios both key behaviour off brand identity.
   Decide the persona before provisioning the mailbox.

## 5. Read-only finding — BTL / DIHAC bindings

Make routing (from `hooks_list`, team 2008339):

| Tenant | FB Page | Hook | Scenario | Active |
|---|---|---|---|---|
| BTL | 222081604317115 | 2826247 | 6311519 `BTL — FB Lead Ads → Render Phillips lane` | yes |
| DIHAC | 1145894278606476 | 2826249 | 6318640 `DIHAC — FB Lead Ads → capture + alert (no Phillips dispatch)` | yes |

The asymmetry is real and looks deliberate: BTL dispatches into the Phillips
lane, DIHAC captures and alerts only. Both hooks bind the Page ids that the
social publisher's `switch()` also uses, so publisher and lead-capture agree on
identity for these two tenants.

Hosting bindings:

| | `domain.json` intent | Live | Match |
|---|---|---|---|
| BTL | render, `current_hosting_state: siteground_noindex`, `current_hosting_matches_intent: false` | `besttortlawyers.com` 200, `server: nginx` — SiteGround, not Render, not behind Cloudflare | **no** |
| DIHAC | render, `current_hosting_matches_intent: true` | `doihaveaclaim.ai` 200, `server: cloudflare`, `rndr-id` present | yes |

**Money-path break, still open:** `besttortlawyers.com/phillips-law/` returns
**403** at the SiteGround origin, and `btl-site.onrender.com/phillips-law/`
returns **404**. There is no `phillips-law` path anywhere in `origin/main`
(`git ls-tree | grep -i phillips` → empty). The page does not exist on either
side; this is not a DNS cutover problem. The Estate Matrix flagged the same
thing on 2026-09-13 and it is unchanged a week later. BTL is the tenant
carrying the JV traffic, so this is a dead page on the revenue path, and it is
a content problem, not an infrastructure one.

---

## Evidence

- Make 6324097 blueprint, read-only, `lastEdit 2026-09-18T19:33:33.547Z`
- Make 6145431 blueprint, read-only, `lastEdit 2026-09-20T22:41:31.026Z`
- Make `hooks_list` team 2008339, read-only
- `gh pr view/diff 48 --repo marketingapes/domains`; CI run 35537479206 SUCCESS
- `git show origin/audit/attribution-consent-20260920:{cawk,stopableed,tbrewery}/preview/config.js`
- `curl -sI` on besttortlawyers.com (+`/phillips-law/`), doihaveaclaim.ai,
  paralegalhelper.com, btl-site.onrender.com/phillips-law/, 2026-09-21 ~03:10Z
- `dig` paralegalhelper.com A / NS

## Tests

`tools/check-release.sh` → **DOMAIN RELEASE CHECKS: PASS**, 65 tests, 0 fail
(41 pre-existing + 24 new). New tests assert each defect against the current
model and the fix against the patched model, so a regression in module ordering
flips a paired assertion.

## Unresolved blockers

1. **Applying either patch needs Kyle.** Both scenarios are LIVE; editing them
   is a production mutation this lane is not authorized to make.
2. **Publisher response shape is a breaking change** for anything reading the
   webhook body. The caller inventory is unknown to me.
3. **Whether scenario 6318694 routes on `domain_id`** decides whether PR48's
   22 safe previews can merge. I read the hook, not that scenario's blueprint.
4. **No authenticated BigQuery query route was used.** Root identified Make
   connection 10947377 as an authorized read path; this lane did not run a
   query through it, so nothing here claims anything about table freshness or
   event coverage.

## Exact next action

Kyle decides, in this order:

1. Patch 6324097 route A (export blueprint first). Highest value: it is the
   only change that converts Phillips delivery records from claims into
   receipts, which is what the buyer conversation needs.
2. Split PR48; hold cawk / stopableed / tbrewery.
3. Decide BTL `/phillips-law/` — write the page or remove the links pointing at
   it. It 403s/404s today.
4. Publisher patch after the caller inventory is known.
