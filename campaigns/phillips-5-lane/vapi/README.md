# Phillips 5-Lane — Vapi / Sofia wiring (DRAFT)

Status (2026-09-29, private key from Kyle): **both draft assistants CREATED, nothing bound.**
No live assistant was edited. No number was bound or repointed. No calls were placed.
Rollback/inventory note: `inventory-2026-09-29.json` (IDs and names only). Script: `apply_vapi.py`.

| Created | ID | Model (copied from) | Transfer tool | Bound number |
|---|---|---|---|---|
| BTL Sofia — Phillips 5L (DRAFT) | `c45499e0-c61e-47ac-ab4f-6f3e4c52e7a3` | xai grok-4.3 (from `976d64df` Sofia BTL Paraquat v4) | `7bd31747-…` → +1 888-888-8888 placeholder | **none** |
| NIL Sofia — Phillips 5L (DRAFT) | `82d628a7-a751-4bae-b93d-fb645cafb1bc` | openai gpt-4o (from `57f80d14` NIL — INBOUND — Sofia) | `95a22d87-…` → +1 888-888-8888 placeholder | **none** |

Verified numbers (read-only):

| Number | Points at | Notes |
|---|---|---|
| +1 602-693-1461 | `57f80d14` **NIL — INBOUND — Sofia** (live) | NOT `41ee29eb` (that is NIL — OUTBOUND — Sofia); ops notes were stale |
| +1 202-932-9700 | **no assistant** | **Twilio: OWNED** by our account (friendly name "Sofia Haze - Best Tort Lawyers", voice webhook → api.vapi.ai). Bind to `c45499e0` only on Kyle's "bind it". |
| +1 213-878-7408 | `976d64df` Sofia BTL Paraquat v4 | unchanged |

Cleanup for Kyle (no deletions by seats): spare unattached tool `b63a9b9d-c36a-41c4-ab95-575661f37f1b`
(`transfer_btl_phillips_5l`, duplicate from a retried run) can be deleted in the Vapi dashboard.

## Map

| Assistant | Lanes | Number | Binding |
|---|---|---|---|
| BTL Sofia — Phillips 5L (draft: `btl-sofia-phillips-5l.assistant.json`) | LA County · CA Women's Prison · BTL Rideshare (targeted) | +1 (202) 932-9700 (BTL canonical) | **Not bound.** Verify Twilio ownership first; bind only on Kyle's "bind it". |
| NIL Sofia — Phillips 5L (draft: `nil-sofia-phillips-5l.assistant.json`) | NIL MVA/PI · NIL Rideshare (open) | +1 (602) 693-1461 | **Not changed.** Verified: points at live `57f80d14` NIL — INBOUND — Sofia. Repointing to `82d628a7` is a Kyle decision. |

Per-assistant checklist (in the draft JSON):

| Item | BTL | NIL |
|---|---|---|
| Prompt | ✅ drafted | ✅ drafted |
| Criteria (labeled ASSUMED) | ✅ | ✅ |
| LISTEN → ASK → QUALIFY → ROUTE | ✅ | ✅ |
| Transfer destination | ⚠️ placeholder — Phillips lines awaiting Michael | ⚠️ placeholder |
| Fallback | ✅ callback at safe time | ✅ callback |
| Consent language | ✅ read before any transfer | ✅ |
| Trauma-informed (no assault details) | ✅ all 3 lanes | ✅ rideshare lane |
| Structured outcome (for `transfer` event) | ✅ analysisPlan | ✅ analysisPlan |

## To apply (seat with the private key, Kyle-approved)

1. `GET /assistant` and `GET /phone-number` → save a rollback note (who each number points at).
2. `GET` the live BTL Paraquat Sofia v4 and NIL Sofia `41ee29eb-…`; copy model provider/model,
   transcriber, voice, `serverUrl` into the two drafts (fields marked `COPY_FROM_LIVE_*`).
3. Create two transfer tools (type `transferCall`) with destination **+18888888888 placeholder**,
   and put their IDs into `model.toolIds`.
4. `POST /assistant` for each draft (strip the `_draft` key). Do NOT PATCH the live assistants.
5. Twilio console → confirm +1 202-932-9700 is in the Marketing Apes Twilio account (SID, owner).
6. Stop. Binding numbers and live transfer lines are Kyle gates.

## Test plan (Kyle-run only — no live test calls by seats)

Use the Vapi dashboard "Talk" web test (not a phone call) per assistant:

| # | Script | Expect |
|---|---|---|
| B1 | LA County, under 18, juvenile hall, no lawyer | qualifies → consent read verbatim → transfer tool called (placeholder) |
| B2 | Caller starts describing the assault | Sofia stops them gently, does not ask follow-ups |
| B3 | "It's not safe to talk" | offers to end immediately, asks safe callback time |
| B4 | CA women's facility, staff, 2019 | qualifies; never says "too late" |
| B5 | Rideshare via Lyft, driver, has a lawyer | kind exit, no transfer |
| B6 | Transfer fails | fallback line, confirms safe callback time |
| N1 | Car crash AZ 3 months ago, treated, other driver at fault, no lawyer | qualifies → consent → transfer |
| N2 | Crash 4 years ago | "a person will review" — no "too late" |
| N3 | Rideshare driver, Uber, CA, no lawyer | trauma-informed intro, qualifies |
| N4 | Asks "Do I have a case? How much?" | no promises, no dollar figures |

Pass = every row behaves as expected, `analysisPlan` fields populated, no voicemail, no outbound dial.
