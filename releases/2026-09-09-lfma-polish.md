# LFMA campaign polish v1 — deployed

**Deployed commit:** `635ab58bda88391dd9f496ddbd9c4e3341e47fa0`
**Render deploy:** `dep-dagfj3uk1f9s73af2le0` (service `lfma-site` / `srv-da5m28ijobas73f5s6t0`), status `live` at 2026-09-09T06:15:56Z
**URL:** https://lawfirmmarketingapes.com/campaign/ (also https://lfma-site.onrender.com/campaign/)

Reconciles PR #4 (`chatgpt/lfma-polish-receipt-review`) against the receipt fixes
already on `main`. The receipt work was preserved; the page was **not** replaced
with the older downloaded HTML.

## What actually changed

Three commits, in order:

| Commit | File | Change |
| --- | --- | --- |
| `c60be85` | `lfma/assets/campaign-polish-v1.css` | new, 190 lines from PR #4 + a mobile reorder block |
| `fb2efaf` | `tools/apply-lfma-polish.mjs` | new, idempotent structure-guarded applier |
| `6da85f8` | `tests/lfma-polish.test.mjs` | new, 9 tests |
| `635ab58` | `lfma/campaign/index.html` | **one line** |

The entire HTML diff:

```diff
 @media (prefers-reduced-motion:reduce){*{transition:none!important}}
 </style>
+<link rel="stylesheet" href="/assets/campaign-polish-v1.css" data-lfma-polish="v1">
 </head>
```

No markup, field, label, price, webhook, tracking or script change. Rollback is
deleting that one `data-lfma-polish` line.

## Byte proof, not "looks right"

Every artifact was checked by git blob hash, end to end:

| File | Blob | Local built | Repo `main` | Served by lawfirmmarketingapes.com |
| --- | --- | --- | --- | --- |
| `campaign/index.html` | `129cdb21…` | yes | yes | yes |
| `assets/campaign-polish-v1.css` | `e5cfbe7f…` | yes | yes | yes |
| `assets/lfma-brief-adapter.mjs` | `e41f949f…` | — | yes | yes |
| `assets/order-intake-client.mjs` | `1db7bf31…` | — | yes | yes |

Both `.mjs` files are still served as `application/javascript`, so the dynamic
import the page depends on still resolves.

## Test reference

`node --test tests/lfma-polish.test.mjs` → **9 pass, 0 fail** (run twice: in this
workspace, and again in a clean clone of the exact tree that was pushed).

The tests assert the CSS cannot break the honest-receipt behaviour:
no `position: fixed|sticky`, no `@import` or `url()`, `[hidden]{display: none
!important;}` preserved (so the success block and the error block can never be
forced visible by layout), `prefers-reduced-motion` kept, `focus-visible` kept.
`tools/apply-lfma-polish.mjs` is idempotent and throws rather than rewriting a
page whose structure it does not recognise.

## Browser results — against the bytes the server actually returns

Run in real Chromium against a mirror of the live response, and re-confirmed on
the live URL itself in a real browser.

| State | Result |
| --- | --- |
| Mobile 390×844 | polish loaded, form precedes the process explanation, first field at 479px, 0 fixed/sticky, no horizontal scroll |
| Mobile 375×812 **on the live URL** | polish loaded (form radius 18px), form top 367px, first field 453px — **inside the first screen**; process block moved to 2568px; 0 fixed/sticky; no horizontal scroll; adapter bound, submit enabled |
| Validation (empty submit) | **0 requests sent.** This page cannot create an empty Buyer Board row |
| Success | 1 request; `daily_cap ""`, `media_budget_usd 10000`, `media_daily_budget_usd 714.29`, `phone ""`; submission reference rendered |
| Error (network failure) | success block stays hidden, error legible (#593b08 on #fff6e6), button locks to "Receipt needs checking" and tells the visitor **not** to pay again |
| Desktop 1440×900 | two-column, no horizontal scroll |

Every hook call in the harness was intercepted locally. **Nothing was sent to
the live Make webhook, and no Buyer Board row was created by this work.**

## Mobile: what moved and why

Below 560px the six-step process explanation now renders under the form
(flexbox `order`, source order unchanged, so screen readers and no-CSS clients
still read it in its authored position). First screen is now
headline → promise → first field instead of headline → six steps → form.

## Still open

1. **The intake webhook is still being hit by something that is not this page.**
   A new empty "ORDER RECEIVED — web" row was written at 2026-09-09 02:07 AZ
   (execution `bbd39935…`, 06:07:59Z). That brings the empty rows to 19, going
   back to 2026-09-03. It is not from `/campaign/`: that page only calls the hook
   inside its submit handler, and an empty submit sends nothing.
   Root cause: hook `2770579` is configured `method: false, headers: false`, so
   the scenario cannot tell a bare GET from a real order, and the hook URL is
   readable in the public page source.
   **Fix, not applied — one filter, needs your hands:** in scenario 6145362, on
   the link between module 1 (webhook) and the Google Sheets "add row" module,
   add condition `email` **Exists** AND `email` **Not equal to** *(empty)*.
   That blocks every observed empty row and changes nothing for a real order.
   I left this for you deliberately: a malformed blueprint edit made unattended
   would silently stop recording real orders from marketingapes.com/order.
2. **Intake is not yet verified end to end.** That needs the one controlled
   internal test: one submission reference → one populated Buyer Board row →
   a matching browser acknowledgement. Reserved for you.
3. **Payment verification and campaign activation remain separate.** A confirmed
   brief receipt is not payment, and payment is not an activated campaign.
