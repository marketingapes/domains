# Phillips go-live: 4 torts — STAGED, DO NOT MERGE without Kyle's explicit yes

Kyle-approved go-live set (2026-09-29): **mva-pi** (NIL), **sex-abuse-la-county** (BTL),
**sex-abuse-ca-womens-prisons** (BTL), **rideshare-sex-abuse** (NIL).

This branch cherry-picks ONLY those 4 torts' pages (12 files: /tort/, /quiz/, /talk-to-sofia/
each) from the overnight build. The other 9 torts live only on PRs #141/#142 — Kyle did
NOT approve them; do not pull them in here.

- Pages are inert: placeholder 888-888-8888 phones, no live bindings.
- Ad specs: `~/workspace/legal-lane/phillips-overnight-build/out/<slug>/go-live-ad-spec.md`
  ($500/day/tort, PAUSED, files only — zero spend).
- Vapi: 13 drafts exist; the 4 go-live drafts are mapped in VAPI-WIRING-4TORT.md.
  Binding numbers is Kyle's login step — seats do not rebind.
- Buyer criteria: ASSUMED for all 4 (only Paraquat is verified). Kyle confirms with Phillips.
- Gates before anything goes live: merge (Kyle) → Vapi approvals + number binding (Kyle) →
  Phillips criteria (Kyle's pitch) → attorney review of disclaimers → Kyle says "run".
