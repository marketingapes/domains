# BTL California abuse — LA County first iteration (LOCAL DRAFT)

Firm: Phillips Law Group. Programs (each versioned, every rule PENDING attorney approval — none invented):
`la-county-juvenile-detention` (first), `ca-juvenile-detention-other`, `ca-womens-prison`.
Nothing here is live: no push, merge, deploy, call, text, email, invoice, ad, spend or provider change.

## What is built
| Part | Where | State |
|---|---|---|
| Callback form, real quiz, talk-to-Sofia callback | `btl/sex-abuse-la-county/` | Repaired; noindex; `intake_endpoint: null` (disconnected notice shown before entry) |
| Context/answer adapter (dispatch disabled) | legal-web-lead `src/intake/btl-abuse-campaign.js` | Routes registered only if `BTL_ABUSE_ADAPTER_ENABLED=true` (default off) |
| Private Perspective (same lead, real-only, historical block) | legal-web-lead `src/intake/btl-abuse-perspective.js` | Operator-only route |
| Offer, ads ↔ pages, order/invoice/payment gate, build queue, 14-check readiness | `campaign-system/abuse/` | Local; activation always false |
| Draft creatives (9 PNG + 3 WebM) from committed lane photos | `campaign-system/abuse/creative/out-2026-10-21/` | Draft; final MP4s missing |
| Email/SMS templates | `campaign-system/abuse/templates/messages.json` | `send: false` |
| Make 6311519 LA allowlist correction | `campaign-system/abuse/make/` | Draft; no form IDs invented |
| Sofia context (template 08c54f48, unassigned) and human handoff | `campaign-system/abuse/sofia`, `handoff` | Drafts |

Ad → page map (utm_campaign `btl-ca-abuse-la-county-v1`, utm_content = angle):
`la-review-form` → `/sex-abuse-la-county/` · `la-four-questions` → `/quiz/` · `la-private-callback` → `/talk-to-sofia/?callback=1`.

## Run locally
```sh
node --test campaign-system/test/abuse-campaign.test.mjs tests/phillips-5-lane.test.mjs
PLAYWRIGHT=<existing playwright dir> CHROMIUM=<chromium> SHOTS=<new dir> node tests/btl-abuse-la.browser.mjs
PLAYWRIGHT=… CHROMIUM=… node campaign-system/abuse/creative/render.mjs <new dir>
bash tools/check-release.sh
```

## Blockers that cannot be completed locally
1. Attorney-approved screening rules for all three programs, and approval of page/ad copy and the consent text
   `btl-abuse-callback-consent-draft-2026-10-21.1` (Kyle is handling Phillips approval).
2. Voice line: "the 602 Vapi" number and binding are unconfirmed; 202-932-9700 is not verified for LA and is not
   repurposed. Pages hide call links until `phone_status: verified_for_program`.
3. Transfer destination: complex-tort 602-200-3960 vs MVA 602-200-3976 runtime override and staffed hours unconfirmed.
4. LA abuse Meta form IDs for the Make 6311519 allowlist.
5. Mounting the adapter live, setting `intake_endpoint`, and a live suppression sync for this lane — each needs approval.
6. Final MP4 (H.264) exports and any voice-over; firm approval of all creative.
7. Measurement (GTM/Meta) is off by default on these drafts; TikTok and all non-Facebook channels stay off.
