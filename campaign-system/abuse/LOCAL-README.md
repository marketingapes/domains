# Phillips / BTL LA County — runnable local package

This extends the existing campaign setup server, reuses Claude's three committed pages and backend intake/Perspective adapter, and keeps every provider effect disabled. It is a review package, not production configuration. MVA, SSDI, Paraquat, phone bindings and live Make scenarios are unchanged.

## Start

Node 20+; no package install, credentials or network service required for the workbench. Keep the packaged `domains` and `legal-web-lead` directories beside each other:

```sh
cd domains
node campaign-system/abuse/local-server.mjs
```

Open the printed `http://127.0.0.1:<port>/abuse/` URL. The existing factory remains at `/`. The workbench listens only on loopback and refuses other Host/Origin values. It must never be exposed through a tunnel or deployed as the production operator API. No cloud authentication is provided by this local extension.

To preserve local fixture state across restarts, supply a new private fixture directory and the backend snapshot path:

```sh
node campaign-system/abuse/local-server.mjs /tmp/btl-fictional-fixtures ../legal-web-lead
```

The default creates a fresh private temporary directory. Do not point it at production data. All stored intake is forced simulated; only US fictional 555-0100–0199 numbers are accepted, and entered names/email are discarded. The packaged screenshots contain fictional IDs and private aggregate counts only.

## Try it

1. Create an order with an opaque CRM account reference. The invoice remains unsent: $2,500 fee + $5,000 media.
2. Click **Run fictional settlement & local build**. This is an explicit fixture ledger entry, not a real payment. Six write-once build jobs reference local artifacts. Readiness remains blocked even when every local build job completes.
3. Open each local branded page. All providers/measurement remain off. Only this loopback server injects the fictional intake endpoint; committed deployable pages still have `intake_endpoint:null`.
4. Save the sample quiz lead in Perspective. Record a fictional human-review request. Stages change only from receipts written by those actions. Calls/documents/recordings remain pending or unavailable. No timer fabricates completion.
5. Prepare an SMS draft. Missing consent, suppression proof or timezone blocks it; outside the draft 8am–8pm recipient-local window it is held. The template is always visible for review. Nothing is sent.

## Reused components and limits

- `setup-server.mjs` gains an optional extension; existing behavior is unchanged without it.
- `machine.mjs` supplies immutable order/invoice, process-local scoped payment capabilities and fixture/connected queue isolation.
- `durable-store.mjs` publishes fully synced JSON with atomic NX and serializes writes with filesystem locks. Interrupted unpublished writes cannot look committed. Directories must be owned and private (0700); symlink reads are refused. Cross-process NX and append contention are tested. A process crash while holding a lock deliberately leaves the job blocked; there is no unsafe lease stealing. Diagnose the failed local worker before clearing its abandoned fixture lock or start a fresh fixture directory. This is not a production distributed worker.
- `worker.mjs` handles only deterministic local artifacts, bounded attempts, duplicate receipts and an explicit failure owner. No provider worker/sender is imported. Replays after completed local artifacts do not repeat handlers; a crash between handler and receipt can repeat a PURE handler, so live external effects must never be added to these handlers.
- Backend snapshot `0433c43c058bbe0809277a72b96bbe9bc42af4f6` supplies the actual existing intake and Perspective contracts; source files remain unchanged. Historical counts are the parent-supplied October 21 private snapshot, not a live warehouse query or independently rescanned source document.
- `automation.mjs` consumes authenticated call-bound backend context and the same question bank version, confirms prior answer IDs, checks fresh suppression and separates recording consent. Draft messages require a matching stored trigger event and affirmative channel consent. START never clears suppression automatically; opt-out confirmation remains held without an approved exception. Unknown delivery must be reconciled before any retry.

## Payment-provider seam

`payment-events.mjs` verifies Ed25519 signatures over the exact raw UTF-8 normalized relay body, rejects stale/tampered/cross-scope events and conflicting replays, and applies monotone refund/dispute holds. Defaults have no public key and fail closed. Keys must have a trusted server-side profile `{public_key, mode:"fixture", tenant, firm_id, campaign_id}`. A valid fixture signature with `fixture:false` is refused, and connected settlement reads always return null in this local package. A bare PEM key has no payment authority. No native payment-provider webhook endpoint or provider account is installed. The tests generate ephemeral mock keys in memory and never save credentials.

Normalized relay body (fixture example, not a provider's native webhook format):

```json
{"schema":"btl.payment-relay/v1","event_id":"pay-fixture-example01","tenant":"BTL","firm_id":"phillips-law-group","campaign_id":"btl-ca-abuse-la-county-v1","order_id":"ord-fictional-example01","invoice_id":"<issued draft invoice id>","reference":"FIXTURE-REFERENCE01","amount_cents":750000,"currency":"USD","status":"settled","source":"processor_settlement","occurred_at":"<current ISO timestamp>","fixture":true}
```

A future production implementation must add and independently review the native provider authenticator and real-payment trust policy; configuration alone cannot enable real settlement authority here. The local test composition root supplies fixture-key profiles and an invoice resolver. A provider-specific authenticator must independently verify the actual provider webhook protocol before producing this relay; never trust client JSON or Make's declaration that payment succeeded. Re-read authoritative settlement before enqueueing. Refund/dispute receipts revoke even an unexpired capability. Real queue execution and activation require their own verified conditions, absent here.

## Make draft

`make/disabled-blueprint.json` contains an on-demand Start → HTTP → Return blueprint, using module versions and config schemas read from Make on October 22. All three configs validate locally against the stored schema snapshot. Its HTTP route has the literal `0 == 1` hard stop, `example.invalid` URL, no credentials and redirects disabled. It was NOT imported, run, connected or activated. `make-routing.mjs` implements and tests the positive LA form/campaign/program/consent/suppression gate. The existing 6311519 targeted change remains a separate draft. No new webhook or native lead-form source is created.

## Verify

```sh
BTL_ABUSE_BACKEND_DIR=../legal-web-lead node --test campaign-system/test/abuse-campaign.test.mjs campaign-system/test/abuse-integration.test.mjs campaign-system/test/abuse-workbench.test.mjs
```

The optional browser runner uses an ALREADY installed Playwright and Chromium, blocks every external request, and captures desktop/mobile previews:

```sh
BTL_ABUSE_BACKEND_DIR=../legal-web-lead PLAYWRIGHT=/existing/playwright CHROMIUM=/existing/chromium SHOTS=/tmp/new-btl-shots node campaign-system/test/abuse-workbench.browser.mjs
```

## Exact sanitized fields needed before connecting providers

Parent can supply references/fixtures only; no secrets or claimant data:

- Confirmed LA Meta form ID allowlist, distinct from other California programs/MVA, plus field IDs mapped to the four question IDs and consent evidence fields.
- Selected payment provider and one sanitized settled/refund webhook fixture with header names and signature protocol; public verification-key reference and canonical invoice/customer metadata mapping. No private keys or API keys.
- Approved public API/service references, existing connection reference IDs, exact voice/assistant binding and complex-tort handoff destination plus staffed hours/timezone. Do not infer these from MVA.
- Approved consent/copy versions and per-program rule-set IDs; email requires a separate affirmative choice and private unsubscribe route. Kyle handles Phillips approval; pending values do not block local testing.
- Sanitized Perspective/BigQuery field schema and receipt examples for lead↔call↔recording↔handoff↔outcome joins, plus authorized viewer policy. Runtime values remain null without those linked receipts.

Retainer extension is optional and unimplemented; no approved client retainer/template was supplied. Nothing in this package signs a document or reports a signed case.
