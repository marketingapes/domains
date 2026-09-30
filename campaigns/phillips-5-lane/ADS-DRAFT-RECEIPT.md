# Phillips 5-Lane — Ad Drafts Receipt (2026-09-29)

**Everything PAUSED. Zero spend.** Meta objects were read back after creation (status PAUSED).
Google = import-ready files only (no seat connection).

## Account inventory (read-only, 2026-09-29)

| Tenant | Platform | Account | Owner (Business) | Status | Seat permissions | Billing | Pixel / dataset | Page |
|---|---|---|---|---|---|---|---|---|
| BTL | Meta | `act_411567125842274` "Best Tort Lawyers - Primary" | Marketing Apes `271597869839201` | ACTIVE (1), disable_reason 0 | DRAFT, ANALYZE, ADVERTISE, MANAGE | card, no spend cap, TZ LA | `673552078259404` "Best Tort Lawyers" (last fired 2026-09-28) | `222081604317115` Best Tort Lawyers |
| NIL | Meta | `act_2536177083499794` "Nearest Injury Lawyers" | Marketing Apes `271597869839201` | ACTIVE (1), disable_reason 0 | DRAFT, ANALYZE, ADVERTISE, MANAGE | card, no spend cap, TZ LA | `1464576608376747` "Nearest Injury Lawyers" (last fired 2026-09-28) | `1275847145612714` Nearest Injury Lawyers |
| — | Meta | `act_379286315737022` Marketing Apes | — | **RESTRICTED — not used, not read** | | | | |
| BTL | Google Ads | **945-563-5555** "Best Tort Lawyers" (under Marketing Apes MCC 607-291-9714), found in Google Ads Editor | Marketing Apes MCC | loaded in Editor; account has ~20 **unposted Depo-Provera changes from another seat** | Editor (local) | | | |
| NIL | Google Ads | **NONE FOUND** — no Nearest Injury Lawyers account in the Marketing Apes MCC (90 accounts checked in Editor) | | | | | | |

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

- **Ads attached, all PAUSED** — 20 ads (4 per lane, 1080×1350 creative, copy from `creative/<lane>/copy.md`),
  read back `status=PAUSED` (Meta shows PENDING_REVIEW / IN_PROCESS — review only, no delivery).
  Spend 2026-09-29: **$0.00** in both accounts (getAccountSummary). Unpausing is a Kyle gate after attorney review.
- **Pixel LEAD event** — pages push `ee_qualified` to dataLayer; GTM must map it to Meta `Lead`
  (BTL `GTM-PHC7459M`, NIL `GTM-NKLD8KST`). Not published by a seat.
- **Google Ads customer IDs** for BTL and NIL, plus a seat connection or Kyle import via Ads Editor.
- Landing pages live (merge + deploy) — Kyle gate.

## Meta ads (all PAUSED)

| Lane | Ad set | Ads (c1–c4) | Creatives (c1–c4) |
|---|---|---|---|
| L1 NIL MVA | `52602948159795` | `52602950751595` `52602950761395` `52602950768395`* `52602950774395` | `1343752197645121` `1392448375897653` `2347674629309178` `1748480856421254` |
| L2 BTL LA County | `120254610949110231` | `120254611310930231` `120254611311150231` `120254611311340231` `120254611311470231` | `1624957952491609` `1647028640172537` `1425778036344838` `1088901864116383` |
| L3 BTL CA Women's Prison | `120254610949980231` | `120254611311600231` `120254611311770231` `120254611312320231` `120254611313040231` | `4501862970025212` `4539838179595209` `1627905028929784` `1811115786575990` |
| L4 BTL Rideshare (EXP-A) | `120254611017870231` | `120254611314060231` `120254611314480231` `120254611315510231` `120254611316300231` | `1093995286344809` `1527618535838863` `1396082176011760` `1794229121708861` |
| L5 NIL Rideshare (EXP-B) | `52602948184595` | `52602950778595` `52602950782595` `52602950789595` `52602950791595` | `1539150924721451` `1433865648689761` `28705857145715544` `2783157022086469` |

\* L1 c3 is marked needs-designer-pass. UTM: `utm_source=meta&utm_medium=paid&utm_campaign=phillips5l-<lane>&utm_content=c<n>`.
Pages: BTL `222081604317115`, NIL `1275847145612714`. Images hosted from commit `245b1fc` on this branch.

## Google Ads Editor

- `google-ads/BTL-945-563-5555-import.csv` = lanes 2–4 combined (3 campaigns, 5 ad groups, keywords, 5 paused RSAs).
- **Import not completed:** the Mac screen locked mid-import (macOS blocks UI automation while locked).
  To finish: Google Ads Editor → Accounts → Paste text / From file → *Use selected accounts* → 945-563-5555 →
  paste the CSV → OK. **Do not Post the whole account** — it holds another seat's unposted Depo-Provera changes;
  post only the three `PHILLIPS-5L` campaigns (they are Paused).
- NIL lanes 1 & 5: files ready, **no NIL Google Ads account exists** in the MCC.
