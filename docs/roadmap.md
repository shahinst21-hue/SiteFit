# SiteFit development roadmap

**Current authority, 10 October 2026:** Phases 8, 9, 9.5, 10 and 11 are complete. Phase 12 is **planning/review only**; [full proposal](phase12_plan.md), [reuse audit](phase-12-design-audit.md) and [eight-reference Phase 13 handoff](phase-13-design-handoff.md) await implementation approval. All eight UI references are confirmed complete; design examples are not evidence. D84 raises only the internal database checkpoint to 400,000,000 bytes (actual 374,855,347; margin 25,144,653). No upgrade, paid AI or Production/later implementation authorised. Earlier dated checkpoints are historical, not current authority.

**Authoritative checkpoint, 9 October 2026:** Phases 8, 9, 9.5 and 10 are complete within their recorded qualified scope. Phase 10 implementation/completion PRs #28/#31 and post-main CI 37986830919 passed; main baseline is `02a0d4c011548dde0aa13dba7b46948c1b1811e5`. The owner requests **Phase 11 planning/review only**: [complete proposal](phase11_plan.md), [earlier-model/prompt/decision audit](phase-11-design-audit.md). No scoring policy in that proposal is approved or activated yet. Implementation awaits explicit approval; Phases 12/13 remain separately authorised later work. Earlier dated checkpoints below are history, not current phase authority.

Current checkpoint, 9 October 2026: Phase 8 is complete through protected PRs #24/#25 and passing post-merge CI. D80 authorises immediate [Phase 9 existing-provider implementation](phase9_plan.md) under D78/D79; GLA/new providers/importer are excluded. [Phase 9 status](phase-9-status.md) records actual gates. No purchase, subscription, Full Report generation or Phase 10 is authorised. Scoring/grouped prompts remain frozen candidates; calibration resumes only in separately authorised later work. Earlier dated paragraphs below are historical.

Current authority: Phase 6 and the [Free Snapshot UI refinement](free-snapshot-ui-status.md) are complete and frozen. The owner now approves Phase 7 Steps 7.0–7.9 under [phase7_plan.md](phase7_plan.md), with D73's private frozen Checkout contact amendment. Phase 7 is complete through protected PR #20 and successful post-merge CI; [phase-7-status.md](phase-7-status.md) records all 23 gates and remaining separately authorised pre-launch work. Phase 8 remains unauthorised.

Recorded 2026-10-03; reviewed 2026-10-04. Phases 0–5 are complete. See [phase-3-status.md](phase-3-status.md) for implemented schema/Auth and [phase-4-status.md](phase-4-status.md) for address resolution/property persistence and their completed Definitions of Done. Phase 2.5 is complete under the updated UK-wide, Mobile First contract; see [phase-2.5-status.md](phase-2.5-status.md) for observed checks and protected delivery. Phase 5 is complete under the revised approved plan (see [phase-5-status.md](phase-5-status.md)); Phases 6–7 are also complete; Phases 8–17 remain planning only. Implement one phase per authorised task; passing a gate does not authorise the next phase. Record actual checks before declaring completion.

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

- Status: **implementation approved and in progress** under D72/D73 and [phase7_plan.md](phase7_plan.md); D74 revises verification scope. Phase 6/PR #18 are complete and frozen. See [actual status](phase-7-status.md).
- Objective: permanent verified Google/email account → owned eligible Free Snapshot → one-off £29 Stripe **Test Mode** Checkout → durable account/analysis entitlement. Free Snapshot still requires no signup; existing guest history must survive supported upgrade/secure claim without regeneration and be recoverable on later sign-in.
- Planned scope: server-selected Price/product, narrow payment persistence, signature-verified/idempotent webhook, bounded success/cancel/status flow and minimal account history. Payment/access state is separate from immutable analysis/report state; do not change ready analysis status to `paid`.
- Verification: actual Local signed Stripe Test payment/reversal/replay and hosted entitlement proofs; protected Preview browser/Auth/UI/ownership/security/deployment proofs. No external Stripe Preview delivery requirement, relay, Cloudflare account or protection disablement (D74). Real identity/inbox/accessibility gates remain required. Test reversal rules are approved; live tax/refund/access/retention policies remain launch decisions.
- Definition of Done: complete plan checklist including no-signup free regression, permanent-only purchase, real Google/email new/existing identity continuity/recovery, ownership/RLS/immutability, exact £29 test payment, signature/idempotency/concurrency/reversal, durable entitlement, no forged return grant, complete checks/hosted SQL/protected Preview/CI delivery. No Full Report, paid AI, financial calculation, PDF, report email or Phase 8 execution. **Production purchasing/live Stripe remain disabled regardless of credentials; live activation requires a later explicit gate after report delivery exists.**
- Mandatory pre-launch payment gate: configure Stripe Live directly to the final SiteFit Production webhook and verify actual signed delivery, idempotency, atomic payment confirmation and correct permanent-account entitlement against the approved final Production configuration before enabling real purchases. Separate owner approval, commercial policies, report readiness and real-payment verification budget are required. No webhook proxy belongs in the intended architecture unless a genuine Production requirement is later approved.

## Phase 8: Full Location Data

- Objective: gather approved full-report location context.
- D70 keeps category-capable POI and broader catchment/mobility/customer/competitive-strength investigation in Phase 8. The earlier proposal to bring a POI subset into Phase 6 was superseded; no additional provider was admitted.
- Codex implements: selected adapters and evidence for catchment, demand, competitors, complementary businesses, accessibility, mobility and local business signals within approved source coverage.
- Human action: any provider permissions/budget or dataset selection that materially affects report promises.
- Definition of Done: real benchmark coverage is checked; units, date/geography and source limitations are visible; proxies are labelled; no proprietary footfall or fabricated exhaustive coverage.

## Phase 9: Premises History

- Objective: present supported premises observations and unresolved history.
- Proposed implementation: reuse Phase 8 evidence, add one bounded admitted planning-history source, and allow small reviewed factual imports for a sourced premises timeline. Exact unit/date matching, separate building context, immutable deeper collection and explicit gaps replace a broad title/lease/occupier database. See [complete proposed sequence and DoD](phase9_plan.md); approval is pending.
- Human action: source permissions or user-supplied evidence where relevant.
- Definition of Done: events link to sources; conflicting/ambiguous identities remain explicit; absent records are not treated as proof of vacancy, failure, lease permission or a complete history. No national historical property database.

## Phase 10: Economic Engine

Owner-authorised Phase 10 implementation: [approved plan](phase10_plan.md) and [status](phase-10-status.md). Separate source-first Financial Engine backend with labelled illustrative scenarios and deterministic arithmetic; no final interactive UI or embedded form/calculations in Snapshot, Full Report or PDF. Independently prepare rental evidence from both existing PropertyData endpoints; incompatible area falls back to qualified benchmark. Six existing trial credits maximum; no new providers, purchases or historical-name integrations.

- Objective: deliver separate prepopulated economic capabilities and immutable scenarios, with optional edits. Supported rent context independently feeds later Full Report preparation; purchase/report access never depends on engine inputs.
- Codex implements: deterministic calculations, validated units/periods, versioned methods, rounding and scenario outputs with missing-input behaviour.
- Owner scope/formula and six-credit existing-trial authority recorded; genuine expired access or new expenditure requires separate approval.
- Definition of Done: independent expected-value tests pass for approved formulas and boundary conditions; missing inputs remain unknown; AI performs no core financial calculation; scenarios are not forecasts of success.

## Phase 11: Evidence, Scoring and Decision Logic — planning only

- Objective: answer the selected business's location strengths/risks, with an explainable supported number and separate premises feasibility, evidence adequacy and Decision Readiness. No customer must analyse raw datasets to get a useful conclusion.
- Audit first: [inventory and assessment](phase-11-design-audit.md) distinguishes the implemented Phase 6 scorer, fictional UI score, advanced 34-parameter prototype, frozen independent audit and D76's accepted boundaries. Candidate coefficients and historical provisional-score rejection are not approved runtime policy.
- Proposed baseline: [Steps 11.0–11.9](phase11_plan.md#8-numbered-execution-steps--only-after-approval), one deterministic fixed-scope **preliminary resident/workplace context index**, existing-source market/access/premises/rental reasoning, claim-specific admission/conflicts, separate binding readiness and private immutable assessment. The narrow score scope and profile priorities require approval; no complete commercial-suitability promise or D77 competition score.
- Reuse Phase 8 metric/source/release/spatial framework, Phase 9/9.5 qualified events/references and Phase 10 independent rental context. Financial Engine calculations/inputs remain separate from Free Snapshot, Full Report and PDF under D82.
- Owner action: approve the four actual policy/architecture choices in [plan Section 11](phase11_plan.md#11-risks-dependencies-and-owner-decisions). No baseline purchase, new provider or paid AI request required.
- Definition of Done: [all proposed gates](phase11_plan.md#12-definition-of-done--proposed-all-unchecked), including numerical admission and bounded real-packet usefulness, truthful gaps/risks, source rights, immutable ownership/replay/security, required regression and protected delivery. No unverified scoring or customer acceptance claimed.
- Boundary: no Phase 11 implementation in this planning task. Phase 12 owns authorised AI narrative/semantic evaluation; Phase 13 owns genuine paid report/dashboard/PDF and final display. Existing historical Free reports and customer UI remain frozen; UX/UI remains not approved for launch.

## Phase 12: AI Report Engine

- Status: complete proposal awaiting owner implementation approval. [Steps 12.0–12.9 and full DoD](phase12_plan.md); [implemented prompt/schema audit](phase-12-design-audit.md).
- Objective: useful evidence-linked business-specific report intelligence from existing stored evidence/assessments, including independent qualified rent context. Preserve exact Resident & Workplace Context Index scope/publication, separate premises/readiness and material opposition. No new scoring policy or finance calculations in report.
- Proposed implementation: two parallel grouped analyses plus one dependent synthesis, one shared repair, deterministic figures/Appendix, narrow immutable Full edition beside ready Free, actual-stage bounded background completion/recovery and stored-only reads. Report-grounded questions use deterministic common answers and separately budgeted bounded model answers. No final dashboard/PDF code in Phase 12.
- Owner gates: implementation approval; separately bounded live AI QA budget; material content acceptance. Current planning authorises none of those paid calls. No new provider/account/infrastructure purchase baseline.
- DoD: versioned validated useful intelligence for three concepts; exact evidence/metric/scope/conflict lineage; failures retain accepted groups; legacy history unchanged and read-time external calls zero; real lifecycle/recovery, security/ownership/refund/capacity, grounded questions and export contracts; full regression/exact-head CI/protected merge. Numeric index never conceals unresolved premises requirements.

## Phase 13: AI Native Interactive Report Dashboard & Multi Level PDF Export

- Objective under D85: dashboard is the primary product, PDF its shareable/archive export. Users must understand the conclusion, reasons, data and next action without downloading PDF. [Complete eight-reference handoff](phase-13-design-handoff.md) governs visual/component direction; example figures/claims/tab content are not evidence.
- Separate approval required. Implement result-first tabs, cards, maps, appropriate charts, evidence/source/method inspection, bounded report questions, genuine controls and professional actual-stage progress/recovery. Do not automatically preserve an older dashboard where it conflicts with references.
- Exact Phase 11 context index only; independent readiness/premises and gaps. Qualified rental evidence belongs in main report. Financial Engine remains separate: no financial form/calculations/scenarios in Free/Full/PDF. New section keys require forward validation/migration, not legacy 24-tab assumptions.
- Mandatory first Full delivery: print-specific **current-tab PDF and full-report PDF**, same immutable report/version/digest. Every tab export independently identifies property/business/date/sources/limitations; complete PDF includes final Appendix. Retries render stored content only.
- Owner decisions: final design/content/function acceptance, rental tab label, question allowance, export/download/retention terms. Technical choices must respect existing source/map/photo rights; no new service/purchase implied.
- DoD: useful in-dashboard decision without PDF; all visible controls work or are honestly unavailable; stored-only authorised reads and report-grounded answers; source/figure/UI/PDF agreement; responsive/keyboard/real 200% checks and owner acceptance; secure recoverable exports with no repeat charge/regeneration/history change. Current UX/UI remains not approved for launch.

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

- D85 adds actual end-to-end dashboard/current-tab and full-report PDF checks: owned access, report-grounded questions, browser compatibility, performance, export recovery and immutable UI/PDF agreement. Phase 13's owner acceptance remains separate; this does not authorise new work in Phase 12 planning.

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

## Owner priority update — 9 October 2026

D78 changes prioritisation to revenue validation first: stop unnecessary supplementary spatial QA and avoid speculative engineering work. Preserve minimum honest-sale, customer-security and reliable-delivery requirements; mandatory unresolved gates remain explicit. This does not authorise live payments, launch, a new phase or selling an unavailable Full Report. Final paid-deliverable work and willingness-to-pay validation require their appropriate explicit authorisation; do not extend Phase 8 to implement them.

## Accepted delivery priorities — 9 October 2026

D79 preserves completion of each approved phase while applying D78. Close Phase 8's essential security/CI/protected-delivery gates first. Keep property history, economic calculations, scoring and AI work in Phases 9–12 focused on the paid report; Phase 13 delivers the real Full Report, AI Native Dashboard and PDF. Phases 14–15 provide dependable delivery/recovery, cost control and security. Phases 16–17 prioritise the pre-payment journey, conversion and real willingness to pay. Supplementary engineering polish must not replace that sequence. This update does not start another phase within Phase 8 or enable Production/live payments.

## Phase 8 completed implementation gate — 9 October 2026

Steps 8.0–8.9 and mandatory data/security/Preview/regression gates are verified with qualified source outcomes. Protected PR #24 merged after exact-head CI; post-merge CI 37921803941 passes. See phase-8-status.md for the complete evidence/Definition of Done and the separate protected completion-document record. D77 leaves unique competitor counts/percentiles unavailable. D78/D79 guide the paid-deliverable sequence without starting Phase 9 here; final visual UX/UI remains not approved for launch. Production purchase/deployment, Full Report, Economics execution, PDF and scoring/prompt calibration remain outside this completed phase.

## Phase 9 completed — 9 October 2026

Existing-provider premises history is implemented and verified through protected PR #26 and passing post-merge CI 37934156053; [status](phase-9-status.md) records all Steps 9.0–9.9, qualified evidence, immutable storage, security, costs and limits. The completion record follows protected CI separately. No Phase 10 authority, new provider, purchase, Production activation or Full Report generation follows automatically.

## Phase 9.5: AI Web Evidence Discovery — completed 9 October 2026

D81 inserts a bounded paid-preparation discovery stage after Phase 9, without renumbering/reopening completed phases. Scope: property-specific commercial rent and verifiable past business activity, exact-unit/date/source/rights admission, reconciliation with existing evidence and compact immutable persistence. [Plan](phase9.5_plan.md), [status](phase-9.5-status.md). No Full Report UI, financial execution or Phase 10 implementation. Recurring paid search is not enabled by the one US$0.50 development proof. Required verified/security/CI/protected-delivery gates remain explicit.

Protected PR #29 and post-merge main CI 37978182341 passed. Initial automatic admission is limited to permitted independently verified FSA observations; agency rents and historical narratives remain qualified references where rights/date/unit proof is unavailable. This is bounded discovery with explicit missingness, not comprehensive historical tenancy or a current-rent feed. Completion does not authorise a later phase, recurring AI spend or additional provider investment.

Phase 10 separation: later Full Report UI/PDF consumes qualified rental evidence only, never Financial Engine inputs/calculations. Final separate-engine interactive UI is not built in Phase 10. No Phase 11–13 implementation is authorised.

## Phase 10 verified implementation — 9 October 2026

Steps 10.0–10.8 and required arithmetic/source/security/immutability/storage/regression proofs pass; protected PR #28 and post-main CI 37984861941 pass. Final separation/completion correction follows protected CI. See phase-10-status.md. Financial Engine remains a separate backend capability, without final interactive UI; future Full Report consumes qualified rental evidence independently. No Phase 11 is authorised.

## Phase 11 authorised under D83 — 2026-10-09

Steps 11.0–11.9 are under implementation. Initial numeric output is Resident & Workplace Context Index, subject to scoped evidence/method admission; broader decision and premises/readiness remain separate. Phases 12/13 are not authorised. [Status](phase-11-status.md) records actual remaining gates.

## Phase 11 completion — 10 October 2026

Steps 11.0–11.9 complete under D83 through protected PR #32 and successful post-main CI; see [completion record](phase-11-status.md). Resident & Workplace Context Index remains a dated density-only hypothetical construct, with separate premises/readiness. No customer numerical UI or Phase 12/13 is activated. Subsequent phases require separate owner approval. Storage is 374,855,347 bytes; preserve the 375,000,000 checkpoint before additional hosted writes.
