# Shared campaign metadata and absolute URLs

State: BUILT-NOT-LIVE. Based on domains commit `aa683a9d9bc2eb94bc30ba0deeca3ddc93553296` and the BTL current brief BTL-DOMAIN-20261122.3. No domain manifest, frozen validator, buyer rule, Glassman SSDI source, provider object or production deployment changed.

## What this patch fixes

The existing campaign generator had page titles/descriptions but omitted canonical, `og:url` and Twitter metadata from its regular pages. Its share image could be root-relative. Meta ad-image drafts concatenated a hard-coded BTL prefix, corrupting already-absolute image URLs. Landing links appended a second question mark when a destination already carried a query.

`metadata.mjs` is used by the existing `build.mjs`; it is not a replacement page generator. It builds one escaped title/description/canonical/OG/Twitter set, resolves public HTTPS URLs, and preserves existing destination query parameters while adding campaign UTMs. Measured local OG dimensions are emitted without inventing values for remote/unreadable assets.

For generated live HTML, `href`, `src`, `srcset` and `poster` references become full HTTPS URLs against the configured domain and generated page path. Existing absolute external URLs retain their own origin. Hero CSS receives an absolute URL. `tel:`, `mailto:`, `data:` and in-page fragments retain their intended behavior. Script/style contents are treated as opaque by the HTML reference rewrite.

## Deliberate preview exception

Preview canonical/OG/Twitter metadata is absolute. Preview body resources and navigation stay local: forcing those references to production would break the self-only image policy or move a reviewer onto a live intake page. Preview `noindex,follow`, CSP `connect-src 'none'`, disabled dialing and disabled sending remain intact. Metadata does not load a tracker or send a lead.

The existing provider-review preview gains the same metadata set and the existing generic BTL share image. Its checked-in preview snapshot is refreshed because the current test requires it to equal the generated page.

## Scope and limitations

- This changes the existing BTL campaign generator and supplies a reusable metadata helper. It does not assert that all 14 tenant sites, older handwritten pages or historical generated pages have been migrated.
- The generator still writes its campaign output under the existing BTL directories. The helper's domain parameter is not authorization to run this generator for another tenant or borrow another tenant's branding/accounts.
- All four current configs were built locally. Only the shared source/tests/docs and required provider-review snapshot are included in this focused source patch. Approved campaign regeneration and release remain separate.
- The patch does not revise approved campaign copy, invent SEO claims, alter robots/indexing launch state, compress images, create video, or certify that a preview canonical URL is live/reachable.
- The placement-specific export matrix is in [ASSET-SPECS-20261122.md](ASSET-SPECS-20261122.md). Meta's exact current Ads Guide limits remain unverified; other platform facts have primary-source links.

## Verification receipt

Passed:

```sh
node --check campaign-kit/build.mjs
node --check campaign-kit/metadata.mjs
node campaign-kit/build.mjs --all
node --test campaign-kit/test/*.test.mjs
```

Result: **19 tests passed, zero failed** (14 existing tests and 5 new metadata/URL tests). Tests render actual campaign pages, cover preview isolation and live URL resolution, preserve third-party image origins and existing query/hash values, verify `srcset` handling, reject unsafe URL schemes/credentials, and preserve script contents.

Browser gate attempted:

```sh
CHROMIUM=/usr/bin/chromium node tests/campaign-kit.browser.cjs
```

It could not start in this environment: Chromium aborted with `socket() failed: Operation not permitted`. The default Playwright browser package was also absent. Browser verification remains outstanding; no browser pass or production readiness is claimed. No live events, test leads, calls or messages were sent.
