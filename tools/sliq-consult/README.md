# SmartLife consultation release gate

One action, no checkbox. Clicking Request a Free Consultation requests a human callback by a licensed agent. This release does not enroll contacts in text or AI voice. Do not enable automated contact under the human-callback notice or use a generic Marketing Apes messaging verification as evidence of SmartLife enrollment.

## Deployment order
1. Confirm supervisor and licensed intake agent, state coverage, manual callback handling, privacy wording, and restricted access to contact data. Use a separate restricted BigQuery dataset for personal details; keep BI to request ID, source and event timestamps. Do not enable social webhooks that expose contact details to a third party.
2. In Make, isolate a SmartLife consultation custom webhook. Require x-make-apikey. Accept only the exact worker payload with routing human_callback_only and both automation flags false. Use a parameterized BigQuery insert/MERGE in sequential execution keyed by requestId with collision check; persist first and return HTTP 200 JSON {"stored":true,"requestId":"<the stored request ID>"} only when the write is verified. Use one restricted intake owner and no SMS, Vapi, email blast or social conversions in this scenario. An uncertainty or rejected row must not return a success receipt.
3. Deploy worker.mjs as a Cloudflare Worker on the exact www/apex consultation path, not on other routes. Set a hostname-scoped invisible Turnstile widget and server validation, configure rate limiting on the POST and set the four bindings listed in the worker. Set up a temporary staging hostname only after adding it explicitly and never point an untested route at production. Existing production DNS is DNS-only; a Worker Route needs proxied DNS or equivalent Render API hosting. Do not switch apex proxy/DNS without checking origin TLS and rollback or use the legacy suspended service.
4. Ship the static site after the staging API passes. Without the configured API the form remains hidden and uses the existing contact page. Test valid/invalid mobile, spam challenge, retries with the same request ID, BQ row and one licensed agent who can see only the intake assigned to them. Then prove one test request per verified channel.
5. Release ads and automated communications independently only after approved creative/budget, channel permissions and routing evidence, and any carrier-approved opt-in flow.

## Social attribution
For website campaigns, use the same live destination with ?utm_source=facebook, instagram, tiktok, or youtube and appropriate campaign/medium values for first-party reporting. Validate transport per channel independently; a tracking URL is not an account connection. This slice stores coarse source, not click IDs, profile or health info. No customer data is sent to social platforms. Do not configure sensitive insurance data for optimization.

First-party link targets observed: Facebook page 1278677531985470 and linked Instagram @smartlifeinsurancequote. TikTok and YouTube require verified brand account/channel and permissions before surfacing as active links. Native lead forms, posting, ad activation and offline event sends are separately scoped.

## Local checks
Run `node --test tools/sliq-consult/worker.test.mjs`. Provider tests use synthetic data and mocked responses. Never call a real phone from these tests.
