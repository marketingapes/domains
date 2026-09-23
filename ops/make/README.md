# ops/make — Make scenario reliability patches

Nothing in this folder has been applied. Every Make scenario referenced here is
LIVE and was read only.

The `*.flow.json` files are hand-extracted structural models of the live
blueprints: module order, filters, onerror handlers and side effects. They are
faithful for those four things and deliberately omit email HTML, switch tables
and variable expressions, which do not affect the invariants under test. Each
model pins the scenario's `lastEdit` timestamp at the time it was read — if
that has moved, re-read before applying.

Tests: `node --test tests/make-*.test.mjs` (also run by `tools/check-release.sh`).

---

## Before applying anything

1. Open the scenario in Make → **⋯ → Export Blueprint** → save the JSON.
   That file is the rollback artifact. Make's own version history is the
   backup to the backup, not the primary.
2. Confirm `lastEdit` still matches the value in the model file. Another seat
   edits these scenarios.
3. Apply during a quiet window. Scenario 6324097 runs every 15 minutes;
   6145431 is instant-triggered.

---

## 6324097 — Sofia Call Outcomes → Phillips desk (route A only)

### The defect

Module 4 `Mark confirmed` writes `xfer:{call_id}` with
`outcome: transfer_confirmation_sent` **before** modules 11/12/14 attempt the
email. The Gmail modules have no error handler. So:

- Gmail fails → the execution errors, no email reaches the firm
- the marker is already committed (`autoCommit: true`)
- the next 15-minute cycle reads `exist: true` and filters the call out
- the transfer confirmation is lost permanently, and the datastore asserts a
  send that never happened

Route B (Meta CAPI) already has the correct order — module 27 writes its marker
*after* module 26 sends. Route A is the one that is wrong.

### The change

| Module | Now | After |
|---|---|---|
| 3 | `ExistRecord xfer:{id}` = "claimed" | unchanged key, now means **delivered** |
| 31 | — | **new** `GetRecord xferlock:{id}` (onerror: resume) |
| filter | — | **new** lock absent, or `claimed_at` older than 10 min |
| 4 | `AddRecord xfer:{id}` = sent | **repurposed** → `AddRecord xferlock:{id}` `{state: pending, claimed_at: now}` |
| 11 / 12 / 14 | no error handler | **add** `onerror: Resume {id: ""}` |
| 111 / 121 / 141 | — | **new** `AddRecord xfer:{id}` with `message_id`, guarded on the email returning a non-empty id |
| 112 / 122 / 142 | — | **new** `AddRecord xferfail:{id}:{ts}`, guarded on the send having failed |

Module order becomes: 3 → filter → 5 → 6 → 31 → lock filter → 4 (lock) → 7 → 8
→ 9 → 10 → email → receipt/failure write.

### Why this does not replay existing calls

The delivered marker keeps the **same key** `xfer:{call_id}` the current design
already writes. Every historical record therefore still reads as delivered at
module 3 and is filtered out. No backfill, no migration script, no rewrite of
existing rows. Two tests pin this
(`a legacy marker … is never replayed`, `legacy records are left untouched`).

### Also fix while in module 7

`{{6.leadgen_id}}` is interpolated straight into the SQL string of a
`google-bigquery:writeQuery` module. `leadgen_id` is parsed out of Sofia's
transfer message text, so it is not fully trusted input. Wrap it:

```
{{replace(6.leadgen_id; "/[^0-9A-Za-z_-]/g"; "")}}
```

and use the sanitized value in both places in the query. Separately, this
module runs a SELECT through a *write* query module — move it to a read-only
query module if one is available on connection 10947377.

### Rollback

Re-import the exported blueprint. No data migration is needed to roll back:
`xferlock:` and `xferfail:` keys become orphaned in datastore 152269 and are
ignored by the restored flow. Delete them at leisure. `xfer:` keys written by
the patched flow are shape-compatible with the old flow's reader (it only
checks existence).

### Known gap — NOT fixed by this patch (P2)

The trigger window is 25 minutes on a 15-minute schedule, so a call is offered
to the flow about twice. A Gmail outage longer than ~25 minutes still loses the
confirmation, because the call ages out of the window before the lock goes
stale. Test `KNOWN GAP: a failure outlasting the 25-minute Vapi window` pins
this.

Two ways to close it:

- **Widen the trigger window** to 120 min / `limit=100`. Cheap to do, but route
  B (CAPI) runs `ExistRecord` for *every* ended call in the window, so this
  multiplies dedup operations roughly 5×. Against the "know the meter" rule in
  CURRENT-BRIEF §1d, price this before enabling.
- **A separate hourly sweeper scenario** (recommended): list Vapi calls over a
  6-hour window filtered to `assistant-forwarded-call`, and for any with no
  `xfer:` record and no live `xferlock:`, re-enter the email path. Bounded
  operations, leaves the hot path alone.

---

## 6145431 — ALL DOMAINS Social Post

### The defect

Flow order is `1 → 2 (FB) → 4 (ledger) → 5 (respond) → 3 (IG) → 6 (ledger)`.
The webhook responds `{"ok":true}` at module 5, before Instagram runs. A caller
that receives `ok:true` cannot distinguish:

- both channels posted
- Instagram was never requested
- Instagram was requested but the tenant has no IG mapping (7 of the 14 FB
  tenants do not — KG, RI, CGG, TOSS, FPLB, PX, REAPES)
- Instagram was attempted and failed

Separately, the ledger cannot prove destination: row 4 writes `{{1.page_id}}`
and row 6 writes `{{1.ig_id}}` — both read from the *webhook payload*, while
the actual destination comes from the `switch(tenant_id)` inside the post
modules. Callers do not send those fields, so the columns are blank. And
column 10 is the literal string `posted` on both rows, so the ledger is
structurally incapable of recording a failure.

### The change

Insert module 7 (`SetVariables`, roundtrip) to resolve `page_id`,
`ig_account_id` and the eligibility flags once. Replace the straight line with
router 8:

- **Route 0** filter FB-eligible → 2 (onerror: Resume) → 9 (status vars) → 4 (ledger, `{{7.page_id}}`, real status)
- **Route 1** filter IG-eligible → 3 (onerror: Resume) → 10 (status vars) → 6 (ledger, `{{7.ig_account_id}}`, real status)
- **Route 2** no filter → 5 respond, last, with a per-channel body

Route 2 must be unfiltered. Moving module 5 to the end of the main line instead
would mean a false IG filter swallows the reply entirely — that is the trap the
current design avoids by responding early.

Response body:

```json
{
  "ok": true,
  "facebook": { "status": "posted", "post_id": "...", "page_id": "..." },
  "instagram": { "status": "posted|failed|skipped_not_requested|skipped_no_image|skipped_tenant_unmapped", "post_id": "...", "account_id": "..." }
}
```

`ok` is true only when every *requested* channel reached `posted`. HTTP 200 on
full success, 207 partial, 502 when Facebook failed.

Add three ledger columns: `channel_status`, `resolved_destination_id`,
`request_id`. Appending columns to the sheet is backward compatible with
existing rows.

### Caller-visible change

This is a **breaking change for anything that reads the response body.** The
current body is `{"ok":true,"fb_post_id":"..."}`; `ok` and `fb_post_id` are
preserved, so a caller that only checks those keeps working — but `ok` will now
be `false` in cases where it used to be `true`. That is the point. Identify the
callers before applying.

Latency: the reply now waits for Instagram. Instagram photo publishing is a
two-step create-then-publish and can take several seconds. If callers hit the
Make webhook response timeout, the fallback is to respond `202 {"accepted":
true, "request_id": ...}` immediately and have callers read the ledger.

### Rollback

Re-import the exported blueprint. The added sheet columns can stay; the old
flow simply does not write them.

### Idempotency — P0, now included

Was scoped out as P2. It became P0 on **2026-09-21**, when the batch fired 21
executions for 14 mapped tenants and double-posted two live Pages:

| Page | Posts | Times (UTC) |
|---|---|---|
| REAPES `638087342872731` | 2 | 03:41:05, 03:44:03 |
| PX `326146494261183` | 2 | 03:40:15, 03:44:09 |

PX had not posted since 2017. Verified against the Graph API, not the ledger.

Module 11 derives a dedup key; module 12 checks it before anything publishes;
route 0 short-circuits to a `replayed: true` response.

The key is **derived**, not caller-supplied:

```
post:{{ifempty(1.request_id; upper(1.tenant_id) + ":" + sha256(1.message) + ":" + formatDate(now; "YYYY-MM-DD"))}}
```

That choice is load-bearing. The re-fire sent *identical content to the same
tenant*, so a derived key stops it **with no change to any caller**. A
caller-supplied `request_id` is honoured when present, but nothing depends on
callers being fixed first.

Use a **new datastore**. Do not reuse 152269 — that is the Phillips call-outcome
store and mixing publish receipts into it would make both harder to reason about.

The receipt write (module 14) is **guarded on a successful publish**. An
unguarded write would reproduce the exact 6324097 defect this same branch
fixes — a marker written before proof, locking out the retry. A test pins it.

### Instagram is failing on app permissions, separately

Execution `56e047e134224bcbb0d0005eebd39700`, 2026-09-21 03:37:50Z:

```
(#10) Application does not have permission for this action (10, OAuthException)
  module: CreatePostPhoto (instagram-business)
```

This is not the unmapped-tenant path — the tenant was mapped. The Meta app
lacks `instagram_content_publish`. No Instagram post has succeeded. Because the
current flow responds before Instagram runs, this failure still returned
`ok:true`. Granting the permission is a human step and is not part of this
patch.
