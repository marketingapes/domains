# Can your agency do this? — conference demo (DEMO-20261006-1925)

Review-only route: `/demo/ad-to-intake/` (source `lfma/demo/ad-to-intake/`).
Pages-only work by Claude; dot coordinates API, voice/SMS readiness and QA.
No merge, deployment, provider configuration, live call, transfer or message is
authorized or performed by this change.

## Status: page-ready, integration-blocked

The page ships **unconnected**. `integration-config.mjs` exports the frozen
`UNCONNECTED` config and `transport = null`, and the CSP keeps
`connect-src 'none'`, `media-src 'none'`, `form-action 'none'`. In this mode no
live control can be enabled, nothing leaves the tab, and no live state
(starting / in call / processing / ready) can be displayed. A clearly labeled
**Simulation** receipt is available instead.

Contract in force (coordinator update, 2026-10-06): Vapi web calls cannot
transfer to PSTN; the live path is not approved; a phone-first flow needs a
participant lead phone and a separate, verified receiving phone. SMS
eligibility is unknown.

## Journey

1. **You** — name + work email, then “Start demo”. Validated in-page only.
   Starting is explicitly not consent to call, recording or texts.
2. **The ad** — owned, labeled sample ad for placeholder “Your Firm”, with:
   “Pretend you are your ideal potential client. Use the fictional case answers
   for this demo.”
3. **Their page** — matching synthetic prospect page and the fixed fictional case
   answers (no free-text case details).
4. **Sofia** — AI disclosure (“Sofia is an AI agent, not a person”), three
   separate unchecked consents (phone contact, recording, optional SMS),
   lead phone, live state pill, and an optional handoff to the participant’s own
   second phone: verify → confirm code → transfer, each state shown separately.
   Purpose/caller/recording copy comes only from the approved contract; until
   then it reads “pending the approved contract”.
5. **Receipt** — private, in-tab: recording, intake summary, transfer outcome,
   text follow-up state and “Perspective”, using only data returned for that
   session; missing/processing/failed is labeled as such.
   Close: “One man + AI. Interested in this for your firm? Talk to Kyle.” and
   “Reply READY” for consented SMS (display only; the page sends nothing).

The prior $2,500 pricing strip, campaign-inquiry pricing step and LA County
scoreboard are omitted from this conference view. The canonical pricing model in
`campaign-system/` is untouched.

## Files

- `index.html`, `demo.css` — page and styles (existing MA logo, type, lime palette,
  orbital hero, reduced-motion support preserved).
- `demo.mjs` — DOM wiring only.
- `adapter.mjs` — pure integration boundary + session controller (no network).
- `integration-config.mjs` — the single binding point; unconnected.
- Tests: `tests/lfma-ad-demo.test.mjs`, `tests/lfma-ad-demo.browser.cjs`,
  test-only fake `tests/fixtures/lfma-ad-demo-fake-transport.mjs`.

## Safety behaviour (enforced in `adapter.mjs`, covered by tests)

- Participant data lives only in a closure; never in URLs, history, storage,
  cookies or analytics. Start over clears inputs, DOM receipt and controller.
- Every identity, consent, lead-phone or fictional-answer change bumps a
  generation counter: the session is discarded and late responses are ignored.
- `start()` is idempotent while starting/active; repeated clicks create one session.
  Retry after failure creates a fresh session.
- “Starting” is set on request; `in_call`/`processing`/`ready` only from
  `getStatus`. No timers manufacture success; polling only reads status.
- Transfer requires phone voice path + in call + verified receiving phone that
  differs from the lead phone. `requested` is never shown as completed;
  completion only from status/receipt (`connected`).
- Recording playback renders only for a URL on the approved contract origin;
  anything else (e.g. a raw provider URL) is withheld and labeled.

## Binding a verified contract (for dot)

Replace both exports in `integration-config.mjs`:

    integrationConfig = { status: 'verified', contractVersion, voicePath: 'phone'|'browser',
      origin: 'https://<approved-origin>', disclosures: { callPurpose, callerIdentity, recordingUse },
      recordingOptional: false, pollMs }
    transport = { createSession, launchVoice, getStatus, startVerification,
                  confirmVerification, requestTransfer, getReceipt }

and narrow CSP `connect-src` (and `media-src` if playback is approved) to that one
origin. Proposed normalized shapes the controller expects — **proposals, to be
confirmed or corrected by the contract, not verified endpoints**:

- `createSession({participant, consent, fictionalCase, leadPhone, voicePath})` → `{sessionId}`
- `launchVoice(sessionId)` → `{state:'starting'}` or `{error}`
- `getStatus(sessionId)` → `{state: starting|in_call|processing|ready|failed, transfer?, error?}`
- `startVerification(sessionId, e164)` → `{verification:'challenge_issued'|'failed'}`
- `confirmVerification(sessionId, code)` → `{verification:'verified'|'failed'}`
- `requestTransfer(sessionId, e164)` → `{transfer:'requested'|'failed'}`
- `getReceipt(sessionId)` → `{summary?, perspective?:[{label,value}], recording:{state, playbackUrl?},
   transfer:{state}, sms:{state}}`

Open questions for the contract: session auth/credential handling; whether calls can
run unrecorded (`recordingOptional`); verification channel (call vs SMS — SMS
eligibility unknown); recording access control and expiry; error codes. If
`voicePath` is `browser`, the handoff UI stays unavailable (no PSTN transfer) and a
browser voice SDK would need its own approved script/CSP change.

## Local review

    python3 -m http.server 8765 --directory lfma   # http://127.0.0.1:8765/demo/ad-to-intake/
    node --test tests/lfma-ad-demo.test.mjs
    CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tests/lfma-ad-demo.browser.cjs
    bash tools/check-release.sh

The browser test serves repo files via interception and counts any external or
non-GET request as a failure. It runs the shipped unconnected page and a
test-only fake binding (injected by intercepting `integration-config.mjs`) at
375 and 1440px. Screenshots go to `/tmp/lfma-ad-demo-review/`. The fake binding
proves UI state handling only; it is not live evidence.

Logo: `lfma/assets/portal/ape-logo.jpg` is byte-identical to
`ma/assets/network/ape-logo.jpg` (SHA-256
`5dcc03152b3881cd3d943bf36260c514703f07e45a452f75da1cdc77c5426dab`), asserted in tests.
