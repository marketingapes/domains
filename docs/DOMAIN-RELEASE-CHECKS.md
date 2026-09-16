# Automatic domain release checks

Changes to this repository can run the existing validation without an AI session
or provider credentials. The workflow runs on pull requests, pushes to `main`, and
manual dispatch, with a ten-minute time limit and a seven-day validation log.

## What is checked

- The real static asset decode/build succeeds.
- `jsonschema` is installed; schema validation cannot silently skip.
- The frozen Foundation artifacts remain byte-identical, all 14 canonical tenant
  manifests are present, and the existing schema/validator passes.
- The existing site and campaign-system tests pass, including the regression
  test that builds a campaign in a temporary tree and checks for manifest drift.
- Build/tests do not modify tracked source files.

Run locally with Node 22+ and Python 3.12:

```sh
python3 -m pip install -r requirements-ci.txt
bash tools/check-release.sh
```

No email, SMS, calls, form submissions or deployment happens in this workflow.
Public site reachability, provider delivery, DNS, and buyer outcomes require
separate receipts. A green code check is not a launch-readiness claim.

## Finish connecting the release gate

1. Merge this checks-only change and confirm the main-branch workflow passes.
2. Make **Domain release checks** a required check in the existing main-branch
   protection/ruleset. Review any existing rules instead of replacing them.
3. For the existing Render services using this repository, change automatic
   deployment from **On Commit** to **After CI Checks Pass**. Preserve their
   existing branches, publish paths, environment and build filters. Verify a
   subsequent accepted commit deploys the expected SHA before calling the gate
   operational.
4. Record public-site/DNS checks after that deployment. Do not run live intake or
   outbound tests from ordinary pull-request checks.

Until steps 1–3 are verified, these checks are a review signal and do not block
the current On Commit Render deployments. This PR does not alter those settings.

Render documents the deployment trigger at
https://render.com/docs/deploys and build filters at
https://render.com/docs/monorepo-support.

## Actual legal site sources

As inspected September 15, 2026:

| Domain | Production source | Render service |
| --- | --- | --- |
| NIL | `marketingapes/nil-site` | `nil-site-staging` |
| BTL | This repository, `btl/`, for the Render preview; root still on SiteGround | `btl-site` |
| DIHAC | This repository, `dihac/` | `dihac-site` |
| LFMA | This repository, `lfma/` | `lfma-site` |

The frozen NIL manifest in this repository is not proof that the production NIL
site deploys from here. Apply the corresponding checks to its actual repository
separately. Keep BTL's existing `/phillips-law/` pages available during any root
cutover; this checks-only change does not authorize or perform that migration.
