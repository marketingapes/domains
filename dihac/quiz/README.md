# DIHAC quiz — `/quiz/`

Built 2026-09-25 for the Evolution Engine 1.0 Paraquat demo loop. Preview only: `noindex`, `PREVIEW · NOT LIVE`, no lead capture, no webhook, no spend, no DNS change.

## What it does

A short screen on doihaveaclaim.ai. Answers never leave the page. The result routes the person to the tenant that owns the matter:

| result | route key | destination | tenant |
| --- | --- | --- | --- |
| `potentially_qualify` (paraquat track) | `paraquat` | `https://besttortlawyers.com/paraquat/?tort=paraquat&utm_source=doihaveaclaim.ai&utm_medium=quiz&utm_campaign=dihac-quiz&utm_content=potentially_qualify&quiz_id=dihac-quiz&quiz_version=…&session_id=…` (+ pass-through `lead_id`, `claim_id`, `campaign_id`, `gclid`, `fbclid`, `ttclid`) | BTL |
| `injury` | `injury` | `https://nearestinjurylawyers.com/?tort=injury&utm_source=doihaveaclaim.ai&…` | NIL |
| `no_match` / `unsure` | `sofia` | `/talk-to-sofia.html?from=dihac-quiz&result=…` (same domain, no utm) | DIHAC |

Deep links: `/quiz/?tort=paraquat` starts on the first paraquat step. `/quiz/?debug=1` prints the resolved route on the result screen.

## Where the rules live

- `index.html` → `<script type="application/json" id="quiz-schema">` is the single source of truth for steps, choices, outcomes, routes, stop reasons and outbound UTMs. Edit there.
- `<script id="quiz-engine">` is a pure router (no DOM). `tests/dihac-quiz.test.mjs` runs that exact block in node and walks every path.
- The human-readable version is `~/workspace/legal-lane/dihac-network/quiz-schema.md`. It is marked **DERIVED**: the canonical Muse schema was not on this Mac, in Drive, or in mail on 2026-09-25 (defect `BOOTSTRAP_DOC_MISSING`). Questions come from `~/workspace/legal-lane/dihac-network/library/paraquat.md`.

## Events (dataLayer → GTM-WJCZF46W)

`ee_page_view` (page_type `quiz`), `ee_quiz_start`, `ee_quiz_step` (step_id, step_index, track), `ee_quiz_complete` (result, tort, destination_tenant_id, destination_host), `ee_quiz_route` + `ee_outbound_click` on the CTA click, `ee_quiz_restart`. Every event carries `tenant_id=DIHAC`, `domain_id`, `session_id` and stored attribution. Individual answers (diagnosis, years, settlement) are **never** pushed to the dataLayer or sent anywhere.

## Copy rules (from the library README)

A matching answer means the person may **potentially qualify** for a lawyer to review. The page never says they have a claim, a case, or money coming. Stops are explained as "a common reason a reviewer would not take this further right now", then offered Sofia.

## Verify

```sh
node --test tests/dihac-quiz.test.mjs      # router + page contract
bash tools/check-release.sh                # full repo gate
```

End-to-end (Playwright, local static server → real besttortlawyers.com): see the 2026-09-25 receipt in Drive `Evolution Engine/…/30 Batch Room`.

## Known gaps

- The live BTL Paraquat page (`btl/paraquat/index.html`) does not read incoming query params; it keeps its own 3-step mini check and a preview-only lead form. Params are carried for attribution only.
- NIL destination is the homepage (`Talk with Sofia`), not a tort-specific page.
- DIHAC `config.js` still says `BUILT_NOT_LIVE`; the quiz inherits that state.
