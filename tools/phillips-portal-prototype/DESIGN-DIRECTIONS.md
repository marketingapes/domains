# Client Perspective — three visual directions

Private visual review candidates in `lfma/portal/prototypes/client-perspective-directions/`. Self-contained one-page HTML, coordinated campaign filtering, accessible tabs and no network calls or execution controls. All three use the same confirmed Phillips 14-day planning snapshot: $5,000 total, $3,000 Meta Website, $2,000 Google Search. Current platform spend, individual lead counts, AI work, Litify feedback and Signed outcomes remain unknown/unconnected. No synthetic lead records or fabricated performance are used.

| Direction | Hierarchy and interaction | Useful when |
| --- | --- | --- |
| **Signal** | Overview-first command view, restrained dark navigation rail, four-part campaign story, status/next-review summaries; detail through tabs. | The client wants a quick operating check and the next decision. |
| **Flow** | Journey-first editorial view; click or use arrow keys through six stages, inspect what the stage proves and what moves it forward. | The client wants to understand how marketing becomes a verified outcome. |
| **Workspace** | Campaign-first selection; coordinated marketing, AI intake and firm/Litify work lanes, with results and next-action tabs. | The client regularly compares campaigns and the work behind their results. |

All use the existing ape logo, dark LFMA ink, light lilac/cyan canvas and restrained violet accents. Current reference https://lawfirmmarketingapes.com/ was read before finalizing the shared family. Its historical marketing proof was not copied into the Phillips preview. No animation, external fonts, chatbot or decorative AI effects. The common Needs your team summary appears before detailed panels. Missing feedback is a coverage gap, not zero outcomes.

Campaign selection changes planning amount, channel/destination/preparation, all marketing/intake/firm scope labels, stage context and next action. Source observation remains Oct 4, 2026 18:17 UTC, distinct from current/live performance. Evidence disclosures describe verification requirements and show no private links. Real assignments and approval authority remain unconfigured; these are visual examples, not access-controlled hosted portals.

Build: `python3 tools/phillips-portal-prototype/build-directions.py`.

Browser QA: `node tools/phillips-portal-prototype/verify-directions.mjs`. Set PERSPECTIVE_PLAYWRIGHT_MODULE and PERSPECTIVE_CHROMIUM to installed Playwright core/Chromium paths when needed. Four tabs/stages use WAI-ARIA-style selected states, roving keyboard focus, Home/End and arrow navigation. QA checks all three scopes × three views × three viewports = **81** cases plus stage keyboard, tabs, disclosures and scoped budgets. Widths 1440, 768, 375; no clipping, render errors or outbound requests. Ten source-level privacy, shared-fact and interaction checks accompany the browser checks.

Creative hypothesis: Signal helps scanning; Flow helps understanding; Workspace helps campaign comparison. No effectiveness or conversion claim is made. Kyle chooses the look/feel before deeper runtime work. No publication, source-permission changes, onboarding, campaign activation or protected portal edits.
