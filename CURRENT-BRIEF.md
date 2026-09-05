# CURRENT-BRIEF.md

Living file. Every AI reads this before touching anything.
Updated: 2026-09-05 (boolean lock) by Grok (PM). Chat is disposable. This file + Drive BOARDROOM are the restart point.

## 1. Mission

Build and sell the **Legal Evolution Engine**.
BTL, NIL, Sofia, DIHAC, LFMA are proof, demo, and revenue infrastructure — not random sites.

One sentence:

> The Legal Evolution Engine helps law firms launch, qualify, route, and optimize campaigns toward signed cases — not just leads.

The bar we are digging toward (not pretending we are there today):

> If you want me to run ads, I’m not your guy. If you want me to look at your entire legal growth system and show you how to turn it into an AI-powered signed-case engine, that starts at $1M.

Kyle’s direct time is not cheap. We still sell entry points. We do not act like the work is small.

Every project must create at least one: case study, dashboard, campaign result, reusable playbook, buyer conversation, signed contract, or leverage asset. No random work.

## 1b. Boolean law (operating OS)

Right/wrong is not confidence. It is measurement.

Hypothesis → Action → Measurement → Result → Adjustment → Repeat.

Five gates. Every chat, plugin, schedule, site, domain, idea, campaign:

| Gate | Question |
|---|---|
| MONEY | Does it create cash, a buyer, a proposal, a pilot, or a deal? |
| PROOF | Does it make the engine more believable with a live URL, result, demo, or case? |
| SYSTEM | Does it make tomorrow easier (template, wire, brief, reusable play)? |
| TRACKABLE | Can we see an event with tenant_id + lead_id or a receipt? |
| REPEATABLE | Can another AI run it from this file without guessing? |

Scoring: 0 = CUT · 1 = PARK · 3 = RUN · 5 = ATTACK.

No “I think.” No “should be.” No “probably live.” Built / verified / measured / reusable / revenue-connected — or it sits.

## 2. Active offers

Three levels. Do not invent a fourth.

| Level | Name | What it is | Today’s money |
|---|---|---|---|
| 1 | **Legal Engine Snapshot** | Paid look. Fast diagnosis. Limited scope. | Request → Kyle invoices. Starts at **$5,000**. Not a free call. |
| 2 | **Pilot** | Prove one campaign lane. | **$5k–$15k** / funded campaign seat. Invoice-only. |
| 3 | **Founder-Led Engine** | Kyle personally designs the legal growth system. | **$1M+** only when proof + buyer size make it reasonable. Not a homepage button yet. |

12-month target (direction, not a live SKU sheet): $1M Kyle-led look · $250k+ enterprise design · $25–50k/mo managed engine · $5–15k pilots.

Public CTA: **Request a Legal Engine Snapshot**
Never: “book a free call”, “let’s chat”, “get my free audit”.

Scarcity line:

> I’m not trying to work with everyone. I’m building the Legal Evolution Engine with a small number of firms that can move fast, report outcomes, and understand that signed cases are the scoreboard.

## 3. Boolean board (measured 2026-09-05)

`curl` + git. Not belief.

| Thing | M | P | S | T | R | Score | Call |
|---|---|---|---|---|---|---|---|
| NIL Sofia talk | T | T | T | T | T | 5 | ATTACK — live CF+Render |
| LFMA `/engine/` Snapshot | T | T | T | T | T | 5 | ATTACK — [lfma-site.onrender.com/engine/](https://lfma-site.onrender.com/engine/) |
| LEE preview | T | T | T | T* | T | 4 | RUN — [lee-site-2rwl.onrender.com](https://lee-site-2rwl.onrender.com/) noindex, borrowed LFMA GTM, DNS not live |
| DIHAC Sofia | F | T | T | T | T | 4 | RUN — preview URL |
| LFMA Sofia | T | T | T | T | T | 5 | ATTACK — demo on offer path |
| MA `/order/` | T | T | T | T | T | 5 | ATTACK |
| BTL site | T | T | T | ? | T | 3 | RUN — DNS last |
| KG site | F | T | T | ? | T | 2–3 | RUN as founder brand, not legal cash |
| NIL-intake PR #16 | T | T | T | T | T | 5 | ATTACK when Kyle merges — not production yet |
| Make 6145362 Snapshot/order | T | T | T | T | T | 5 | ATTACK |
| Make Sofia email 6144825 | T | T | T | T | T | 4 | RUN — human-gated send |
| Cloudflare Workers/Wrangler | F | F | F | F | F | 0 | CUT until cutover stable |
| LFMA HTML-Tools 01–10 | F | F | F | F | T | 1 | PARK |
| TNT / Black Friday / 15% share | T | F | F | F | F | 1 | PARK — legal cash first |
| AI Night League | F | F | F | F | F | 0 | CUT until a connected system exists |
| $750K EOY | — | — | — | — | — | — | scoreboard, not a play |
| Ads ON | F | F | F | F | F | 0 | CUT until Kyle says + qualify events live |
| Invent `signed` event | F | F | F | F | F | 0 | CUT — no source of truth |

\* LEE tracking is TRUE only as `ee_snapshot_request` into LFMA’s GTM. Own container = FALSE until assigned.

## 3b. Active domains

| tenant_id | domain | job | verified live |
|---|---|---|---|
| NIL | nearestinjurylawyers.com | MVA qualifier ads front door | **YES** — Sofia Adaptive Intake at `/talk-to-sofia.html` behind Cloudflare, Render origin |
| BTL | besttortlawyers.com | operating unit + network brand | Render static `btl-site`; DNS cut last |
| DIHAC | doihaveaclaim.ai | national qualifier / test brand | `dihac-site.onrender.com` |
| LFMA | lawfirmmarketingapes.com | firm front door, sells the engine | `lfma-site.onrender.com` + this repo `lfma/` |
| MA | marketingapes.com | sell the machine / order | `/order/` live → Make 6145362 |
| KG | kylegosselin.com | founder/operator brand | kg-site.onrender.com |
| LEE | legalevolutionengine.com | named product / Snapshot | **preview** https://lee-site-2rwl.onrender.com/ — DNS not flipped, noindex |

DNS cut order (do not skip): **DIHAC → NIL → LFMA → BTL last**.

Sofia skins (same file, hostname or `?brand=`): NIL blue · DIHAC purple · LFMA gold.
Live demos:
- NIL https://nearestinjurylawyers.com/talk-to-sofia.html
- DIHAC https://dihac-site.onrender.com/talk-to-sofia.html
- LFMA https://lfma-site.onrender.com/talk-to-sofia.html

## 4. Current build state

**Shipped (verified 2026-09-05):**
- Sofia Adaptive Intake v7.1 + legal-safer DIHAC/LFMA copy — `marketingapes/nil-site` `d3d68cb`
- Live URL returns `talk-v7-adaptive-intake`, `server: cloudflare`, Render `rndr-id`
- Page events: `ee_talk_view`, `ee_voice_start`, `ee_voice_connected`, `ee_voice_end`, `ee_call_click`, `ee_chat_click`, `ee_type_instead_click`
- Make wires (POST JSON, no AI inside): social 6145431, NIL Sofia email 6144825, campaign order 6145362
- This file + LFMA `/engine/` Snapshot offer
- Sofia copied onto DIHAC + LFMA faces in `marketingapes/domains` (same brain, brand GTM/canonical)
- LEE standalone offer: `lee/index.html` commit `d781c4f` → https://lee-site-2rwl.onrender.com/ (200, tenant LEE, noindex, canonical legalevolutionengine.com)
- nil-intake **PR #16 OPEN** (not merged): Vapi status-update start/end → 200 ignore; qualify/transfer still on same `lead_id`

**Not shipped / not verified:**
- Make POST after `qualification.completed` (still missing)
- Cloudflare Workers / Wrangler — **do not add** until cutover is stable
- Cloudflare Workers / Wrangler — **do not add** until cutover is stable
- Meta spend, real lead contact, signed-case writeback from Phillips/Canopy
- `$1M` as a buyable SKU

## 5. Today’s scoreboard

Optimize: **signed cases, accepted opportunities, revenue, cost per signed outcome, qualified opportunities, reusable leverage.**
Not: clicks, likes, CPL vanity, “looks good”.

| Signal | State |
|---|---|
| Sofia voice page live | YES |
| Qualified / transferred server events | Partial in nil-intake (end-of-call structured only) |
| Signed event | **NONE** — do not invent |
| Ads | **OFF** until Kyle says |
| Snapshot offer page | TRUE — LFMA `/engine/` and LEE preview |
| Buyer conversation | Snapshot form → Make 6145362 (not re-tested tonight) |
| Signed | FALSE |
| Ads | FALSE |

## 6. Open blockers

- Claude CLI on Kyle’s Mac: `Invalid API key` — paste Claude work or unset `ANTHROPIC_API_KEY`
- Codex CLI: not installed — Kyle pastes the Codex prompt into Codex
- Cloudflare account MCP: unauthorized in Grok chat (docs only). DNS/Access stay human.
- Render MCP: unauthorized in Grok chat. Deploys = git push to connected repos.
- Phillips Litify writeback / Canopy live payload URL: not in Drive
- Invoice 1238 (First Benefit Month 2) unpaid — do not send a second invoice
- LFMA Facebook Page: not created (human)

## 7. What not to touch

- Rebuild an OS / EE-OS / Control Plane zip / new Render engine per brand
- Unsuspend `evolutionengine.onrender.com`
- SmartLife sheet ↔ legal leads (never mix)
- `make-social-adapter.js` for intake events
- Replace `lead_id` with a Render UUID
- Meta spend, text/call a real lead
- Wrangler / Cloudflare Workers on static faces
- Homepage “free audit” language (killed; do not bring it back)
- Production git push on `nil-intake` (PR only)

## 8. Last verified state

- 2026-09-05 `curl`: NIL / DIHAC / LFMA talk pages 200 + `talk-v7-adaptive-intake`
- 2026-09-05 `curl`: `https://lee-site-2rwl.onrender.com/` 200, title Snapshot, `tenant_id:'LEE'`, `noindex`, GTM-NWVHNTVK (LFMA container)
- 2026-09-05 `curl`: `https://lfma-site.onrender.com/engine/` 200 Snapshot
- 2026-09-05: `lawfirmmarketingapes.com/engine/` 404 (old nginx — DNS)
- 2026-09-05: `gh pr view 16` marketingapes/nil-intake = **OPEN**, not merged
- Claude overnight SMS to Joe/Deborah/623: **UNVERIFIED in this session**. Do not treat as evidence until Twilio receipts are re-read. Human-gated. Tuesday 623 call remains Kyle’s if that lead is real.

## 9. Next play (first attack)

Boolean 5/5 waiting on a human gate: **merge [nil-intake PR #16](https://github.com/marketingapes/nil-intake/pull/16)** so Sofia start/end stops 422-retrying. Then register `legalevolutionengine.com` so LEE leaves noindex.

Do not: ads, signed events, Night League, TNT, Wrangler, second OS.

---

## AI positions (winners only)

| Who | Position |
|---|---|
| Kyle | Owner / head coach / cash / DNS / spend / yes-no |
| ChatGPT | Strategy, offers, architecture, QA, itinerary |
| Claude | Builder, page polish, legal-safe copy, fast iteration |
| Codex | Repo, intake code, deploy/debug, technical verification |
| Grok | PM + execution (GitHub, Drive, Gmail, Zapier/Make inventory, Canva) + angle/social reads |
| Render / Make / Zapier / GitHub / Drive / Cloudflare | Tools. Not decision makers. |

Evidence beats confidence. No AI says “done” without: what changed, where, evidence, unknowns, next action.

## Master prompt (paste before any AI acts)

You are working inside Kyle Gosselin’s AI operator system.

The mission is to build and sell the Legal Evolution Engine, with BTL, NIL, Sofia, and related domain assets acting as proof, demo, and revenue infrastructure.

Operate like a championship team:

Do not freelance. Do not guess. Do not claim work is complete without evidence.
Do not overwrite production without explicit approval.
Do not optimize for vanity metrics when outcome data exists.
Preserve lead IDs, campaign IDs, source data, tracking signals, and attribution.
Keep buyer routing, compliance, and production actions human-gated.

Before acting, identify: task, files/services inspected, verified state, planned change, what could break, approval needed.

After acting, report only:

Current State:
Changed:
Evidence:
Unknowns:
Next Action:
Blocker:

Scoreboard: signed cases, accepted opportunities, revenue, cost per signed outcome, qualified opportunities, reusable leverage — not clicks, likes, or busy work.

## Handoff format

TASK:
CONTEXT:
SOURCE OF TRUTH:
CURRENT STATE:
DO NOT TOUCH:
NEXT ACTION:
DONE MEANS:

## Daily play

Morning: set scoreboard + itinerary from this file.
Build block: one money move, one proof move, one system move.
Film review: shipped / failed / changed / learned.
Next brief: update this file so the next AI can pick up clean.

The AI that produces evidence plays. The AI that guesses sits.

Boolean everything. Measure truth. Compound the winners. Cut the rest.
