# Shareable Phillips rideshare examples

Separate noindex design-review namespace: `/review/phillips-rideshare-20261104/`. It preserves the original campaign pages and Claude's separate Drive version.

The three examples use the actual reference CSS and visual structures from `/phillips-law/az-accident/`, `/claim-check/` and `/talk-to-sofia/`, adapted to the existing approved rideshare screens:

- `form.html`: photo hero, overlaid firm header, focused call/callback card, tap-choice questions.
- `quiz.html`: fixed-height chat transcript, answer chips, Back, answer summary, progressive contact step.
- `sofia.html`: dark portrait-led stage, explicit AI marker, disabled call action, expandable callback form and proposed firm handoff.

Existing `(602) 693-1461` is displayed as non-dialable preview text. Rideshare setup is explicitly pending. No Vapi binding, assistant, transfer, phone, advertising or intake service was changed.

All three say preview only, request test data only, carry noindex and CSP `connect-src 'none'; form-action 'none'; frame-src 'none'`. The simulation script has no fetch/beacon/provider/call action. Form input creates a synthetic receipt in browser memory only. No retainer workflow is connected. Michael's exact nationwide disclaimer remains the first body element, at 12-point Times New Roman and visible without scrolling.

`index.html` and `ads.html` provide context/creative-review links. Only the three examples use `experiences.css` and `preview.js`; their source builder is `python3 tools/build-phillips-rideshare-review.py`. Page assets are local to this review namespace. Original reference CSS was copied, not modified.

Validation: `tests/phillips-rideshare-review.browser.cjs` runs in CI and verifies five pages at 320/390/768/1280px, no sideways scroll, loaded images, disclaimer text/font/position, no telephone links, blocked outbound intake, chat questions and answer summary, form receipts, and expandable Sofia callback. Local result: 252 checks passed. Full release tests are run after commit.
