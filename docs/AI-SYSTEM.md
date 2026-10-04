# AI-SYSTEM.md — the shared brain

One doc. Every AI seat reads it before acting and writes to it before leaving.
This file is the entire memory of the operation. Nothing else carries over.

## The split

- **Kyle prompts.** He is the operator. He is never the messenger between seats.
- **Seats build.** Claude Code, Codex, Chat — write code, open PRs, then stop.
- **Muse merges and verifies.** Nothing merges without Kyle's word. Every merge gets a live verification and a receipt.

## Protocol (every seat, every session)

1. `git pull` — get the latest version of this file.
2. Read this file top to bottom before touching anything.
3. Do the work: one task = one branch = one PR. Then stop.
4. Before leaving or iterating, append a timestamped note at the bottom:
   ```
   ## YYYY-MM-DD HH:MM TZ — <seat name>
   Saw: <the state of things as you found it>
   Did: <what you changed — branch, PR number, test result>
   Next: <what the next seat should pick up>
   ```
5. Commit and push. The note is the handoff.

## Hard rules

- Never merge to main. Never deploy to production. Kyle approves every merge.
- No ad spend. No DNS changes. No billing charges. No deletions. No outbound messages.
- No secrets in code, docs, or commit messages. Ever.
- Every change ends with a receipt: what changed, branch, PR number, verification result.
- BTL and NIL never share identity, phone, assistant, consent, or tenant data.

## Current state (2026-09-28, evening PDT)

- **Paraquat pilot is LIVE end to end.** Pages: besttortlawyers.com/paraquat/, /talk-to-sofia/, /quiz/.
- Phone: (213) 878-7408 → Sofia v4 (LegalCalls criteria) → transfers to Kyle's cell. Verified.
- Quiz intake → Make scenario "BTL — Paraquat Web Intake → LegalCalls" → BigQuery receipt. Verified live (ref BTLPQ-717E9722CA).
- GTM container GTM-PHC7459M merged (PR #135) — deployment pending confirmation.
- $5,000 QuickBooks invoice link ready — send only when LegalCalls replies asking for it.
- Shared Drive folder "Paraquat Pilot — BTL x LegalCalls" created, not yet shared with Craig/Rob.
- Phone assignments: 213-878-7408 = BTL Paraquat (temp). 213-513-7977 = LFMA. 202-932-9700 = BTL canonical. Do not rebind without Kyle.

## Log

_(Seats append timestamped notes below. Newest at the bottom.)_

## 2026-09-29 PDT — Claude Code (Phillips 5-lane, manifest v5.0)
Saw: PR #143 staged 15 pages in one generic "Phillips Law Group" template — no GTM/pixels/GA4, no Sofia link on landings, internal metrics in public copy, not at served paths. No ads/Vapi built.
Did: branch `claude/phillips-5-lane-v5` (on top of #143). Rebuilt 15 pages at btl/<slug>/ and nil/<slug>/ in each brand; tests/phillips-5-lane.test.mjs (171/171 suite green). Meta: 5 campaigns / 5 ad sets / 20 ads all PAUSED, $0 spend (IDs in campaigns/phillips-5-lane/ADS-DRAFT-RECEIPT.md). Google: import CSVs; BTL = 945-563-5555, NIL has NO Google account. Vapi: drafts only — seat VAPI_API_KEY returns 401. 45 creatives + Paraquat learnings. Receipt: campaigns/phillips-5-lane/GO-LIVE-RECEIPT.md = BLOCKED.
Next: Kyle gates in the receipt. Google Ads Editor: finish BTL import (screen locked mid-import) and post ONLY the 3 PHILLIPS-5L campaigns — account holds another seat's unposted Depo-Provera changes. Separate issue: main's nil/index.html loads BTL GTM-PHC7459M.

## 2026-10-02 19:38 UTC — dot (protected reporting candidate)
Saw: current portal body retained stale current-state promises and a lead-loader script whose target nodes were absent. Draft PR182 added an aggregate report tab but inherited those claims.
Did: staged `dot/portal-reporting-truth-20261002`, aggregate-only protected report shell and corrected renderer, synthetic tests. No merge, deployment or token distribution. Full source suite197/197 and foundation pass; Chromium render blocked by local socket permissions.
Next: review with the corrected legal-web-lead report API and native deferred index; run actual browser and authenticated API checks. Keep access distribution on hold.

## 2026-10-04 12:30 UTC — Codex (Monday Phillips recovery)
Saw: freshly read draft PR226 remained open at 9e94a4c0 with successful CI; domains main cc45b117, nil-site main265b5159 and legal-web-lead main d19af948. Original outcome patch was saved only in prior task, not remote.
Did: recovered existing stage/phillips-az-mva-20261005; expanded inert review.html into full all-channel/intake/transfer/outcome demo. 226 release tests and 41 validator tests pass; six source assets match sizes/SHA256. Chromium375/768/1440: no overflow, errors, HTTP requests or live controls. Recovered private patches with exact historical hashes; backend local commit8446be27 in original three files only, full721 pass/5 skipped, focused29; separate35 local Redis tests cover all5 skipped checks. Existing importer37 pass/2 skipped; separate14 local Redis tests cover both. No additive totals/live integration inferred.
Next: keep PR226 draft and all campaign controls disabled. Private backend publication remains blocked by coordinator-reported prior Forbidden write; no retry. Resolve budget, staffed hours/6am capture, platform/TikTok/tracker/legal/provider evidence, verified MVA crosswalk and canonical importer/portal loader/readback/retention. Existing canonical client fixes source to web_form; aggregate outbox cannot supply per-lead signed proof. Claude installed but signed out; no review claimed. PR13 and protected portal untouched; no merge/deploy/calls/submissions/spend/grants.


### 2026-10-04 Phillips MVA completed staged continuation

Continued existing PR226 branch. Built six still formats, three silent20-second video masters, posters/captions, three isolated landing previews and one self-contained playable review artifact; source logo untouched. Campaign validator46 pass; local browser previews/media pass. Private replay plus default-off offline outcome preparation saved as legal-web-lead draft PR16 991531b; backend728 pass/5 skip and existing canonical raw-runtime memory contract checked. Prior Forbidden evidence corrected to read-only GraphQL request; current normal rights allowed authorized draft save. No production bindings, PR13/protected portal changes, merge, deploy, upload, calls, messages, personal submissions, spend or activation. Budget, staffing and applicable release/source/access bindings remain held.


### 2026-10-04 Phillips MVA disabled durable-delivery completion

Backend PR16 68db57e now builds same-Redis private atomic journal, strict injected transport, per-destination claim/readback/ack/retry/partial recovery and callable default-off worker factory. Full750pass0skip using all isolated Redis checks; focused53pass. No server/scheduler/live binding. Canonical runtime's durable registry/raw readback requires approved existing integration or minimal evolutionengine scope; no other repo changed, new persistent service, credentials or marketing_events writer. Campaign/demo receipts refreshed; all original launch boundaries remain.


### 2026-10-04 Complete authorized Phillips offline system

Continued recovered runtime as evolutionengine draftPR48 07e6c4d: durable Redis identity, real accepted NIL/campaign scope, verified crosswalk enrollment, defaultoff separately authorized private identity/raw readbacks and bounded existing-BigQuery query adapter. Source1217pass; backendPR16 03ec231 private-client/worker integration755pass. Actual complete synthetic system and independent-process Redis proof pass; BigQuery transport MOCK_RAW_ONLY. Earlier source implementation gap complete; no credentials/service/grants/activation. PR42 historic Converted/sent-date-as-Signed and earliest-phone mapping inspected/preserved/excluded. Campaign single review demo refreshed; original artwork, PR13/protected portal unchanged. Remaining live configuration/release/business evidence only.


### 2026-10-04 Final exact-head Phillips offline receipts

Source draftPR48 7c748c1:1217 local passes, GitHub Tests and Scope Audit success; test-only pinned SES fixture makes CI offline without runtime changes. Backend draftPR16 30c04b7:755 passes, no configured CI checks. Campaign review receipt pins both final heads and complete synthetic Redis/source/backend/portal proof. Existing Library review will be replaced in place. All release choices and live bindings held; no merge/deploy/activation, protected edits or real personal submissions.


### October4 platform-policy documentation correction
Paid TikTok US MVA PI ineligible per official August2026 policy; preserved reusable media/organic distinction. Added PMax signal/remarketing and sensitive platform-feedback guards; no educational workaround, budget/pricing/live settings change. Existing draftPR226 and Library review updated; source/backend unchanged.


### October4 default-off after-hours retention
BackendPR16 ed6d476:767tests pass including real Redis recovery and complete synthetic MVA integration. Kyle confirms after-hours team; same transfer line unverified. Existing consumer hours unchanged. Separate queue captures authorized NIL MVA requests only after durable consent/readback, no immediate provider call. Frontend deferred-status contract needed before enable; frozen PR13 unchanged. Browser UI inaccessible (no connected Desktop Commander devices); known cron current receipt:cron is diagnostics, not callback proof.


Final after-hours evidence update: backendPR16 73999fd768passes/46web; retained-duplicate queue readback required, no false saved receipt or callback-state assertion. Review receipt pins exact final head. All release boundaries unchanged.
