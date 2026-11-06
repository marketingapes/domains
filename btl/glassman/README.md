# Glassman Perspective (BTL) — `/glassman/` and `/glassman/request/`

Static, noindex client shell for Jeffrey Glassman Injury Lawyers' SSDI campaign on the existing
Best Tort Lawyers site. This folder is inside the public publish path: keep it free of lead data,
commercial or payment facts, invoice or account identifiers, source links, hook IDs and credentials.

**Status: public planning preview; secure reporting implementation awaits activation.** The new
`reporting/` page uses the existing Perspective email sign-in and aggregate endpoint. The backend
reader, exact BTL origin allowance and tenant access still require approval and live verification.
No reporting figures are embedded in public files. No submission backend is configured. A static preview is not a live publication, and nothing here verifies current ad delivery.

| Path | What it is |
|---|---|
| `index.html` | Perspective planning snapshot dated 2026-11-05: campaign structure (setup, campaign media, intake & reporting), campaign journey, three entry paths, how review works, channel readiness, Reporting (not connected). No scripts, `connect-src 'none'`; links to secure reporting. |
| `request/index.html` + `request.js` | Five-step guided brief (focus, who & where, contacts, angle & budget, review) with a live brief preview, review editing and browser back/forward. |
| `request/brief.js` | Pure logic: validation, brief text, content hash, fail-closed receipt check. Unit-tested. |
| `reporting/` | Signed-in aggregate view: memory-only session; explicit loading, unconfigured, error, unauthorized and stale states. Calls/spend/qualification/cases remain unavailable. |
| `glassman.css` | Shared styles. System fonts only; no external requests. |

Replaces the legacy request form, which posted to a webhook, ignored failures, showed "Request
received" regardless and promised an automatic invoice under superseded terms. No GTM or analytics.

## Honesty rules this page encodes

- A brief is for review. It never purchases, invoices, changes the contract, approves spend or launches.
- No client commercial facts on public assets: no package amounts, balances, invoice or payment dates. Those belong behind authenticated reporting.
- Budget in a brief is a hypothetical proposal typed by the user, for discussion only. A campaign outside SSDI is a separate future request: not part of the current SSDI campaign; scope and pricing require review.
- Status is a dated planning snapshot (Nov 5, 2026), not live reporting. Launch history and current delivery are unverified: the page makes no claim about whether any ad ran before. A dated manual note reported Facebook ads paused (not live-verified); readiness must be verified before any approved launch or resume. Google is not ready; ChatGPT and TikTok are held; MVA is out of scope.
- No internal channel caps, pacing or review points are shown. No lead, CPL or case guarantees.
- Reporting shows "Not connected" placeholders only: no zeros, no manual counts, timestamp unavailable.

## Submission modes

- **Default (shipped): preview.** `<meta name="glassman-request-endpoint" content="">` is empty, so the page never sends; the user copies or downloads the brief. It never shows "received".
- **Future receipt endpoint (not configured).** Set the meta to a same-origin path only (anything else stays preview). The page POSTs JSON with an `Idempotency-Key` equal to the brief ID and counts the brief as received only when the reply is `application/json` with `schema: "glassman.campaign-brief.receipt/v1"`, `status: "received"`, `durable: true`, the same `request_id` and a valid `receipt_id`. HTTP errors, network failure, timeout, malformed or opaque replies fail closed. Repeated clicks share one in-flight send; retries and reloads reuse the same brief ID while the content is unchanged. A receipt remembered in `sessionStorage` is not treated as proof after reload.

## Activation blockers (nothing here is connected)

Reporting activation is documented in `marketingapes/evolutionengine` → `docs/glassman-reporting-summary.md`. It requires explicit approvals for the existing server identity, whole-workbook viewer access, the read-only scope, tenant/person/campaign mapping and narrowly scoped BTL origin allowance. A Sheet viewer grant covers every tab, even though application reads are limited to the aggregate block. No access has been changed.

The following remain unverified for live use:

1. A Glassman aggregate-only tenant with individually approved users and an overview-only level. Owner privileges are not required.
2. An unambiguous exact campaign authorization mapping for the aggregate source.
3. A read-only, server-side aggregate reporting source behind authentication. No direct browser access to any sheet, no widened sharing, no raw rows or event IDs in served assets.
4. Approval and activation of the exact BTL origin for Glassman sign-in and summary paths only.
5. A receipt-capable request backend that durably stores the brief and returns the receipt contract above.
6. Codex review, then a human-approved deploy. Local QA is not a live publication.

## Tests

```sh
node --test tests/glassman-perspective.test.mjs
PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium [SHOTS=/new/dir] \
  node tests/glassman-perspective.browser.mjs
```

The browser test serves `btl/` from 127.0.0.1, aborts every other host, and uses a local fake
endpoint for the receipt cases. It proves page behaviour only.

Reporting tests: `node --test tests/glassman-reporting.test.mjs` and `PLAYWRIGHT=/path/to/playwright CHROMIUM=/path/to/chromium node tests/glassman-reporting.browser.mjs`. All provider responses are synthetic.
