# Phillips 5-lane — CREATIVE MATRIX

Generated 2026-09-29 by `build_creatives.py` (HTML/CSS → headless Chrome) and `build_copy.py`. Source HTML for every PNG is in `<lane>/src/`. Re-render: `python3 build_creatives.py [lane]`.

**Nothing here is uploaded to any ad platform.** All creative and copy is **pending-attorney-review**.

## Global rules applied

| Rule | How it's applied |
|---|---|
| Brand identity | BTL lanes use only BTL tokens (paper `#F6F1E7`, ink `#111827`, gold `#C6A15B`, Iowan Old Style serif) + seal from `btl/brand.json`. NIL lanes use only NIL tokens (navy `#08122b`/`#0f1e3c`, teal `#2fbfa3`, white heavy sans) + a vector redraw of the `nil/assets/pin.png` pin. No file mixes brands. |
| Firm name | **"Phillips Law Group" appears on no creative or copy.** Naming the firm in ads is an attorney-review gate; brand shown is BTL or NIL only. Copy says "an independent law firm". |
| Disclaimer band | Every PNG reserves a band = 8% of height (86px @1080, 108px @1350, 50px @628) with `Attorney advertising. Not a law firm. No legal advice. Results not guaranteed.` — **status: pending-attorney-review**. |
| AI disclosure | Any creative that names Sofia labels her "AI intake guide, not a lawyer" (or "our AI intake guide"). |
| Imagery | Typographic + gradients/soft light only. No photos, no faces, no people, no vehicles, no night-car imagery. |
| Survivor lanes (2–5) | Calm, dignified, open space; no graphic words on images; no second-person assertion that the viewer was harmed (Meta personal-attributes); "You don't need to describe what happened" on the Sofia-card concept. Uber/Lyft are **not** named (trademark review needed). |
| MVA lane (1) | Urgency + clarity, "In any of the 50 states", "about 2 minutes"; no fear imagery, no dollar amounts, no guarantees. "50" is a state count, not money. |
| **Rideshare experiment** | Lanes 4 (`btl-rideshare-sex-abuse`) and 5 (`nil-rideshare-sex-abuse`) use the **same 4 concepts, identical headlines/body/CTA copy**, rendered in each brand's identity. Only brand name/visual identity differ — targeting/audience is the test variable. Keep the pairs matched (c1↔c1 …) when launching. |

## Status legend

- **launch-ready (pending attorney review)** — typographic render is final-quality for Meta/GDN; ships once counsel signs off on copy + disclaimer.
- **needs-designer-pass** — usable for a test, but would benefit from a designer/photography upgrade before scaling.


## Lane 1 — `nil-mva-pi` (NIL)

Copy: [`nil-mva-pi/copy.md`](nil-mva-pi/copy.md)

| File | Size | Concept (layout) | On-image headline | Paired Meta headline | Status | Compliance notes |
|---|---|---|---|---|---|---|
| `nil-mva-pi_c1_meta_1080x1080.png` | 1080×1080 | c1 (center) | Hurt in a crash? Check your options in 2 minutes. | Hurt in a crash? See your options | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-mva-pi_c1_meta_1080x1350.png` | 1080×1350 | c1 (center) | Hurt in a crash? Check your options in 2 minutes. | Hurt in a crash? See your options | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-mva-pi_c2_meta_1080x1080.png` | 1080×1080 | c2 (left) | Car accident? Know your next step. | Car accident? Know your next step | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-mva-pi_c2_meta_1080x1350.png` | 1080×1350 | c2 (left) | Car accident? Know your next step. | Car accident? Know your next step | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-mva-pi_c3_meta_1080x1080.png` | 1080×1080 | c3 (inverse) | Don't wait to learn your options. | Check your options in 2 minutes | needs-designer-pass | band ✓; needs-designer-pass — "50" numeral is strong but the light-panel inverse is the least on-brand NIL layout; consider a US-map line graphic. |
| `nil-mva-pi_c3_meta_1080x1350.png` | 1080×1350 | c3 (inverse) | Don't wait to learn your options. | Check your options in 2 minutes | needs-designer-pass | band ✓; needs-designer-pass — "50" numeral is strong but the light-panel inverse is the least on-brand NIL layout; consider a US-map line graphic. |
| `nil-mva-pi_c4_meta_1080x1080.png` | 1080×1080 | c4 (card) | Start with Sofia. It takes about 2 minutes. | Hurt in a crash? See your options | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-mva-pi_c4_meta_1080x1350.png` | 1080×1350 | c4 (card) | Start with Sofia. It takes about 2 minutes. | Hurt in a crash? See your options | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-mva-pi_c1_google-display_1200x628.png` | 1200×628 | c1 landscape + 3 reassurance bullets | Hurt in a crash? Check your options in 2 minutes. | RSA set in copy.md | launch-ready (pending attorney review) | band ✓ (50px, 15px type — smallest legible size; verify on GDN preview) |

## Lane 2 — `btl-sex-abuse-la-county` (BTL)

Copy: [`btl-sex-abuse-la-county/copy.md`](btl-sex-abuse-la-county/copy.md)

| File | Size | Concept (layout) | On-image headline | Paired Meta headline | Status | Compliance notes |
|---|---|---|---|---|---|---|
| `btl-sex-abuse-la-county_c1_meta_1080x1080.png` | 1080×1080 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-la-county_c1_meta_1080x1350.png` | 1080×1350 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-la-county_c2_meta_1080x1080.png` | 1080×1080 | c2 (left) | Laws in California changed. | Laws in California changed | launch-ready (pending attorney review) | band ✓; "Laws in California changed" is a legal claim (AB 218 / AB 452) — attorney must confirm wording before launch. |
| `btl-sex-abuse-la-county_c2_meta_1080x1350.png` | 1080×1350 | c2 (left) | Laws in California changed. | Laws in California changed | launch-ready (pending attorney review) | band ✓; "Laws in California changed" is a legal claim (AB 218 / AB 452) — attorney must confirm wording before launch. |
| `btl-sex-abuse-la-county_c3_meta_1080x1080.png` | 1080×1080 | c3 (inverse) | Your voice matters — even years later. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-la-county_c3_meta_1080x1350.png` | 1080×1350 | c3 (inverse) | Your voice matters — even years later. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-la-county_c4_meta_1080x1080.png` | 1080×1080 | c4 (card) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-la-county_c4_meta_1080x1350.png` | 1080×1350 | c4 (card) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-la-county_c1_google-display_1200x628.png` | 1200×628 | c1 landscape + 3 reassurance bullets | You deserve to be heard. | RSA set in copy.md | launch-ready (pending attorney review) | band ✓ (50px, 15px type — smallest legible size; verify on GDN preview) |

## Lane 3 — `btl-sex-abuse-ca-womens-prisons` (BTL)

Copy: [`btl-sex-abuse-ca-womens-prisons/copy.md`](btl-sex-abuse-ca-womens-prisons/copy.md)

| File | Size | Concept (layout) | On-image headline | Paired Meta headline | Status | Compliance notes |
|---|---|---|---|---|---|---|
| `btl-sex-abuse-ca-womens-prisons_c1_meta_1080x1080.png` | 1080×1080 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-ca-womens-prisons_c1_meta_1080x1350.png` | 1080×1350 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-ca-womens-prisons_c2_meta_1080x1080.png` | 1080×1080 | c2 (left) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-ca-womens-prisons_c2_meta_1080x1350.png` | 1080×1350 | c2 (left) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-ca-womens-prisons_c3_meta_1080x1080.png` | 1080×1080 | c3 (inverse) | Your voice matters — even years later. | Your voice matters, even years later | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-ca-womens-prisons_c3_meta_1080x1350.png` | 1080×1350 | c3 (inverse) | Your voice matters — even years later. | Your voice matters, even years later | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-sex-abuse-ca-womens-prisons_c4_meta_1080x1080.png` | 1080×1080 | c4 (card) | Misconduct by staff is never part of a sentence. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; Pointed line; confirm with counsel it reads as advocacy not accusation. Revival-window timing (AB 2777) unconfirmed — copy avoids any deadline claim. |
| `btl-sex-abuse-ca-womens-prisons_c4_meta_1080x1350.png` | 1080×1350 | c4 (card) | Misconduct by staff is never part of a sentence. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; Pointed line; confirm with counsel it reads as advocacy not accusation. Revival-window timing (AB 2777) unconfirmed — copy avoids any deadline claim. |
| `btl-sex-abuse-ca-womens-prisons_c1_google-display_1200x628.png` | 1200×628 | c1 landscape + 3 reassurance bullets | You deserve to be heard. | RSA set in copy.md | launch-ready (pending attorney review) | band ✓ (50px, 15px type — smallest legible size; verify on GDN preview) |

## Lane 4 — `btl-rideshare-sex-abuse` (BTL)

Copy: [`btl-rideshare-sex-abuse/copy.md`](btl-rideshare-sex-abuse/copy.md)

| File | Size | Concept (layout) | On-image headline | Paired Meta headline | Status | Compliance notes |
|---|---|---|---|---|---|---|
| `btl-rideshare-sex-abuse_c1_meta_1080x1080.png` | 1080×1080 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c1_meta_1080x1350.png` | 1080×1350 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c2_meta_1080x1080.png` | 1080×1080 | c2 (left) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c2_meta_1080x1350.png` | 1080×1350 | c2 (left) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c3_meta_1080x1080.png` | 1080×1080 | c3 (inverse) | Your voice matters — even years later. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c3_meta_1080x1350.png` | 1080×1350 | c3 (inverse) | Your voice matters — even years later. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c4_meta_1080x1080.png` | 1080×1080 | c4 (card) | Riders deserve to feel safe. And to be heard. | Riders deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c4_meta_1080x1350.png` | 1080×1350 | c4 (card) | Riders deserve to feel safe. And to be heard. | Riders deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `btl-rideshare-sex-abuse_c1_google-display_1200x628.png` | 1200×628 | c1 landscape + 3 reassurance bullets | You deserve to be heard. | RSA set in copy.md | launch-ready (pending attorney review) | band ✓ (50px, 15px type — smallest legible size; verify on GDN preview) |

## Lane 5 — `nil-rideshare-sex-abuse` (NIL)

Copy: [`nil-rideshare-sex-abuse/copy.md`](nil-rideshare-sex-abuse/copy.md)

| File | Size | Concept (layout) | On-image headline | Paired Meta headline | Status | Compliance notes |
|---|---|---|---|---|---|---|
| `nil-rideshare-sex-abuse_c1_meta_1080x1080.png` | 1080×1080 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c1_meta_1080x1350.png` | 1080×1350 | c1 (center) | You deserve to be heard. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c2_meta_1080x1080.png` | 1080×1080 | c2 (left) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c2_meta_1080x1350.png` | 1080×1350 | c2 (left) | Confidential. At your pace. | Confidential. At your pace. | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c3_meta_1080x1080.png` | 1080×1080 | c3 (inverse) | Your voice matters — even years later. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c3_meta_1080x1350.png` | 1080×1350 | c3 (inverse) | Your voice matters — even years later. | You deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c4_meta_1080x1080.png` | 1080×1080 | c4 (card) | Riders deserve to feel safe. And to be heard. | Riders deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c4_meta_1080x1350.png` | 1080×1350 | c4 (card) | Riders deserve to feel safe. And to be heard. | Riders deserve to be heard | launch-ready (pending attorney review) | band ✓; no firm name; AI-disclosed where Sofia appears |
| `nil-rideshare-sex-abuse_c1_google-display_1200x628.png` | 1200×628 | c1 landscape + 3 reassurance bullets | You deserve to be heard. | RSA set in copy.md | launch-ready (pending attorney review) | band ✓ (50px, 15px type — smallest legible size; verify on GDN preview) |

## Open issues / gates

1. **Attorney review** of every line of copy and the disclaimer band (all marked pending-attorney-review). State-specific advertising rules (e.g. CA Rules of Prof. Conduct 7.1–7.3 for BTL CA lanes; state bar rules for nationwide MVA) not yet checked.
2. **Firm name** intentionally absent; if counsel requires the responsible attorney/firm on the ad, add it to the band and re-render (single constant `DISCLAIMER` in `build_creatives.py`).
3. **Meta special ad category / sensitive content**: survivor ads may still be limited by Meta review even with neutral wording; have a fallback set without the word "sexual" in primary text.
4. **Uber/Lyft** not named anywhere — naming them needs trademark + counsel review.
5. **Photography**: none used (no licensed, relevant, non-distressing photo exists in the repo for these lanes). If a designer pass adds imagery for the survivor lanes, keep it to calm environmental/abstract (window light, open sky) — no people in distress, no car interiors.
6. Phone numbers are not on any creative (both brands' phones are placeholders per BUILD-SPEC).
7. **4:5 renders** reuse the 1:1 composition with extra open space (by design for the survivor lanes — calm, uncluttered). A designer may want to re-balance the 4:5 MVA versions to fill the frame more.
8. **Render pipeline:** `build_creatives.py` writes `src/*.html`, then `render_cdp.mjs` screenshots them in one headless Chrome over CDP (per-file `--screenshot` launches hung under load on this machine). Fonts are system fonts (Iowan Old Style, -apple-system); re-rendering on a non-Mac will change typography.
9. Self-checks run: every `src/*.html` contains the disclaimer; no BTL file contains "Nearest"; no NIL file contains "Best Tort" or BTL gold; no file contains "Phillips".
