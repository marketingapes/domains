# BTL consumer experience patch receipt

Baseline: PR338, `draft/btl-mass-tort-kit-v1`, reviewed commit `8751568aa63bd7add857b08e6d9003611ecac751` (346 tests). This isolated branch, `draft/btl-page-optimization-v1`, adds to that baseline. It does not merge PR338 or rewrite the original template. `pages.mjs` retains its existing layout and generic studio behavior; the validated MASS_TORT adapter supplies the new optional experience to the same renderer.

## Deliverable and local proof

Run `node campaign-system/setup-server.mjs`, import a synthetic fixture, or edit the shared campaign experience fields and generate the existing review pack. The optional `experience` object is backward compatible with reviewed v1 kits and participates in the existing evidence hash. It contains `headline`, `intro`, `imageRef`, `imageAlt`, `faqVersion`, `nextSteps[]`, and `faqs[{question,answer,approvalRef}]`. Existing firm, screening, geography and consent fields remain authoritative within that draft. Screening question IDs are version-scoped (`qualifies-N` / `disqualifies-N`); reordering rules requires a new reviewed question bank version before integration.

To reproduce the exact synthetic screenshots through the existing dry run:

```sh
node --input-type=module -e "import {experienceFixture} from './campaign-system/test/fixtures/campaign-experience.mjs'; import {writeFileSync} from 'node:fs'; writeFileSync('/tmp/btl-experience.json',JSON.stringify(experienceFixture(),null,2));"
node campaign-system/mass-tort-cli.mjs /tmp/btl-experience.json /tmp/btl-experience-review
SHOTS=/tmp/btl-experience-shots node tests/campaign-experience.browser.cjs
CHROMIUM=/usr/bin/chromium SHOTS=/tmp/btl-setup-shots node tests/mass-tort-setup.browser.cjs
bash tools/check-release.sh
```

The output directory must be new. The browser suite serves the generated documents at loopback `/paraquat/`, `/paraquat/quiz/` and `/paraquat/talk-to-sofia/` aliases. Those aliases prove local rendering only; the committed public `btl/paraquat/*` pages and `/perspective/` remain unchanged. There has been no live deployment or public publishing.

| Feature | Local behavior proved | Still unbound |
|---|---|---|
| Form / callback | Validates synthetic contact details and screening; exact unchecked calls/SMS choices; prepares a local preview | No callback request, lead write or durable receipt |
| Quiz first | Requires answers including “Not sure”; passes prior answers, source and confirmation timestamps to Sofia mode in the same document | No cross-document persistence or server context fetch |
| Sofia first | Displays scripted prompts from this campaign’s questions and retains prior answers; visible adjacent AI/voice disclosure | No microphone, connected model, voice session or outbound call |
| Information | Shared supplied FAQ copy/version; unknown questions explicitly require human review; no freeform legal chatbot | Review-reference strings are supplied evidence, not verified approval |
| Assets | Owned BTL seal and responsive 900/1600px USDA agricultural image; alt text, intrinsic sizes, decoding, no remote requests | Custom firm logos and other tort assets require assembly; missing assets show a visible requirement |
| Retry | Unchanged repeated preview retains its ID; edited inputs invalidate the preview and create a fresh ID | Server dedupe/save-before-ack still required |

Screenshots and the machine receipt are delivered separately in the user’s Library; this stacked PR contains text/code only. The local synthetic screenshots cover all three modes at 390px and 1440px. The receipt records zero external/mutating consumer requests and zero page errors. CI also preserves browser screenshots and logs as run artifacts. Tests also cover config variations, missing consent/questions/images, malformed FAQ editing and recovery, escaping, same-document answer provenance, mode transitions, optional SMS, clear/reset, empty storage, keyboard skip/focus, labeled inputs, reduced motion and overflow. Existing setup regression tests retain firm/tort isolation, stale-evidence checks and eight-download behavior. This is focused automated accessibility checking, not a complete assistive-technology audit.

The screenshots and fixture use synthetic operational questions and copy. They contain no approved legal screening criteria, outcomes, testimonials, caller histories or performance claims. Image provenance is retained in `docs/paraquat-pilot-001/README.md`: USDA NRCS public-domain agricultural landscape, not a client/victim endorsement or evidence of herbicide use. The asset resolver uses exact paths only and reads no imported filesystem references.

## Proposed form / quiz → Sofia context

`campaign-system/handoff-contract.mjs` produces the existing `btl.intake.web/v1` envelope with a **proposed**, unbound `spec_version: btl.sofia-context/proposed-v1` context. It includes:

- `campaign_id`, `spec_version`, `tenant_id`, `brand_name`, `firm_name`, `tort_name`, `source_path` (`form|quiz|sofia`), `question_bank_version`, `faq_version`.
- `lead_id: null` and `consent_record_id: null` until authoritative persistence exists. The browser never invents a saved lead or consent receipt.
- `prior_answers[{question_id,value,source,confirmed_at}]`, `consent_scope`, `context_status: untrusted_local_demo`.
- Existing domain/page/source/submission identifiers, exact consent version/text and a synthetic contact preview. Test suppression covers outbound calls, SMS, email, buyer delivery and ad events. `dry_run:true`, `activation:false`, `transport:none`, `receipt:null`, human review required.

All browser inputs are untrusted. Before any Vapi use, Render must validate tenant/campaign/lead linkage, resolve authoritative firm branding, screening/question-bank and FAQ versions, consent/suppression state and routing from server-held configuration, and bind an opaque persisted context reference. Do not forward browser-provided firm/routing/answer strings as system instructions or legal eligibility decisions. Phone/email/claim details must never enter analytics, pixels or query strings. This patch has no analytics, storage, transport or provider SDK.

The current Paraquat assistant is not wired to this context contract. A public page or configured assistant does not prove a callback, booking or firm handoff. Live persistence, context fetch, approved prompt/routing, durable lead→call→outcome receipts and explicit activation remain dependencies. No callback, scheduling, microphone or endpoint adapter was enabled here.

## Boundaries and read-only search

No change to `mass-tort-lifecycle.mjs`, domain manifests/schema, portfolio, foundation hashes, engine pins, SSDI, Phillips MVA or phone bindings. No purchases, calls, SMS, email, grants, lead transmission, deployment or merge. The schema extension lives in the existing independent `mass-tort.mjs` validator; no lifecycle-code workaround is used.

The bounded UUID search for `211218bd-989a-493e-87b5-5185b9e1ad7f` returned no matches across local domains, this isolated branch, evolutionengine, legal-web-lead, evolution-legal-router, sofia-lead-portal, lead-router and nil-intake sources, excluding Git internals and encoded binaries. No Vapi read tool was available to resolve its display name. This does not prove the assistant is unused; remote/provider bindings were not inspected or altered.
