# Rideshare experiment (lanes 4 vs 5) + tracking plan

## Experiment

**Question:** For rideshare sex-abuse claims, does a targeted audience on the BTL brand produce
qualified leads more cheaply than an open audience on the NIL brand?

| | Lane 4 — BTL (EXP-A) | Lane 5 — NIL (EXP-B) |
|---|---|---|
| Budget | $50/day (Meta $25 + Google $25) | $50/day (Meta $25 + Google $25) |
| Creative | same 4 concepts + same copy, BTL identity | same 4 concepts + same copy, NIL identity |
| Meta audience | women 21–54 · 15 rideshare metros (20mi) · interest Uber OR Lyft | US · 18–65 · all genders · no interests |
| Google | same keywords · 15 metros | same keywords · US |
| Funnel | BTL landing → quiz → Sofia | NIL landing → quiz → Sofia |

**Known confounds (not removable):** the brand differs along with the audience, because BTL/NIL
separation is a hard rule. Read the result as "BTL+targeted vs NIL+open", not audience alone.

**Primary metric:** cost per qualified lead = spend ÷ `ee_qualified` (web) + Sofia `outcome=qualified` (voice), deduped by lead.
**Secondary:** qualification rate, Sofia start rate, transfer rate, signed-case rate.
**Rule:** no judgment and no budget change before **7 full days** of data after both lanes start on
the same day. Minimum 20 qualified leads combined before calling a winner; otherwise extend.

## Event plan

| Event | Where it fires | Source |
|---|---|---|
| `page_view` | every page load | page → dataLayer `ee_page_view` |
| `quiz_start` | first quiz answer | page → `ee_quiz_start` |
| `qualification_complete` | quiz end | page → `ee_qualification_complete` |
| `qualified` / `disqualified` | quiz result | page → `ee_qualified` / `ee_disqualified` (GTM maps `ee_qualified` → Meta `Lead`, GA4 `qualify_lead`) |
| `sofia_start` | Sofia CTA click | page → `ee_sofia_start` |
| `call_request` | callback submit or tel: tap | page → `ee_call_request` |
| `transfer` | Sofia transfer tool call | **server** — Vapi end-of-call `analysisPlan.transfer_connected` → Make → BigQuery |
| `signed_case` | firm signs | **server** — Phillips/Litify outcome → credit ledger |

Payload for page events: `{event, tenant, lane, page}` only. No PII in dataLayer.

## Status

- Page events: wired in the 15 pages (verified by test; live firing needs deploy + GTM Preview).
- GTM tags/triggers for the new events: **not published** (container changes are a Kyle-approved step).
- `transfer` / `signed_case`: depend on Vapi assistants going live + Phillips outcome feed — **blocked**.
- TikTok: pixel slot on every page; ID pending from Kyle.
