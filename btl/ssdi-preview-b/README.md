# Jeffrey Glassman SSDI preview — Version B 2.0.0

Separate static pages: landing/sample form at `/ssdi-preview-b/`, dedicated `/form/`, `/quiz/`, `/talk-to-sofia/`, `/ads/`, and `/perspective/`. Each door loads directly and can be reached from every page's navigation. The three Facebook-style ads link to the actual separate door pages. Shared `preview.css`, `preview.js`, local firm logo and local Lora font are required. This is a multi-page bundle, not a standalone HTML file.

## Synthetic-only behavior

No editable contact/medical text, real calls, audio, provider actions, form submissions or trackers. Applications are the marked demo default; appeals and three fixed fictional scenarios are available. Every result requires human review and never decides benefits, eligibility, representation or firm acceptance. Separate sample phone/SMS/email controls start unchecked and authorize no real contact.

Each sample journey produces a synthetic receipt. To carry it to the separate Perspective page, this revision uses only sessionStorage key `ssdi-preview-b:v2:synthetic-only`. Stored values are allowlisted source/scope/scenario enums, a bounded sequence, and three checkbox booleans; no arbitrary answers, contact, medical text, credentials or real records are stored. At most50 scenarios remain in the current tab, reload preserves them, and Reset clears this key only. A separate browser session starts with three labeled preloaded samples. Browsers may clone sessionStorage when duplicating a tab; this state is fictional only. If storage is unavailable, the receipt explicitly says it remains on its current page.

Perspective validates incoming synthetic state and renders only fixed sample labels. Restricted view omits scenario details; the sample-owner toggle is an explicitly fictional view, not authentication. Activity dates are simulated human UTC dates. CSP disallows connections, frames, media and form actions; scripts, styles, logo and font are local only.

## Brand and scope

Kyle requested branding to Jeffrey Glassman's official website from his email signature. The supplied `https://www.jeffreyglassman.com/` redirects to `https://www.jeffreysglassman.com/`. The official SVG logo is stored locally; navy/amber palette, Arial body and Lora headings follow the inspected public site. `BRAND-SOURCE.md` records sources; Lora's OFL is included. No site trackers, real phone/email actions, case results, awards, testimonials, slogans or benefits guarantees were copied. Every page says branded concept/preview; firm approval is unconfirmed.

Firm-specific criteria, scope, states, receiving team, transfer IDs, Vapi/TrustedForm/Perspective backend and live campaign activation remain unwired or unconfirmed. No numbers or IDs are borrowed from Paraquat or Phillips. Agency service fee is $2,500 with media separately agreed, explicitly not a claimant legal fee.

This additive revision touches only `btl/ssdi-preview-b/`. Muse A, existing BTL pages, Phillips602, executor and issues70/31 are untouched. Sources remain the canonical Muse brief, synthetic-only override and newer Kyle instructions permitting separate branded preview pages.

Local test: `node /workspace/ssdi-preview/verify-pages.cjs`. Tests/evidence and complete site ZIP are under `/workspace/ssdi-preview/pages-v2/`. To serve a downloaded bundle, extract it and run `python3 -m http.server 8000` from its parent, then open `http://localhost:8000/ssdi-preview-b/`.
