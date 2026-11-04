# Phillips rideshare pages with an under-form disclaimer

Namespace: `/review/phillips-rideshare-20261104/disclaimer-under-form-review/`.

The three examples have clean campaign presentation: no preview banners, review captions, or preview wording in visible page text. The exact nationwide disclaimer remains under the form in the existing 11px Times New Roman treatment. This change adds no claim of firm approval or compliance; the separate operator guide retains the placement context.

Functions remain deliberately unavailable:
- Phone controls are non-dialable/disabled and say calling is unavailable here.
- Callback submission buttons are visibly disabled and the form says it is not connected, with no request sent.
- A dedicated local interaction script preserves the chat questions and expandable Sofia form, but has no receipt-generation, intake, phone or provider action. Native/programmatic form submissions are prevented; CSP still blocks outbound connections and form actions.
- Quiz outcomes are an on-page screening result, never a queued lead, accepted matter or sent request.

The original top-placement previews, earlier above-fold alternative, routing, assistant, ads, and other campaigns remain unchanged.

Build: `python3 tools/build-phillips-under-form-review.py`.
Validation: under-form mode passes 164 browser checks at 320/390/768/1280, including no preview wording, exact disclaimer/size/position, clean layout, disabled controls, prevented submissions, no fake receipt/outbox and no outbound intake. Existing placement modes also run in CI. Phone and desktop screenshots inspected.
