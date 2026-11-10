# BTL network and campaign onboarding

Status: **BUILT-NOT-LIVE — specification and local preview**  
Owner: Kyle Gosselin / Marketing Apes  
Decision date: 2026-10-27, America/Los_Angeles

## Product decision

Best Tort Lawyers is the proposed **mass tort and abuse advertising directory and inquiry network**. Participating firms specify the matters they handle, their written screening criteria, jurisdictions, intake capacity and delivery requirements. People can review participating firms, provide a limited initial account and request contact. AI collects and organizes information against approved screening questions; the receiving firm makes legal and representation decisions.

The network model, pricing and alternate-firm routing are proposals. This repository does not establish that participating firms have signed network agreements, that a referral-service license exists, or that any tort is launch-ready. DoIHaveAClaim.ai can become a separate guided-screening entry; Nearest Injury Lawyers remains the PI/MVA acquisition lane. The present implementation is confined to the existing BTL campaign kit.

**Two different forms:** the onboarding preview is for law firms buying services. It is not a claimant intake form. Firm orders use `btl.campaign.order/v1`; claimant capture retains `btl.intake.web/v1`. Do not send an order into a claimant webhook.

## Source and authorization

- Read `BRIEF.md` first. The existing `build.mjs` remains the only page generator. No extensions to the retired `campaign-system/` or Python page builders.
- This change implements Kyle's October 27 request and subsequent network/membership direction. Existing role assignments in the earlier brief do not supersede that new request.
- Branch/PR preparation is authorized. Invoice sending, customer messages, calls, production changes, payment collection and spend remain subject to Kyle's exact authorization.
- Payment starts a staged build. Client acceptance puts the exact version into Kyle's launch queue. Neither is production approval.
- The existing nine campaign launch gates remain required. The additional commercial, privacy and routing checks below are prerequisites, not substitutes.

## Commercial models

| Model | Commercial purpose | Draft handling |
|---|---|---|
| `managed_campaign` | Dedicated campaign build plus an expressly approved media budget | Existing MA Test Fee is $2,500. Media must be an explicit positive amount. A proposed total is not an issued invoice or approved quote. |
| `qualified_lead_program` | Fixed contracted amount per defined, consented and valid inquiry | Price, geography, screening version, exclusivity, credits and acceptance window require an approved quote. No default service/media line items. |
| `network_membership` | Firm profile, criteria/capacity management and program/report access | $100–$150/month was brainstormed; $150 is a proposed presentation price only. No subscription creation, included media or guaranteed lead count. |
| `founding_partner` | Custom platform work and dedicated campaign operations | Custom scope, fee/media/usage split, milestones and authorization required. No automatic amount or billing. |

Membership and inquiries are different products. Do not charge a firm for both pass-through media and the same inquiries without an explicit, understandable commercial agreement. The public-facing inquiry service is proposed to be free. Signed representation and any eventual case recovery are distinct from advertising purchases.

## Manual process, translated into repeatable work

| Step | Manual decision or action | Deterministic system work | Evidence |
|---|---|---|---|
| 1. Request | Firm selects campaign/model, states and desired channels | Validate fields and catalog version; save one order | Order ID, version, timestamp, receipt |
| 2. Readiness | Confirm firm, written criteria, route, capacity and commercial terms | Evaluate required fields and unverified references; put unsupported requests into review | Named reviewer and source references |
| 3. Quote | Agree fee, media or inquiry price, limits and service scope | Freeze order snapshot and quote version | Accepted quote and scope/terms version |
| 4. Invoice | Invoice the authorized buyer for the agreed items | Reserve invoice operation; create once; bind provider invoice | Order/customer/invoice mapping, currency, total |
| 5. Payment | Confirm money is applied to that invoice | Authenticate event, persist, re-fetch authoritative state, reconcile | Payment IDs, applied amount, payment status |
| 6. Build | Assemble the campaign from the approved brief | Emit one build job per funded order/version; use `build.mjs` | Build ID, source hash, generated artifact hashes |
| 7. Test | Inspect pages, intake, consent, routing and reporting | Run deterministic checks and retain test evidence | Test receipts and durable synthetic row |
| 8. Client review | Client accepts or requests changes | Store edits against reviewed version; rebuild changed assets | Revision and client acceptance receipts |
| 9. Launch queue | Kyle reviews release, budget and schedule | Require current approvals on the same artifact/version | Owner release authorization |
| 10. Launch | Perform the explicitly authorized release | Publish approved version; activate only approved channels/budgets | Deployment and platform readback |
| 11. Operate | Firm reviews inquiries and returns dispositions | Track delivery, billing acceptance, firm acceptance, signed outcomes separately | Durable delivery/disposition/billing receipts |
| 12. Improve | Decide what to cut or test next | Compute internal quality/cost metrics; draft bounded changes | Before/after versions, hypothesis and outcome |

An early request may be saved while details are missing. It cannot become invoice-ready merely because it has a receipt. An invoice can be the commercial entry point with a referenced, versioned scope and terms; it does not replace the separate claimant permission, representation and network arrangements.

## Firm request fields

Use progressive disclosure. Repeat firm details from a verified profile only when current and authorized; allow correction.

| Group | Required for a complete request | Required before invoice or release |
|---|---|---|
| Campaign | Commercial model, tort/matter, target states, language, desired channels | Supported template/version; approved scope and account mapping |
| Key qualifiers | Written criteria source and version, responsible approver | Approved rules, questions, unknown treatment, effective date and exclusions |
| Firm | Legal firm name, requester, business/billing contact | Verified authority, participant status, approved public firm identity |
| Intake | Delivery choice, destination reference, hours/timezone, capacity | Tested actual receiving route and fallback; destination permissions |
| Money | Proposed media amount for managed campaigns, requested billing recipient | Approved price/currency, funding rule, fee/media/usage breakdown, cancellation and credit terms |
| Review | Scope acknowledgement and change notes | Versioned final terms acceptance; exact client acceptance of generated assets |

Collect no claimant medical information in this form. Never request API keys, bearer links or secret webhooks. A destination field holds an adapter reference, not a credential. Store integrations through the existing secure credential flow.

## Campaign hierarchy and build manifest

One campaign unit is one buyer + matter + qualifier version + jurisdiction set + language + commercial authorization. A multi-tort order contains multiple units; it is not one ambiguous all-torts campaign. Preserve campaign budgets and outcomes separately.

The approved manifest connects:

1. Firm/profile and responsible reviewer.
2. Written qualification profile and question set.
3. Matter, jurisdictions, language and supported claims/disclosures.
4. Three entry doors: guided screening, Sofia and callback form.
5. Selected channel drafts, creative variants and landing destinations.
6. Budget envelope, explicit channel allocations, run length and start trigger.
7. Consent profile, intake adapter, durable capture and deduplication.
8. Actual firm transfer/delivery route, hours, capacity and unavailable-state behavior.
9. Approved internal measurement and any separately allowed platform event mapping.
10. Client review, owner release and immutable receipts.

`build.mjs` already generates the five-page lane, paused ad bundles, Sofia configuration, delivery configuration, tracking and launch checklist. Onboarding extends that generator. A catalog entry only means a template exists; source tests, integration evidence and approvals determine readiness. At this baseline there are two kit configurations, Paraquat and Bard PowerPort. Other torts require a new approved config; SSDI is a separate benefits product.

Do not automatically split a small budget among every channel. Store channel eligibility and the approved allocation; optional channels remain requests until their account, creative, policy, measurement and budget checks pass. Preserve the Phillips AZ MVA account's existing Arizona-only authority and funded destinations. A mass-tort order cannot reuse that authority, account budget or claimant pool by default.

## Key qualifiers: facts, evidence and decisions

Maintain a versioned profile containing criterion ID, buyer-approved question, allowed answers, rule, required evidence, sensitivity, source and approver. Potential categories include product/exposure, injury, dates, jurisdiction, prior representation and documentation. These are candidate categories; none is a universal disqualifier.

Each answer carries source, capture date, profile version, evidence status and result. A platform audience, IP address or AI inference never proves a person's residence, age, exposure, diagnosis or eligibility. Reuse a known answer only when appropriately authorized and matched, with its provenance and a correction path.

| Result | Meaning | System behavior |
|---|---|---|
| `PRELIMINARY_MATCH` | Reported facts satisfy the approved screening rules at their allowed evidence level | Offer the permitted next intake step; do not claim legal eligibility |
| `NEEDS_REVIEW` | Critical answer is missing, uncertain, conflicting or needs records/legal judgment | Hold for human review; never invent an answer |
| `NOT_MATCHING_CAMPAIGN` | An approved rule is not met for this specific campaign | Explain this program's scope and, where permitted, offer another option |

Firm acceptance, signed representation and revenue are separate events. A signed retainer is not collected revenue. A lead missing disposition data is unknown, not zero signed outcomes.

## Proposed network routing

Directory advertising and an automated lawyer referral service can have different obligations. The runtime must carry a jurisdiction-approved `routing_mode`; calling the product a directory does not establish an exemption. California's official rules require referral-service certification unless exempt. ABA Model Rule commentary permits certain paid lead generation but draws a boundary around paid recommendations and representations about legal analysis. Have the relevant firm/counsel approve the operating model before enabling multi-firm routing. See sources below.

For an advertising-directory mode, the consumer affirmatively selects the identified participating firm and initiates the contact request. System assignment followed by displaying a firm is not equivalent to consumer selection. Do not claim to rank the best lawyer, guarantee a legal fit or send a request to an undisclosed purchaser. Public listings require verified firm identity, participation, practice areas and jurisdictions; sponsored placement must be disclosed. A paid membership does not establish professional qualification.

Alternate-firm delivery requires ALL of the following:

- The original firm's specific rejection or release reason, preserved as a fact about that program.
- The applicable media/data agreement permits alternate handling. Phillips-funded inquiries are not automatically network inventory.
- A legally approved routing model for the relevant jurisdiction.
- A current, eligible participating recipient with capacity and an approved profile.
- The person's informed permission for the identified recipient and relevant contact channel, with a withdrawal path.
- No conflicting exclusivity, duplicate sale or active representation restriction.
- A new delivery/consent/billing record linked to the original claim, without overwriting its origin.

If any predicate is unknown, stop in review. A no-match state provides an honest explanation and appropriate next options; it does not assert that the person has no legal claim. Abuse inquiries should support a minimal-information, safe-contact path and human handoff without requiring a detailed traumatic narrative for advertising qualification.

## Qualified-inquiry billing proposal

The proposed billable unit is a unique, consented inquiry that meets the contracted screening definition and is delivered with an acknowledgement to the agreed firm. It is not a guaranteed signed case. Specify whether confirmation of contactability or a connected call is part of the SKU.

Proposed advertising/directory compensation is not tied to attorney fees, firm revenue or a recovery in a particular case. California Rule 5.4 comment 2 expressly addresses that nonlawyer compensation boundary. Pricing labels do not independently resolve referral-service requirements. [S8]

Persist `delivery_id`, `claim_id`, buyer, qualification version, exclusivity, price version, consent reference, delivery acknowledgement, acceptance/credit status and invoice line reference. Idempotency keys prevent duplicate billing. A matched inquiry with failed delivery is not billable.

Before selling the product, agree an objective dispute window and credit reasons: duplicate within the agreed lookback, invalid contact, outside scope/geography, missing permission or verified screening error. Do not let a buyer redefine qualifiers after delivery, and do not treat a failure to sign a valid inquiry as an automatic defect. Silence is not acceptance unless an approved contract expressly establishes that mechanism. No unlimited sharing or undisclosed parallel sale.

For prepaid credits, implement an append-only ledger: funded, reserved, delivered/charged, credited, released, refunded. Reserve at most the available balance in the same transaction that reserves the delivery. The pure onboarding contract does not implement this ledger or authorize any PPL charges.

## Render, Make and provider boundaries

Render owns validation, current order state, the transaction boundary, uniqueness, pricing/approval checks and job creation. Use the existing transaction-capable application store after verifying it; do not introduce a new service merely for this prototype. BigQuery is the durable analytical/event layer, not the only concurrency lock. Drive/Sheets displays the human brief and queue; it does not decide payment truth. Make invokes adapters and mirrors approved outcomes.

### Scenario map to implement after review

| Scenario | Proposed modules | Failure behavior |
|---|---|---|
| Order accepted | Authenticated Render outbox job → mirror order/brief → return mirror reference | Retry by order/version; no invoice on mirror failure |
| Invoice operation | Reserved invoice job → QBO customer lookup → approved line validation → create/reconcile invoice → return invoice ID | On ambiguous provider timeout, reconcile before creating again; outbound held |
| Payment reconciliation | Intuit event inbox → provider re-fetch → transactionally reconcile applied payment → emit one build job | Partial, pending, reversed, mismatched or unknown state cannot advance |
| Campaign build | Approved job → existing repository branch/build adapter → kit build/tests → review artifact receipt | Preserve failed build; retry same job safely; no public deployment |
| Revision | Authorized change request → new version → rebuild affected assets → review receipt | Invalidate affected client/owner approvals; price changes require re-quote |
| Launch queue | Client acceptance + complete evidence → owner queue item | Missing/stale gate stays blocked |
| Release | Exact owner authorization → existing deployment/ad adapters → readback | Partial release is an incident; pause affected lane and retain receipts |
| Outcomes | Firm disposition adapter → canonical event validation → durable event → internal reporting | Deduplicate; quarantine mismatched tenant/claim IDs; retry with evidence |

All outbound notifications have a separate authorization boundary. A future approved automatic-invoice policy can allow routine sends for exact catalog/profile versions; it must be explicit, bounded and revocable. Until then, the invoice is prepared for Kyle's approval. Do not turn on an existing scenario to test this flow: several existing order scenarios email people.

Make's instant webhooks execute in parallel by default. Enable suitable queue/error settings and incomplete executions, but keep application-level transaction/idempotency controls. Do not send a success response before durable acceptance and then ignore downstream storage failure. Provider notifications should be accepted quickly after durable inbox storage and processed asynchronously. Intuit documents a three-second acknowledgement target, out-of-order events and CDC reconciliation for missed notifications. [S3–S5]

### Invoice/payment verification

Prefer the payable invoice's payment route. A separate QuickBooks standalone payment link creates a different accounting path; Intuit documents that Online link payments become sales receipts and are not an invoice-follow-up mechanism. QuickBooks Payments availability on this company is unverified. [S2]

Current provider catalog reads found MA Test Fee item `53` at $2,500 and Ad Budget item `1010000001` with a $0 default. Override the budget explicitly. No invoice or subscription was created. Historical briefs reference another ad-spend item; bind current quote/product mappings explicitly rather than silently substituting.

Authenticate Intuit's raw-body HMAC signature before accepting a webhook. Support the configured payload version, validate its company/account mapping, then store the inbox event once. Re-fetch invoice and applied payments; a created invoice, browser thank-you, webhook name or zero balance alone does not prove payment. Credits, voids and write-offs must not unlock a build. Payment and media-funds availability are separate checks. Do not expose a client-controlled `mark paid` operation. [S6]

## Measurement and optimization

Keep `lead_id`, `claim_id`, `domain_id`, `campaign_id` and relevant order/build/delivery IDs joinable. Preserve first-touch attribution and subsequent touches as distinct records. Preserve consent version, timestamp, page/build, recipient scope and TrustedForm retention reference when required.

Primary internal measures: valid inquiry cost, firm acceptance rate, cost per firm-accepted inquiry, signed rate/cost where dispositions are available, credit rate, response time, contribution after media/usage/credits and collected revenue. Key qualifiers are eligibility rules, not substitutes for these measures.

Keep diagnosis, exposure, abuse details, screening answers, transcripts and records out of ad telemetry. Default sensitive-platform exports off; review payloads, URLs, referrers, consent and event meaning for each campaign/platform. Google prohibits sensitive-category measurement through enhanced conversions/store-sales uploads. Hashing or server-side transport does not override that restriction. Meta/current channel eligibility remains a separate review, not a presumed pass. [S7]

Use the initial funded sprint to measure a single approved lane. Record a baseline and explicit volume/spend cap; no evidence currently supports a universal PQL rate or guaranteed cost reduction. Every creative, routing or budget change gets a hypothesis, an approved bound and an outcome review. Proposed improvement can be automated; live spend and material changes retain Kyle's authorization.

## Acceptance and release receipts

Before production, demonstrate a controlled order → authorized invoice → verified payment → exactly one build → client revision/acceptance → launch queue path. Also test duplicate clicks/events, missed and out-of-order payment events, partial/failed/refunded payments, stale approvals, changed quote, failed storage, failed delivery, exhausted capacity, withdrawal and a no-match inquiry. Use sandbox providers or locally synthetic fixtures until an exact live test is authorized.

The current PR contains a real offline request preview, deterministic contract functions and tests. It does not contain a deployed Render API, transactional database migration, live Make scenario, automatic invoice send, subscription, real payment, licensed network, approved PPL price or live campaign. `RECEIPT.md` records the checks actually completed.

## Primary references

- S1: [ABA Model Rule 7.2 commentary](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_7_2_advertising/comment_on_rule_7_2/) and [California State Bar lawyer referral rules](https://www.calbar.ca.gov/legal-professionals/rules/rules-state-bar/title-3-programs-and-services/chapter-3-lawyer-referral-services). These are a design boundary, not a nationwide legal opinion.
- S2: [Intuit payment links](https://quickbooks.intuit.com/learn-support/en-us/help-article/payment-methods/payment-links-quickbooks-desktop/L6onPNJpn_US_en_US).
- S3: [Make webhooks](https://help.make.com/webhooks).
- S4: [Make incomplete executions](https://help.make.com/incomplete-executions).
- S5: [Intuit webhook best practices](https://static.developer.intuit.com/output_html/qbo/docs/develop/webhooks/best-practices.html).
- S6: [Intuit webhook configuration](https://static.developer.intuit.com/output_html/qbo/docs/develop/webhooks/configure-webhooks.html).
- S7: [Google customer data policies](https://support.google.com/google-ads/answer/7475709?hl=en).
- S8: [California Rule 5.4, comment 2](https://www.calbar.ca.gov/legal-professionals/rules/rules-professional-conduct/current-rules-professional-conduct/chapter-5-law-firms-and-associations).

Restart point: wire the reviewed contract into the existing Render application and approved provider adapters in a subsequent branch. Obtain the missing company payment configuration, approved commercial terms, written buyer qualifiers, real intake destinations and jurisdiction-specific network determination before scheduling a live test.
