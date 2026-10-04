# SiteFit development roadmap

Recorded 2026-10-03. Phases 0–3 are complete. See [phase-3-status.md](phase-3-status.md) for implemented schema/Auth and the completed Definition of Done. Phase 2.5 is complete under the updated UK-wide, Mobile First contract; see [phase-2.5-status.md](phase-2.5-status.md) for observed checks and protected delivery. Phases 4–17 remain planning only. Implement one phase per authorised task; passing a gate does not authorise the next phase. Record actual checks before declaring completion.

The Product Contract in [product.md](product.md) controls scope. Definitions of Done below are planning acceptance criteria, not claims that checks passed. A phase requiring external access remains unverified until the relevant access and checks are available.

## Phase 0: Product Contract and Benchmark

- Objective: establish approved scope, architectural direction and conceptual benchmark scenarios.
- Codex implements: initialise Git and create the eight required documents; record accepted decisions, proposed schema, future tests and explicit unknowns. No application or infrastructure.
- Human action: supply real UK property addresses for Benchmarks A, B and C later. No credentials required. These inputs explicitly do not block documentation completion.
- Definition of Done: eight documents exist and agree; all approved rules are recorded; conceptual benchmarks have no invented addresses; unknowns are recorded; no later phase or secrets are introduced; Git status is checked.
- Status: documentation foundation complete on 2026-10-03; three benchmark addresses remain outstanding and non-blocking. No executable benchmark results exist.

## Phase 1: Repository, Infrastructure and Environments

- Status: complete. Local checks, remote CI, branch protection, hosted development Supabase connectivity and a protected Vercel Preview are verified. Docker-backed local services remain unavailable and are a documented non-blocking limitation. See [infrastructure.md](infrastructure.md) and [phase-1-status.md](phase-1-status.md).

- Objective: create a minimal, production-quality development and deployment foundation.
- Codex implements: Next.js App Router shell, strict TypeScript, Tailwind, minimal directory structure, safe environment example and ignores, Supabase development configuration, Vercel deployment preparation, and CI for lint, type checks, legitimate tests and production build. Update developer commands and configuration documentation.
- Human action: provide GitHub repository/access, Vercel project/account connection, Supabase development project/access and secure environment settings where needed; configure branch protection if Codex lacks permission.
- Definition of Done: local app runs; strict TypeScript and Tailwind verified; Local/Preview/Production separated; environment files safe; required local checks pass; CI configured and remote execution verified when access supplied; Supabase connectivity and Vercel Preview deployment verified when credentials/access supplied. Document unavailable checks explicitly; never claim a deployment passed without checking it. No schema, auth flows or product pages.

## Phase 2: UX Foundation and Public Website

- Status: complete. Local checks, browser UX/responsiveness, remote CI and authenticated Preview passed. Implementation merged through protected PR #2; post-merge CI passed and `main` was clean. Completion documentation also uses the protected PR workflow. See [phase-2-status.md](phase-2-status.md).
- Objective: establish the public experience and consistent navigation.
- Codex implements: required public pages, four-step frontend wizard, responsive/accessibility foundations and honest availability/empty/error/loading states. The user additionally authorised the Blog index/article frontend, structured content provider/model, safe rich rendering, metadata, JSON-LD, sitemap/robots and documentation for later controlled publishing.
- Human action: no aesthetic approval needed; SiteFit name and implementation judgement are explicitly authorised. Real contact details and reviewed legal policies are later launch requirements, not blockers for the requested development placeholders.
- Definition of Done: all required pages and navigation work; wizard validation/state preservation pass; price is centrally configured; responsive/accessibility checks and lint/types/tests/build/remote CI pass; Blog content/SEO architecture works; documentation and protected merge are complete; no fake analysis or later-phase backend exists.

## Phase 3: Supabase Database and Authentication

- Status: complete. The user verified real hosted Magic Link delivery, same-browser PKCE, Account access/refresh, sign-out and consumed-link rejection. Hosted migrations/RLS/Auth-session probes, local validation, remote CI and protected Preview pass. PR #4 merged through branch protection; post-merge CI passed and main was clean/matching origin. Completion documentation uses the same gated workflow. No Phase 4 work.
- Objective: establish persistent records and enforceable ownership.
- Codex implements: minimum required schema, migrations, Supabase Auth flows, RLS/storage foundations and schema/access tests; extend the proposed schema only as needed.
- Human action: hosted inbox/browser magic-link verification is complete; none outstanding for Phase 3. Existing CLI access supports development migrations/configuration. Public exploration remains open; private persistence requires verified identity. Exact future sign-in placement, purchase policy and retention periods remain decisions for the features that use them; this phase creates no saved-checker/purchase flow.
- Definition of Done: reproducible migrations; auth works under approved policy; cross-user access is rejected; privileged credentials remain server side; future schema stays documented rather than speculative implementation.

## Phase 2.5: Product direction, UI and conversion redesign

- Status: complete. The minimal journey, progressive economics, mature UK-wide experience and fictional Sample Report passed local/runtime/hosted Auth/browser checks, final-head CI, protected PR #6 merge and post-merge CI. See [phase-2.5-status.md](phase-2.5-status.md).
- Objective: a mature analytical product experience, UK-wide and Mobile First, with credible £29 decision value.
- Implements: contract/architecture/decision updates before code; Homepage, navigation, Address → Business Type → Snapshot, optional progressive economics, Pricing, Sample Report, Blog/article readability, Login/Account and coherent controls.
- Human action: no additional design approval required. Real providers, legal/support launch inputs and financial rules remain later gates.
- Definition of Done: minimal anonymous journey; economics optional/skippable; UK-wide copy; truthful mature evidence language; 390px-first responsive/keyboard checks; £0/£29 configuration; Blog/SEO/Auth regression; lint/types/tests/build/runtime/remote CI; documented results and protected merge/clean main. No Phase 4 backend.

## Phase 3.5: Brand, UI and UX refinement

- Status: complete. Local/runtime/hosted Auth/browser checks, final-head CI, authenticated Preview, protected PR #8 merge and post-merge CI pass. Completion documentation follows the same protected workflow. See [phase-3.5-status.md](phase-3.5-status.md).
- Objective: refine the approved temporary brand, product-led Homepage, anonymous wizard, Snapshot, optional economics, Pricing, fictional Sample Report, Resources/articles and shared/Auth surfaces.
- Codex implements: original reference-informed presentation and reusable components; one-use React-memory Home entry; local published-resource search/category/sort. No new backend, persistence or service dependency.
- Definition of Done: consistent supplied wordmark; materially stronger coherent UI/UX; 390px-first responsive/keyboard checks; preserved £0/£29, evidence truth, Auth and Blog/SEO; lint/types/tests/build/public runtime/remote CI; documented actual results; protected PR merge and clean matching main.
- Phase 4 remains a separate unauthorised gate.

## Phase 4: Address Resolution and Property Identity

- Objective: resolve a supplied address to a reviewable property identity.
- Codex implements: Google address resolution/Geocoding and place boundary, user confirmation, ambiguity handling, canonical property references and UK nation/region/local-authority identity checks.
- Human action: Google Cloud/Maps access, billing, restricted keys in secure settings, verified usage terms; benchmark addresses if still absent. Verify UK coverage and jurisdiction-specific resolver capabilities; no London-only boundary.
- Definition of Done: real supplied UK addresses resolve or return explicit ambiguity/failure; unsupported geography is handled; keys are protected; no inference of premises suitability from an address match.

## Phase 5: Data Integration Framework

- Objective: collect external data with a stable evidence contract.
- Codex implements: adapter boundaries when needed, normalised result/provenance contract, availability states, timeouts, rate limits, permitted caching and source contract tests. Define evidence IDs and source-to-observation links now for later engines.
- Human action: approve provider usage/licensing and budget; provide account access where required.
- Definition of Done: implemented adapters have verified capabilities, bounded failures and clear provenance; unavailable/stale data is explicit; storage respects provider terms; no invented observations or fragile property scraping.

## Phase 6: Free Snapshot Engine

- Objective: produce a useful free assessment of one location.
- Codex implements: approved subset of evidence collection and snapshot presentation, freshness and insufficient-evidence handling.
- Human action: approve exact Free Snapshot content and free-to-paid boundary before dependent work; supply real benchmark properties.
- Definition of Done: benchmark snapshots reflect available sources with traceable facts and visible unknowns; missing sources do not fabricate completeness; no success score or payment implementation.

## Phase 7: Payment

- Objective: sell configurable Full Report entitlements through Stripe Checkout.
- Codex implements: server-side configured pricing, checkout, verified/idempotent webhooks, payment records and entitlement guards.
- Human action: Stripe access and secure test/live settings; approve tax treatment, refund policy and entitlement duration. Initial price assumption is £29, configurable.
- Definition of Done: test-mode success, cancellation, failed payment, duplicate/out-of-order events and unauthorized access are tested; browser redirects cannot mark payment paid; price is not hardcoded in business logic. Live activation is a separate authorised account action.

## Phase 8: Full Location Data

- Objective: gather approved full-report location context.
- Codex implements: selected adapters and evidence for catchment, demand, competitors, complementary businesses, accessibility, mobility and local business signals within approved source coverage.
- Human action: any provider permissions/budget or dataset selection that materially affects report promises.
- Definition of Done: real benchmark coverage is checked; units, date/geography and source limitations are visible; proxies are labelled; no proprietary footfall or fabricated exhaustive coverage.

## Phase 9: Premises History

- Objective: present supported premises observations and unresolved history.
- Codex implements: permissible event collection, identity/date matching, evidence links and unknown-state presentation.
- Human action: source permissions or user-supplied evidence where relevant.
- Definition of Done: events link to sources; conflicting/ambiguous identities remain explicit; absent records are not treated as proof of vacancy, failure, lease permission or a complete history. No national historical property database.

## Phase 10: Economic Engine

- Objective: calculate reproducible financial scenarios from explicit inputs.
- Codex implements: deterministic calculations, validated units/periods, versioned methods, rounding and scenario outputs with missing-input behaviour.
- Human action: approve formulas, scenario assumptions, inclusion of costs and presentation; provide benchmark economics or approve labelled synthetic calculation-only cases.
- Definition of Done: independent expected-value tests pass for approved formulas and boundary conditions; missing inputs remain unknown; AI performs no core financial calculation; scenarios are not forecasts of success.

## Phase 11: Evidence Engine

- Objective: harden report-wide claim traceability and uncertainty handling.
- Codex implements: validation of the Phase 5 evidence contract, claim links, derivation lineage, freshness/coverage rules and contradiction handling.
- Human action: approve material sufficiency/freshness policies and evidence presentation.
- Definition of Done: important claims resolve to valid permitted evidence; official/commercial provenance and estimate/inference labels remain distinct; unsupported claims fail validation or become Unknown/Insufficient Evidence.

## Phase 12: AI Report Engine

- Objective: synthesise validated evidence into an honest structured report.
- Codex implements: AI provider abstraction, versioned prompts/schema, validation, constrained evidence references, bounded retries and failure handling.
- Human action: provider access and secure credentials, budget and approval of material report wording/rules.
- Definition of Done: schema and evidence validation pass; fabricated references, missing-data invention and success probabilities are rejected; deterministic financial values remain unchanged; provider-specific objects stay behind the boundary.

## Phase 13: Full Report UI, PDF and Delivery

- Objective: deliver the paid report consistently across web and PDF.
- Codex implements: approved 16-section report UI, permitted PDF generation/storage, secure delivery and version-consistent regeneration.
- Human action: approve report template and delivery/account policy; external delivery account access if a service is selected.
- Definition of Done: authorised paid users access the right report; UI/PDF agree on evidence, calculations and unknowns; PDF layout and links are verified; failed exports recover without duplicate charges or leakage.

## Phase 14: Reliability, Cost Control and Internal Admin

- Objective: operate the single-location product within approved cost and reliability limits.
- Codex implements: bounded retry/recovery, observability, provider cost controls, rate limits and minimal restricted internal support tooling.
- Human action: approve budgets, operational thresholds and internal access roles.
- Definition of Done: interruption, timeout and duplicate-work scenarios recover safely; cost limits and privileged access are tested; logs redact sensitive data; admin remains internal and does not expand into an enterprise dashboard.

## Phase 15: Security, Testing and Production Hardening

- Objective: validate security and critical paths before launch.
- Codex implements: comprehensive relevant checks from [testing.md](testing.md), deployment hardening and documented remediation/recovery procedures. Security begins in earlier phases and is reviewed here.
- Human action: approve privacy/retention/legal policies and arrange any independent review; provide production access securely where needed.
- Definition of Done: identified blocking security defects are resolved; RLS, payment, evidence and delivery checks pass; secrets/dependencies are reviewed; production configuration and recovery checks are documented with actual results.

## Phase 16: SEO, Analytics and Marketing Infrastructure

- Objective: make the public product discoverable and measurable.
- Codex implements: broader discovery/marketing hardening beyond the user-authorised Phase 2 Blog/metadata foundation, plus approved analytics and consent behaviour. The publishing agent/CMS remains separate future work requiring authorisation.
- Human action: approve analytics/privacy choices and marketing claims; domain/service account access where needed.
- Definition of Done: private reports remain protected and non-indexable; public metadata is correct; tracking follows approved policy; no unsupported success claims or sensitive-input analytics.

## Phase 17: Beta and Production Launch

- Objective: validate the complete commercial product with users and launch under explicit approval.
- Codex implements: benchmark and beta fixes, release checks, launch/runbook documentation and deployment work within authorised access.
- Human action: supply all benchmark properties if still absent, approve measurable launch criteria, beta feedback, live billing/domain/account activation and production release.
- Definition of Done: end-to-end real-property benchmark review and critical paths pass; evidence gaps are disclosed; launch criteria and remaining risks are approved; deployed production and payment/delivery are actually verified; no phase is marked complete on intended rather than observed results.
## Phase 4 execution gate (2026-10-04)

Phase 4 address resolution/property identity is explicitly authorised and implemented on a dedicated branch. Postio, development migration/security tests, actual canonical persistence/reuse and manual entry through the deployed Preview are verified after secure human configuration. Protected PR #10 merged after required CI; post-merge CI and clean main/origin synchronization passed. Phase 4 is complete. Detailed checklist: phase-4-status.md. Completion does not authorise Phase 5; no analysis/provider data collection, payment, financial computation, report generation, PDF or publishing agent is introduced.
