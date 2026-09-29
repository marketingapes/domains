# Paraquat → Phillips 5-lane: creative learnings

Grounded in what shipped (or was archived) for Paraquat and the Arizona MVA pilot. Short on purpose.

## 1. Messages / angles that were used

| Angle | Where | Keep? |
|---|---|---|
| "Paraquat questions. *A clearer first step.*" (serif, italic second clause) | `btl/paraquat/index.html`, `btl/paraquat/quiz/index.html`, screen `docs/paraquat-archive/screens/1-muse-desktop.png` | **Reuse the shape**: plain question + calm promise of a *step*, not an outcome. |
| "Start with Sofia" / "Talk to Sofia about a potential … claim." | `btl/paraquat/talk-to-sofia/index.html`, `nil/index.html`, AZ creative `campaigns/arizona-mva-pilot/creative/nil-clearer-next-step-square-v1.png` | Reuse as secondary line / CTA. |
| "may potentially qualify for further review by an independent law firm" | every `btl/paraquat/*` page, `btl/brand.json` (`seo.description`, `persona_notes`) | **Reuse verbatim** in body copy. |
| "A clearer next step after an accident" / "Free first step. No guarantee of a connection or representation." | `campaigns/arizona-mva-pilot/meta-campaign-blueprint.json` cell A | Reuse for NIL MVA. |
| "Exposed? You May Qualify", "Free … Case Review", "You may have legal options … so an attorney can evaluate" | archived ad tab in `docs/paraquat-archive/2026-09-27-form-preview-1c51685.html` | **Avoid** — "You May Qualify" drifts toward an eligibility claim, and "an attorney can evaluate" implies a lawyer review we can't promise. The archive exists because that version was replaced. |
| Nav CTA "Check if you qualify" / button "Check if I qualify" | `btl/paraquat/index.html` | **Avoid in ads**; use "See your options" / "Start with Sofia". |
| Social proof, dollar amounts, internal metrics | none on Paraquat consumer pages; BUILD-SPEC flags #143 for putting "reconciled 18 signed matters…" in a hero (`docs/phillips-5-lane/BUILD-SPEC.md`) | Never. |

## 2. Imagery style

- **BTL**: warm paper background `#F6F1E7`, ink `#111827`, gold hairlines `#C6A15B`, serif headline (Iowan Old Style / Baskerville / Georgia), sans body, seal `btl/assets/btl-seal.svg`. One public-domain *context* photo (USDA NRCS soybean rows, `btl/assets/paraquat-field-usda-nrcs*.jpg`) washed out to ~80–90% paper overlay behind the headline (`btl/paraquat/paraquat.css` `.hero:before`). No claimant, no diagnosis, no exposure event depicted; provenance credited (`docs/paraquat-pilot-001/README.md`). Tone: "Quiet authority. Plain, direct, human." (`btl/brand.json` `voice`).
- **NIL**: navy `#08122b`→`#0f1e3c` radial gradient, white heavy sans headline (weight ~850, tight tracking), teal `#2fbfa3` and red/coral pin accent (`nil/index.html`, `nil/assets/pin.png`).
- **AZ MVA static** (`nil-clearer-next-step-square-v1.png`): navy panel + AI-generated photo of a woman with phone by a car. **Avoid for Phillips**: it's an AI face (disclosure risk, no license record), and it has **no disclaimer band**.
- The Paraquat "illustrations are original artwork" pattern (symptom/work icons) is a safe way to add visuals without people.

## 3. Compliance-safe patterns to carry over

- "ATTORNEY ADVERTISING." first, then: matching/directory service, **not a law firm**, no legal advice, no attorney-client relationship, nothing guaranteed (`btl/paraquat/talk-to-sofia/index.html` footer; `nil/index.html` footer).
- "may potentially qualify" — never "you qualify" (`btl/brand.json` `persona_notes`; BUILD-SPEC copy rules).
- "an independent law firm" — never name the firm (BUILD-SPEC; naming Phillips is an attorney-review gate).
- **AI disclosure** wherever Sofia is named: "Sofia is AI, not an attorney" (`btl/paraquat/*`), "AI intake specialist" (`campaigns/arizona-mva-pilot/followup-copy.md`).
- "Not sure" is always a valid answer; no answer ends in "no match" (`docs/paraquat-archive/README.md` QA table).
- Meta description field used as a compliance line: "Start with Sofia. Not a law firm. No legal advice." (AZ blueprint) — reuse.
- Blueprint guardrails `avoid_personal_attribute_assertions`, `avoid_case_value_or_outcome_claims`, `do_not_call_service_a_law_firm` (`campaigns/arizona-mva-pilot/meta-campaign-blueprint.json`) — apply to every ad. Especially: no "Were you abused?"/"Are you a survivor?" second-person attribute assertions on Meta.

## 4. Funnel structure

Ad → landing (`/<lane>/`, one focused object + disclosures) → quiz (`/<lane>/quiz/`, one question per step, "Not sure", recap, contact) → Sofia (`/<lane>/talk-to-sofia/`, call or callback, AI-disclosed) → human review. Intake endpoint is fail-closed (`CONFIG.endpoint = null`) until a BTL tenant exists (`docs/paraquat-archive/README.md`). dataLayer carries only non-identifying events (BUILD-SPEC tracking contract). AZ MVA alternative: Meta Instant Form → signed webhook → Sofia (`campaigns/arizona-mva-pilot/README.md`).

**Implication for creative:** ads sell the *first step* (short, private, at your pace), not the case. CTA = "Learn More" by default.

## 5. Reuse vs avoid (summary)

Reuse: serif-question + calm-step headline pattern; paper/ink/gold BTL system; navy/teal NIL system; "may potentially qualify"; "independent law firm"; AI disclosure; one-line compliance description; typography-led layouts; public-domain context imagery only.
Avoid: "You may qualify"/"Check if you qualify" in ads; any lawyer/attorney-evaluation promise; AI-generated faces; creatives without a disclaimer band; naming the receiving firm; dollar/outcome/volume claims; mixing BTL and NIL assets (BUILD-SPEC identity rule).
