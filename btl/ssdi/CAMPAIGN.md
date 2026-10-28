# BTL-SSDI-001 — campaign plan (all channels)

Everything is built to run, and everything is **switched off**: ads are paused or not yet created, and no money is spent.
Nothing turns on without Kyle's approval in chat naming the exact campaign and budget.
The buyer's firm is never named in any ad, page or call.

## The offer

A free Social Security Disability review for people who:
- are age 54–63
- have been out of work at least a year
- are under a doctor's care now
- are not getting government disability payments
- don't already have a lawyer

**Geo:** all US except California and Colorado. Location targeting is "people living in" the US only, with no India or Pakistan traffic.

**Transfer hours:** Monday–Friday, 9:30 AM–6:00 PM Eastern.

## How a lead moves

| Step | What happens | Where it's built |
|---|---|---|
| 1. Ad click | One of three doors: form, quiz chat, or Talk to Sofia | Ads below → `/ssdi/`, `/ssdi/quiz/`, `/ssdi/talk-to-sofia/` |
| 2. Screen on the page | The buyer's five criteria, plus the state check. Visitors who aren't a fit never give contact details and are pointed to ssa.gov | `criteria.js` |
| 3. Lead stored | Webhook answers with a receipt only after BigQuery has stored the lead. TrustedForm certificate and UTMs/click IDs are attached | Make 6777650 (campaign-kit intake) |
| 4. Sofia calls | The SSDI Sofia re-asks the criteria on the call, one question at a time | Vapi assistant `9d3d31eb` "BTL Sofia — SSDI v1" |
| 5. Live transfer | Warm transfer: Sofia announces "I have *name* from *state*, age *N*, calling about Social Security Disability" | Vapi tool `ea091726` `transfer_to_intake` → Kyle's cell (stand-in for the buyer's DID) |
| 6. Outside hours | Sofia tells the caller the team calls back during business hours | Same assistant |

Inbound callers to Sofia's number follow steps 4–6.

**Status 2026-10-28:** steps 1–3 and the Sofia assistant and transfer are built. A test lead got receipt `BTLK-DEFF6E3AFE`. Sofia still needs her own phone number, and the automatic callback in step 4 needs a new intake webhook. Both are in the go-live list below.

## Budget for the test (proposal)

The test budget is $5,000 over about 14 days, run only during transfer hours (about $360 a day on the 10 weekdays).

| Channel | Share | Spend | Why |
|---|---|---|---|
| Meta (Facebook + Instagram) | 60% | $3,000 | Age-targeted reach to 54–63, three doors to compare |
| Google Search | 30% | $1,500 | High intent: people already searching for SSDI help |
| Retargeting (Meta + Google) | 10% | $500 | People who started a door but didn't finish |
| TikTok | held | $0 | Its age brackets can't be held to 54–63 (55+ is open-ended), so it waits for the test read |

The scorecard is **cost per transferred call that the buyer accepts**, not cost per lead. Other read-outs: the not-a-fit rate on each door, and the rate at which Sofia connects to qualified callers.

## Meta (Facebook + Instagram)

- **Campaign:** `BTL-SSDI-001 · Meta · Leads`. Objective Leads (website); optimization event Lead (`ee_lead_submit_success` through GTM-PHC7459M). Campaign budget, lifetime, dayparted to Mon–Fri 9:30–18:00 ET. Created PAUSED.
- **Ad set:**
  - US, people living in. Exclude California and Colorado.
  - Ages 54–63, hard limits (Advantage+ audience off).
  - All genders.
  - Facebook and Instagram feeds, Stories and Reels. No Audience Network, which cuts low-quality and offshore traffic.
- **Ads:** one per door, each in square and 9:16.
- **Policy:** the ad text never says "you" next to an age or health condition (Meta's personal-attributes rule). Every ad says it is attorney advertising and not affiliated with Social Security.

| Door | Image (square / Stories) | Primary text | Headline | Button | URL |
|---|---|---|---|---|---|
| Quiz | `/assets/ssdi/ads/ssdi-quiz-1080x1080.jpg` / `-1080x1920.jpg` | Social Security Disability can be hard to figure out alone. Sofia, our AI assistant, asks six quick questions and tells you right away whether a free review may be a fit. No cost, no obligation. Attorney advertising. Not affiliated with Social Security. | SSDI help for adults 54–63 | Learn more | `/ssdi/quiz/?utm_source=facebook&utm_medium=paid_social&utm_campaign=BTL-SSDI-001&utm_content=quiz` |
| Sofia | `/assets/ssdi/ads/ssdi-sofia-1080x1080.jpg` / `-1080x1920.jpg` | Rather talk it through? Ask Sofia to call. She asks a few simple questions about work and health. If a free review may be a fit, she connects you with an intake team on the same call. Attorney advertising. Not affiliated with Social Security. | Talk through disability benefits | Call now / Learn more | `/ssdi/talk-to-sofia/?utm_source=facebook&utm_medium=paid_social&utm_campaign=BTL-SSDI-001&utm_content=sofia` |
| Form | `/assets/ssdi/ads/ssdi-form-1080x1080.jpg` / `-1080x1920.jpg` | Out of work for a year or more and under a doctor's care? Social Security Disability benefits may be available. Check in about two minutes. Questions first; your number comes last. Free. Attorney advertising. Not affiliated with Social Security. | Social Security Disability: see who may qualify | Learn more | `/ssdi/?utm_source=facebook&utm_medium=paid_social&utm_campaign=BTL-SSDI-001&utm_content=form` |

Note on the form ad: "Out of work… under a doctor's care?" is a question, but it still reads close to Meta's personal-attributes line. If Meta rejects it, the fallback primary text is: "Social Security Disability benefits may be available to people out of work a year or more because of their health. Check in about two minutes…"

## Google Search

- **Campaign:** `BTL-SSDI-001 · Search`. Search network only (no Display, no search partners).
  - Location: US, presence only. Exclude California and Colorado.
  - Ad schedule: Mon–Fri 9:30–18:00 ET.
  - Bidding: Maximize conversions, switching to target CPA after 30 conversions.
  - Age: 45–54 and 55–64 included (Google's brackets); 18–44 and 65+ excluded.
  - Created PAUSED.
- **Ad groups and keywords** (phrase and exact):
  - *SSDI help:* "ssdi help", "help applying for ssdi", "how to apply for ssdi", "how to qualify for ssdi", "ssdi eligibility"
  - *Disability lawyer:* "social security disability lawyer", "ssdi lawyer", "ssdi attorney", "disability benefits lawyer", "disability attorney near me"
  - *Denied / waiting:* "ssdi denied", "denied social security disability", "ssdi appeal help"
- **Negatives:** login, my social security, office, office hours, phone number, card, replacement, calculator, payment schedule, payment dates, jobs, salary, california, colorado, ssi only, child, kids, va disability, ltd insurance, short term disability.
- **Responsive search ad:**
  - Headlines (30 characters max):
    - Free SSDI Review
    - SSDI Help for Ages 54–63
    - See If You May Qualify
    - Questions First, Number Last
    - Talk It Through With Sofia
    - Out of Work a Year or More?
    - No Cost to Check
    - Not Available in CA or CO
    - Social Security Disability
    - Two-Minute Eligibility Check
  - Descriptions (90 characters max):
    - Answer a few simple questions about work and health. Free review. Attorney advertising.
    - Private service, not affiliated with Social Security. You can always apply free at SSA.gov
    - Sofia, our AI assistant, can call you and connect you with an intake team the same day.
    - Out of work a year or more and under a doctor's care? A free review may be a fit.
  - **Assets:** a call asset with Sofia's number (once she has one) on the same schedule; sitelinks for Quiz, Talk to Sofia, and What happens next.

## Retargeting

- **Meta:** people who visited a `/ssdi/` page in the last 14 days but didn't fire Lead. Same age and geo limits. Uses the Sofia ad ("Rather talk it through?").
- **Google:** an audience of visitors who didn't convert, added to the Search campaign in observation mode with a bid adjustment.

## TikTok (held)

Built and ready but not in the first test. TikTok can target 55+, but not 54–63 exactly, and its 45–54 bracket would mostly be outside the buyer's range.

Two 20-second scripts for creator-style video:
1. **"The questions first"**: a woman about 58 at a kitchen table: "When I couldn't work anymore, nobody explained Social Security Disability to me. This took six questions. No number until the end." Screen recording of the quiz. Caption: "Free SSDI review · ages 54–63 · Attorney advertising".
2. **"Sofia called me"**: a phone on a table rings; the caption reads Sofia's opening line, then the warm transfer. End card: "Ask Sofia to call. Not affiliated with Social Security."

## Follow-up (only with the matching consent)

| When | What | Consent |
|---|---|---|
| Within 2 min of a lead during hours | Sofia calls | Calls box (required) |
| No answer | One text: "Hi {first}, it's Sofia from Best Tort Lawyers about your disability review. I'll try you again shortly, or call me at {sofia_number}. Reply STOP to opt out." | Texts box only |
| +2 hours, then next business morning | Sofia calls again; 3 attempts max over 2 business days | Calls box |
| Lead arrives after hours | First call at 9:30 ET next business day, never before 9:00 the caller's local time | Calls box |
| Not a fit | Nothing. They were already shown ssa.gov | — |

## Fraud and quality

- **Location:**
  - Ads target "people living in" the US only.
  - A lead whose state is California or Colorado stops at the page.
  - Phone numbers must be US 10-digit.
- **Proof and tracking:** each lead carries a TrustedForm certificate, consent text and version, timestamp, page URL, UTMs and click IDs.
- **Duplicates:** the intake dedupes on submission ID. The buyer's dedupe window is still to be confirmed.
- **No bulk leads:** no lead is passed without the visitor answering questions. Sofia re-confirms the criteria live before any transfer.

## Before anything spends (go-live list)

1. **Sofia's phone number.** The account is at its free-number limit. Either point an unused test number at the SSDI Sofia, or buy one (about $1–2 a month).
2. **Automatic callback.** A new Make webhook for the SSDI intake that stores the lead, sends the receipt, then has Sofia call during the buyer's hours *and* the caller's local hours. Phones are allow-listed to Kyle's until go-live.
3. **Buyer's DID** replaces Kyle's cell in `transfer_to_intake`, plus their posting specs if they want lead data too.
4. **Buyer/counsel OK** on the consent text and the ad copy above.
5. **Conversions:** confirm `ee_lead_submit_success` records as Lead in Meta and Google.
6. **Merge PR #364** (deploys the pages; they stay hidden from search).
7. **Create the paused campaigns** in Meta and Google, then Kyle's go naming campaign and budget.
