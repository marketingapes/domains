# domains — Evolution Engine domain site packages

One folder per domain. Each is a self-contained static site served by its own Render Static Site.
Engine stays singular (`evolution-engine-staging-u0kf`); these folders are HTML hosting only.

| Folder | Domain | Render site | Source of truth (Drive) |
|---|---|---|---|
| `btl/` | besttortlawyers.com | btl-site | Best Tort Lawyers Shared Drive `/Web/` |
| `nil/` | nearestinjurylawyers.com | nil-site | Evolution Engine Drive `Websites/Nearest Injury Lawyers/Landing Pages/homepage/` (sofia-v2 2026-08-18) |
| `dihac/` | doihaveaclaim.ai | dihac-site | DoIhaveaclaim.ai Shared Drive `/Web/Live/index.html` + `/Web/Dev/` support pages |
| `lfma/` | lawfirmmarketingapes.com | lfma-site | Evolution Engine Drive `Old-Archive/Web/LawFirmMarketingApes/Web/Live/1.0/` (matches live IDs) |

Build: each Render site uses buildCommand `sh build.sh` (decodes `*.b64` binary assets) and
publishPath = the domain folder.

Rules (from Drive START-HERE): corrections append, do not rewrite the DIHAC homepage,
one engine — many domain packages. BTL `/phillips-law/*` funnel is NOT here yet — do not
cut BTL DNS to Render until it is mirrored from the current host.
