# Phillips rideshare clean URL namespace

New static routes, following existing folder-index conventions:
- `/phillips/ri/` — primary callback page
- `/phillips/ri/claim-check/` — private conversational check
- `/phillips/ri/talk-to-sofia/` — Sofia page with expandable callback form

Collision check: no tracked files existed at `btl/phillips/ri`; all three proposed public routes returned HTTP 404 before creation. Existing review URLs and all unrelated pages are preserved.

Build: `python3 tools/build-phillips-ri.py` copies the current clean under-form presentation into this isolated namespace, makes assets/navigation use `/phillips/ri/`, and adds self-canonical URLs. Assets are local to this namespace; no dependency on the review URL is needed at runtime.

Noindex, exact disclaimer wording and the requested small under-form review placement are retained. No approval/compliance claim is added. Calling remains visibly unavailable and callback submit buttons remain disabled with a short not-connected note. Chat questions work locally, but do not create a lead, fake receipt or outbox. No ads, Vapi assistant/binding/transfer, DNS, Render configuration or intake service changed.

Validation: clean-route browser mode verifies three pages at 320/390/768/1280, canonical URLs, loaded assets, layout, exact disclaimer/position/type, absence of preview wording, disabled actions, prevented submissions and no outbound intake. It runs in CI alongside all existing review modes.
