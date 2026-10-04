# Client Perspective — Phillips first

Isolated draft Marketing Apes portal template. Live `/portal/phillips/` and its renderer/authentication are unchanged. No deployment, sharing, ads, credentials, calls, lead submissions or Sheets writes.

Open `lfma/portal/prototypes/phillips-current/client-perspective-preview.html` for a self-contained **read-only** walkthrough. Tabs work; there are no approval controls or network requests. It displays owner-confirmed $5,000 / 14-day planning ($3,000 Meta Website, $2,000 Search), unknown performance and the campaign → lead → intake → firm feedback → executed-retainer outcome → optimization chain. Current reports and assignments are not connected.

For the actual local mock review flow:

```
node tools/phillips-portal-prototype/server.mjs --local-mock
```

The runner binds an ephemeral random port to **127.0.0.1 only**, allows fixed assets, requires same-origin JSON mutations and owns its synthetic recipient sessions. `demo-reviewer` and `demo-operator` are fictional; persona selection is deliberately a demo convenience, never production authentication. Server service defaults disabled and accepts only LOCAL_MOCK_ONLY. Server-owned recipient scopes, allowed actions and row assignment all must match. Caller actors/time are rejected. Audit uses compare-and-swap, idempotency and exact scope hashes, plus repeated identity/source checks. Sheet status cells never authorize approval or campaign execution. Memory audit is ephemeral, not a durable production record. A Sheet changing after the final read can make a recorded historical event stale; no execution follows it, and the next projection/replay compares the current scope.

## Existing private source contract

Owner-created **PhillipsPerspectiveOperations**, spreadsheet `1FET1WpeS8bDfPJlkym3lNXYLBaFBhwOtz4kUTl_hDe8`, is private My Drive / Kyle owner only per native worker receipt. Tab IDs are in `sheet-contract.mjs`. CurrentState (8 rows), Tasks (4), ApprovalRequests (3 pending_details), ApprovalLog (headers only). Assignees/approvers/dates are blank. Existing `PhillipsLeadProgress` remains separate read-only with lead PII; never expose its workbook or raw rows in general/client projections. Existing historical registry mapping is not proof of current runtime or access.

Task `item_version` and `content_hash`; requests `target_item_id`, `target_item_version`, `target_content_hash`; log `approved_scope_hash`, `idempotency_key`. Owner-only source evidence URLs must be omitted from external projections unless separately verified. Hash contract: sorted-key JSON of **all actual schema fields except content_hash**, empty cells `""`, numbers retained, dates UTC ISO without milliseconds. `sheet-contract.mjs` implements strict normalization/checking with caller-supplied exact headers and column types. Numeric values must be unformatted, dates explicit offsets or Sheets serials. Mock item scope hash is a **different local fixture contract**; it must not be written as a workbook content hash.

No authenticated Sheets caller is available in this runner. It never fetches this workbook. Exact full headers/rows and numeric/date column sets are still needed to complete its live read-only mapper; IDs alone do not justify guessed adapters. No new OAuth, permissions, public sharing or invented assignments.

Before enabling real decisions: complete exact request scope/proposed change/risk/cost, update bound versions/hashes, configure verified recipient identities and item/action scopes, independently verify evidence visibility, add a server-authenticated read-only workbook adapter, and implement an authoritative durable audit with atomic append/idempotency. Cross-system snapshots must be revalidated when any downstream action is considered; a client-editable Sheet or review log is never sufficient spend/deploy authority. Live endpoint integration and protected portal changes need their own authorized scope. BigQuery remains a later historical projection, not current-state or approval authority.

## Validation

15 service/hash tests cover default-off, scope/privacy, actor forgery, stale versions, idempotency, revoked access, concurrent decisions and workbook canonicalization. Browser QA exercises all four tabs at 1440/768/375, approval + recipient switching, zero overflow/errors/outbound requests. Static Library walkthrough has no backend claims. Frozen Phillips portal files and campaign PR226 remain unchanged.
