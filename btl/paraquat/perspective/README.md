# Paraquat Perspective backend coordination

Frontend-owned routes: `/paraquat/perspective/` and the three Paraquat pages.
The page reuses Phillips Perspective styling. LFMA, Phillips, existing intake logic,
phone bindings, paid ads, Make and outbound calls are untouched.

## Read-only aggregate contract

Proposed backend-owned GET route:
`https://legal-web-lead.onrender.com/api/v1/portal/paraquat/overview`

This route is NOT claimed connected. `config.json` deliberately has `feed_url: null`
until the backend owner implements and verifies it. Then set that exact URL.
Existing infrastructure uses a protected Make intake receipt; don't send test leads
to it or trigger scenario 6500405 to test this frontend.

Response shape (the example below has no verified live data):

```json
{
  "schema": "paraquat-perspective/v1",
  "campaign_id": "PARAQUAT-PILOT-001",
  "synthetic": false,
  "as_of": "2026-10-13T00:00:00Z",
  "counts": {"leads": null, "calls": null, "followups": null},
  "sources": [],
  "statuses": [],
  "connections": {"intake": false, "sofia": false, "ad_spend": false}
}
```

Sources: `form`, `sofia`, `quiz`.
Statuses: `received`, `screening`, `review`, `followup`, `handed_off`, `not_a_fit`.
Use JSON numbers for verified nonnegative counts, null when unavailable, and
omit source/status rows without a connected source. Unknown values never mean zero.
A valid connection flag requires backend evidence. Only aggregate counts are public.
No lead records, claimant names, email, phone, state, answers, IDs, free-text summaries,
transcripts, audio or recording URLs may be returned. CORS must allow
`https://besttortlawyers.com` without credentials. No public bearer key.

Intake event reconciliation must use receipt/submission deduplication server-side,
campaign `PARAQUAT-PILOT-001`, and the existing page IDs `btl-paraquat-main-dropdown`,
`btl-paraquat-call-first`, `btl-paraquat-quiz`. Sofia assistant ID supplied by Kyle:
`976d64df-ca8d-4880-a983-7fcec3e786db`; inbound `+12138787408`.
Route verification does not prove an actual call, transfer, callback or follow-up.

The client renders only allowlisted aggregate fields. It does not store credentials,
claimant information or synthetic examples. Synthetic examples are separate, local
and explicitly labeled; they make no network writes.

Rollback: revert this release commit. Parent baseline: `3b819008c5ecd08f55d01ac6d620e6b3665eda92`.
