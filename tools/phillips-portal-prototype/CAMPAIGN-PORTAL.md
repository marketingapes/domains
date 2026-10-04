# Client Perspective — MVA-first campaign portal

Current review artifact: `lfma/portal/prototypes/client-perspective-directions/04-campaign-portal.html`. It supersedes selecting among three visual directions with Kyle's definitive information architecture; the earlier examples remain saved.

Top-level campaign tabs: **MVA**, **LA County**, **Handoff**. Handoff is a neutral placeholder for the ambiguous requested label, with no invented scope or business logic. MVA opens first. Within each campaign: **Overview**, **Leads**, **Marketing**, **Next steps**. Switching campaign coordinates every section, retaining the section selection and withholding MVA content from unconfigured campaigns. LA County has no inferred current results; historical homepage proof is not reused.

Overview shows the confirmed $5,000 / 14-day planning budget, actual spent **Unknown**, remaining **Unknown** and separate marketing/intake numbers **Unknown**. Remaining is not calculated without verified actual spend. Marketing shows a clearly labeled 60/40 **planned allocation**, staged artwork with approval unverified, an empty actual performance series and unconnected optimization history. Next steps distinguish exact review tasks, missing assignments and proposed coverage/feedback improvements from executed optimizations.

Leads uses **three explicitly synthetic, deidentified DEMO examples**, never actual private data. They are excluded from all actual totals. Source/creative and current-work filters coordinate an ordered timeline; call attempt, connection to AI, attempted transfer, completed transfer, Phillips connection/work, disposition and executed-retainer proof remain separate. No personal identifiers, injuries, symptoms or treatment details. No real timestamps or claimed calls. A filter with no matching examples has a clear empty state.

Visual family: current LFMA dark ink, lilac/cyan canvas and restrained violet accents; bold MVA heading and planned-budget typography, confident spacing and connected lead timeline. A short purposeful campaign switch motion respects reduced motion. No decorative AI effects or runtime AI. No credential/input forms or decisions.

Build with `python3 tools/phillips-portal-prototype/build-campaign-portal.py`. Browser QA with `node tools/phillips-portal-prototype/verify-campaign-portal.mjs` (same optional Playwright/Chromium environment overrides as prior tools). **36 campaign × section × viewport checks** at 1440,768,375; combined lead filters, empty state, stage distinctions, keyboard campaign/section tabs, evidence disclosure, no clipping/render errors/outbound requests. Seven targeted source/privacy/packaging checks.

Artifact packaging uses exact image/script placeholders. Browser QA caught and corrected broad placeholder substitution before delivery. Production portal, PR13, campaign PR226 and live sources are unchanged. This is visual review only: no publishing, Sheets writes, auth setup, messages, calls or spend.

## Numbers-first / Sofia evidence refinement

Eight large measures dominate Overview: planned budget, actual spent, remaining, verified leads, connected to AI, Phillips connected, completed transfers and Signed. Every tile drills into the corresponding section and campaign-scoped proof explanation. Only the confirmed $5,000 planning amount is populated; unavailable values are explicitly marked, not zero or fake counters. Twenty-four metric drilldowns are browser-tested across three widths. The source observation timestamp stays visible; no live pings or invented trends.

AI intake is the visual centerpiece inside Overview: ad/source → AI handling → actual contact → Phillips acknowledgement → next action. It links to the explicitly synthetic activity timeline. Response time/contact rate/comparison remain unavailable without verified comparable records; no causal marketing improvement is claimed and AI does not declare legal eligibility.

Lead fields use Kyle's plain labels **Lead, Text, Email, Call, Status, Ad**. Unified Sofia channel presentation distinguishes attempted/sent/delivered/replied and call/AI/transfer states. Text/email examples illustrate the intended reporting interface only: source inspection at legal-web-lead0fc1704 found default receipt policy OFF/PENDING for both channels, unresolved sender/STOP/reply bindings and no verified live transport. No provider or account access was changed. Actual aggregates would require the same evidence-backed lead records; synthetic rows are excluded from all campaign totals.

Firm outcome, signing status, reason and next action remain separate from contact status. Unknown reasons are Awaiting firm feedback; no AI winning/losing rationale. Signed needs executed-retainer reference/date. Real firm reasons require authorized firm access.

Expandable call evidence shows provider, synthetic call ID, unavailable time/duration, outcome and association ambiguity. Recording/transcript buttons are disabled. No real recording, bearer link, token, provider fetch or public URL. Future authorized server resolution must verify the lead/campaign association; ambiguous phone-only matches cannot attach evidence. Completed call, AI connected, Phillips connected and Signed remain separate.

Social DM/WhatsApp/CTV exploration was explicitly parked by Kyle and is **absent from the shipped preview**. Inactive scratch fragments stay only in the task recovery directory, outside source control. The original $5,000 allocation remains unchanged. All live sources and provider permissions stay untouched.

## Reuse without another runtime

Brand/client/campaign display configuration now lives in `campaign-portal-config.json`; synthetic-only activity rows live separately in `campaign-portal-demo-leads.json`. The shared builder owns layout, components, transitions, filtering and evidence interactions. Planning values are typed, must balance, and retain actual-spent/remaining nulls. Public display config holds no credentials, real leads or provider links. The demo fixture cannot count toward actual totals.

This build deliberately remains Phillips-first and rejects a different tenant until its facts/access are independently validated. Copying a config is not approval to reuse Phillips proof, onboard another firm, deploy or provision authentication. Shared changes can propagate through the same builder after each configured preview passes source/fact/privacy checks. Current schema is a local visual-template contract, not a production multitenant service.
