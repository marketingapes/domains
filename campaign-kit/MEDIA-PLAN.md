# Campaign package and media planning

This change extends the existing campaign kit. It does not introduce another page builder or replace the order/payment workflow in [draft PR #362](https://github.com/marketingapes/domains/pull/362).

## Package contract

For the requested $10,000 package with $7,500 planned media, merge `examples/10k-package.fragment.json` into the approved full campaign configuration. Preserve the campaign's approved duration and explicit channel allocation. The example is a fragment, not a complete campaign or launch authorization.

- `commercial.package_total_usd`: total package price, separate from media.
- `commercial.planned_media_usd`: planned media, required to equal `budget.media_total_usd`.
- `commercial.currency`: currently USD.
- `commercial.json`: an internal `UNAPPROVED_PLAN` artifact. Payment remains `UNKNOWN`; queue state remains `NOT_QUERIED`.

The remaining $2,500 is an unitemized package balance, not an assumption about profit, an added charge, or authority to create an invoice line. Existing campaign configurations and budgets are unchanged by this PR.

Channel allocation is normalized and apportioned deterministically in exact cents. `lifetime_plan_cents` is the authoritative integer planning amount. Daily references round down and expose the remainder separately. Zero-share channels remain zero. These are planning values, not platform spending guarantees: approve and implement account currency, eligibility, dates, lifetime caps and stop rules before activation. No new PMax or native-lead adapter is included.

The supported Search match options are `EXACT` and `EXACT_AND_PHRASE`; invalid values fail validation rather than silently broadening targeting. Existing default match behavior is preserved.

## Private reporting draft defaults

Generated Perspective entries disable self-registration and open demo. These are unapplied configuration files, not evidence that server authorization is installed. Verify authentication, firm-scoped authorization, cross-tenant denial, logout clearing and late-response isolation before release. Reuse the existing Glassman private Perspective path rather than creating a second dashboard.

## Relationship to PR #362

PR #362 contains the firm request, invoice verification, payment-to-build state reducer and version-bound client/owner approvals. Keep it as the commercial state authority. This media plan does not verify payment, create a build job, bind to an approved order hash, or activate a release.

Verified November 7, 2026: #362 remains open and draft at `91e086da43024faeae7eb5de7b69d93e01edf72b`, behind main. A local three-way merge of its generator changes with this patch on main `286b552b1f752c8c883b427b073d117c06c9f1eb` completed without conflicts, and all 43 combined kit/onboarding/order tests passed. No existing PR branch was changed. A production order adapter, transactional persistence, provider reconciliation and approved release bindings remain separate work.

## Validation

- `node campaign-kit/build.mjs --all`: passed for all three current configs.
- `node --test campaign-kit/test/*.test.mjs`: 20 tests passed, including 10 new media/privacy/Search regressions.
- Combined local compatibility snapshot with PR #362: 43 tests passed.
- Independent review identified and fixed near-one allocation drift and invalid match-setting broadening; regression tests cover both.
- Browser-test syntax checks passed. The local real-browser suite was blocked before startup by cloud sandbox socket restrictions; this is not a browser behavior pass.
- Full repository and browser CI must be checked on the actual PR commit. No live integration, invoice, lead, call, message, portal permission or spend change was made.
