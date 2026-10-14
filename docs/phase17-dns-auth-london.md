# Phase17 — DNS, Google and stored London source preparation

14 October 2026. Owner confirms GoDaddy routing, preserved Google Development callback and enabled Production Google. This work verifies those changes and prepares existing permitted source releases. No main merge/application Production promotion, provider request, paid AI, Live payment, campaign, subscription or hosting change is implied.

## Domain and authentication

Actual DNS A responses: 216.198.79.1 and64.29.17.1. Vercel reports `misconfigured=false`, ownership verified and no conflicts. HTTPS is not yet a pass: both native HTTPS and the browser fail the connection; HTTP returns Vercel404 `DEPLOYMENT_NOT_FOUND`.

Vercel's Production target is an old ERROR deployment `dpl_2bqJEqLfj4cbztFiGbdKSUbHfiPa`, commit `eef0c6c207f0ef8d4bf008db77165250a1ff5a43`. Its recorded `npm ci` failure is lockfile mismatch (missing @emnapi runtime/core1.11.3). It is not the reviewed Phase17 code. Current npm11/Node24 installation succeeds; no dependency or historical lockfile rewritten. A successful Preview build does not automatically promote Production.

Production Auth API confirms Google enabled, Client ID configured, exact site URL/callback allowlist. Development Google remains enabled with the same existing Client ID; no Development Auth setting or Google Console credential changed by this work. The owner's Console callback confirmation is recorded, not independently labelled a successful OAuth exchange. Actual Production Google/PKCE remains blocked by deployment/TLS. Preview inspection reaches login, not an authenticated owner account; a fresh Development Google exchange has not passed in this turn.

A demonstrated UI dependency hid Google when checkout/dashboard gates were disabled. Login now offers configured Google independently of commercial authority. Correct Production Supabase target and PKCE/redirect/identity/payment/ownership controls remain intact. Actual page-render regression covers disabled sales/execution and wrong Production database denial.

## Source-only reuse

The operator script defaults to audit; applying requires the exact fixed Production project, an initially empty source inventory,14 reviewed ready London releases, approved retained normalised data, rejected raw retention, source IDs/checksums/licences and capacity margin. It never selects public customer tables, Auth users, analyses, snapshots, payments or reports. Failed/loading Development releases are excluded. No new provider request or current-vintage claim.

Source relation footprint before reuse:342,925,312 bytes. Initial Production:23,778,995 bytes. A15% relation-size margin remains below the450,000,000-byte internal checkpoint; actual capacity is checked inside each write. Normalised ONS geography/Census/Income/BRES, OS Open UPRN, TfL NUMBAT, Overture places and Planning Data retain original release IDs, timestamps, manifests, licence notices and binary/geographical values.

Data transfers are parameterised single-statement transactions with exact PostgreSQL reconstructed-row comparison. A mismatch rolls back the batch. Original server JSON avoids PowerShell date reformatting; the offline PostgreSQL fixture reproduces the rejected noncanonical date, successful geometry/bytea transfer and duplicate denial. No trigger/grant disabled. The Management transport's size limit is handled by gzip, first verified with a nonmutating large parameter. Target writes are fixed-project checked; no raw response/secret logged.

Metadata is initially `loading`. Each release becomes ready only after its complete verified table rows and existing integrity triggers pass, in geography-before-dependent order. Empty-staging continuation checks all child tables empty and complete canonical metadata equality. Explicit `-ResumeVerified` checks all original metadata, allowed loading/ready states and the complete canonical per-row SHA256 prefix before skipping any stored data. It rejects changed/excess rows; it does not reset or automatically retry an ambiguous dispatch. Ready sources remain immutable.

Actual transfer initially stopped at a Management API upstream connection timeout during OS ingestion. Independent SQL found30 committed chunks/300,000 identities, last ordinal29; six completed geography/population/Census releases were ready, remaining eight still loading. No incomplete release was promoted. The operator continuation reconciles complete stored prefixes before any subsequent writes; the source fixture also detects a changed binary prefix. This timeout is not attributed to AI, schema, hosting duration or a proven PostgreSQL data defect.

A second Management interruption was independently reconciled at115 chunks/1,150,000 identities. Binary data now uses the existing service-only OS/place importer RPCs through the existing Supabase Node SDK, selected before dispatch, with canonical batch SHA verification. Direct PowerShell REST was rejected by Supabase's secret-key browser guard; the supported server SDK preserves that guard, credentials stay private and no public/browser importer is enabled. There is no error-triggered automatic transport switch or resend; any interruption stops for reconciliation. No payload-size root cause is asserted for the upstream failures.

Actual Production Data API read probe passes geography/population and TS007A/TS066 profiles for a public Soho area origin, with distinct original universes. This is not a selected-property/observed-demand claim. The publishable client cannot call the private source reader. Zero provider and AI calls.

Final measured import/verification and protected-delivery receipts are recorded below after observation. This source preparation is not an operational paid report proof. Existing source-provider configuration/rights, approved sales/contract/durable delivery, budgets, application promotion and bounded genuine Live proof remain launch gates.

## Operator verification

Dot-source the existing ignored fixed-target SQL helpers, then dot-source `scripts/data/reuse-london-production.ps1` for audit. `-Apply` is an explicit mutation; it is not called by app, CI, deploy or cron. Keep helpers/credentials private. Run `supabase/verification/production-london.sql` after complete reuse. Initial-empty `production-setup.sql` is historical setup verification and must not be misused once sources or real accounts exist.

Development Ready fingerprint and reservations must match the preflight after reuse. Measure Production controls and source fingerprints separately; do not assert actual Google, email, paid generation or Live delivery passed from SQL/fixtures.

Current code check:348 tests, lint/types/build passed; real built HTTP/public/private indexing/campaign privacy checks passed. Actual browser shows the Google option in the built login. Private scan:10 privileged values across692 repository/client files, zero hits. A proposed local server using the Production environment was rejected by automatic approval review without a detailed reason; it was not executed or labelled passed. Owner subsequently separately authorised non-commercial Production deployment of this PR after CI/protected Development delivery, with all sales/AI/source/scheduler/indexing/campaign controls disabled and no main merge.
