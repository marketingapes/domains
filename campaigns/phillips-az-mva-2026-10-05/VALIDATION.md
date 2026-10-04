# Validation receipt — October 4, 2026

- Offline package validator: PASS. Exact selected Google campaign IDs, Monday6am Arizona=13UTC, disabled activation/contact/delivery, consent defaults/SHA256, Google text limits, privacy field allowlist, unchanged source asset bytes/hashes, and inert review-page CSP verified. Asset byte checks used the actual sibling nil-site checkout.
- Existing campaign-system and public-demo/protected-report regression tests:41 passed,0 failed (`node --test campaign-system/test/*.test.mjs tests/lfma-mva-sprint.test.mjs tests/phillips-portal-report.test.mjs`). No runtime changes were required.
- Before commit, existing tracked domains source had no diff; only the isolated sprint folder was added. nil-site and legal-web-lead working trees were clean. PR13 files and protected portal unchanged.
- Current repository source and Library evidence read successfully. Live advertising APIs, RYSE and TikTok identity refresh unavailable; no new access requested.
- No browser/mobile execution QA performed. The static review page uses responsive grids and a CSP blocking connections/forms/scripts; it contains no lead inputs. This is a review artifact, not a declared production landing-page build.
- No platform mutation, upload, lead submission, phone call, buyer delivery, deployment, campaign activation or spending. No claim of end-to-end acceptance or staffed answer.

Re-run: `node campaigns/phillips-az-mva-2026-10-05/validate.mjs`.

## Independent-review corrections

Added optional neutral injury/symptom and treatment-history prompts for private intake and firm human review only. They can be skipped, cannot decide legal eligibility and cannot be collected in Meta forms or used for audience targeting. Search scope is explicit: three RSAs all use W1; W2/W3 are sitelinks rather than distinct Search destination tests.

The self-contained validator now parses both CSVs with strict quoted-field/record handling and checks exact IDs/routes, columns, row counts, copy limits, paused states, channel safety flags and consent. 41 focused positive/negative tests pass, including malformed CSVs, changed route IDs, enabled controls, overlength copy and missing/tampered source assets. CI runs this validator and focused suite without requiring any external checkout.

Asset verification output is separate: the self-contained run reports external byte checks **NOT RUN**. An explicit local run with `--assets-root /workspace/nil-site` verified all six actual files, sizes and SHA256 hashes. An explicitly requested absent root or missing file fails; nothing is silently skipped.

Full existing release tests: 226 passed, 0 failed; build/foundation checks pass. The first wrapper invocation reached its final clean-worktree check while corrections were uncommitted; after committing, the wrapper was rerun to verify the clean-worktree gate. No protected files, runtime intake, portal, deployment or live controls changed.
