# Campaign sprint offer — review candidate, not published

Base: ac88fa9ded31cafa93f9c6eb125130027fa03c9b (GitHub main independently read Oct27).
Branch: codex/mass-tort-sprint-local-20261027.
Publication candidate: https://marketingapes.com/campaign-sprint/
Local preview: http://127.0.0.1:8768/campaign-sprint/ while its local server runs.

## Offer

One tort. Two weeks. A focused campaign sprint.
One $7,500 invoice: $2,500 build/management and $5,000 media allocation.
The two-week media window starts after scope, firm approvals and technical readiness.
No guaranteed volume, cost per case, legal eligibility or signed-case outcome.
No payment collected, provider activated or email sent from the website.
CTA prepares an email to kyleg@marketingapes.com for the visitor to send. This address
is verified against existing ma/index.html and ma/README.md, not a new inbox assumption.
The requested business information is firm name, tort, target states and intake contact.
No phone CTA; neither unresolved 669 number is used.

## Files and reuse

ma/campaign-sprint/index.html, sprint.css, sprint.js — isolated firm-facing offer.
ma/campaign-sprint/demo/ — five static pages (hub, ads and three paths), CSS, fixed
fictional interaction script, and existing BTL seal. No public existing page changed.
The form/quiz/Sofia layouts are exported by docs/campaign-sprint/build-fixtures.mjs
using campaign-kit/build.mjs's existing normalize/renderPages/renderCss exports.
It is a single demonstration adapter, not a general campaign generator or provider
orchestrator. Existing generator, BRIEF, configs and public campaign lanes are unchanged.
All kit scripts are removed from exported fixtures; only fixture.js is executable.
All inputs are readonly, selects disabled on initialization, free text removed and
consent replaced with an explanatory placeholder. Quiz choices are non-personal.
No claimant information can be typed into these demo inputs. The simulated handoff
changes local DOM only and offers a link to the synthetic reporting illustration.
Sofia is a five-turn scripted reveal, no voice provider, recording or transfer.
Perspective is a static fictional journey, not the authenticated operating portal.
No recording URLs, real records, performance metric or signed-case claims are included.

## Isolation

Offer and all fixtures deny connect-src, form-action and frames with CSP.
All fonts/assets/scripts are local; no Google Fonts exception. Fixtures contain no
intake endpoint or live kit capture scripts. No fetch, beacon, XHR, browser storage,
microphone, clipboard or dial links are in the executable demo script.
The only outward user contact is the clearly labeled mailto link on the offer.
CSP is not access control: these are deliberately nonsensitive demonstration files.

## Reproduce and verify

node docs/campaign-sprint/build-fixtures.mjs
node --test tests/campaign-sprint.test.mjs campaign-kit/test/*.test.mjs
python3 tools/verify-foundation.py

19/19 tests passed: nine offer tests plus ten existing kit tests.
Foundation: PASS, 17 frozen files unchanged, 14 canonical manifests conformant.
git diff --check: clean.
Browser: actual in-app Chromium local HTTP render at widths 320, 390 and 1440.
15 responsive page checks: no horizontal overflow or broken loaded images.
Verified form simulation, quiz three-step progress and back navigation, fixed fields,
quiz simulated completion, return to synthetic reporting, five-turn Sofia completion,
primary CTA anchor and FAQ expansion. Browser console: no error/warning entries in the initial review.
Revision 2 also verifies Enter/Space quiz progression, heading focus on forward/back
and result, focused simulation confirmation, and speaker-labeled atomic polite Sofia
announcements with preserved control focus. Screen-reader audio was not tested.
See accessibility-proof.json and revision-2.md.
Email href inspected; email client was not opened and no email was sent.
No live provider, lead, analytics, ad account or CRM integration was tested or claimed.

Evidence: tests.log, foundation.log, responsive-checks.json and screenshots in this folder.
Desktop/mobile hero and full-page screenshots are from final copy. Other walkthrough
screenshots document the tested interaction states. No real claimant data was used.

## Publication step — parent review first

1. Independently inspect exact local commit and source.patch. Approve only this isolated
   ma/campaign-sprint/ addition and its source/tests/evidence. Preserve other local work.
2. Confirm the current existing ma-site service maps marketingapes.com to domains/main,
   staticPublishPath ma. ma/README.md documents that binding; live Render metadata was
   not read in this task. The root render.yaml does not declare ma-site, so do not apply
   it as a substitute or create a new service/domain.
3. After approval, parent can publish the reviewed commit via the normal PR/release
   process. No push, PR, merge or deploy was performed here. Existing deployment filters
   must be checked before assuming an automatic deploy for ma/campaign-sprint/**.
4. Verify public offer, all three fixture paths and assets return correct bytes/MIME;
   recheck phone/desktop and mailto. Give the GMass owner the URL only after this passes.
   Publication is not ad/voice activation, invoice issue or outreach-send authority.
5. Rollback removes only ma/campaign-sprint/ from the published revision. No backend
   migration, data cleanup, routing change or campaign-state rollback is needed.

## Environment limitations and recovery

Shell git fetch failed DNS; GitHub read connector confirmed the same main SHA.
Initial loopback bind failed EPERM. A narrowly approved escalated local HTTP server
then succeeded, enabling actual browser testing. No production access was used.
Workspace dependency loader reports unsupported for this thread; the available browser
was used instead. Library upload was not required; screenshots and full patch are local
review artifacts. No other agent's browser tabs or GMass setup were touched.
