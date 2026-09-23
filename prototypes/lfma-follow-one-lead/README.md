# LFMA: Follow one lead — implementation handoff

Status: DRAFT HANDOFF. No production release. This file is not a claim that a connected landing page has been deployed.

## Assignment

Prepare a synthetic B2B demonstration that makes acquisition, permission, intake, receiving-team receipt, retainer milestone and outcome review understandable. Keep LFMA's existing paper/ink/gold identity and existing production contracts. The prototype must not represent simulated states as actual business results.

The implementation package delivered to Kyle contains `demo/index.html`, a self-contained interactive prototype, and `evidence/demo-qa.json`. Import that exact file into this isolated prototype directory from the supplied package. Do not assume a chat sandbox URL is accessible from another agent. Ask Kyle for the attachment only when the actual package is unavailable.

Expected SHA-256 of the delivered HTML:
`68a8b2c2ab653d738bc2c2613da2e7d66725058f3681ec406e98422bf70b4c3d`

The HTML is not yet committed by this handoff. Do not replace existing root pages or imply a production release.

## Prototype behavior already exercised locally

Chromium tests at 1440x1100, 390x844 and 320x740: six-step clean path; no-answer path stops at step four without a completed intake or retainer; synthetic JSON receipt export; Enter-key reset; no horizontal page overflow; no JavaScript page errors; zero external HTTP requests. Desktop and 390px screenshots visually inspected. These are prototype tests, not live integration or conversion evidence.

## Non-negotiable boundaries

- Synthetic data only. No actual firm, claimant, account, private email, commercial criteria or payment data in this public repository.
- No external calls, analytics, forms, live assistant, money movement or conversion events in the demo.
- Preserve `noindex,nofollow` and the explicit synthetic-demo labels in preview.
- A failed transfer is not a delivered lead. A retainer is not proof of collected fees.
- This branch is for staging only. No production merge, root promotion, DNS edit, service creation or budget change is authorized.
- Existing production campaigns and intake remain with their current operator.
- Do not modify unrelated domains or revive suspended services.

## Follow-on implementation

After the exact prototype is imported and reviewed, connect an approved B2B campaign-request flow through the existing verified capture contract in a separately scoped change. Request acceptance requires a real server receipt. Never display a working voice assistant, successful payment, submitted request or live metrics when the backend is missing.

Return base/head SHAs, exact changed paths, actual test results, screenshot locations, remaining unknowns and rollback. Stop when the assignment passes. Review does not authorize release.
