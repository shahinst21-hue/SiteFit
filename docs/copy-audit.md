# Website communication audit — 14 October 2026

Owner authorises repository-wide customer copy research, audit, rewriting and implementation. Work is on a protected Development/Preview branch. No Production copy deployment, new spending, migrations, provider retrieval, historical-report regeneration or commercial activation is included. Phase15 remains closed with exceptions and Phase16 remains accepted.

## Starting position and priorities

| Priority | Finding | Implemented response |
|---|---|---|
| High | Home explains “context” and a “brief” before the lease decision | Property-specific before-you-commit headline, London scope and tangible questions |
| High | Snapshot copy claims Full generation and PDF are unimplemented even though delivered | Remove obsolete phase statements; distinguish Ready access from actual purchase availability |
| High | Public sample exposes 16 historical sections rather than the current eight | Eight concise illustrative sections, three-line verdict and four decision-changing checks |
| High | Price controls hardcode £29 | Read configured minor-unit price in controls and purchase review |
| High | Unsupported implied certainty/technical language | Qualified rental/record/activity labels, plain-language methodology; no guarantees or measured-footfall claims |
| Medium | Payment polling pause can be mistaken for stopped fulfilment | Explain page refresh versus saved status; warn against paying again |
| Medium | Internal wording (“admitted”, “operand”, “stored”) in customer messages | Plain-language labels, retaining exact original/source-history details in Appendix |
| Medium | Prompt prose lacks a consistent explicit writing style | Versioned British-English style in existing v2 instructions; unchanged schema, slots and factual gates |
| Medium | Contact excludes Google despite available Google sign-in | Describe both existing sign-in methods |
| Medium | Public metadata/social preview suggests UK-wide analysis | London-specific description; retain generic UK address acceptance |

## Customer decision and hesitation by stage

| Stage | Need / hesitation | Copy response |
|---|---|---|
| Arrival | What is it? Is my business/location supported? | Lease decision, London, supported concepts, free first action |
| Address / concept | Why these inputs? Is an account/card needed? | Property selection and business-specific checks; no financial gate |
| Snapshot | What does the initial evidence mean? What remains open? | Actual saved findings, next question and specific additional report value |
| Sign-in / purchase | Will I lose the Snapshot? What am I paying for? | Saved account access, configured one-off price, terms and separate supply/payment states |
| Preparing | Is it stuck? Should I buy again? | Accurate stage/status, saved progress and assistance path |
| Report | What matters before a lease? Can I inspect/share it? | Preserved Verdict, strengths/risks/action contract; eight views and same-edition PDF |
| Help / evidence | Can I trust it? How do I resolve gaps? | Source/date/limitations, indicative AI, original records and email help |

## Scope reviewed and retained

- Public pages, header/footer/menu, responsive action labels, articles and metadata use the existing routes and structured content repository. No new SEO pages or visual redesign.
- Address lookup (returned/empty/error/manual), business selection, Snapshot loading/unknown/locked/missing-section, authentication and account history reviewed in source. Existing actionable address/auth messages retained where already clear.
- Every purchase route and its conditional replies inventoried. Existing versioned legal disclosure, unchecked consents, payment/entitlement/ownership controls and immutable contract PDF are retained. Substantive policy changes are excluded.
- All eight dashboard components, charts, maps, rental views, display helpers and PDF paragraph/export path reviewed. Original conclusions, values, source links, licences, material limitations and digests are preserved. This is not a rewrite of stored historical interpretations.
- Public Sample Report revised. Development three-concept real-source drafts, empty/worst states and Snapshot synthetic fixture reviewed as examples, never promoted to source evidence or Ready. Numeric fixture data and frozen analytical drafts retained to preserve regression/provenance meaning.
- Source/selection prompts, bounded answer selection, deterministic interpretation and projection templates reviewed. Only the current free-prose v2 style prompt changed. Legacy/ID-only prompts do not need a prose-generation instruction.
- `supabase/templates/sign-in.html` optional email copy clarified; security placeholders/expiry remain unchanged. Hosted Free-tier default email template and actual inbox delivery were not changed or proved. No report-ready/support email sender/template exists to rewrite; no new notification feature added.
- Private support/verification routes remain internal and default-denied. Their operational diagnostics are not marketed as customer capabilities.
- SQL-generated historical/source/legal text remains as applied history; no migration or customer mutation.

The route inventory below is source coverage. It is **not** a claim that every authenticated or provider-dependent state was exercised live.

## Measurement and experiments

Existing campaign consent and private association record Ready Snapshot, purchase start, checkout/payment outcomes, Ready report and interruptions. Existing separate Test/v2 Live aggregation and operator-entered traffic/spend remain unchanged. Verified payment, not the browser return, defines paid conversion. There is no reliable commercial baseline yet; Test fixtures do not establish willingness to pay.

Traffic/checker starts require channel records. A first-party visitor funnel and report-open/read events are not fully instrumented; do not invent these metrics or add tracking in a copy task. Consent loss, shared campaign codes, browser/session loss and low sample sizes limit inference. Record deployment revision/date and cohort/as-of dates in existing campaign results.

Three future experiments, without a new experimentation platform:

1. Before-commit hero versus concept-fit question: evaluate completed verified purchases per attributable Snapshot, alongside starts/completions. Keep coverage, price and functionality equal.
2. Current “See the Full Report” action versus a concise action-plan benefit: evaluate checkout initiation and verified completion, not button clicks alone.
3. Paid-card emphasis on ranked risks/actions versus eight-section depth/PDF: compare paid conversion and purchaser usefulness feedback, including refunds/non-delivery. Avoid promising complete answers.

Run only after applicable activation/measurement approval. No uplift percentage, minimum commercially significant conversion or statistically valid winner is claimed at prelaunch volume.

## Verification and remaining limits

Local verification: npm ci on Node24.12.0/npm11.6.2 (zero audit vulnerabilities); npm run check passed 352 tests, lint, strict types and production build. This includes fresh PostgreSQL rebuild/RLS and existing three-concept customer exports/PDF checks. Actual built HTTP checks passed 13 public pages/articles and 13 internal paths, metadata/JSON-LD/sitemap/robots/social image/404 and four invalid/cross-origin address boundaries. Marketing consent/withdrawal and anonymous indexing checks passed without generation. Browser verification on the built local app: Home1440/390, Pricing1440, Sample390, mobile menu, invalid postcode, safe entry to the checker, all eight frozen-fixture tabs390, priority-action navigation and empty evidence. No root horizontal overflow or object-coercion text was found in these views. Four added render/contract tests cover public text, five Snapshot states, unavailable/owned/blocked checkout and prompt bounds. Real200% zoom and real-phone testing were not repeated for this copy task; previous accepted design remains. Hosted delivery/CI receipts follow below. Live AI quality of the new style instruction, actual hosted email template/inbox, every private UI state, real purchase/refund and actual post-launch conversion remain unverified in this no-spend assignment. Existing legal/hosting/confirmation/budget/Live-proof requirements remain in the [launch gate register](launch-gate-register.md); copy does not close them. See [guidelines](copy-guidelines.md), [benchmarks](copy-benchmark.md) and [change log](copy-changelog.md).

## Route and state source inventory

Inventory reads 636 tracked text sources. Dependency lockfile, binary assets and ignored credentials are not customer-copy sources. Source inventory is broader than runtime/browser coverage; verification receipts below specify what actually ran.

| Route / surface | Source | Scope | Change |
|---|---|---|---|
| /account | [app/account/page.tsx](../app/account/page.tsx) | Owned journey / dynamic state | Copy revised |
| /account/report-verification | [app/account/report-verification/page.tsx](../app/account/report-verification/page.tsx) | Private operational / fixture | Reviewed; existing contract retained |
| /api/addresses/lookup | [app/api/addresses/lookup/route.ts](../app/api/addresses/lookup/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/addresses/manual | [app/api/addresses/manual/route.ts](../app/api/addresses/manual/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/addresses/resolve | [app/api/addresses/resolve/route.ts](../app/api/addresses/resolve/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/addresses/search | [app/api/addresses/search/route.ts](../app/api/addresses/search/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/analyses/generate | [app/api/analyses/generate/route.ts](../app/api/analyses/generate/route.ts) | Endpoint / conditional replies | Copy revised; limits unchanged |
| /api/campaign | [app/api/campaign/route.ts](../app/api/campaign/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/internal/fulfilment | [app/api/internal/fulfilment/route.ts](../app/api/internal/fulfilment/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/reports/intelligence | [app/api/reports/intelligence/route.ts](../app/api/reports/intelligence/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/reports/questions | [app/api/reports/questions/route.ts](../app/api/reports/questions/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /api/stripe/webhook | [app/api/stripe/webhook/route.ts](../app/api/stripe/webhook/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /auth/callback | [app/auth/callback/route.ts](../app/auth/callback/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /auth/confirm | [app/auth/confirm/page.tsx](../app/auth/confirm/page.tsx) | Public / shared metadata | Reviewed; existing contract retained |
| /blog/[slug] | [app/blog/[slug]/page.tsx](../app/blog/[slug]/page.tsx) | Public / shared metadata | Reviewed; existing contract retained |
| /blog | [app/blog/page.tsx](../app/blog/page.tsx) | Public / shared metadata | Copy revised |
| /check-location | [app/check-location/loading.tsx](../app/check-location/loading.tsx) | System state | Reviewed; existing contract retained |
| /check-location | [app/check-location/page.tsx](../app/check-location/page.tsx) | Public / shared metadata | Reviewed; existing contract retained |
| /contact | [app/contact/page.tsx](../app/contact/page.tsx) | Public / shared metadata | Copy revised |
| /dev/report | [app/dev/report/page.tsx](../app/dev/report/page.tsx) | Private operational / fixture | Reviewed; existing contract retained |
| /dev/snapshot | [app/dev/snapshot/page.tsx](../app/dev/snapshot/page.tsx) | Private operational / fixture | Reviewed; existing contract retained |
| /error.tsx | [app/error.tsx](../app/error.tsx) | System state | Reviewed; existing contract retained |
| /how-it-works | [app/how-it-works/page.tsx](../app/how-it-works/page.tsx) | Public / shared metadata | Copy revised |
| /internal/support | [app/internal/support/page.tsx](../app/internal/support/page.tsx) | Private operational / fixture | Reviewed; existing contract retained |
| /layout.tsx | [app/layout.tsx](../app/layout.tsx) | Public / shared metadata | Reviewed; existing contract retained |
| /login | [app/login/page.tsx](../app/login/page.tsx) | Public / shared metadata | Reviewed; existing contract retained |
| /methodology | [app/methodology/page.tsx](../app/methodology/page.tsx) | Public / shared metadata | Copy revised |
| /not-found.tsx | [app/not-found.tsx](../app/not-found.tsx) | System state | Reviewed; existing contract retained |
| / | [app/page.tsx](../app/page.tsx) | Public / shared metadata | Copy revised |
| /pricing | [app/pricing/page.tsx](../app/pricing/page.tsx) | Public / shared metadata | Copy revised |
| /privacy | [app/privacy/page.tsx](../app/privacy/page.tsx) | Public / shared metadata | Reviewed; existing contract retained |
| /purchase/auth | [app/purchase/auth/page.tsx](../app/purchase/auth/page.tsx) | Owned journey / dynamic state | Reviewed; existing contract retained |
| /purchase/callback | [app/purchase/callback/route.ts](../app/purchase/callback/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/cancellation | [app/purchase/cancellation/route.ts](../app/purchase/cancellation/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/checkout | [app/purchase/checkout/route.ts](../app/purchase/checkout/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/claim | [app/purchase/claim/route.ts](../app/purchase/claim/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/confirmation | [app/purchase/confirmation/route.ts](../app/purchase/confirmation/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/identity | [app/purchase/identity/route.ts](../app/purchase/identity/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/resume | [app/purchase/resume/page.tsx](../app/purchase/resume/page.tsx) | Owned journey / dynamic state | Copy revised |
| /purchase/return | [app/purchase/return/page.tsx](../app/purchase/return/page.tsx) | Owned journey / dynamic state | Reviewed; existing contract retained |
| /purchase/start | [app/purchase/start/route.ts](../app/purchase/start/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /purchase/status | [app/purchase/status/route.ts](../app/purchase/status/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /reports/[id] | [app/reports/[id]/loading.tsx](../app/reports/[id]/loading.tsx) | Owned journey / dynamic state | Reviewed; existing contract retained |
| /reports/[id] | [app/reports/[id]/page.tsx](../app/reports/[id]/page.tsx) | Owned journey / dynamic state | Status copy revised |
| /reports/[id]/pdf | [app/reports/[id]/pdf/route.ts](../app/reports/[id]/pdf/route.ts) | Endpoint / conditional replies | Reviewed; existing contract retained |
| /robots.ts | [app/robots.ts](../app/robots.ts) | Public / shared metadata | Reviewed; existing contract retained |
| /sample-report | [app/sample-report/page.tsx](../app/sample-report/page.tsx) | Public / shared metadata | Copy revised |
| /sitemap.ts | [app/sitemap.ts](../app/sitemap.ts) | Public / shared metadata | Reviewed; existing contract retained |
| /snapshots/[id] | [app/snapshots/[id]/loading.tsx](../app/snapshots/[id]/loading.tsx) | Owned journey / dynamic state | Reviewed; existing contract retained |
| /snapshots/[id] | [app/snapshots/[id]/page.tsx](../app/snapshots/[id]/page.tsx) | Owned journey / dynamic state | Reviewed; existing contract retained |
| /social-image | [app/social-image/route.tsx](../app/social-image/route.tsx) | Public / shared metadata | Copy revised |
| /terms | [app/terms/page.tsx](../app/terms/page.tsx) | Public / shared metadata | Reviewed; existing contract retained |

Shared customer surfaces: all `components/*.tsx`, all `components/report-dashboard/*.tsx`, `lib/site-config.ts`, `lib/wizard.ts`, `lib/content/*`, `lib/auth/flow.ts`, `lib/analysis/{packets,enriched-packets,interpretation,projection,ai-provider}.ts`, `lib/snapshot/{model,demo}.ts`, `lib/report-intelligence/{catalog,narrative,selection,decision-summary,operating-comparison,questions,export,provider}.ts`, `lib/report-dashboard/{display,presentation,rental,structured-preview,pdf}.ts`, `lib/fulfilment/policy.ts`, `lib/payments/*`, `lib/legal/*`, `supabase/templates/sign-in.html`, the illustrative Free Snapshot JSON and three frozen dashboard fixtures. Component-only states are covered in the stage table and verification receipts rather than invented routes.
