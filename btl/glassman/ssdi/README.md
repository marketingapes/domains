# Glassman SSDI pages (GLASSMAN-SSDI-002) — besttortlawyers.com/glassman/ssdi/

The BTL SSDI A pages (`/ssdi/`, Glassman-style layout) re-branded for Jeffrey Glassman Injury Lawyers. Same layout, copy, quiz and intake; noindex,nofollow.

| Page | URL | page_id |
|---|---|---|
| Request a callback | /glassman/ssdi/ | glassman-ssdi-main-form |
| Talk to Sofia | /glassman/ssdi/talk-to-sofia/ | glassman-ssdi-call-first |
| Eligibility check | /glassman/ssdi/quiz/ | glassman-ssdi-quiz |

- Sofia line: (669) 209-9040, Vapi phone d9e1cabe "DEMO Sofia — Glassman SSDI" (assistant 32e90752).
- Leads: campaign-kit intake (Make 6777650), tenant `glassman`, campaign `GLASSMAN-SSDI-002`. `?test=1` sends a synthetic lead.
- Brand: logo, door images and colors from `/glassman-ssdi/` (jeffreysglassman.com palette). Firm phone (617) 777-7777, privacy/disclaimer links go to jeffreysglassman.com.
- Criteria (Oct 28): age 48–64, all states except ND, SD, AK and HI, intake Mon–Fri 8 AM–8 PM Eastern, from Dan Verrilli's Oct 27 list. The other quiz checks (out of work, doctor, benefits, lawyer) are unchanged until the rest of Dan's list is added. The Glassman Sofia on (669) has not been updated.
- Ads (Oct 29): `/assets/glassman-ssdi/ads/` has the BTL SSDI door images (`/assets/ssdi/ads/`) with the Glassman logo in place of the Best Tort Lawyers label. The form image's state line reads "ND, SD, AK or HI" instead of "CA or CO". The quiz image still says ages 54–63, the BTL range; Glassman takes 48–64. `brand_ads.py` rebuilds them.
- Built 2026-10-28 from the dark pages, which were at `/ssdi/` then and are now at `/ssdi/b/`. `build_from_ssdi.py` reads `/ssdi/`, so it no longer reproduces these pages as is; edit this folder directly.
