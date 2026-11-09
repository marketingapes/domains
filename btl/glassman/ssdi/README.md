# Glassman SSDI pages (GLASSMAN-SSDI-002) — besttortlawyers.com/glassman/ssdi/

The BTL SSDI A pages (`/ssdi/`, Glassman-style layout) re-branded for Jeffrey Glassman Injury Lawyers. Same layout, copy, quiz and intake; noindex,nofollow.

| Page | URL | page_id |
|---|---|---|
| Request a callback | /glassman/ssdi/ | glassman-ssdi-main-form |
| Talk to Sofia | /glassman/ssdi/talk-to-sofia/ | glassman-ssdi-call-first |
| Eligibility check | /glassman/ssdi/quiz/ | glassman-ssdi-quiz |

- Sofia line: (339) 329-6165 (Massachusetts), Vapi phone 683be3e8 (assistant 32e90752). The older (669) 209-9040 line reaches the same assistant but is no longer shown on the pages.
- Leads: campaign-kit intake (Make 6777650), tenant `glassman`, campaign `GLASSMAN-SSDI-002`. `?test=1` sends a synthetic lead.
- Brand: logo, door images and colors from `/glassman-ssdi/` (jeffreysglassman.com palette). Firm phone (617) 777-7777, privacy/disclaimer links go to jeffreysglassman.com.
- Criteria (Oct 28): age 48–64, all states except ND, SD, AK and HI, intake Mon–Fri 8 AM–8 PM Eastern, from Dan Verrilli's Oct 27 list. The other quiz checks (out of work, doctor, benefits, lawyer) are unchanged until the rest of Dan's list is added.
- Ads and door cards (Oct 29): `/assets/glassman-ssdi/ads/` has the BTL SSDI door images (`/assets/ssdi/ads/`) with the Glassman logo in place of the Best Tort Lawyers label. The form image's state line reads "ND, SD, AK or HI" instead of "CA or CO", and the quiz image's headline says ages 48–64 instead of 54–63. `brand_ads.py` rebuilds them. The "Other ways to start" door cards on all three pages use the square ones, like `/ssdi/b/` (they used the text-only `/glassman-ssdi/img/ad-*.jpg` cards before).
- Built 2026-10-28 from the dark pages, which were at `/ssdi/` then and are now at `/ssdi/b/`. `build_from_ssdi.py` reads `/ssdi/`, so it no longer reproduces these pages as is; edit this folder directly.


Consent (2026-11-06): no checkboxes. Tapping "Request my free call" agrees to calls
and texts from Marketing Apes and Jeffrey Glassman Injury Lawyers (including Sofia,
AI or prerecorded voice), with frequency, rates and STOP/HELP in the same line. Version
`glassman-ssdi-002-consent-marketing-apes-2026-11-06-v1` applies only to new
submissions; `consent.calls` and `consent.sms` both record `granted`, `text`,
`version`, `method` (`clickwrap_submit`) and `captured_at`. Earlier submissions keep
the version they were captured under. This page change does not enable calls or texts.

Offline browser verification: run `node btl/glassman/ssdi/tests/consent.browser.mjs`
from the repository root with Playwright installed, or set `PLAYWRIGHT_MODULE` to
its `index.mjs`. Set `CHROMIUM_EXECUTABLE` if needed and `EVIDENCE_DIR` for
screenshots (default `/tmp/glassman-consent-evidence`). The test intercepts all
requests, serves repository files locally, and mocks every receipt; it never
releases a webhook request. It uses the old intake fixture from commit `4349045`
to verify that pending old consent cannot become new Marketing Apes SMS consent.

Campaign privacy clarification (2026-11-05): only these three pages replace the
blanket no-sale claims with “Shared for this inquiry” and a campaign-specific
notice. It names Glassman and campaign providers and commits Marketing Apes to
asking permission before its own referrals to another firm. Clearly labeled
links point to BTL privacy/SMS/terms, Marketing Apes website privacy, and the
firm's original privacy/disclaimer. No external policy or unseen service
agreement is edited or asserted as verified.

A successful receipt confirms that the callback request was received for review.
The selected callback window is a requested preference, not a confirmed booking
or a promise of an immediate call. Callback metadata, introductory copy, FAQ,
door cards and thank-you copy reflect that. Consent text/version, phone route,
callback payload values, receipt gate and conversion code are unchanged.

Path clarification (2026-11-05): all three pages distinguish an inbound automated
intake conversation from a callback request for team review. No blanket 24/7
answering, same-call firm connection, or 24–48-hour callback promise remains in
HTML or generated quiz result copy. A live transfer may be offered when available;
no successful transfer or response time is promised. Screening criteria, hours,
routing, consent and conversion code are unchanged.

Approved form preview (2026-11-05): the callback cards on the quiz and Talk to
Sofia pages now reference `glassman-ssdi-form-1254x1254.jpg`, copied byte-for-byte
from the parent's verified Meta creative 3648447985307479. It is a JPEG despite
the CDN URL's .png suffix: native 1254 × 1254, 115224 bytes, SHA256
`a824eef320684a990a2f84432d518e46a7e40f036db310bc2c8f1d3b4a4901b5`.
It visibly says “Submit an inquiry for review. Not available in ND, SD, AK or HI.”
No pixels were generated, resized, cropped or re-encoded. HTML uses its actual
native dimensions; existing responsive square layout is preserved. The old 1080
asset is retained but no longer referenced by these campaign pages. The supplied
vertical JPEG was verified separately and is not referenced or added to this
campaign, which uses square cards.

The root Glassman contact test checks separate consent proof and rejects
the superseded automatic SMS grant. Offline browser tests also verify campaign
privacy links, requested-time receipt copy, rejection of HTTP 200 without a
receipt, one conversion for a first non-test receipt, and no conversion for a
test or duplicate receipt. All network traffic is intercepted.

Quiz other-options request (2026-11-09): a NOT_A_FIT result now offers an optional
contact form in place of the SSA link and Change an answer button. The request
retains NOT_A_FIT and routing hold, records request_type other_firm_review_request
and followup_request.referral_authorized=false, and uses separate Marketing Apes-only
contact consent. It is not a qualified Glassman lead or a referral permission. The
receipt confirms storage only and does not fire generate_lead. Qualified and
uncertain paths retain their existing behavior. Run
`node tests/glassman-ssdi-quiz.browser.cjs` for offline mobile/desktop verification;
all provider requests and receipts are mocked.

Review clarification: the quiz privacy footer distinguishes Glassman review
requests from Marketing Apes other-options requests. Other-options submissions
use separate ee_other_options_* attempt/error/receipt events and never emit
ee_lead_submit_* events. Existing non-quiz buttons retain their original markup.

TrustedForm requirement (2026-11-09): all three Glassman forms wait up to eight
seconds for an HTTPS cert.trustedform.com certificate before sending. A missing
or malformed certificate stops submission with a retryable error; it does not
create a success receipt. The top-level trustedform_cert_url is preserved across
unchanged retries, including reloads. Already-attempted legacy requests without
a certificate are not silently resent or assigned a new identity. This checks
URL shape, not certificate retention, claim status, or legal validity. No
certificate URL is put in analytics. Run the offline TrustedForm browser suite
with node tests/glassman-trustedform.browser.cjs; provider calls are intercepted.
