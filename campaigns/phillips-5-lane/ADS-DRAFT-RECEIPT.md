# Phillips 5-Lane — Ad Drafts Receipt (2026-09-29)

**Everything PAUSED. Zero spend.** Meta objects were read back after creation (status PAUSED).
Google = import-ready files only (no seat connection).

## Account inventory (read-only, 2026-09-29)

| Tenant | Platform | Account | Owner (Business) | Status | Seat permissions | Billing | Pixel / dataset | Page |
|---|---|---|---|---|---|---|---|---|
| BTL | Meta | `act_411567125842274` "Best Tort Lawyers - Primary" | Marketing Apes `271597869839201` | ACTIVE (1), disable_reason 0 | DRAFT, ANALYZE, ADVERTISE, MANAGE | card, no spend cap, TZ LA | `673552078259404` "Best Tort Lawyers" (last fired 2026-09-28) | `222081604317115` Best Tort Lawyers |
| NIL | Meta | `act_2536177083499794` "Nearest Injury Lawyers" | Marketing Apes `271597869839201` | ACTIVE (1), disable_reason 0 | DRAFT, ANALYZE, ADVERTISE, MANAGE | card, no spend cap, TZ LA | `1464576608376747` "Nearest Injury Lawyers" (last fired 2026-09-28) | `1275847145612714` Nearest Injury Lawyers |
| — | Meta | `act_379286315737022` Marketing Apes | — | **RESTRICTED — not used, not read** | | | | |
| BTL | Google Ads | **unknown** — `btl/domain.json` google_ads.customer_id = null, NEEDS_AUTH | | | no seat connection | | | |
| NIL | Google Ads | **unknown** — `nil/domain.json` google_ads.customer_id = null, NEEDS_AUTH | | | no seat connection | | | |

Active campaigns in both Meta accounts at time of build: **none** (the 2026-09-24 Phillips ads hold remains intact).

## Lane → drafts

| # | Lane | $/day | Meta account | Meta campaign (PAUSED) | Meta ad set (PAUSED) | Meta $/d | Google file | Google $/d |
|---|---|---|---|---|---|---|---|---|
| 1 | NIL MVA/PI | 200 | NIL `act_2536177083499794` | `52602948119995` | `52602948159795` | 100 | `google-ads/l1-nil-mva-pi.csv` | 100 |
| 2 | BTL LA County | 100 | BTL `act_411567125842274` | `120254610938410231` | `120254610949110231` | 50 | `google-ads/l2-btl-la-county.csv` | 50 |
| 3 | BTL CA Women's Prison | 100 | BTL `act_411567125842274` | `120254610938880231` | `120254610949980231` | 50 | `google-ads/l3-btl-ca-womens-prison.csv` | 50 |
| 4 | BTL Rideshare (TARGETED) | 50 | BTL `act_411567125842274` | `120254610939490231` | `120254611017870231` | 25 | `google-ads/l4-btl-rideshare-targeted.csv` | 25 |
| 5 | NIL Rideshare (OPEN) | 50 | NIL `act_2536177083499794` | `52602948129795` | `52602948184595` | 25 | `google-ads/l5-nil-rideshare-open.csv` | 25 |
| | **Total** | **500** | | | | **250** | | **250** |

Meta settings (all 5): objective OUTCOME_LEADS · ABO (budget on ad set) · optimization
OFFSITE_CONVERSIONS on pixel event `LEAD` · lowest cost, no cap · Advantage audience OFF ·
automatic placements · no custom/lookalike audiences · **no retargeting on survivor lanes (2–5)**.

## Targeting (exact)

| # | Geo | Age | Gender | Detailed targeting |
|---|---|---|---|---|
| 1 | United States (home + recent) | 18–65 | all | none (open) |
| 2 | LA County approximation: Los Angeles 25mi, Lancaster 15mi, Santa Clarita 10mi, Pomona 10mi, Long Beach 10mi | 21–65 | all | none |
| 3 | California (region 3847) — **geo-only** per locked answer q5; facility angle in copy only | 18–65 | women | none |
| 4 | 15 rideshare metros at 20mi: Los Angeles, New York, San Francisco, Chicago, Houston, Dallas, Atlanta, Miami, Phoenix, Seattle, Boston, Washington DC, Philadelphia, Las Vegas, San Diego | 21–54 | women | interests: Uber (company) `6004675264764` OR Lyft `6015774821042` |
| 5 | United States | 18–65 | all | none (open) |

Note: Meta rejected DMA targeting ("DMAs are being replaced with Comscore Markets"), so lane 4
uses city + radius.

## Still missing before these can run

- **Ads** — no ads attached yet (so nothing can deliver). Creatives in `creative/`; attach after
  attorney review of disclaimers + Kyle approval.
- **Pixel LEAD event** — pages push `ee_qualified` to dataLayer; GTM must map it to Meta `Lead`
  (BTL `GTM-PHC7459M`, NIL `GTM-NKLD8KST`). Not published by a seat.
- **Google Ads customer IDs** for BTL and NIL, plus a seat connection or Kyle import via Ads Editor.
- Landing pages live (merge + deploy) — Kyle gate.
