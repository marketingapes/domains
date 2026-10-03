# LFMA MVA sprint review candidate

Additive static route: `/demo/mva-sprint/`. No homepage, campaign routing,
Phillips portal/report, foundation manifest, provider configuration or Vapi
configuration is changed.

The buyer narrative tests market response, firm intake conversion and where AI
improves the process. Six route/identity combinations use fixed synthetic answers.
Prequalification captures information for firm review; it makes no legal decision.
Consent gates the synthetic handoff. Intake acknowledgement, unavailable intake,
assigned follow-up and declined permission have distinct reporting states.

No leads, free-text inputs, phone numbers, calls, live AI, form submissions,
analytics, remote API calls or browser storage are used. Content Security Policy
disables connections and form actions. Events live in memory and clear on reset,
configuration change or reload. Signed outcomes, spend, revenue and ROI are unknown.

## Visual provenance

- Reference: current `lfma/index.html` at base `6123c347c27a88c2cad95e8b062993c23c5e1821`
  and the public Law Firm Marketing Apes homepage inspected on 2026-10-03.
  Uses the pale background, dark ink, cyan/violet/magenta palette, numbered process,
  existing ape logo and founder portrait in a wider editorial composition.
- `/assets/kyle-headshot.png`: existing LFMA founder portrait, reused unchanged.
- `/assets/portal/ape-logo.jpg`: existing LFMA brand logo, reused unchanged.
- `journey.svg`: newly authored conceptual vector illustration. No accident scene,
  real case, client photo or testimonial is depicted.
- Phillips naming is a concept label. No unverified Phillips logo or endorsement
  is presented. Branded/unbranded alternatives are not claimed as approved ads.

## Validation

`bash tools/check-release.sh` covers all release checks including the new state
and safety tests in `tests/lfma-mva-sprint.test.mjs`. Browser QA covers every
identity/route/outcome combination at desktop and mobile, no external requests,
consent gates, reset and viewport overflow. No live call is needed.

## Outstanding source and publication review

The original private Site source is Library file
`libfile_2eeec30af2bc8191b16f3455fb552402`, version 0,
`Phillips_MVA_Full_Sprint_Demo_Source.html`. Both supported consumer-local
materialization attempts failed. This candidate is independently implemented
from the supplied workflow brief; exact source parity has not been verified.
The original Library file and private Site remain unchanged.

Review source parity when that artifact can be transferred. Then the parent can
coordinate the approved LFMA release and verify the live public URL. Local QA,
a draft PR and a future URL are not a live publication. Do not merge PR219.
