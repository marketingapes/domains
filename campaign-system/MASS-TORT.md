# BTL MASS_TORT campaign kit v1

One campaign job extends `catalog.mjs`, `model.mjs` and `pages.mjs`. This operator-only adapter does not change the public studio, domain manifests, generated studios, existing pages or provider integrations. BTL is the tenant/platform; `firm` is the campaign’s brand overlay. MVA is a separate product. SSDI is benefits-specific and is never a mass-tort template.

From the repository root, copy `campaign-system/examples/mass-tort.draft.json` to a private working file. It contains **template placeholders**, no prospective client or claimant data, no legal/medical criteria and no inherited budget. Choose a unique campaign ID and update all three page IDs and `identity.source` to match. Use an existing named mass-tort catalog topic; `createMassTortKit({topic,start,campaignId})` creates a fresh blank profile. Changing torts requires a fresh profile and human firm review; never copy criteria, consent approvals or evidence from another campaign.

```sh
node campaign-system/mass-tort-cli.mjs campaign-system/examples/mass-tort.draft.json /tmp/btl-mass-tort-review-001
node --test campaign-system/test/*.test.mjs
```

The single dry run validates the input and writes `manifest.json`, `readiness.json`, `form.html`, `quiz.html`, `sofia.html` and `ads.html` to a **new directory outside the repository**. It refuses invalid input, existing output directories and repository destinations. Generated HTML uses the existing studio renderer with the firm display name and color. Form/quiz/Sofia remain clearly labeled, non-submitting demos; no AI is connected. Ads show three editable concept slots with image, video storyboard and final video references; it does not invent finished creative. The approved logo reference is carried in the manifest for final page assembly; this dry run does not import/embed logo or media assets. Review readiness requires separate polished asset evidence.

For a blocking gate, append `REVIEW_READY` or `LAUNCH_READY`. Exit codes: 0 = requested gate passed (default DRAFT only means valid dry run), 1 = readiness gate blocked, 2 = invalid input or filesystem error. The manifest always has `dryRun:true` and `activation:false`, even if launch evidence is complete. No publish/activation command exists here.

## Required field checklist

| Scope | Required input |
| --- | --- |
| Identity | Unique campaign ID; bound tenant/domain IDs; source `btl:mass-tort:<campaignId>`; stable `submission_id`, persisted `lead_id`; tenant/domain/campaign/submission dedupe scope |
| Firm brand | Firm ID and approved display name, six-digit hex color, approved local logo reference; routing stays in destinations |
| Tort | Named catalog topic, same screening topic, rules version, firm-reviewed qualifications and disqualifications; human review always required |
| Geography | Included geography, explicit exclusions array (empty means none only after firm approval) |
| Consent | Exact consent version and exact calls/SMS text; visible, unchecked channel choice; no hidden checkbox or inferred grant |
| Pages | Three unique campaign page IDs and versioned polished preview references; form→open, quiz→prequalify, Sofia→ai |
| Creative | Exactly three concepts, copy, image preview, video storyboard; final video deliverables for launch |
| Infrastructure | Existing Make scenario/hook IDs and revisions, Vapi assistant, existing labeled test line, BigQuery and Perspective bindings; no secret URLs |
| Intake destinations | Existing calendar, transfer, firm delivery and fallback IDs/revisions; IANA timezone |
| Reporting | Clearly labeled synthetic sample reference; actual reconciliation reference separately; unknowns null; public aggregates only, cohort >=10, max age 15 minutes |
| Budget | Positive explicit media cents and separate approval reference; studio pricing is never authorization |
| Evidence | Current snapshot hash; every required check has verified=true, private receipt reference, named reviewer and ISO review timestamp |

Opaque provider IDs and repo/private evidence references only. Never include credentials, webhook URLs, claimant names/phones, answers or transcripts in this public kit or generated review output. Logo references must be local asset paths; the adapter fetches no remote assets. Keep the working campaign configuration and proof receipts private; publish only sanitized assets after separate approval. Unknown properties are rejected recursively, so a copied MVA/SSDI or provider-export config cannot silently become this product.

## Two gates

`REVIEW_READY` requires polished branded page evidence, all three ad concepts with image/video preview evidence, a verified existing labeled test/demo line and an honest sample report. The blank example is **DRAFT**. Its generated slots do not claim polished pages, connected services, actual reporting or optimization.

`LAUNCH_READY` additionally requires campaign-specific firm approvals of rules, geography, copy and exact consent; all bound inputs/destinations; verified persistent lead→call→outcome receipts; save-before-ack, callback scheduling and confirmed handoff/fallback; consent, duplicate and opt-out safeguards; actual reconciled reporting; separate budget and activation approvals. Readable per-check instructions live in exported `REVIEW_CHECKS` and `LAUNCH_CHECKS` and the emitted manifest. Every check is mandatory.

After reviewing the actual configuration and private receipts, set `evidence.snapshot` to `kitSnapshot(kit)` and record each attestation. Any material change invalidates all evidence. The hash binds approvals to content; it is not a signature or proof of provider health. The validator checks the completeness/consistency of human attestations offline; it does not verify external receipts or authorize launch. A reviewer must inspect the cited proof. Never mark a check verified merely because an ID exists or a request returned HTTP 200.

## Existing integration handoff — no new platform

Inspection baseline: domains `a73c3469077fe3c0cb8fa8d6979373c1ec5b2d37` and evolutionengine `2d8383e48524b817c9b157b5b18c3486e0464d69`.

- Reuse the envelope in `btl/paraquat/intake.js`: `btl.intake.web/v1`, stable retry `submission_id`, tenant/domain/campaign/page IDs, campaign-specific screening, exact consent/version and attribution. Preserve synthetic suppression flags. A receipt must identify a durable saved record before success is shown. Do not propagate Paraquat’s hardcoded rules, consent, phones, endpoints or hidden submit-consent checkbox.
- Existing Make **6437227** lacks an outboundVapi step and a save-before-ack guarantee. Copying its ID is not proof. Its launch gate requires explicit remediation receipt references for persistentReceipt and leadCallOutcome plus a verified revision. This PR does not alter that scenario or trigger tests against it.
- Keep `evolutionengine/docs/EVENT-CONTRACT.md`: existing `marketing_events` ledger, verified-forward writes only, native-ID lineage and `{channel}:{native_event_id}` idempotency. Reconcile `lead_submitted`, `call_started`, `call_outcome`, `callback_booked`, `transfer_completed`, `firm_accepted`/`firm_rejected`, `consent_captured` and `stop_received` using campaign-scoped mappings. Preserve `suppression_registry`; suppression wins. No speculative events or new tables.
- Existing Paraquat private reporting reads `raw_lead_events` and has campaign/source-specific filters in `evolutionengine/sql/views/paraquat_portal.sql`; it is not a generic new-campaign feed. Bind existing campaign-scoped views/adapters explicitly. Do not borrow Paraquat sources or assume the existing view includes another tort.
- Preserve `btl/paraquat/perspective/README.md` safeguards: public aggregates, unknowns null, >=10 cohort and <=15-minute freshness; the legal-web-lead overview route remains unchanged. Test-line documentation conflicts require binding receipts, never guessing from prose.

Automated now: input shape/product checks, versioned job configuration, evidence invalidation, readiness checklist, build manifest and safe local review previews. Later work needs separate approvals and implementation: final approved assets/logo assembly, provider adapters that consume this job, verified durable persistence/outbound flow, scheduling/handoff tests, actual reporting and activation. No new number, spend, outreach, activation, credentials/security changes, production deployment or merge is part of this kit.
