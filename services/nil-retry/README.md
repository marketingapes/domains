# nil-retry — Sofia retry cadence (Render cron)

Closes the reach leak: one dial per lead then silence. Re-reads Vapi call history every 15 minutes and places the next attempt on schedule. Stateless, idempotent, shadow by default.

- Cadence after the Zap's first dial: +15 min → +2 h → next day 10:00 AZ. Max 4 attempts total.
- Window 08:00–20:00 America/Phoenix. Never dials reached leads (transfer, real conversation ≥45 s, any inbound from the number), declines, non-US numbers, or DO_NOT_CALL.
- Carries the Zap's `variableValues` (first_name, lead_id, language…) forward; adds `submitted_ago=earlier`, `retry_attempt=N`. Call `metadata.source = nil-retry`.
- Arm: set `DRY_RUN=false`. Until then it only logs `wouldCall` lines.

Render: cron `nil-retry`, schedule `*/15 * * * *`, start `node services/nil-retry/retry.js`, repo `marketingapes/domains`. Secrets in Render only: `VAPI_API_KEY`.

Test locally: `node -e "const {plan}=require('./retry.js');console.log(plan(require('./fixture.json'),new Date()))"`.
