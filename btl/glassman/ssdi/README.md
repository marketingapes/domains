# Glassman SSDI pages (GLASSMAN-SSDI-002) — besttortlawyers.com/glassman/ssdi/

The BTL SSDI A pages (`/ssdi/`, Glassman-style layout) re-branded for Jeffrey Glassman Injury Lawyers. Same layout, copy, quiz and intake; noindex,nofollow.

| Page | URL | page_id |
|---|---|---|
| Request a callback | /glassman/ssdi/ | glassman-ssdi-main-form |
| Talk to Sofia | /glassman/ssdi/talk-to-sofia/ | glassman-ssdi-call-first |
| Eligibility check | /glassman/ssdi/quiz/ | glassman-ssdi-quiz |

- Sofia line: (669) 209-9040, Vapi phone d9e1cabe "DEMO Sofia — Glassman SSDI" (assistant 32e90752).
- Leads: campaign-kit intake (Make 6777650), tenant `glassman`, campaign `GLASSMAN-SSDI-002`. `?test=1` sends a synthetic lead.
- Brand: logo, door images and colors from `/glassman-ssdi/` (jeffreysglassman.com palette). Firm phone (617) 777-7777, privacy/disclaimer links go to jeffreysglassman.com.
- Criteria (Oct 28): age 48–64, all states except ND, SD, AK and HI, intake Mon–Fri 8 AM–8 PM Eastern, from Dan Verrilli's Oct 27 list. The other quiz checks (out of work, doctor, benefits, lawyer) are unchanged until the rest of Dan's list is added. The Glassman Sofia on (669) has not been updated.
- Ads and door cards (Oct 29): `/assets/glassman-ssdi/ads/` has the BTL SSDI door images (`/assets/ssdi/ads/`) with the Glassman logo in place of the Best Tort Lawyers label. The form image's state line reads "ND, SD, AK or HI" instead of "CA or CO", and the quiz image's headline says ages 48–64 instead of 54–63. `brand_ads.py` rebuilds them. The "Other ways to start" door cards on all three pages use the square ones, like `/ssdi/b/` (they used the text-only `/glassman-ssdi/img/ad-*.jpg` cards before).
- Built 2026-10-28 from the dark pages, which were at `/ssdi/` then and are now at `/ssdi/b/`. `build_from_ssdi.py` reads `/ssdi/`, so it no longer reproduces these pages as is; edit this folder directly.


Future consent update (2026-11-05): Marketing Apes operates these three pages for
inquiries to Jeffrey Glassman Injury Lawyers. Submit records call consent; the
separate SMS checkbox starts unchecked and is optional. Version
`glassman-ssdi-002-consent-marketing-apes-2026-11-05-v1` applies only to new
submissions. Both `consent.calls` and `consent.sms` include `granted`, `text`,
`version`, `method`, and `captured_at`. The original `consent.version`, `text`,
`method`, and `captured_at` fields remain for the raw intake contract. The channel
timestamps share the submit capture time and remain frozen on unchanged retries.
A changed disclosure or SMS choice gets a fresh submission ID. Historical consent
is not Marketing Apes consent. This page change does not enable calls or texts.

Offline browser verification: run `node btl/glassman/ssdi/tests/consent.browser.mjs`
from the repository root with Playwright installed, or set `PLAYWRIGHT_MODULE` to
its `index.mjs`. Set `CHROMIUM_EXECUTABLE` if needed and `EVIDENCE_DIR` for
screenshots (default `/tmp/glassman-consent-evidence`). The test intercepts all
requests, serves repository files locally, and mocks every receipt; it never
releases a webhook request. It uses the old intake fixture from commit `4349045`
to verify that pending old consent cannot become new Marketing Apes SMS consent.

Publication review still needs to resolve the existing “Never sold”/“It is not
sold” claims against the linked firm's Privacy Policy, which permits referrals
for consideration. Those business assertions and the firm's policies are not
changed here. No Marketing Apes privacy-policy URL or data-handling promises have
been invented; confirm its applicable notice and actual data practices before
publication. The root Glassman contact test checks separate consent proof and rejects the
superseded automatic SMS grant.
