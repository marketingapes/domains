# DIHAC quiz engine

Config-driven screening quiz for doihaveaclaim.ai. One JSON definition per
tort, one engine, one signal.

| Piece | Where |
|---|---|
| Engine | `dihac/app.js` (activates only on a `[data-dihac-quiz]` element) |
| Settings | `dihac/config.js` → `quiz` block: allowed torts, next-step targets, disclaimer |
| Quiz definitions | `dihac/campaigns/<tort>/quiz.json` (`afff`, `paraquat`) |
| Harness page | `dihac/quiz/index.html?tort=<tort>` |
| Tests | `tests/dihac-quiz.test.mjs` |

## Run it locally

```sh
cd dihac
python3 -m http.server 8080
# http://localhost:8080/quiz/?tort=afff
# http://localhost:8080/quiz/?tort=paraquat
```

The quiz JSON is fetched, so `file://` will not work; any static server does.
Open the browser console to see `dataLayer` events (`ee_quiz_start`,
`ee_quiz_step`, `ee_quiz_complete`). Answer values are never pushed to the
data layer, only question ids and the final signal.

Score without a browser:

```sh
node --test tests/dihac-quiz.test.mjs
```

Or from the console on the harness page:

```js
DIHAC_QUIZ.load('afff').then(q => DIHAC_QUIZ.evaluate(q, {
  exposure: 'firefighter_civilian', exposure_years: 'over_five',
  diagnosis: ['kidney_cancer'], diagnosis_year: 'within_2', represented: 'no'
}))
```

## Signal

`DIHAC_QUIZ.score(quiz, answers)` returns exactly one of `strong`,
`possible`, `unlikely`:

1. Any `scoring.disqualify` rule that matches → `unlikely`.
2. Otherwise add the `points` of every matching `scoring.points` rule.
3. `points >= thresholds.strong` → `strong`, `>= thresholds.possible` →
   `possible`, else `unlikely`.
4. A `strong` result drops to `possible` if any `scoring.required` rule is
   not met.

Conditions: `{question, is}`, `{question, in: []}`, `{question, includesAll: []}`,
`{question, answered: true|false}`, combined with `{all: []}`, `{any: []}`,
`{not: {}}`. Multi-select answers are arrays; `is` and `in` match any selected
value.

## Result screen

`results.<signal>` supplies `headline`, `body`, `nextStep`
(`sofia_outreach` | `resources`) and an optional `lawyerType` override; the
quiz-level `lawyerType` is the default. The engine appends the config
disclaimer to every result.

## Language rules (enforced)

`DIHAC_QUIZ.lint(quiz)` runs before any quiz renders and the tests run it on
every committed definition. The only permitted form of "qualify" is
"potentially qualify". Content may not mention acceptance, compensation,
settlements, guarantees, entitlement, eligibility, deadlines, "our attorneys"
or "legal advice", and may never say the person has a claim. `strong` and
`possible` results must contain "potentially qualify"; `unlikely` headlines
must not. DIHAC is a matching service, not a law firm.

## Adding a tort

1. Add `dihac/campaigns/<tort>/quiz.json` with the same shape as `afff`.
2. Add the slug to `quiz.torts` in `dihac/config.js`.
3. Run `node --test tests/dihac-quiz.test.mjs` — it validates structure,
   lints language and checks that every allowed tort has a definition.
