# Phase 3 implementation and verification record

Recorded 2026-10-03. Scope: Supabase Database and Authentication only, including the additionally requested Blog persistence. Phase 4 and all later implementation remain unstarted. Phase 3 is not complete until the real hosted inbox/browser magic-link flow and final remote delivery gates pass.

## Authentication

Existing Login is now an email-only magic-link form with validation, loading, fixed failures and sent state. Browser/server Supabase SSR clients are separate; the application uses validated publishable credentials only. Server clients are request-scoped and `server-only`; verified `getUser()` protects the small `/account` page and profile reads. Scoped Proxy refreshes cookies, carries them to render/browser and sets private/no-store/no-referrer. Public marketing, Blog and checker remain accessible without signing in. Checker entries remain memory-only; no analysis submission is implemented.

Current emails use Supabase's default template and PKCE `/auth/callback`, with same-browser verifier requirement. Only local `/account` or `/check-location` return destinations are accepted. Invalid/expired/wrong-purpose/replayed links return a fixed new-link error. `/auth/confirm` provides a token-hash confirmation POST path for integration testing and a future custom SMTP template; GET does not consume the token. Sign-out revokes the current session via a same-origin Server Action; signed-out and failure states are handled. No password/social auth, complex dashboard or report email service.

The development project rejected custom email-template modification with HTTP 400 because it uses the free-tier default mail provider. That attempt did not install a template. Auth redirect settings were then successfully applied separately, retaining default email templates. SMTP recipients may be limited to organisation members. No paid upgrade or mail service is provisioned. Privacy/Terms now truthfully describe development email/session cookies and remain legal-review drafts.

## Schema, migrations and ownership

Migration `20261003210000_initial_sitefit_schema.sql` defines profiles, properties, analyses, analysis_inputs, data_snapshots, evidence_items, competitors, premises_events, economic_models, reports, report_sections, payments, pdf_exports, system_events and blog_posts. Database enums cover the exact ten analysis states, three categories, six evidence classes, knowledge states and four Blog states. Meaningful PK/FK/unique/check constraints, obvious indexes and consistent timestamps are included. Full fields/deletion choices are in [database.md](database.md).

Auth UUID → minimal profile → analysis owner is the private ownership chain. All children resolve through their analysis; composite FKs reject cross-analysis input/evidence/report provenance. All fifteen tables have RLS. Client grants permit own profile reads/display-name updates, own draft creation/business choice and append-only own draft inputs. Clients cannot alter owner/property/lifecycle, derived results, payments, exports or logs. Canonical properties are readable only through owned analyses. Financial/evidence deletion is restricted; no retention duration or automatic destructive cleanup policy is invented.

Blog JSONB supports the Phase 2 rich model, images/author/CTAs and all metadata. Anonymous/authenticated reads expose only published past-dated content. All client writes are denied. No admin/editor role, CMS, agent or publication flow is introduced. Local public articles stay selected behind the existing repository; a future Supabase mapper/writer and complete ingestion validation are documented without changing pages.

## Observed verification

- Started from clean, updated `main` at `6ca698a`; dedicated branch `phase-3-database-auth`.
- CLI authentication already existed. It verified the active `sitefit-dev` project matches local configuration; linked it without asking for/persisting a database password. Hosted SQL reported Postgres 17.11 and zero initial application tables.
- Migration dry-run and actual `db push --linked --skip-vault --yes` passed. Remote/local migration version `20261003210000` match; no dashboard-only schema change.
- Generated TypeScript database types from hosted `public`; SDK profile access is typed. Presentation/wizard contracts stay independent of raw row types.
- Fresh isolated PostgreSQL reconstruction from committed migrations passed. The real SQL suite passed both locally and hosted: A/B read/write isolation across all private tables, forged ownership, cross-user input insertion, lifecycle/payment escalation, immutable/derived writes, own draft/input success, composite provenance, restricted deletion, all-table RLS, exact lifecycle and Blog status visibility. Fixture transactions rolled back.
- Hosted table inventory confirmed all fifteen tables and RLS=true. Hosted security advisor reported no issues at warning/error levels.
- Hosted Auth probe verified one-time email tokens, server-verified identities, A/B profile isolation, replay rejection and sign-out. It also exercised actual application confirmation POST/session cookies/protected Account/sign-out/replay errors. Disposable synthetic Auth users were removed; subsequent SQL confirmed zero remaining test accounts. No email was sent by this probe, so this is not inbox/PKCE delivery evidence.
- Final clean `npm ci`, lint, strict typecheck, 27 tests and production build passed. npm's Windows optional-dependency lock inconsistency was resolved by full generation/installation in a pristine directory; no existing dependency versions changed and audit reported zero vulnerabilities. Remote Linux delivery remains a separate gate.
- Production runtime public checks passed: twelve pages/articles, twelve internal paths, existing SEO/JSON-LD/sitemap/robots/social/404 checks, anonymous Account redirect, fixed failed callback redirect/no-store, incomplete-link retry page.
- Actual encrypted Supabase settings were configured in Vercel Preview only. Production and automatic main deployments remain unchanged.
- Browser checks on the production build verified empty/invalid email validation, keyboard submit, focus on the invalid field, signed-out Account redirect, fixed invalid-link messaging and incomplete-link retry. Login at 320/768/1440 and confirmation at 320 px had no horizontal overflow, one H1 and real labels; no password field. Console warnings/errors were empty for these checks. A Login screenshot was saved outside Git and viewport overrides reset. A complete inbox/authenticated browser journey is still unverified.
- Hosted public Auth settings confirmed email/signups enabled, email confirmation required and Google/Apple/Facebook disabled. Declared configuration diff has zero remaining updates; undeclared platform settings are preserved.

## Outstanding gates

Real inbox/browser PKCE verification requires a development recipient and opening its email link in the same browser that requested it. An asynchronous request for the test email is pending. Generated/admin tokens and SQL role tests do not replace this gate. After the email check, verify refresh, sign-out and used-link failure, then final required CI/protected merge and clean main. Remote PR/Preview evidence and browser inspection will be recorded before delivery.

## Deferred work and limits

No Google/address resolution, providers, Free Snapshot, payment checkout/webhook, economic/evidence engines, AI/report/PDF generation/delivery, admin, CMS or publishing agent. No database rows representing real property analyses or completed payments are seeded. Exact future sign-in placement, entitlement, retention and legal launch policies remain later decisions. Docker-backed full local Supabase remains unavailable; actual hosted SQL/Auth and isolated PostgreSQL rebuilds are separate verified checks. Default hosted mail restrictions and same-browser PKCE are development limits; public launch email/anti-abuse hardening needs later service decisions.

## Definition of Done

- [x] Supabase Auth is implemented.
- [ ] Magic Link inbox/browser flow works against hosted development.
- [ ] Default PKCE authentication callback verified end-to-end.
- [x] Application sign-out works in hosted-backed runtime checks.
- [x] Initial schema exists through migrations.
- [x] Application schema reconstructs from migration history.
- [x] Required fourteen core tables exist.
- [x] Blog persistence model exists.
- [x] Required RLS is enabled.
- [x] User A cannot read/mutate User B protected data.
- [x] Published Blog architecture can be publicly readable.
- [x] Non-published Blog rows are protected.
- [x] TypeScript database integration is coherent.
- [x] Changed/new source and documentation secret review passed; actual local values and service metadata are excluded. Staged/committed review is also required at delivery.
- [x] Lint passed during implementation.
- [x] Strict type checking passed during implementation.
- [x] All 27 tests passed during implementation.
- [x] Production build passed during implementation.
- [ ] Remote CI passes.
- [x] Hosted development migration and SQL policies are verified.
- [x] Documentation is updated.
- [ ] Protected merge completed and main clean/matching origin.
- [x] Phase 4 has not started.
