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

## 2026-10-04 UTC — Codex (Client Perspective isolated draft)
Saw: Kyle chose Phillips-first Client Perspective, a Marketing Apes mobile portal template. Existing protected Phillips portal lives at /portal/phillips/; campaign PR226 and backend/source draft integration were already saved. Native worker created a separate private operations workbook; real assignees, approvers and authenticated server adapter are unconfigured.
Did: branch codex/phillips-sheets-approval-prototype, isolated MA-branded walkthrough and explicitly local-only review runner. No existing protected portal edits. PII/evidence URL allowlist, server-scoped synthetic reviews, stale/version checks, CAS/idempotency and strict workbook hash normalization. Focused 15/15 tests; responsive QA 12/12 with zero outbound requests. Review artifact is read-only and self-contained; mock runner does not connect to Sheets or execute actions.
Next: verify exact workbook headers/rows and identity/access scope, complete pending request details, implement authenticated read-only projection and durable audit separately before considering runtime integration. Keep drafts disabled; no merge/deploy/sharing/activation without Kyle.

## 2026-10-04 UTC — Codex (unpublished reusable release packages)
Saw: Kyle wants Client Perspective as a reusable Marketing Apes product; parent asked private Phillips/public demo/both, answer pending. No new firm/tort launch authorization.
Did: added generic public-demo candidate with no client details, sources, budget or actions; retained private Phillips review separately. Trusted actor/source/item tenant binding now fails closed and is included in scope hashes/audit; 18 focused tests. No publication or protected portal changes.
Next: resolve release audience before publishing only the selected artifact. Real private portal still requires authenticated source/recipient access and durable audit. Do not publish mock fixtures/server or onboard other firms/torts implicitly.

## 2026-10-04 UTC — Codex (verified private read-only Sheets projection)
Saw: existing authorized Drive connector reads the actual private operations workbook; exact schema is now recovered. Assignees/approvers remain blank, requests pending_details. No need to ask Kyle for schema or new permissions.
Did: exact-schema injected read-only adapter, strict 15/15 actual record hashes and 3/3 request target bindings verified; corrected fractional Sheets serial precision and made localeCompare canonicalization explicit. Source observed_at preserved, evidence URLs omitted, safe owner snapshot integrated into private walkthrough. No decision/write method; 28 focused tests pass. Private source snapshots remain outside git/public artifacts.
Next: production server read identity and verified recipient scopes still must be supplied; conversational owner read access is not proof of live runtime access. Keep real decisions disabled pending complete request details and durable audit. Publication audience remains pending.

## 2026-10-04 UTC — Codex (three Client Perspective visual choices)
Saw: Kyle wants three modern, restrained, mobile-friendly one-page options in the LFMA/Marketing Apes family, with coordinated campaign marketing→AI intake→Litify/outcome visibility. Look/feel choice takes priority over runtime work.
Did: Signal (overview-first), Flow (journey-first stage inspection), Workspace (campaign-first work lanes). Same verified planning facts and honest unknown feed/outcome states; no invented lead rows or performance. Existing live LFMA page read as visual reference. Self-contained Library previews plus desktop/mobile screenshots for each; 81 campaign/view/viewport checks including375px, keyboard tabs, stage navigation, evidence disclosures and budget/scope checks. Ten source/privacy tests. Protected portal and runtime remain untouched.
Next: Kyle chooses visual direction. Keep all draft/unpublished; no infrastructure expansion or source sharing while reviewing the look. Source URLs and private lead records are excluded from all examples.

## 2026-10-04 UTC — Codex (MVA-first definitive campaign IA)
Saw: Kyle specified campaign tabs MVA/LA County plus ambiguous handoff label; within each Overview/Leads/Marketing/Next steps. MVA first, stronger modern MA identity with clarity; no further runtime work.
Did: one updated interactive portal, bold budget/heading, coordinated campaign sections, clearly synthetic deidentified lead interface with source/work filters and seven distinct proof stages, planned allocation/creative view, honest unknown actual results and proposed improvements. Neutral Handoff placeholder; no LA County result assumptions. Native preview+desktop/mobile+demo-leads-mobile images.36 responsive campaign/section checks plus filters, keyboard and stage distinctions; seven focused source/packaging tests. Protected portal unchanged.
Next: visual feedback and clarification of Handoff label. All draft/unpublished, no live integration or execution authority.
