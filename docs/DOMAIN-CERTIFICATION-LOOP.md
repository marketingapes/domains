# Domain Certification Loop

Updated: 2026-09-21

## Purpose

Certify each Marketing Apes domain one at a time with reproducible evidence. The goal is not "looks good." A domain moves forward only when its public experience, source, measurement, capture, compliance, and deployment state are explicitly tested.

Canonical portfolio truth remains `portfolio.json` + each `<tenant>/domain.json`. Campaign state stays outside domain manifests.

## Team roles

### Claude CoWork — user-journey QA
Use the live site like a prospect/customer on desktop and mobile.

Test:
- homepage first impression and message clarity
- navigation, menus, CTAs, forms, validation, success/error states
- all obvious public journeys
- phone/email links
- mobile widths and touch behavior
- broken images, visual overflow, inaccessible controls, confusing copy
- privacy/terms/disclosures near capture
- cross-domain handoffs and UTM preservation
- obvious 404/dead ends
- share preview behavior when practical

Do not edit production directly. Produce a defect list with exact URL, reproduction steps, expected behavior, actual behavior, severity, screenshot/reference when useful.

### Claude Code — source repair
Read the defect list, `DOMAINS.md`, the domain manifest, and the current source before editing.

Rules:
- preserve the correct tenant identity and tracking profile
- fix the smallest root cause
- add or update tests for regressions
- do not invent legal claims, performance claims, IDs, pixels, buyers, or approvals
- do not put secrets or raw webhook URLs into source
- work on a branch/PR
- run repository validation before requesting merge

### Claude Terminal — deterministic evidence
Run the repository verifier, tests, and domain audit before and after changes.

Minimum commands:

```sh
python3 tools/verify-foundation.py
node --test tests/*.test.mjs
node tools/domain-audit.mjs <TENANT>
node tools/domain-audit.mjs <TENANT> --live
```

Save the output in the handoff. Terminal is the evidence lane; it does not declare success based on visual judgment.

## Certification gates

A public production domain is `LIVE` only when applicable gates pass.

1. **Identity / hosting**
   - intended canonical hostname matches the live brand
   - root resolves over HTTPS
   - www behavior is intentional
   - Render/SiteGround origin is the intended current origin
   - deployed commit/version is known

2. **Web / UX**
   - root exists
   - mobile and desktop usable
   - one meaningful H1 on primary marketing pages
   - primary CTA works
   - internal public links do not dead-end
   - images/assets load
   - forms have useful validation and recovery
   - post-submit state tells the user what happens next

3. **SEO / machine readability**
   - unique title and description
   - absolute canonical
   - `index,follow` on public production pages unless intentionally excluded
   - robots.txt and sitemap.xml resolve
   - sitemap URLs resolve
   - Open Graph/social metadata on important entry pages
   - accurate structured data only
   - llms.txt optional; never substitute it for real crawlability

4. **Tracking**
   - correct web GTM container for the tenant
   - correct GA4 destination when used
   - no placeholder tracking IDs
   - no cross-tenant container
   - production analytics are not polluted by staging
   - at least `page_view` and one meaningful `ee_*` / conversion event can be observed before paid traffic

5. **Capture / data**
   - form/voice/chat path reaches the intended lane
   - one path per event; no accidental Zapier+Make duplicate lane
   - durable identity is preserved where applicable: `lead_id`, `claim_id`, `domain_id`, `campaign_id`
   - attribution IDs/UTMs survive
   - raw webhook URLs/secrets are not committed to public source
   - successful synthetic test is isolated from live outreach

6. **Compliance**
   - correct entity identity
   - no unsupported guarantees
   - law-firm / referral / marketing-service role is clear
   - consent/disclosure is appropriate for the actual contact method
   - TrustedForm/evidence preserved when required
   - unresolved buyer/counsel requirement = `NEEDS VERIFICATION` or `BLOCK`

7. **Release**
   - repository validation passes
   - PR is reviewed by the deterministic gates
   - exact merged commit is deployed
   - live smoke test is rerun after deploy
   - evidence and unknowns are recorded

## Allowed states

- `DRAFT`
- `BUILT-NOT-LIVE`
- `QA_PASSED_BUILT_NOT_LIVE`
- `NEEDS VERIFICATION`
- `APPROVAL REQUIRED`
- `LIVE`
- `PAUSED`
- `RETIRED`
- `BLOCK`

Never use "done" without the evidence bundle.

## Evidence bundle

Every domain handoff ends with:

```
TENANT:
DOMAIN:
SOURCE:
DEPLOYED VERSION:
STATE:

CURRENT STATE:
CHANGED:
TESTS RUN:
LIVE URLS TESTED:
TRACKING EVIDENCE:
CAPTURE EVIDENCE:
COMPLIANCE STATUS:
BROKEN / UNKNOWN:
NEXT ACTION:
BLOCKER:
```

For every fix record the file/commit/PR and the exact live URL retested.

## Domain queue

Work one at a time unless a shared-system defect affects multiple domains.

1. LFMA — lawfirmmarketingapes.com
2. NIL — nearestinjurylawyers.com
3. DIHAC — doihaveaclaim.ai
4. BTL — besttortlawyers.com
5. KG — kylegosselin.com
6. MA — marketingapes.com
7. SLIQ — smartlifeinsurancequote.com
8. FPLB — forpetslikeblue.com
9. DDM — discountdealme.com
10. CGG — crazygolfgame.com
11. PX — pillowexchange.com
12. RI — researchinvestigation.com
13. TOSS — tosssports.com
14. TNT — tonedntasty.com

Priority can change for revenue or a hard blocker, but the active domain must still finish its evidence bundle before the next one becomes active.

## Human gates

Do not silently perform:
- DNS cutover
- budget/spend activation
- outbound messages to real people
- live buyer delivery
- destructive production changes

Production website cleanup explicitly requested by Kyle still uses PR + validation + exact-deploy verification. DNS and external-account provisioning remain separate gates.

## Claude kickoff prompt

Use this at the start of every domain:

> You are the QA/build crew for Marketing Apes' Evolution Engine. Certify **<TENANT> / <DOMAIN>** only. Read `DOMAINS.md`, `<folder>/domain.json`, and `docs/DOMAIN-CERTIFICATION-LOOP.md` before acting. Do not broaden scope to another domain. First establish current live/source/deploy truth. Run the deterministic audit. Then test the real customer journey. Fix the smallest verified defects on a branch with tests. Never invent tracking IDs, buyers, legal approvals, or results. Never store secrets/raw webhook URLs in source. After each change rerun the audit and repository tests. End with the evidence bundle exactly as defined in the runbook. A domain is not LIVE merely because it returns 200.
