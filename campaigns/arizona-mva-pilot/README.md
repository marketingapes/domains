# Arizona MVA two-brand pilot

Status: build complete; publishing, spend, outbound contact, and buyer delivery remain approval-gated.

## Objective

Start qualified conversations from Arizona Meta Instant Forms for two distinct brands while using one Evolution Engine intake system.

- NIL: Nearest Injury Lawyers — direct matching-service positioning.
- DIHAC: Do I Have a Case? — question-led education and intake positioning.
- Sofia: disclosed AI intake specialist for SMS, email, and voice follow-up.
- Buyer route: Phillips for qualified Arizona motor-vehicle leads only.

## Funnel

Meta ad → Meta Instant Form → signed Render webhook → canonical intake and dedupe → consent-aware Sofia follow-up → qualification outcome → Phillips adapter → outcome ledger.

The website is not the lead transport. That prevents a private Render key from being exposed in browser code. Each form uses the appropriate brand privacy-policy URL and sends people to the matching confirmation page after submission.

## Test design

- Campaign objective: Leads / Instant Forms.
- Geography: Arizona only; adults 25+ to reduce low-intent volume during the pilot.
- Placements: Advantage+ placements, excluding Audience Network for the first quality test.
- Cell A: NIL ad + NIL form.
- Cell B: DIHAC ad + DIHAC form.
- Use Meta's native A/B test so delivery is randomized and the two brands do not bid against each other.
- Optimization: maximize leads initially; judge success on qualified-conversation rate, not cost per form alone.
- Proposed budget: $25 per cell per day for 3 days ($150 maximum). This is a recommendation, not authorization to spend.

## Primary success metrics

1. Signed lead webhook success rate ≥ 99%.
2. Duplicate lead rate visible and no duplicate outreach.
3. Time from Meta lead to first Sofia attempt under 2 minutes when outbound is approved.
4. Contact rate, completed qualification rate, qualified rate, and buyer-accepted rate tracked by `domain_id`, `campaign_id`, and `lead_id`.
5. Complaint/STOP rate below 1%; any consent complaint pauses the affected cell.

## Files

- `meta-campaign-blueprint.json`: campaign/ad-set/ad specifications.
- `nil-meta-instant-form.json`: NIL form copy and field mapping.
- `dihac-meta-instant-form.json`: DIHAC form copy and field mapping.
- `followup-copy.md`: approved-for-QA Sofia message sequence and boundaries.
- `launch-checklist.md`: human gates required before anything goes live.
- `creative/nil-clearer-next-step-square-v1.png`: 1:1 NIL static concept.
- `creative/dihac-not-sure-square-v1.png`: 1:1 DIHAC static concept.
