# Client Perspective — MVA-first campaign portal

Current review artifact: `lfma/portal/prototypes/client-perspective-directions/04-campaign-portal.html`. It supersedes selecting among three visual directions with Kyle's definitive information architecture; the earlier examples remain saved.

Top-level campaign tabs: **MVA**, **LA County**, **Handoff**. Handoff is a neutral placeholder for the ambiguous requested label, with no invented scope or business logic. MVA opens first. Within each campaign: **Overview**, **Leads**, **Marketing**, **Next steps**. Switching campaign coordinates every section, retaining the section selection and withholding MVA content from unconfigured campaigns. LA County has no inferred current results; historical homepage proof is not reused.

Overview shows the confirmed $5,000 / 14-day planning budget, actual spent **Unknown**, remaining **Unknown** and separate marketing/intake numbers **Unknown**. Remaining is not calculated without verified actual spend. Marketing shows a clearly labeled 60/40 **planned allocation**, staged artwork with approval unverified, an empty actual performance series and unconnected optimization history. Next steps distinguish exact review tasks, missing assignments and proposed coverage/feedback improvements from executed optimizations.

Leads uses **three explicitly synthetic, deidentified DEMO examples**, never actual private data. They are excluded from all actual totals. Source/creative and current-work filters coordinate an ordered timeline; call attempt, connection to AI, attempted transfer, completed transfer, Phillips connection/work, disposition and executed-retainer proof remain separate. No personal identifiers, injuries, symptoms or treatment details. No real timestamps or claimed calls. A filter with no matching examples has a clear empty state.

Visual family: current LFMA dark ink, lilac/cyan canvas and restrained violet accents; bold MVA heading and planned-budget typography, confident spacing and connected lead timeline. A short purposeful campaign switch motion respects reduced motion. No decorative AI effects or runtime AI. No credential/input forms or decisions.

Build with `python3 tools/phillips-portal-prototype/build-campaign-portal.py`. Browser QA with `node tools/phillips-portal-prototype/verify-campaign-portal.mjs` (same optional Playwright/Chromium environment overrides as prior tools). **36 campaign × section × viewport checks** at 1440,768,375; combined lead filters, empty state, stage distinctions, keyboard campaign/section tabs, evidence disclosure, no clipping/render errors/outbound requests. Seven targeted source/privacy/packaging checks.

Artifact packaging uses exact image/script placeholders. Browser QA caught and corrected broad placeholder substitution before delivery. Production portal, PR13, campaign PR226 and live sources are unchanged. This is visual review only: no publishing, Sheets writes, auth setup, messages, calls or spend.
