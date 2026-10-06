# SiteFit development roadmap

Recorded 2026-10-03; reviewed 2026-10-04. Phases 0–5 are complete. See [phase-3-status.md](phase-3-status.md) for implemented schema/Auth and [phase-4-status.md](phase-4-status.md) for address resolution/property persistence and their completed Definitions of Done. Phase 2.5 is complete under the updated UK-wide, Mobile First contract; see [phase-2.5-status.md](phase-2.5-status.md) for observed checks and protected delivery. Phase 5 is complete under the revised approved plan (see [phase-5-status.md](phase-5-status.md)); Phases 6–17 remain planning only. Implement one phase per authorised task; passing a gate does not authorise the next phase. Record actual checks before declaring completion.

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
- Phase 4 required a separate instruction; it was subsequently authorised and completed as recorded below.

## Phase 4: Address Resolution and Property Identity

- Objective: resolve a supplied address to a reviewable property identity.
- Status: complete. See phase-4-status.md for real Postio, development persistence, security, Preview and protected-delivery evidence.
- Codex implements: Postio behind an internal provider boundary; explicit postcode Search → exact postal address selection → current server-side UDPRN resolve → canonical UUID → Business Type. Optional genuine autocomplete and manual-unverified fallback; preserve missing UK geography and coordinate precision. No mandatory confirmation step or analysis.
- Human action completed: Postio account/local key and development Supabase server secret; Preview-only secure server variables. No Google Cloud/Maps credentials required. Four representative nations verified with provider limitations retained.
- Definition of Done: real supplied UK addresses resolve or return explicit ambiguity/failure; unsupported geography is handled; keys are protected; no inference of premises suitability from an address match.

## Phase 5: Data Integration Framework

- Current authority: owner approved revised [phase5_plan.md](phase5_plan.md) Steps 5.0–5.9 on 2026-10-05. London-only V1, proportional framework and three proof adapters; [phase-5-status.md](phase-5-status.md) records actual gates. Deferred hardening needs a concrete trigger, and Phase 6 remains unauthorised.

- Objective: collect external data with a stable evidence contract.
- Codex implements: adapter boundaries when needed, normalised result/provenance contract, availability states, timeouts, rate limits, permitted caching and source contract tests. Define evidence IDs and source-to-observation links now for later engines.
- Human action: approve provider usage/licensing and budget; provide account access where required.
- Definition of Done: implemented adapters have verified capabilities, bounded failures and clear provenance; unavailable/stale data is explicit; storage respects provider terms; no invented observations or fragile property scraping.

## Phase 6: AI-native Free Snapshot — implemented under D70

- Objective: genuine first-level analysis and clear £29 deeper-investigation value, with conclusion-first factors, independent result colours and closed per-section reasoning. The approved [phase6_plan.md](phase6_plan.md) defines D70; actual evidence is in phase-6-status.md.
- Implemented: runtime Evidence/Data Quality, scoped Census comparison, versioned deterministic score-ready dimensions/hypothesis weights, bounded GPT 6.1 Sol section analysis/validated synthesis, owned immutable persistence and stored replay. Current-source gaps withhold all four composite scores. No new POI provider, purchased Full Report engine, payment or financial execution.
- Human action completed: ownership/model/data-handling/budget approval and secure local/Preview credentials; actual 200% zoom verified. Six independently selected actual inner/outer London commercial fixtures pass. No Phase 6 owner-dependent gate remains.
- Definition of Done: real category/inner-outer analytical-readiness gate, valid claim-support Evidence IDs, defensible comparisons/business relevance, measured AI evaluations/cost/runtime, historical freeze/security/source-failure/CI proofs. No unsupported score/footfall/viability, generic data viewer, or silently weakened gate. Free shows the locked three-output financial benefit and Run Financial Analysis outline without optional marketing, forms or execution. Economics use remains voluntary after verified purchase/main report. The Full Case action stays honestly non-paying until authorised payment.

## Phase 7: Payment

- Objective: sell configurable Full Report entitlements through Stripe Checkout.
- Codex implements: server-side configured pricing, checkout, verified/idempotent webhooks, payment records and entitlement guards.
- Human action: Stripe access and secure test/live settings; approve tax treatment, refund policy and entitlement duration. Initial price assumption is £29, configurable.
- Definition of Done: test-mode success, cancellation, failed payment, duplicate/out-of-order events and unauthorized access are tested; browser redirects cannot mark payment paid; price is not hardcoded in business logic. Live activation is a separate authorised account action.

## Phase 8: Full Location Data

- Objective: gather approved full-report location context.
- D70 keeps category-capable POI and broader catchment/mobility/customer/competitive-strength investigation in Phase 8. The earlier proposal to bring a POI subset into Phase 6 was superseded; no additional provider was admitted.
- Codex implements: selected adapters and evidence for catchment, demand, competitors, complementary businesses, accessibility, mobility and local business signals within approved source coverage.
- Human action: any provider permissions/budget or dataset selection that materially affects report promises.
- Definition of Done: real benchmark coverage is checked; units, date/geography and source limitations are visible; proxies are labelled; no proprietary footfall or fabricated exhaustive coverage.

## Phase 9: Premises History

- Objective: present supported premises observations and unresolved history.
- Codex implements: permissible event collection, identity/date matching, evidence links and unknown-state presentation.
- Human action: source permissions or user-supplied evidence where relevant.
- Definition of Done: events link to sources; conflicting/ambiguous identities remain explicit; absent records are not treated as proof of vacancy, failure, lease permission or a complete history. No national historical property database.

## Phase 10: Economic Engine

- Objective: calculate reproducible supplementary financial scenarios from optional explicit inputs in a separate post-main-report Economics area (D65/D69). The free locked benefit previews break-even sales, daily customers and cost/rent sensitivity; no formulas or financial execution move into Phase 6. Entitlement verification precedes inputs/run when the paid path is enabled. Main report purchase/readiness/access does not depend on it; new supplement versions preserve all ready historical reports.
- Codex implements: deterministic calculations, validated units/periods, versioned methods, rounding and scenario outputs with missing-input behaviour.
- Human action: approve formulas, scenario assumptions, inclusion of costs and presentation; provide benchmark economics or approve labelled synthetic calculation-only cases.
- Definition of Done: independent expected-value tests pass for approved formulas and boundary conditions; missing inputs remain unknown; AI performs no core financial calculation; scenarios are not forecasts of success.

## Phase 11: Evidence Engine

- Objective: extend report-wide traceability and uncertainty handling beyond the proposed minimum Phase 6 core.
- Proposed sequencing: valid Evidence IDs, claim support, quality/capability and contradiction preservation must exist before Free analysis; they cannot wait until Phase 11. This phase expands coverage/methods across the later full report rather than adding provenance for the first time.
- Codex implements after its own approval: broader claim links/derivation/quality policies and report-wide reconciliation, reusing the minimum core.
- Human action: approve material sufficiency/freshness policies and evidence presentation.
- Definition of Done: important claims resolve to valid permitted evidence; official/commercial provenance and estimate/inference labels remain distinct; unsupported claims fail validation or become Unknown/Insufficient Evidence.

## Phase 12: AI Report Engine

- Objective: expand bounded validated section analysis into the full report.
- Proposed sequencing: the minimal AI adapter, prompt/schema versions, relevant section packets, validation/repair and validated-only synthesis move into Phase 6 to demonstrate free analytical value. This phase adds deeper subanalyses/full synthesis, not the first AI interpretation.
- Codex implements after its own approval: full-report tasks/schemas/evaluations/cross-section reconciliation, preserving prior free history and source/metric/evidence contracts.
- Human action: provider access and secure credentials, budget and approval of material report wording/rules.
- Definition of Done: schema and evidence validation pass; fabricated references, missing-data invention and success probabilities are rejected; deterministic financial values remain unchanged; provider-specific objects stay behind the boundary.

## Phase 13: Full Report UI, PDF and Delivery

- Objective: deliver the paid report consistently across web and PDF.
- Codex implements: approved result-first report dimensions/subsections with short reason/small strength and closed per-section Why this result (D69), permitted PDF generation/storage and secure delivery from persisted ready content. Sixteen legacy storage keys are not a mandatory UI hierarchy; new keys require explicit migration. PDF rendering/retries use the frozen snapshot without provider retrieval, recalculation or AI regeneration.
- Human action: approve report template and delivery/account policy; external delivery account access if a service is selected.
- Definition of Done: authorised paid users access the original stored report; UI/PDF agree on evidence, calculations and unknowns; reopening performs no collection/calculation/AI generation; a later analysis leaves the earlier report unchanged; PDF layout and links are verified; failed exports recover without duplicate charges, historical-content changes or leakage.

## Accepted cross-phase gate: historical report snapshots

[D60](decisions.md), accepted 2026-10-04, binds later implementation to the persistence contract in [architecture.md](architecture.md) and [database.md](database.md). Recording this requirement does not start Phase 5 or authorise any later phase.

- Phase 5 and each later provider integration must document storage permission and retention duration for raw responses, normalised data, derived metrics, source references and retrieval timestamps. Verify that permitted historical representations/provenance support the report contract; resolve incompatible terms before adoption. Temporary search candidates outside the analysis are not automatically persisted.
- Collection and evidence phases must retain the permitted source snapshots, retrieval timestamps, identifiers and evidence references used by the particular analysis. Preserve its selected-property representation, business type and exact user-input versions independently of mutable canonical property data.
- Phase 10 must store deterministic outputs and economic model version against those exact inputs/evidence. Phase 12 must persist validated AI interpretation, AI provider/model, prompt version, report schema version and report generation timestamp with the complete lineage before ready; analysis timestamp must also be explicit. Ready reads cannot invoke either engine.
- Phase 13 must demonstrate that reopening a ready report reads its stored content, and UI/PDF use the same frozen report/sections. Change current property/provider data, model/prompt versions and cache availability in tests: the historical report remains unchanged and read-time provider/calculator/AI call counts stay zero. Repeating a check creates a new Analysis and Report version or equivalent snapshot; retries cannot overwrite the earlier ready result.
- Reliability/security validation must enforce the freeze through trusted write paths as well as ordinary client access. Test export retries, ownership/entitlements and retention handling without silent regeneration or replacement of historical content. Licence-required expiry/deletion must follow an explicit policy rather than a refresh fallback.

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

## Phase 5 execution gate — 2026-10-05

Steps 5.0–5.9 are implemented and verified through protected PR #13 and required/post-merge CI. Actual ONS/TfL/FSA framework persistence, zero-call historical replay, new analysis lineage, failures/ready guards and genuine London release/PostGIS checks pass. Three migrations and the two measured implementation adjustments are recorded in phase-5-status.md. Current UI/copy/pricing/design remain unchanged; no public collector or Phase 6 engine. Phase 6 requires a new explicit owner instruction; completion does not authorise it. Deferred production mechanisms remain gated by their documented triggers.

## Active gate: Phase 6 (authorised 2026-10-06)

Steps 6.0–6.9 are complete and verified in `phase-6-status.md`, including actual hosted/AI/Preview checks and protected PRs #15/#16 with required post-merge CI. The completion record follows its own protected documentation workflow. D70 supersedes earlier no-implementation/no-score and early-POI proposals. Foursquare/PropertyData/Valhalla remain deferred. Phase 7 and Phase 8 require new explicit authority; neither has started.
