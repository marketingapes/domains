# BTL-SSDI-001 — SSDI campaign (Best Tort Lawyers)

Three pages for a Social Security Disability buyer whose firm is never named on the site.
**Wired but switched off:** leads post to the campaign-kit intake (Make 6777650, stored before the receipt), the
SSDI Sofia exists in Vapi with a warm transfer to Kyle's cell (standing in for the buyer's DID), and no ads run.
The full channel plan is in [CAMPAIGN.md](CAMPAIGN.md); the Sofia record is in [sofia/sofia-ssdi-config.md](sofia/sofia-ssdi-config.md).
Add `?test=1` to any page URL to send a synthetic lead (stored as `lead.test`, never emailed or dialed).

## Buyer terms (from the buyer, 2026-10-27)

- **Criteria:** age 54–63 · out of work at least a year · not represented by an attorney ·
  currently under a doctor's care · not receiving government disability payments.
- **Hours:** Monday–Friday, 9:30 AM–6:00 PM Eastern.
- **Geo:** all US except California and Colorado (ads: no India or Pakistan traffic).
- **Brand:** the firm's name must not appear on the website.

## Pages

| Path | What it is | Page tag |
|---|---|---|
| `index.html` | "Request a free consultation" callback form (name, phone, state, best time, click-to-agree). No screening questions; Sofia screens on the call | `btl-ssdi-main-form` |
| `quiz/index.html` + `quiz/quiz.js` | Eligibility check in the hero card, one question at a time with "why we ask"; contact step only after a "may qualify" result | `btl-ssdi-quiz` |
| `talk-to-sofia/index.html` | Sofia's number with a tap-to-call button, an example call, and a "Have Sofia call me" form that opens in place | `btl-ssdi-call-first` |

All three share `pages.css` + `pages.js`: the Glassman SSDI layout (`btl/glassman-ssdi/`) in Best Tort Lawyers' navy and gold, with no firm named. `talk-to-sofia-b/` still uses the older `look.css` + `talk.js`.

## Shared files

| File | Role |
|---|---|
| `criteria.js` | The only place the buyer's criteria, hours and excluded states live. Outcomes: `QUALIFIED`, `FIRM_REVIEW` (a "Not sure" Sofia confirms on the call), `NOT_A_FIT`. Routes: `sofia_transfer`, `sofia_confirm`, `hold`; callback leads are `sofia_screen`. |
| `qualifier.js` | Form steps and scoring for the older multi-step form (no longer used by `index.html`). |
| `intake.js` | Consent, payload (answers, route, `transfer_window`, UTMs and click IDs), delivery. Fires `ee:lead-saved` on the form after a save. dataLayer gets non-identifying events only. |
| `look.css` | Design for all three pages: dark animated hero, Sofia ring and voice wave, tap tiles, promise cards. Motion is off under `prefers-reduced-motion`. |
| `motion.js` | Scroll reveals. |
| `states.js` | Fills state selects. |
| `/assets/ssdi/hero-woman-phone-*.jpg` | AI-generated hero photo (Leonardo Lucid Realism, 2026-10-27), no logos or text. |
| `/assets/ssdi/ads/ssdi-{quiz,sofia,form}-1080x{1080,1920}.jpg` | Ad images per door, feed and Stories (Leonardo photos, text added 2026-10-28). |

## Before go-live

1. Buyer's DID → swap the destination of Vapi tool `transfer_to_intake`; posting specs → delivery mapping.
2. A phone number for the SSDI Sofia, then turn the call option back on. Never reuse (202) 932-9700,
   which reaches the Paraquat Sofia.
3. Callbacks must fall inside both the buyer's hours and the lead's local calling hours.
4. Buyer/counsel OK on the consent text, which names "a participating law firm" rather than the firm.
5. GTM: map `ee_lead_submit_success` to the Lead conversion before ads run.

Not yet updated to these terms: `perspective/` still describes the earlier SSDI-PILOT-001 reference build.
