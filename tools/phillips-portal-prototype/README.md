# Client Perspective — Phillips first

Isolated draft Marketing Apes portal template. Live `/portal/phillips/` and its renderer/authentication are unchanged. No deployment, sharing, ads, credentials, calls, lead submissions or Sheets writes.

Open `lfma/portal/prototypes/phillips-current/client-perspective-preview.html` for a self-contained **read-only** walkthrough. Tabs work; there are no approval controls or network requests. It displays owner-confirmed $5,000 / 14-day planning ($3,000 Meta Website, $2,000 Search), unknown performance and the campaign → lead → intake → firm feedback → executed-retainer outcome → optimization chain. The private walkthrough includes a verified owner source snapshot when built with --owner-projection; continuous reports and assignments are not connected.

For the actual local mock review flow:

```
node tools/phillips-portal-prototype/server.mjs --local-mock
```

The runner binds an ephemeral random port to **127.0.0.1 only**, allows fixed assets, requires same-origin JSON mutations and owns its synthetic recipient sessions. `demo-reviewer` and `demo-operator` are fictional; persona selection is deliberately a demo convenience, never production authentication. Server service defaults disabled and accepts only LOCAL_MOCK_ONLY. Server-owned recipient scopes, allowed actions and row assignment all must match. Caller actors/time are rejected. Audit uses compare-and-swap, idempotency and exact scope hashes, plus repeated identity/source checks. Sheet status cells never authorize approval or campaign execution. Memory audit is ephemeral, not a durable production record. A Sheet changing after the final read can make a recorded historical event stale; no execution follows it, and the next projection/replay compares the current scope.

## Existing private source contract

Owner-created **PhillipsPerspectiveOperations**, spreadsheet `1FET1WpeS8bDfPJlkym3lNXYLBaFBhwOtz4kUTl_hDe8`, is private My Drive / Kyle owner only per native worker receipt. Tab IDs are in `sheet-contract.mjs`. CurrentState (8 rows), Tasks (4), ApprovalRequests (3 pending_details), ApprovalLog (headers only). Assignees/approvers/dates are blank. Existing `PhillipsLeadProgress` remains separate read-only with lead PII; never expose its workbook or raw rows in general/client projections. Existing historical registry mapping is not proof of current runtime or access.

Task `item_version` and `content_hash`; requests `target_item_id`, `target_item_version`, `target_content_hash`; log `approved_scope_hash`, `idempotency_key`. Owner-only source evidence URLs must be omitted from external projections unless separately verified. Hash contract: sorted-key JSON of **all actual schema fields except content_hash**, empty cells `""`, numbers retained, dates UTC ISO without milliseconds. `sheet-contract.mjs` implements strict normalization/checking with caller-supplied exact headers and column types. Numeric values must be unformatted, dates explicit offsets or Sheets serials. Mock item scope hash is a **different local fixture contract**; it must not be written as a workbook content hash.

No authenticated Sheets caller is available in this runner. It never fetches this workbook. Exact full headers/rows and numeric/date types were subsequently read through the authorized connector and verified; see the read-only adapter continuation below. No new OAuth, permissions, public sharing or invented assignments.

Before enabling real decisions: complete exact request scope/proposed change/risk/cost, update bound versions/hashes, configure verified recipient identities and item/action scopes, independently verify evidence visibility, supply the actual production server identity/read connector for the staged read-only workbook adapter, and implement an authoritative durable audit with atomic append/idempotency. Cross-system snapshots must be revalidated when any downstream action is considered; a client-editable Sheet or review log is never sufficient spend/deploy authority. Live endpoint integration and protected portal changes need their own authorized scope. BigQuery remains a later historical projection, not current-state or approval authority.

## Validation

28 focused review/projection/hash tests cover default-off, scope/privacy, actor forgery, stale versions, idempotency, revoked access, concurrent decisions and workbook canonicalization. Browser QA exercises all four tabs at 1440/768/375, approval + recipient switching, zero overflow/errors/outbound requests. Static Library walkthrough has no backend claims. Frozen Phillips portal files and campaign PR226 remain unchanged.

## Verified read-only adapter continuation

The existing authorized Google Drive connector successfully read metadata and bounded unformatted ranges from all four actual tabs. All 15 record hashes verified; all three request/task target bindings matched. A fractional Sheets serial precision regression was corrected by rounding the calculated epoch milliseconds before converting to ISO. Canonical header sorting explicitly uses localeCompare.

`read-only-adapter.mjs` now contains the **exact verified schema**, injected authorized read interface, strict hash/target checks, repeated trusted actor/tenant/scope validation, allowlisted projections and **no decision or write method**. Owner-only evidence URLs never pass through, missing assignees/approvers are not inferred, source observed_at is preserved separately from fetch/read_at, and Sheet ApprovalLog/status cells are never authoritative audit. Source protocol errors hold the whole projection. Current recipient integration is deliberately owner-read-only, not generalized client authorization.

Private connector snapshots and projected receipts live in the task recovery directory outside this repository; they are not published or committed. `project-owner-snapshot.mjs --owner-snapshot --input FILE --output FILE` validates an offline owner receipt and emits only the safe projection. The optional `build-review.py --owner-projection FILE` includes verified current-state records in the **private** review walkthrough. The generic public demo remains untouched.

The code is not mounted to a live server. Minimal remaining runtime dependency: the actual portal server must supply an existing authenticated server-owned readRange connector/session authorized for the private workbook, and verified recipient tenant/item scopes. This executor's authorized conversational connector read proves owner read access **now**, not that the current Render service has access or that any client recipient may see it. No token extraction, OAuth creation, sharing or service permission changes are authorized by this implementation. Real decision actions additionally need complete requests and durable atomic audit.

## Client Perspective in the protected portal

The existing `/portal/phillips/` page and its loader `lfma/assets/portal/phillips-report.js` now render the Client Perspective inside the token-gated **Campaign to outcome** tab: Arizona MVA by default, LA County and Deadleads (firm intakes) selectable, each with Campaign overview, Leads, Marketing and Next steps. The page holds no data. The view appears only after the report API accepts a portal token. Clear report and pagehide remove it.

Data path, reusing what exists:

1. Owner exports the three original workbooks (MVA `1KcJS5…`, MVA daily spend `1IL3Y6…`, LA County `1evjyp…`) as .xlsx into system temporary storage.
2. `python3 tools/phillips-portal-prototype/project-client-perspective.py --mva … --mva-daily … --la-county … --modified '{…Drive modifiedTime…}' --output /tmp/…/perspective.json` writes the deidentified `ee.phillips_client_perspective/v1` projection (0600). It refuses paths outside temp storage or inside Git. Delete the exports afterwards.
3. POST `{"client_perspective": …}` to legal-web-lead `/api/v1/portal/phillips/report-inputs` with the operator key. The backend refuses names, contact details, narratives and notes, then stores the projection in Redis next to the inputs snapshot.
4. GET `/report` with the portal token returns it as `client_perspective`.

Projection rules: explicit source IDs, dates, delivery evidence, categorical status and reason only. Every original row is listed with its tab and row number. Records merge only on a shared explicit ID. Two rows from one tab that would merge are held as ambiguous. Phone and name similarity are never used, so AI call logs are counted but not attached to leads. Missing spend days, blank days and sheet TOTAL mismatches are reported, never filled. A second spend source is compared, not added. Converted, Retainer Sent, the retainer column and Meta's "signed" lead status never count as Signed.

Local protected preview, with no deployment:

```
node tools/phillips-portal-prototype/protected-preview.mjs --backend ../legal-web-lead/src/intake/portal-report.js \
  --perspective /tmp/…/perspective.json --token-file /tmp/…/token
node tools/phillips-portal-prototype/verify-protected-preview.mjs --url http://127.0.0.1:PORT/portal/phillips/ --token-file /tmp/…/token --out /tmp/…/qa
```

The preview binds 127.0.0.1, generates a random token, and serves only the portal page and portal assets. It loads the projection through the backend's real ingest validation and keeps it in memory. In the served copies only, it rewrites the API origin to itself and the Turnstile key to Cloudflare's always-pass test key. QA covers: no request before a token, rejected tokens, the token never stored, Clear, 36 campaign × section views at 1440/768/375 with no overflow and no contact-like text, lead filters and paging. Screenshots contain source IDs and stay in temp storage.
