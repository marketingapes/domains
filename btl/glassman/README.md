# Glassman Perspective (BTL) — `/glassman/` and `/glassman/request/`

Static, noindex client shell for Jeffrey Glassman Injury Lawyers' SSDI campaign on the existing
Best Tort Lawyers site. This folder is inside the public publish path: keep it free of lead data,
commercial or payment facts, invoice or account identifiers, source links, hook IDs and credentials.

**Status: safe static preview only.** Nothing is connected: no reporting source, no submission backend,
no sign-in. A static preview is not a live publication, and nothing here verifies current ad delivery.

| Path | What it is |
|---|---|
| `index.html` | Perspective planning snapshot dated 2026-11-05: campaign structure (setup, campaign media, intake & reporting), campaign journey, three entry paths, how review works, channel readiness, Reporting (not connected). No scripts, `connect-src 'none'`. |
| `request/index.html` + `request.js` | Five-step guided brief (focus, who & where, contacts, angle & budget, review) with a live brief preview, review editing and browser back/forward. |
| `request/brief.js` | Pure logic: validation, brief text, content hash, fail-closed receipt check. Unit-tested. |
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

Before this shell shows real reporting or accepts sent briefs, all of these need to be in place and verified:

1. A Glassman tenant with approved owner and users, and permissions verified for those users only.
2. The exact campaign mapping (which pages, ads and lead records belong to Glassman SSDI), de-duplicated against other BTL SSDI work.
3. A read-only, server-side aggregate reporting source behind authentication. No direct browser access to any sheet, no widened sharing, no raw rows or event IDs in served assets.
4. CORS/origin allowance for the BTL host on the Perspective backend (today only LFMA origins are allowed).
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
