# Phillips protected-report candidate

Status: BUILT-NOT-LIVE. No deployment, live token use, claimant request or sharing with Phillips.

This supersedes the presentation approach in draft PR182. It preserves a human-check step but states clearly that the check is not report authorization. The static page contains no claimant payload, recordings, current performance totals or unsupported live-automation promises. The former broken lead-board loader is removed from this aggregate-only page; it must not be resurrected by a refresh job.

The self-mounting Campaign to outcome tab requires the corrected report backend, with:
- explicit firm signed confirmation rather than Converted/retainer-sent inference;
- source-specific freshness and honest unknowns;
- periods displayed separately from retained-lead cohort counts;
- incomplete/unreadable records disclosed;
- token passed only in the bearer header, never URL/storage;
- no credentials on redirects, stale request-result suppression, and a Clear report action;
- redacted unmatched states, without claimant identifiers or arbitrary raw status text.

Static public content no longer advertises old campaign budgets/states, immediate texts/callbacks or connected feeds as current facts. Historical raw records remain in Git history; this patch is not a history/cache purge or recording-access remediation.

## Tests and limits

Run `bash tools/check-release.sh`. Targeted renderer/interaction tests are in `tests/phillips-portal-report.test.mjs`; fixtures are synthetic only.

Full local suite: 197 tests passed; foundation validation and asset build passed. Browser QA was attempted in local Chromium but launch is blocked by the environment's socket permission restriction (also after approved escalation). No screenshot or mobile-render pass is claimed. Real browser review at375px/desktop and authenticated API verification remain release gates.

Do not send the portal token to Phillips. Do not merge this alongside stale PR182 wholesale; this candidate already contains and corrects its renderer. Review the backend and native deferred-index PRs together before release.
