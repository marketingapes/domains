# PHILLIPS 5 LANE GO-LIVE RECEIPT

**Status: BLOCKED**
**Reason:** build complete and verified, but live gates remain open: Vapi drafts created but
not bound (Kyle: "bind it"), Phillips transfer lines pending, no phone bound, no intake endpoint, attorney review of disclaimers
and criteria pending, NIL has no Google Ads account, GTM `ee_qualified → Lead` mapping not published,
and nothing is merged or deployed.

Branch `claude/phillips-5-lane-v5` (built on PR #143's branch) · manifest v5.0 · 2026-09-29 · seat: Claude Code

## Pages

| Check | Result | Evidence |
|---|---|---|
| 5 lanes, 15 pages | ✅ | `tests/phillips-5-lane.test.mjs` "5 lanes × 3 pages = 15 pages exist" |
| BTL/NIL identity separation (branding, pixels, numbers) | ✅ | test: no cross-tenant GTM/GA4/pixel/brand/assets; rideshare twins share no file |
| Mobile QA on all 15 | ✅ | 390px renders in `screens/{btl,nil}/*-mobile.png`; no horizontal overflow, tap targets ≥44px |
| Pages responding **live** | ⛔ not deployed | Kyle gate: merge → Render deploy |

## Imagery (v2, Kyle feedback: Paraquat parity + more imagery)

| Check | Result |
|---|---|
| Paraquat-parity structure (landing / quiz pre-qual→qualify→contact / Sofia tort-switched) | ✅ all 15 pages |
| Lane photos generated (Leonardo Lucid Realism) | ✅ 31 of 31 — 6 slots × 5 lanes + NIL Sofia portrait; 646 API tokens used |
| Human review of every image | ✅ no text, logos, car badges, injuries, distress or menace. NIL batch 1 rejected as too dark → regenerated in daylight; MVA mobile hero swapped to 2nd candidate (curb stain) |
| No placeholders ship | ✅ every slot holds a reviewed photo |
| Hero photo visible on mobile | ✅ unobscured photo banner fading into the headline (was washed out by the scrim) |
| Screenshots | `docs/phillips-5-lane/screens/*-mobile.png` (top of each page, 390px) |

## Connected

| Check | Result | Notes |
|---|---|---|
| GTM on every page | ✅ in markup | BTL `GTM-PHC7459M`, NIL `GTM-NKLD8KST` (+ noscript). Loads in headless Chrome (`gtm.uniqueEventId` seen on NIL). Live firing = after deploy. |
| Meta pixel on every page | ✅ slot + ID | BTL `673552078259404`, NIL `1464576608376747`, delivered via GTM (`meta_pixel_direct:false` to avoid double count) |
| TikTok slot on every page | ✅ slot / ⛔ ID | `tiktok_pixel:null` on all 15 — **no TikTok pixel IDs supplied yet** |
| GA4 per lane | ✅ / ⚠️ | NIL `530695235` / `G-00VYXSCGR8`. BTL property `423835322`, **measurement ID missing** (fires via GTM) |
| Sofia CTA → talk-to-sofia | ✅ | test: every landing links `./talk-to-sofia/` and `./quiz/` |

## Voice

| Check | Result | Notes |
|---|---|---|
| BTL Sofia covers 3 lanes | ✅ created (draft, unbound) | `c45499e0-c61e-47ac-ab4f-6f3e4c52e7a3` |
| NIL Sofia covers 2 lanes | ✅ created (draft, unbound) | `82d628a7-a751-4bae-b93d-fb645cafb1bc`; live NIL Sofia untouched |
| No unverified number bound | ✅ | nothing bound. **202-932-9700: Twilio OWNED**, Vapi assistant = none. **602-693-1461 → `57f80d14` NIL — INBOUND — Sofia** (live, unchanged). |

## Criteria

| Lane | Status |
|---|---|
| LA County | **ASSUMED** (minor + LA County institution + no lawyer) |
| CA Women's Prison | **ASSUMED**; AB 2777 revival-window timing flagged for counsel — no deadline stated anywhere |
| Rideshare (both) | **ASSUMED** (Uber/Lyft + driver + US + no lawyer); timeframe not used to disqualify ("2022+" focus in #143 needs a decision) |
| Nationwide MVA | **ASSUMED** (≤2 yrs, treated, not mainly at fault, no lawyer) |

## Compliance

| Check | Status |
|---|---|
| Attorney disclaimer review, per page (15) | **PENDING** on all 15 (`ee-disclaimer-status=pending-attorney-review`) |
| State disclaimer review, per page (15) | **PENDING** on all 15 (`ee-state-disclaimer-status=pending-attorney-review`) |
| Survivor lanes: no assault-detail fields, trauma-informed | ✅ test: no textarea, no "describe/what happened" prompts, RAINN on every survivor page, "Prefer not to say" every step |
| Firm named in ads/pages | Not named ("independent law firm"). Naming Phillips = attorney gate |
| Candidate pages not indexable | ✅ `noindex,nofollow` |

## Ads

| Check | Result |
|---|---|
| All drafts, zero spend | ✅ Meta: 5 campaigns, 5 ad sets, 20 ads, all `status=PAUSED`; spend 2026-09-29 = $0.00 both accounts. Google: import files only |
| Budgets = $500/day table | ✅ Meta 100/50/50/25/25 = 250 · Google 100/50/50/25/25 = 250 |
| BTL lanes in BTL accounts, NIL in NIL (both platforms) | ✅ Meta. Google: BTL → 945-563-5555 (import pending, screen locked); **NIL: no account exists** |
| Experiment documented | ✅ `EXPERIMENT-AND-TRACKING.md` (brand is a known confound) |
| Tracking plan documented | ✅ same file |
| No retargeting on survivor lanes | ✅ no custom/lookalike audiences on any ad set |

## Data — events

| Event | Wired | Verified firing |
|---|---|---|
| page_view, quiz_start, qualification_complete, qualified, disqualified, sofia_start, call_request | ✅ `ee_*` dataLayer, `{event,tenant,lane,page}` only | ✅ headless Chrome (local); ⛔ live/GTM Preview after deploy |
| transfer | server-side (Vapi analysisPlan) | ⛔ blocked on Vapi |
| signed_case | server-side (Phillips outcome feed) | ⛔ blocked |

## Gates for Kyle

1. "bind it" — 202-932-9700 (Twilio-verified) → BTL Sofia `c45499e0`; decide whether 602 moves from live NIL inbound `57f80d14` to NIL 5L `82d628a7`. Web-test both first (vapi/README.md test plan).
2. Phillips transfer numbers (awaiting Michael).
3. Attorney review: disclaimers, criteria, "Laws in California changed", naming the firm.
4. NIL Google Ads account (create/link under MCC) — or approve Meta-only for lanes 1 & 5.
5. GTM: map `ee_qualified` → Meta `Lead` + GA4 in both containers; BTL GA4 measurement ID.
6. TikTok pixel ID(s).
7. Intake endpoint for the 5 lanes (Make scenario like Paraquat's).
8. Merge → deploy → Muse verification → GO-LIVE per lane → unpause.
