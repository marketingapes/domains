# Human launch gates

Nothing in this folder authorizes publishing or spend.

## Must be approved before launch

- [ ] Arizona advertising counsel approves both ads, instant forms, disclosures, privacy policies, and responsible-lawyer/firm presentation.
- [ ] Phillips confirms in writing that it is accepting this Arizona MVA traffic, approves the exact qualification rules, payload, hours, caps, duplicates, returns, and required source/disclaimer language.
- [ ] The Meta app is subscribed to `leadgen`; page access token and app secret are stored only in the staging environment group.
- [ ] The two real Meta form IDs are added to `META_NIL_FORM_IDS` and `META_DIHAC_FORM_IDS`.
- [ ] `META_GRAPH_VERSION` is set to the approved current Graph version.
- [ ] The Render webhook verification and signed test-lead flow pass for both forms.
- [ ] BigQuery domain datasets/tables exist and a test lead appears in the correct domain ledger.
- [ ] Redis is required and dedupe is verified with the same Meta lead twice.
- [ ] Twilio, SendGrid, and Vapi test credentials are verified with internal test recipients only.
- [ ] STOP suppression works across SMS, email, and voice.
- [ ] Sofia script and outcome mapping pass recorded-call QA; no-contact never reaches the buyer adapter.
- [ ] Phillips test payload is accepted in its sandbox/test endpoint.
- [ ] `SOFIA_OUTBOUND_ENABLED` remains `false` until contact QA is signed off.
- [ ] `BUYER_DELIVERY_ENABLED` remains `false` until Phillips signs off.
- [ ] Owner approves the proposed $50/day total, 3-day, $150 hard cap—or supplies a different written cap.
- [ ] Campaigns, ad sets, ads, and forms are created PAUSED; a second person verifies the IDs and budget before activation.

## Automatic pause rules

- Any consent or identity complaint.
- Signed-webhook success below 99%.
- Duplicate outreach to the same source lead.
- Buyer receives a no-contact or non-qualified lead.
- Spend exceeds the approved cap.
- STOP/complaint rate reaches 1% in either cell.
