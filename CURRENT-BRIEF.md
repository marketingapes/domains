# CURRENT-BRIEF.md

Living file. Every AI reads this before touching anything.
Updated: 2026-09-05 by Grok (PM). Chat is disposable. This file + Drive BOARDROOM are the restart point.

## 1. Mission

Build and sell the **Legal Evolution Engine**.
BTL, NIL, Sofia, DIHAC, LFMA are proof, demo, and revenue infrastructure — not random sites.

One sentence:

> The Legal Evolution Engine helps law firms launch, qualify, route, and optimize campaigns toward signed cases — not just leads.

The bar we are digging toward (not pretending we are there today):

> If you want me to run ads, I’m not your guy. If you want me to look at your entire legal growth system and show you how to turn it into an AI-powered signed-case engine, that starts at $1M.

Kyle’s direct time is not cheap. We still sell entry points. We do not act like the work is small.

Every project must create at least one: case study, dashboard, campaign result, reusable playbook, buyer conversation, signed contract, or leverage asset. No random work.

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

## 3. Active domains

| tenant_id | domain | job | verified live |
|---|---|---|---|
| NIL | nearestinjurylawyers.com | MVA qualifier ads front door | **YES** — Sofia Adaptive Intake at `/talk-to-sofia.html` behind Cloudflare, Render origin |
| BTL | besttortlawyers.com | operating unit + network brand | Render static `btl-site`; DNS cut last |
| DIHAC | doihaveaclaim.ai | national qualifier / test brand | `dihac-site.onrender.com` |
| LFMA | lawfirmmarketingapes.com | firm front door, sells the engine | `lfma-site.onrender.com` + this repo `lfma/` |
| MA | marketingapes.com | sell the machine / order | `/order/` live → Make 6145362 |
| KG | kylegosselin.com | founder/operator brand | kg-site.onrender.com |

DNS cut order (do not skip): **DIHAC → NIL → LFMA → BTL last**.

Sofia skins (same file, `?brand=`): NIL blue · DIHAC purple · LFMA gold.
Live demo: https://nearestinjurylawyers.com/talk-to-sofia.html?brand=lfma

## 4. Current build state

**Shipped (verified 2026-09-05):**
- Sofia Adaptive Intake v7.1 + legal-safer DIHAC/LFMA copy — `marketingapes/nil-site` `d3d68cb`
- Live URL returns `talk-v7-adaptive-intake`, `server: cloudflare`, Render `rndr-id`
- Page events: `ee_talk_view`, `ee_voice_start`, `ee_voice_connected`, `ee_voice_end`, `ee_call_click`, `ee_chat_click`, `ee_type_instead_click`
- Make wires (POST JSON, no AI inside): social 6145431, NIL Sofia email 6144825, campaign order 6145362
- This file + LFMA `/engine/` Snapshot offer

**Not shipped:**
- Codex: Vapi start/end without structuredData + Make POST after `qualification.completed` on `marketingapes/nil-intake` (PR, not main)
- Sofia copied onto DIHAC/LFMA Render faces (preview via `?brand=` only)
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
| Snapshot offer page | `/engine/` on LFMA (this commit) |
| Buyer conversation today | Snapshot request → BUYER BOARD + Kyle email |

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

- 2026-09-05: `curl` NIL talk page → v7 adaptive intake, Cloudflare HIT, legal copy on DIHAC/LFMA skins
- nil-intake Vapi callback exists: `POST /api/v1/nil/providers/vapi/callback` — qualify/transfer yes; start/end/signed no
- Campaign order hook tested historically via marketingapes.com/order/

## 9. Next play

1. **Kyle:** paste Codex prompt (nil-intake Vapi start/end + Make after qualify). Do not push main.
2. **Grok (this commit):** CURRENT-BRIEF + LFMA engine Snapshot page + homepage CTA alignment.
3. After legal OK + Kyle go: copy Sofia shell onto DIHAC/LFMA faces.
4. Film review: one money dent, one proof dent, one system dent, one lesson saved.

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
