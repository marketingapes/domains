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


## 2026-10-08 UTC — Codex (authorized dedicated LFMA demonstration publication)
Saw: Kyle explicitly authorized this dedicated page’s necessary push/merge and LFMA deploy. Existing /demo/ is occupied; actual GitHub main is dc89609, and its changed LFMA portal files already match live HTTPS bytes.
Did: Added only lfma/perspective-demo plus private verification docs. Reused the configurable tested demo; generic receiving firm, clear simulation, separate September62/18historical proof, one-time2500fee+5000media proposal, no fixed launch date, verified business contact. Recorded a real44.92-second silent captioned WebM tour and accessible transcript.19local Chromium checks pass. Phone routing/payment/ads remain untouched.
Next: Verify release checks, authorized GitHub merge/auto-deploy, HTTPS assets/unchanged route hashes and public browser journey. Real phone binding, intake receipts and payment merchant/link/terms remain separate gates.


## 2026-10-08 UTC — Codex (scope changed; publication paused)
Saw: Kyle clarified a client-Perspective package and then superseded it with a minimal nationwide car-accident Facebook-native/Vapi path for Jeffery; parent is resolving recipient identity and approved intake destination.
Did: Preserved local Perspective-first package and save-ready buyer-sales assistant draft.19targeted browser checks pass. Removed superseded ad-first video from proposed public assets. No GitHub push/PR/merge, Render deploy, assistant POST, calls, number binding, ads or spend occurred. Added minimal route-map with all unresolved recipient/criteria/consent/geo/budget fields null.
Next: Keep publication paused. Resolve Jeffery/firm/destination, accepted geography, criteria, consent and budget before any actual call, ad or transfer. Full repo release-check attempt was blocked by sandbox socket EPERM and was not retried after scope change.


## 2026-10-08 UTC — Codex (Jeffrey Phillips scope clarified)
Saw: Kyle identified Jeffrey Phillips, not Nadrich, and proposed Facebook inquiry → self-reported injured/not-at-fault screen → Sofia inbound/requested outbound → Phillips intake → visible source/handoff. Nationwide remains proposed, not approved. Claude owns live Arizona.
Did: Updated only the private minimal route draft and source note. Destination/acceptance/criteria/consent/geo/budget remain unset; no public endorsement, Arizona restriction replacement, calls, ads, route changes or publication.
Next: Keep LFMA package page staged. Verify actual receiving entity/destination and approvals before live handoff or nationwide release.
