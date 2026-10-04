# DIHAC quiz — `/quiz/`

Built 2026-09-25 for the Evolution Engine 1.0 Paraquat demo loop, extended the same day to all six library torts. Preview only: `noindex`, `PREVIEW · NOT LIVE`, no lead capture, no webhook, no spend, no DNS change.

## Files (edit the sources, never the injected blocks)

| file | role |
| --- | --- |
| `schema.json` | the shared schema: tracks, steps, choices, outcomes, routes, stop reasons, outbound UTMs |
| `engine.js` | pure router (`createEngine(schema)` → `start, apply, walk, describe, destination, remaining, tracks, validate`); no DOM |
| `build.mjs` | injects both into `index.html`; `--check` fails CI when stale; `--mirror` regenerates the shared markdown at `~/workspace/legal-lane/dihac-network/quiz-schema.md` (or `$QUIZ_SCHEMA_MD`) |
| `index.html` | the page: UI only |

```sh
node dihac/quiz/build.mjs --mirror        # after editing schema.json or engine.js
node --test tests/dihac-quiz.test.mjs     # walks every track and stop reason; asserts page == sources
bash tools/check-release.sh               # full repo gate
```

## Tracks and routes

| track (`?tort=`) | route | destination | tenant | status |
| --- | --- | --- | --- | --- |
| paraquat | `paraquat` | `https://besttortlawyers.com/paraquat/?tort=paraquat&utm_source=doihaveaclaim.ai&utm_medium=quiz&utm_campaign=dihac-quiz&utm_content=potentially_qualify&quiz_id=…&quiz_version=…&session_id=…` + pass-through `lead_id claim_id campaign_id gclid fbclid ttclid` | BTL | live |
| injury | `injury` | `https://nearestinjurylawyers.com/?tort=injury&…` | NIL | live |
| roundup, afff, camp-lejeune, hernia-mesh, talc | `<tort>_review` | `/talk-to-sofia.html?from=dihac-quiz&result=potentially_qualify_sofia&tort=<tort>&intent=claim&utm_campaign=dihac-quiz&utm_content=…` | DIHAC | needs_buyer |
| any stop, "unsure", Camp Lejeune "closed" | `sofia` | `/talk-to-sofia.html?from=dihac-quiz&result=…&intent=claim…` | DIHAC | — |

`needs_buyer` routes swap to a firm page by editing one URL in `schema.json` once a buyer exists (TORT REGISTRY: T48–T53 are "NEEDS BUYER"; T31 hernia mesh is READY with Phillips but has no live page). The Sofia page only knows intents `car_accident | claim | slip | truck`; an unknown intent falls back to car-accident copy, so every same-domain route sends `intent=claim`.

Deep links: `/quiz/?tort=<track>` starts on the first step of that track. `/quiz/?debug=1` prints the resolved route on the result screen. Keys 1–9 answer the visible choices.

## Events (dataLayer → GTM-WJCZF46W)

`ee_page_view` (page_type `quiz`), `ee_quiz_start`, `ee_quiz_step` (step_id, step_index, track), `ee_quiz_complete` (result, tort, destination_tenant_id, destination_host, route_status, step_count), `ee_quiz_route` + `ee_outbound_click` on the CTA click, `ee_quiz_abandon` on pagehide before a result (step_id, step_index, track), `ee_quiz_restart`. Every event carries `tenant_id=DIHAC`, `domain_id`, `session_id` and stored attribution. Individual answers (diagnoses, years, settlements) are **never** pushed to the dataLayer or sent anywhere; the result screen's "What you told us" recap is rendered on-page from schema labels only.

## Copy rules (from the library README)

A matching answer means the person may **potentially qualify** for a lawyer to review. The page never says they have a claim, a case, or money coming, and carries no dollar figures. Stops are explained as "a common reason a reviewer would not take this further right now", then offered Sofia. Camp Lejeune with nothing filed by 2024-08-10 is a distinct `closed` outcome that never says "may still file".

## Known gaps

- The live BTL Paraquat page (`btl/paraquat/index.html`) does not read incoming query params; it keeps its own 3-step mini check and a preview-only lead form. Params are carried for attribution only.
- `talk-to-sofia.html` reads `intent`, `utm_*`, `source` but not `from`/`tort`; the tort is visible in the URL and dataLayer only.
- NIL destination is the homepage (`Talk with Sofia`), not a tort-specific page.
- `ee_quiz_*` events have no GTM tags yet. DIHAC `config.js` still says `BUILT_NOT_LIVE`.
