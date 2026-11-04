# Smaller disclaimer beneath the form — unapproved review only

New isolated namespace: `/review/phillips-rideshare-20261104/disclaimer-under-form-review/`.

The exact nationwide disclaimer is retained, proposed at 11px Times New Roman beneath the callback form. Claim Check shows it under the contact form after the seven screens. Sofia shows it under the expandable callback form. Each page clearly identifies the alternative as unapproved and differing from Michael's written very-top / 12-point requirements. The review guide explains the difference and how to reveal the relevant forms.

This does not assert compliance or firm approval. Original very-top / 12pt previews and the earlier above-fold alternative are preserved unchanged. No intake, phone routing, assistant, ad or retainer workflow is enabled by these pages.

Build: `python3 tools/build-phillips-under-form-review.py`.
Validation: `PLG_DISCLAIMER_UNDER_FORM=1 node tests/phillips-rideshare-review.browser.cjs` passes 164 checks at 320/390/768/1280, including exact wording, computed 11px Roman type, below-form position, explicit unapproved labeling, mobile layout and browser-only synthetic receipts. The original mode passes 252 checks; the earlier below-header mode passes 164. All three modes run in CI. Screenshots of the complete legal block and surrounding form were inspected on phone and desktop.
