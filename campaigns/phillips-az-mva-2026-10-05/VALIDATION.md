# Validation receipt — October 4, 2026

- Offline package validator: PASS. Exact selected Google campaign IDs, Monday6am Arizona=13UTC, disabled activation/contact/delivery, consent defaults/SHA256, Google text limits, privacy field allowlist, unchanged source asset bytes/hashes, and inert review-page CSP verified. Asset byte checks used the actual sibling nil-site checkout.
- Existing campaign-system and public-demo/protected-report regression tests:41 passed,0 failed (`node --test campaign-system/test/*.test.mjs tests/lfma-mva-sprint.test.mjs tests/phillips-portal-report.test.mjs`). No runtime changes were required.
- Before commit, existing tracked domains source had no diff; only the isolated sprint folder was added. nil-site and legal-web-lead working trees were clean. PR13 files and protected portal unchanged.
- Current repository source and Library evidence read successfully. Live advertising APIs, RYSE and TikTok identity refresh unavailable; no new access requested.
- Local browser/mobile execution QA passed for the inert walkthrough, three isolated landing previews and single complete artifact. CSP blocks connections/forms/scripts; no live intake controls. Production PR13 paths unchanged.
- No platform mutation, upload, lead submission, phone call, buyer delivery, deployment, campaign activation or spending. No claim of end-to-end acceptance or staffed answer.

Re-run: `node campaigns/phillips-az-mva-2026-10-05/validate.mjs`.

## Independent-review corrections

Added optional neutral injury/symptom and treatment-history prompts for private intake and firm human review only. They can be skipped, cannot decide legal eligibility and cannot be collected in Meta forms or used for audience targeting. Search scope is explicit: three RSAs all use W1; W2/W3 are sitelinks rather than distinct Search destination tests.

The self-contained validator now parses both CSVs with strict quoted-field/record handling and checks exact IDs/routes, columns, row counts, copy limits, paused states, channel safety flags and consent. 41 focused positive/negative tests pass, including malformed CSVs, changed route IDs, enabled controls, overlength copy and missing/tampered source assets. CI runs this validator and focused suite without requiring any external checkout.

Asset verification output is separate: the self-contained run reports external byte checks **NOT RUN**. An explicit local run with `--assets-root /workspace/nil-site` verified all six actual files, sizes and SHA256 hashes. An explicitly requested absent root or missing file fails; nothing is silently skipped.

Full existing release tests: 226 passed, 0 failed; build/foundation checks pass. The first wrapper invocation reached its final clean-worktree check while corrections were uncommitted; after committing, the wrapper was rerun to verify the clean-worktree gate. No protected files, runtime intake, portal, deployment or live controls changed.

## Connected Mac verification — October 4

- Fresh GitHub read: PR226 OPEN/DRAFT at 9e94a4c0b9f142cf8361fe6a727c56672d2580d5; existing Domain release checks SUCCESS. This historical head was verified before continuation.
- Existing branch recovered, not rebuilt. Expanded only the inert full-sprint walkthrough and handoff evidence. Release suite 226 passed; campaign validator 41 passed; explicit asset-root verification passed all six files against current nil-site main265b5159. Source nil-site and nil-intake working trees remained clean.
- Local Chromium at 375, 768 and 1440 pixels: no horizontal overflow, page errors, external HTTP requests or live intake controls. Screenshots and machine receipt saved in the local recovery directory. No authenticated portal/browser or provider end-to-end result claimed.
- Recovered private patches match historical SHA256s. Legal-web-lead focused29 pass; full721 pass/5 skipped; separate35-test local Redis composition run passes all five previously skipped checks. Existing nil-intake campaign suite37 pass/2 skipped; separate14-test ephemeral Redis store/routes suite passes both skipped checks. These are overlapping runs, not additive totals or live integration evidence.
- Backend draft PR16 is saved at 68db57ea46dd707970e65e287714b8c2f00e1dda. Earlier Forbidden evidence was a read-only GraphQL failure, not a denied write; fresh normal push rights and owner authorization permitted draft publication. Claude review attempt returned Not logged in. Production bindings, verified MVA crosswalk, legal/provider/access evidence, budget and staffing remain owner dependencies.

## Completed staged build continuation

- Six exact-size still formats, three silent 20-second H.264/yuv420p/30fps video masters, three posters and captions/transcript built reproducibly. Fourteen rendered files have byte/SHA256 receipts; original source art and logo remain unchanged. Upload/publication/activation false.
- Three isolated W1/W2/W3 landing HTML previews and one self-contained playable review artifact built. All twelve local Chromium page/viewport checks at375/768/1440 passed: no overflow, errors, external requests or intake controls. Embedded video playback checked.
- Campaign validator now46 passed, including missing/tampered rendered media and unsafe preview/artifact negative tests. Backend733 total:728 passed,5 skipped,0 failed; seven new default-off planner tests included. Existing temporary Redis35-test and nil-intake37+14 receipts remain overlapping local checks.
- Actual evolutionengine recovered raw-runtime contract check passed for timestamp, canonical/firm identity and exact replay. This uses memory stores, never warehouse/legacy-ledger proof. Raw runtime branch is65be266e; main docs alone do not prove deployment. Live endpoint/auth, durable registry/replay, MVA crosswalk, portal loader, partial-delivery handling and ledger projection acknowledgment/readback remain owner bindings.

- Final focused planner/portal review36 pass. Recognized signed-confirmed aliases now fail closed without valid separate proof. Exact backend draft has no CI check runs/statuses; local validation only. The subsequent delivery continuation below builds the transport/ack worker. Durable canonical registry/raw-reader and legacy ledger projection remain external architectural bindings.

## Final durable-delivery continuation

Backend68db57e:750 full tests passed,0 skipped,0 failed with all isolated local Redis tests enabled; focused53 pass includes the new Redis journal, competing claims, restart/client recreation, exact replay, partial destination retries, actual private portal CAS and Signed proof. Canonical transport event IDs match the recovered actual Python runtime. All network transports are injected synthetic fixtures. Worker/readback/ack/retry code is built; production invocation/configuration is held. Canonical durable registry/raw-reader adapter remains an explicitly separate cross-repository scope; no new ledger writer or protected path changes.

## Authorized source extension — final complete offline proof

Source PR48 head7c748c1:1217pass0failed/skip; backendPR16 head30c04b7:755pass0failed/skip. Actual source routes and Redis durable identity/cohort/crosswalk/replay are connected to the actual backend journal/private client/transport and portal CAS. Actual BigQuery repository uses a MOCK client. Independent-process Redis readback, source recreation, lost registry ACK repair, partial retry, replay/no duplicate outcomes, Converted/Signed proof separation and health-field refusal pass. New offline-system-receipt.json is synthetic only. No unbuilt registry/readback/transport gap remains; actual endpoint/auth/table/read-role/retention/scheduler bindings and campaign release choices stay held. Existing PR42 historical Converted-as-Signed/earliest-phone output excluded; no ledger writer.

Final source head7c748c1 GitHub Tests and Repository Scope Audit both SUCCESS. Tests-only SES fixture injection removed a remote Foundation-read timeout; SES runtime unchanged. Full local source1217pass0fail0skip and SES47pass. CI: https://github.com/marketingapes/evolutionengine/actions/runs/37210996223 .

October4 policy correction: paid TikTok US MVA PI explicitly ineligible, historical IDs no release path; no educational acquisition workaround. Reusable media retained; organic applicability separate. PMax signals not delivery limits or retargeting-only; sensitive remarketing restricted. Internal Signed reporting separated from default-off platform feedback; sensitive enhanced-conversion/store-sales information prohibited, hashing/click IDs not permission. Current Meta terms unverified (research pages blocked). No budget/pricing/settings changed.

After-hours continuation: backendPR16 ed6d476 full767pass0fail0skip; web45pass, real Redis retained-record client recreation/namespace isolation/expiry and complete MVA source integration pass. Existing calling hours and frozen frontend unchanged. Capture/release default-off; deferred UI contract and after-hours routing remain release dependencies. No live request submitted.

Final after-hours retained-duplicate guard: backend73999fd full768pass0fail0skip, web46pass. Marker-only duplicate cannot claim saved=true; actual retained record required. No live settings/routes/consumer hours/protected changes.

Final backend0fc1704:768/46web passes include no inherited native/global reissue permission; website stale claims stay held for human review.
