# Technical SEO audit — 8 November 2026

## Outcome and scope

Prepared local improvements only; no Production deployment, configuration change, hosted database operation, paid report, transaction or chargeable provider request. Preserve the current visual interface and product journeys. The existing uncommitted coffee landing-page/report-preview work is outside this change and is retained. Existing database tests use disposable local PostgreSQL fixtures only.

Next.js App Router/React uses server-rendered public pages, static published Blog routes and a small number of client interaction components. `lib/seo.ts` already supplies route-specific titles, descriptions, canonical URLs, Open Graph and Twitter cards. `lib/content` filters publication status/dates; sitemap generation uses that boundary. Root metadata defaults to noindex; public pages opt in only under the existing exact-origin Production approval switch. Private handlers retain authentication, RLS and private/no-store/noindex protections.

## Changes made

| File | Change |
| --- | --- |
| `lib/seo.ts` | Add minimal linked WebSite/Organization graph and article BreadcrumbList generators using the existing origin, brand, tagline and article canonical. |
| `app/page.tsx` | Render the homepage graph through the existing safe JSON-LD serializer. |
| `app/blog/[slug]/page.tsx` | Render article breadcrumbs for the existing Resources return link and article title; retain BlogPosting unchanged. |
| `scripts/check-seo.ts` | Add read-only rendered-HTTP assertions for canonical uniqueness/path, schema syntax/relationships, image alt attributes and exact sitemap membership. |
| This document | Audit findings, regression evidence, limitations and deferred recommendations. |

Only non-visible script elements are added to pages. No CSS, navigation, content text, assets, event names, rendering strategy, caching, application services or dependencies are changed by the SEO implementation.

## Findings

| Issue / observation | Evidence | Severity | Action | Expected benefit | Regression risk |
| --- | --- | --- | --- | --- | --- |
| Missing homepage site identity schema | Homepage source has no JSON-LD; live DOM read also returned no JSON-LD on 8 November | Low | Add linked WebSite and Organization graph | Explicit site-name/publisher identity for search engines; no ranking or rich-result guarantee | Low; inert server-rendered JSON-LD using existing serializer |
| Article hierarchy absent from schema | Articles render BlogPosting and an existing Resources return link, but no BreadcrumbList | Low | Add Resources → article breadcrumb data | Describe the existing editorial hierarchy | Low; no visible/navigation changes |
| Metadata/canonicals | Shared page/article helpers provide unique metadata, absolute query-free canonicals and social cards | Satisfied | Preserve | Avoid duplicate or conflicting metadata | None introduced |
| Crawl/indexing controls | Live homepage is index/follow; live robots returns HTTP 200 with Allow / and all existing private exclusions; live sitemap returns HTTP 200 with seven marketing pages and ten published articles | Satisfied in bounded live read | Preserve activation and private exclusions | Maintain intended discovery and privacy boundaries | None introduced |
| Local/Preview noindex | Explicit existing Production-origin/indexing guard and existing regression coverage | Intentional | Preserve | Keep non-production deployments out of search | None introduced |
| Analytics reportedly not detected | One Google loader in `measurement-controls`; consent/runtime guard; shared Ads installation, GA4 destination, disabled automatic page views, explicit deduplicated page events; server-claimed purchase dispatch | No confirmed defect | No new scripts/configuration/events | Prevent duplicate measurement | None introduced |
| Image/HTML semantics | Blog images use explicit alt/dimensions/sizes; meaningful diagrams carry accessible labels; public smoke checks require language and one H1 | No confirmed defect in reviewed paths | Preserve; check rendered pages | Maintain accessibility and reserved image space | None introduced |
| Performance | Existing system fonts, server-rendered content, sized Next images and async consented tags | No proven defect | No refactoring | Preserve current loading characteristics | None introduced |
| Weak backlink authority | Mentioned in owner brief; no original SEOptimer export available in repository/attachment | Unverified offsite opportunity | No code change | Requires editorial/relationship work outside task | None introduced |

## Analytics verification and limitations

`GoogleMeasurement` defaults consent to denied, suppresses automatic page views and injects only after activation/consent. The loader has an existing script ID guard and module-level shared runtime. Explicit events use session/document deduplication. Purchase/checkout tracking goes through the server route, bound server-retrieved Stripe sessions and persistent claim authority; it does not trust a browser redirect as proof of purchase. Existing tests cover consent gating, destinations, deduplication, attribution and verified commerce. These paths are unchanged.

The existing live browser session displayed one `gtag/js?id=AW-18530541419` script. Its prior consent state was not reset; this is not a new clean-session consent proof. No actual purchase or conversion was triggered. GA4/Ads receiving settings, Google UI reports, attribution completeness and live conversion receipt were not independently verified. An audit scanner's failure to detect consent-loaded analytics is not sufficient evidence to install another tag.

## Intentionally unchanged

- No original SEOptimer report was supplied; only the owner's summaries of analytics detection, strong performance and backlink weakness are available. Findings above come from current code and bounded public reads.
- Login, checker, legal, account, report, payment, auth, internal and development indexing policies are retained. Robots is a crawler hint, not access control; existing authorisation remains responsible for private data.
- Sitemap inclusion, redirects, query behaviour, origin configuration and public route URLs are unchanged. The new coffee landing page is local branch work and was absent from the currently deployed sitemap; that is a release difference, not a live sitemap defect to fix through configuration.
- No SoftwareApplication offers/ratings or LocalBusiness markup: additional product/offer assertions add little value here and risk misrepresenting the service. No invented reviews, business addresses, social profiles, search action or ratings.
- No cosmetic title-length optimisation, visible heading rewrites, content generation, menu changes or speculative performance changes.

## Verification

Node 24.12.0/npm 11.6.2 match repository requirements. Initial root `npm ci --no-audit --no-fund` failed with Windows EPERM on a native Next SWC file held by an existing process. The initial `npm run check` consequently stopped because eslint was unavailable. Existing app processes were not terminated. A credential-free source copy under ignored `.vercel/seo-audit-workspace` was used for clean locked installation and verification; it includes the pre-existing working-tree changes captured at audit time. Concurrent later coffee-page edits are outside that snapshot and this audit's validation claim.

| Check | Actual result |
| --- | --- |
| Isolated `npm ci --no-audit --no-fund` | Passed; 219 packages. Extraction took 20 minutes on this machine. |
| `node --test tests/content.test.ts tests/measurement.test.ts` | Passed, 18 tests. |
| Final `npm run check` after install completed | Passed: lint, strict TypeScript, all 560 tests, production build. Earlier premature types/build attempts during extraction failed for missing Next declaration files and are superseded by this complete-install run. |
| `npm run start -- --hostname 127.0.0.1 --port 3187` | Local production server started successfully without credentials. |
| `npm run check:public -- http://127.0.0.1:3187 noindex` | Passed: 22 public pages/articles, 28 internal paths, 20 same-origin scripts; metadata/JSON-LD/sitemap/robots/social image, real 404s, security headers, private account redirect, safe auth callback and four invalid address-route boundaries. |
| `node scripts/check-seo.ts http://127.0.0.1:3187` | Passed across 22 routes: one correct query-free canonical per page, JSON-LD parse/context/entity relationships, all rendered image alt attributes and exact sitemap membership/no duplicates. |
| Browser: homepage and coffee-location article at 390×844 and 1440×900 | Inspected layouts; no horizontal overflow. Homepage graph and article BlogPosting + BreadcrumbList appear in DOM. No warning/error console entries on these visits; no hydration errors observed. Keyboard Tab reaches the home link and activating Skip to content focuses `main-content`. This is responsive browser smoke, not a physical-device or pixel-diff certification. |
| Read-only Production observations | Homepage title/description/index-follow/canonical and absent original JSON-LD; one existing Google loader; article title/canonical/BlogPosting; HTTP 200 robots/sitemap with existing intended exclusions and 17 URLs. No state-changing Production request. |
| Dependency/source hygiene | Root dependencies restored with lockfile-respecting `npm install --ignore-scripts --no-audit --no-fund`; package manifest and lockfile unchanged. No dependency added. SEO-only diff contains no credentials, CSS, environment or service changes; `git diff --check` passes. |

The nested temporary workspace produced a Next.js multiple-lockfile/root-inference warning; builds and HTTP checks passed. No configuration change was made to silence a temporary-workspace warning. Test fixtures cover postcode validation, Free Snapshot/report ownership and generation, authentication, payment admission, PDF/replay and consent/deduplication. No live sign-in, report generation, paid API, Stripe transaction, receiving-side analytics or Google structured-data acceptance is claimed. Search Console and hosted delivery checks remain distinct.

Protected delivery uses a separate branch from `origin/main`; the five-file SEO change excludes the unrelated coffee landing-page commits and working-tree changes. No merge or Production deployment is part of this task. Hosted CI status is reported separately with the PR.

## Remaining recommendations — not implemented

After an approved future release, use Search Console URL Inspection and structured-data tooling against deployed URLs, then monitor indexing and search appearance. Search Console access/submission and Production release are separate activities. Review consented receiving-side analytics using existing accounts if needed; do not create duplicate tags.

Future owner-approved work could include useful source-backed editorial resources and relevant outreach/earned mentions from genuine commercial-property or small-business organisations. Backlink quality/authority was not measured in this task. Do not purchase or manufacture links. New content, geographic/service pages, visual breadcrumb navigation and social/organisation profile expansion need their own scope.

References: [Google site-name guidance](https://developers.google.com/search/docs/appearance/site-names), [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), [Next.js safe JSON-LD](https://nextjs.org/docs/app/guides/json-ld). Existing indexing authority: [public indexing activation](public-indexing-activation-20261026.md); content boundary: [Blog architecture](blog-architecture.md).
