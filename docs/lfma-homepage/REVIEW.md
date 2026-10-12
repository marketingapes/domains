# LFMA homepage contact and proof correction

Scope: homepage only, based on main a6763aa4084860de268fcaf118bcd66f73ab4509.
No PR #163 code reused; no portal, NIL intake, deployment or provider changes.
No AGENTS.md or SKILL.md was present in the checkout or workspace .agents directory.
Repository README.md, FOUNDATION.md and release workflow were reviewed.

## Destination evidence

The homepage now uses the existing LFMA `/contact.html` agency-contact Make destination.
Commit 60de792d9e007adf3e4ec3efb2b7b55e742cc349 explicitly records
“LFMA contact onto Make” and migration to Make scenario 6145362.
The current contact page retains that destination; CURRENT-BRIEF.md also identifies
6145362 as the Snapshot/order lane. This is evidence of an established LFMA
business inquiry route, not evidence that its current downstream delivery works.
No destination was borrowed from NIL or a client intake service.

JSON contract follows lfma/contact.html: firm_name, contact_name, email, phone,
website, budget, services, message, source, page, timestamp. Fields absent from
this smaller homepage form are empty strings; source stays agency_contact_form.
Page retains LFMA origin/path but excludes query strings and fragments.
No speculative tenant fields or routing values were added to the established contract.
The older foundation manifest inconsistently marks forms current while its generic
shared intake lane is OFF/not wired; that generic lane was not enabled or used.

## Behavior and limits

Native email validation plus trimmed required fields; one pending request at a time;
15-second abort; redirects rejected; no credentials; no automatic retries.
Only HTTP 2xx yields endpoint-acceptance messaging. This does NOT prove Make workflow
completion, durable storage, email receipt or Kyle reading the message. Failure,
CORS/network errors and timeout retain the inputs and advise calling before retrying.
Timeout can occur after server receipt. A no-JavaScript visitor sees a phone fallback
and a disabled submit button, preventing an accidental GET exposing form data.

Proof now says 18 CRM Converted / 81 recorded intakes, unverified executed retainers,
unmatched spend/outcome cohorts and uncalculable confirmed signed-case cost; links to
/results/la-county/#scoreboard. Unsupported improvement/full-loop assertions removed.
Layout, colors, imagery and animation CSS are unchanged.

## Verification

- `node --test tests/lfma-homepage.test.mjs`: mocked contract, pending receipt,
  duplicate submit, HTTP rejection, network/CORS failure, timeout, invalid fields,
  proof regression and fallback checks.
- `CHROMIUM_PATH=/usr/bin/chromium node tests/lfma-homepage.browser.cjs`: mobile and
  desktop browser checks; every network request intercepted. Synthetic data only.
- `bash tools/check-release.sh`: standard build, frozen foundation, full unit suite.

## Remaining release steps

1. Review this draft's code, destination evidence and claim language; require CI green.
2. Before live testing, inspect scenario 6145362 read-only for the current route,
   browser-origin/CORS behavior and any email/SMS/call/invoice/client-dispatch modules.
3. Bounded live-test approval request: authorize exactly ONE synthetic homepage
   submission to the existing LFMA agency-contact endpoint, name `LFMA QA`, firm
   `Synthetic QA`, email `lfma-qa@example.invalid`, phone blank, message
   `Approved LFMA homepage receipt test; no outreach or client dispatch`.
   Confirm downstream sends/dispatch/invoicing are suppressed for that record, or
   explicitly name and approve any intended recipient/action first. Do not retry
   automatically. Verify the Make execution and stored payload/receipt, without
   claiming human receipt from a 2xx response. This test was NOT performed.
4. After receipt review, obtain merge/release authorization, merge the narrow PR
   and release through the existing LFMA static-site process. No merge or deployment
   is authorized by this task. Verify public HTML and scoreboard link via GET after
   release; do not submit another live form as a smoke check.
