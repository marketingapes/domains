# LA County intake results — review candidate

Additive LFMA route: `/results/la-county/`. Built from main
`af81f7421b864ca0e9966422d8b7a54845a5b3f4`; existing LFMA home, MVA demo,
lead-verification, protected portal, NIL and BTL routes are unchanged.

## Aggregate fact lock

Parent-supplied verified packet: Litify firm-side daily export, exact LA County
case-type filter, snapshot `2026-10-03T14:00:17Z`, verification
`2026-10-03T23:51:00Z`. Intakes created May 12–September 23, 2026.
81 distinct intake IDs: 18 Converted, 61 Turned Down, 1 Contacted, 1 Chasing.
18/81 = 22.2%. MarketingApes source: 66 IDs, 18 Converted, 46 Turned Down,
1 Contacted, 1 Chasing; 18/66 = 27.3%. Remaining 15 MarketingApes Deadleads
records are all Turned Down. Neither intake IDs nor source labels establish
unique people or paid-media origin. All 18 Converted records have retainer-sent
dates; sent does not establish an executed retainer or payable case.

Matched historical media spend, raw platform leads, unique people, acknowledged
transfers, firm acceptance and confirmed executed retainers are unverified.
Cost per lead/intake and confirmed signed case remain not calculable. The page
shows formulas and missing inputs. A separately labeled historical manual sheet block reports May 5–June 4, 2026, $1,334.15 spend, 67 Meta leads and $19.91 CPL. Platform refresh unavailable; $1.39 total-versus-daily-row discrepancy disclosed. It is not joined to later Litify conversions.
Current launch is a separate cohort. Litify feedback is explained as the
reporting process; no live automation or CAPI delivery is claimed.

Only public aggregate captions are in source control. No CSV, case IDs,
claimants, contact details, narratives or private source links are included.

## Design and verification

Uses current LFMA/MVA lavender paper, dark ink, violet/cyan/magenta accents,
editorial typography and ruled ledgers. Existing brand logo and Kyle's portrait
are reused unchanged; no new stock image, endorsement or testimonial.
Static HTML/CSS, no script, form, tracker, remote request or live collection.
CSP blocks connections and form actions. Publicly accessible when released,
with noindex consistent with the existing LFMA pages.

- `bash tools/check-release.sh`: build, foundation validation, all 226 tests pass.
- Chromium QA at 320, 375, 390, 768 and 1440px: no overflow, images loaded,
  anchor navigation works, zero external requests or browser errors.
- Review screenshots inspected at mobile and desktop; full-page print CSS included.

Parent must review aggregate captions and coordinate merge/publication.
This draft PR is not evidence of a live public release.
