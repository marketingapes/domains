# Shared domain campaign studio

Built September 8, 2026. One public, secret-free source produces seven branded campaign studios and 25 topic previews per brand. This is a working demo/planning release, not a live lead collection or autonomous advertising release.

## Build and verify

From repository root:

    node campaign-system/build.mjs
    node --test campaign-system/test/*.test.mjs

Generated files are committed because several Render static services have no Node build step. `campaign-system/` is the source; do not independently edit generated `*/campaigns/` files. NIL's generated `nil/campaigns/` directory must also be copied into `marketingapes/nil-site` at `campaigns/`. Its older directory in this repository is not the production deployment source.

## What works

Brand and topic selection, campaign categories, firm/location customization, editable 50-mile MVA planning radius, three intake approaches (prequalification, open-ended form/call and AI), fourteen-day dates and cent-exact budgets, JSON download, standalone HTML demo download, shareable configuration links, and manual actual-spend pacing. No vendor order, invoice, payment, advertising budget, lead routing or consumer record is created by these actions.

Existing vendor agreements and waivers override catalog pricing. $2,500 is monthly management, not a fee per 14-day sprint. Campaign IDs label draft exports and are not transaction identifiers.

## Public/private boundary

Only public templates and public business context belong here. Do not enter claimant information. Query links contain entered business names and geography and are visible to recipients and hosting logs. No advertising pixels, browser storage, lead forms, private tenant records or operator keys are included. Unknown URL fields are discarded. User strings are escaped before HTML rendering; downloads are browser-local. Shared links regenerate from the current catalog version, while JSON/HTML downloads retain their exported content.

## Organic pages

All previews use noindex and are excluded from the production sitemap. Organic activation is not implemented in this release. Each topic needs distinct reviewed consumer copy, a firm and accepted jurisdiction, disclosures, an actual inquiry route and verified measurement before promotion. Existing consumer pages and routes are preserved. JPML September 1, 2026 is a docket-reference source for named MDL topics, not evidence that a buyer accepts cases or that any claimant qualifies. This is an initial configurable library, not an exhaustive list of all torts.

## Publishing and AI handoff

Push the generated directories to the existing site repositories to trigger Render. Keep deployment receipts and mirrored public files in Drive. No automatic Drive watcher or client-scoped MCP was added. Claude, Grok and Codex can use this same catalog and draft JSON contract; no connection to other assistants was made by this release.

For each new topic: edit catalog, regenerate, run tests, review pages and publish generated files. A deployment must include the source plus outputs in one commit. Do not change DNS for the existing Phillips/BTL funnel as part of this release.

## Signature log and QA

Audience: Kyle and firm/agency buyers evaluating campaigns. Traffic: direct demo links. Conversion: download or share a plan, not a consumer inquiry. Built from existing domain mappings and structured offer. Homepage and provider code unchanged. Initial browser verification: seven brands, plan download, share/reload, manual pacing, edit invalidation, malicious text escaping, 390px overflow check and screenshots. Unit/integration tests cover totals, dates, tiers, radius validation and all generated pages. Retain release receipts separately with actual deployment verification.

## Three-page release — September 8, 2026

Campaign class sets the media budget: MVA, personal injury and major mass tort are $10,000; the retained standard tort/sex-abuse category is $5,000. Monthly management remains separate. Qualifications, disqualifications and excluded geography are explicit editable fields and are not treated as verified legal criteria. Switching topics clears qualifications/disqualifications. Shared links include these fields; the UI identifies this before copying.

Every topic now has prequalify/, open/, and ai/ static templates. Customized previews use preview/ with a sandboxed iframe; each can also be downloaded as a standalone HTML page. AI interaction is expressly a scripted demo. Open-ended and call controls do not submit or place calls. None of the three paths is live claimant intake. The older variant property remains in exported plans for compatibility but no longer selects the three intake modes.
