# Phillips disclaimer placement alternative — not approved

Purpose: show Michael a brand-first alternative, while preserving the current placement required by his November 3 instruction. This is a design review, not a determination of compliance or firm approval.

New namespace: `/review/phillips-rideshare-20261104/disclaimer-review/` with guide, callback, Claim Check and Sofia previews. Every alternative is marked “Alternative placement · not approved” and links directly to the unchanged top-placement preview.

Alternative order: Phillips brand header, approval-review context, exact nationwide disclaimer in an inset white panel, preview banner, then the campaign experience. The legal text is unchanged, at 12pt Times New Roman, fully visible without scrolling even at a 320px-wide / 568px-high viewport. It is intentionally not the first body element. Michael's actual instruction still requires very-top placement; this variant must receive his written approval before replacing that placement.

No forms, voice routes, phone binding, advertising or intake service activated. All pages retain noindex and the existing preview CSP. Assets and interaction scripts are shared with the current disabled previews; relative links resolve within the review tree.

Build: `python3 tools/build-phillips-disclaimer-review.py`.
Validation: `PLG_DISCLAIMER_ALTERNATIVE=1 node tests/phillips-rideshare-review.browser.cjs` passes 164 checks; the standard mode passes 252 checks. Both run in CI. Assertions cover exact wording, 12pt Roman type, below-header placement, complete above-fold visibility, approval labeling, responsive layout, loaded assets, blocked intake, disabled voice and browser-only synthetic receipts. Original top-placement assertions remain active in standard mode.
