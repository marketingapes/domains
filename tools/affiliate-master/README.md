# Affiliate master feed v1

This inventory connects existing DiscountDealMe and ForPetsLikeBlue catalogs without changing their live pages. It does not register programs, submit applications, retrieve credentials or claim that every existing affiliate URL is approved.

## Current snapshot

48 source entries: 36 DDM CJ merchant promotions + 12 FPLB products/collections. Both are current repository catalogs, not independently verified account approval. All 48 are held from NEW publication until dated merchant/property evidence is supplied. Existing sites are untouched. Generic shipping or coupon promotions are not equivalent to product inventory.

## Build

    python build_master.py --ddm ../../ddm/data/deals.json --fplb ../../fplb/data/gifts.json --output master-review.json
    python -m unittest -v test_master

Use `--approvals /private/path/approvals.json` only after account review. Do not commit private approval records. Shape:

    {"discountdealme.com:cj-EXAMPLE": {"status":"approved", "property":"discountdealme.com", "verified_at":"2026-11-16T00:00:00Z", "evidence_ref":"authorized-network-account-record"}}

Approval and source freshness expire independently. Dates must include timezones. Source/property keys are stable and prevent accidental cross-brand reuse. No guessed prices: catalog timestamps do not establish price verification. Display a current-price merchant CTA. Unknown commission, revenue and profit remain null.

## Existing pipeline integration

`tools/adsense-builders/ddm/cj_pull.py` already requests advertiser-ids=joined for CJ property101511733, follows pages and removes private EPC/commission fields. `refresh_deals.py` checks relationship-status=joined and filters expired/future promotions. Reuse this provider pull; do not create another secret or connection. Add actual approval evidence from the authorized network response to the private registry. CJ Link Search supplies promotion links, not complete product catalog data. Product Feed is a separate connector task.

## Next production steps

1. Verify each network's account, property and advertiser relationship; store evidence privately. Keep pending/invited/rejected separate from approved.
2. Add authorized adapters for CJ Product Feed, Impact/Awin, MaxBounty and Amazon only when access and use rights are verified. MaxBounty CPA offers are a different type from retail products.
3. Track application status separately; no automatic acceptance of contracts or unsupported publisher representations.
4. Publish only eligible brand slices through existing site pipeline, preserving the prior feed on errors; no scheduler is enabled by this change.
5. Measure valid outbound clicks and affiliate-confirmed commissions, subtract known costs. Do not rank as profitable from advertised payout alone.
6. Perform live privacy, affiliate-link and analytics acceptance tests before enabling a consuming frontend.

Test coverage: 8 focused cases (approval gate, property isolation, expired/stale offers, unavailable inventory, duplicate keys, no fabricated price/profit). This is not full site integration QA.
