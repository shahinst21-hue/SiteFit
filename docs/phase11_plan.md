# Phase 11: Evidence, Scoring and Decision Logic — proposal

Prepared 9 October 2026 at main `02a0d4c011548dde0aa13dba7b46948c1b1811e5`. **Planning and review only; implementation awaits explicit owner approval.** Phases 8/9/9.5/10 are complete with their documented qualifications. No service calls, purchases, activated scoring, migrations, changed customer UI or historical reports are authorised by this document. [Repository/decision/prototype/prompt audit](phase-11-design-audit.md) is the foundation; [Product Contract](product.md), D76–D82 and current owner instructions prevail over historical candidate prose.

## 1. Customer outcome and recommendation

Answer **“What strengths and risks does this place have for opening my coffee shop, restaurant or salon?”** SiteFit must give the customer an evidence-linked position, not require them to analyse datasets. Deliver a scoped conclusion, strongest supported advantages, material trade-offs, unresolved premises questions and up to three decision-changing actions. The number supports this answer; it does not replace it.

Recommend one existing analysis/evidence boundary, a small deterministic **preliminary location index**, and separate qualitative market/access/premises/readiness assessments. Do not restart the 34-parameter model, introduce three scoring engines or wait for complete competition, consent, service-hour and financial evidence before producing any numerical value.

**Important approval choice:** the initially publishable index has a deliberately limited, fixed scope: **resident and workplace context**. The customer label must be **“Preliminary location score — resident and workplace context”**, with the scored scope visible beside the number. It is an initial business-weighted indicator of the measurable local customer base, not a comprehensive suitability score. Competition, access, premises and rent are still assessed in the report and can materially change the decision, but do not get fabricated numerical transforms. This limitation cannot be hidden in an accordion or a generic disclaimer.

This is the commercially practical compromise with available sources. If the owner instead requires the initial number to measure comprehensive customer/competition/access attractiveness, the current sources do not support that promise; broader activation must remain blocked rather than inventing calibration. This plan seeks approval for the **limited preliminary** construct, not a silent redefinition of an approved complete score. A future fuller method gets a new fixed manifest and version after evidence supports it; it never upgrades an old result on reopening.

## 2. Alternatives considered

| Approach | Customer value | Evidence / effort | Main risk / recommendation |
| --- | --- | --- | --- |
| Reactivate advanced 34-parameter nonlinear candidate | Apparently rich, many detailed numbers | Unavailable utilities/denominators; many coefficients, quality factors, interactions/caps and finance inputs | False precision, duplication, sparse internal score inflation; reject for baseline |
| Legacy complete four-dimension score | Complete theoretical fit assessment | Every one of 17 slots plus calibrated transforms; premises/legal unknowns pervasive | Continual absence of scores; contradicts D76's withdrawn prerequisite; keep historical only |
| Qualitative strengths/risks only | Immediately useful and honest | Existing evidence and a small decision-rule library | Does not satisfy owner's numeric objective; fallback, not recommended sole product |
| Three-domain composite with an “available-data” denominator | Frequent numbers | Easy to calculate from whatever turns up | Source loss can improve score; missing competition/poor service coverage disappears; reject |
| **Fixed two-factor preliminary index + full qualitative decision layer** | A useful inspectable business-specific number now, with broader strengths/risks | Reuse resident density, admit one native job-density derivative using existing releases; no new providers/catchment peer collection | Narrow scope can be mistaken for full suitability; explicit label, exclusions, independent risks and finite real-packet review required; recommended |

No point can truthfully be guaranteed for every property. Unresolved identity or missing essential numerical operands produce a precise unavailable state and useful surviving conclusions. The proposed gate concerns two observable inputs, not perfect evidence across every report topic.

## 3. Scope and analytical ownership

| Output domain | Baseline Phase 11 responsibility | Numerical owner |
| --- | --- | --- |
| Resident / workplace context | Dated native measurements/comparison, walking estimates as separate corroborating context, concept relevance | Two fixed index components below |
| Market / proposition | Admitted qualified inventory/FSA observations; existing classification and ambiguity; conditional relevance, opposition and missing offer/coverage | None under D77 |
| Access / activity | Stored modelled routes to reviewed station targets, catchment barriers/limitations and exact native NUMBAT joins; service/time/entrance gaps | None in initial index; no unvalidated access rubric |
| Premises feasibility / history | Phase 9 dated building events, EPC limitations, matched designated-area context, explicit legal/physical unknowns | Separate categorical assessment, never location points |
| Rental context | Phase 10 rental-only projection; existing permitted Phase 9.5 references where relevant | £ / units as qualified facts/estimates, zero attractiveness contribution |
| Evidence adequacy | Claim-specific scope/method/time/rights/parents and conflicts, distinct from favourable/adverse direction | Neutral categorical strength, no confidence percentage |
| Decision Readiness | Actual prerequisites, confirmed scoped constraints versus unverified questions, rule-prioritised next checks | Categorical, not a probability or gap-count score |
| Financial Engine | No calculation, assumptions, scenarios or financial interpretation in this report assessment | Existing separate Phase 10 capability; excluded |

Coffee/restaurant/shared salon reuse one evaluator plus versioned profile data. Hair/beauty may have distinct capability questions for the explicitly selected service, but no separate coefficients or assumptions about luxury clientele. Address/business type remain sufficient; no price/hours/treatments/finance form required. Unknown concept details limit conclusions, not purchase access.

## 4. Proposed numerical specification: small, explicit, reviewable

Method candidate `location-context-preliminary-v1`; numerical policy `native-density-index-v1`; profile policy `business-context-priority-v1`. These are **proposed IDs**, not activated configs.

### 4.1 Observable components and comparators

**R: residential context.** Census 2021 usual residents / frozen OA2021 area in km² around the precise resolved building point. Population and geography releases must match. Reuse existing `residentDensity` semantics; this is native-area context, **not** the customer's walking catchment or present buying demand.

**J: workplace context.** BRES2024 employee jobs / matching LSOA2021 represented area in km², derived from the same frozen OA membership/footprint already used in Phase 8 allocation. This is a **new admitted derivative**, not the currently blocked raw job-count rank. Retain job universe, published rounding/disclosure/period and missingness. Employee jobs are not persons, workplace customers or footfall.

Proposed comparator: **all eligible Greater London native areas**, target excluded. R compares OA density with OA density; J compares the same LSOA footprint density with LSOA footprint density. No native areas versus walking contours; no jobs against resident distributions; no rank labelled commercial-site percentile. Pin release IDs/checksums, geometry/membership method, metric unit/universe, candidate eligibility, exclusions and comparator digest before looking at any target result. All-London comparison is a new method, not relabelled Phase 6 same-authority output.

For J, area is the recorded OA union footprint, explicitly labelled as such, not invented official LSOA area. A missing member, incompatible release, invalid/zero geometry or material footprint inconsistency excludes the affected target/peer under a fixed rule. Do not divide a full native-area job total by an independently clipped walking/London fraction. Admission must establish that included membership represents the native target's full intended footprint; if the existing releases cannot prove it, J remains unavailable. Do not obtain a new dataset or switch silently to raw counts.

For each component, use existing midrank principles: `P = 100 * (less + equal/2) / N`, at least 30 unique target-excluded peers, at least 90% of the predeclared eligible comparison frame, nonconstant distribution, finite valid operands and observed zero preserved. Cohort adequacy is a descriptive-method gate, not 90% confidence. Compute counts/digests in bounded local PostgreSQL queries against already admitted immutable releases. Do not send/store 26,369 OA records per assessment or collect paid walking cohorts.

### 4.2 Proposed business priorities and arithmetic

| Profile | R weight | J weight | Basis |
| --- | --- | --- | --- |
| Coffee shop | 45% | 55% | Simplified relative resident/daytime-workplace priorities from existing 25:30 hypothesis, rounded transparently |
| Restaurant | 55% | 45% | Existing 25:20 priorities, rounded; generic resident/workplace context, not evening trade proof |
| Hair / beauty salon | 80% | 20% | Existing 40:10 priorities; repeat resident appointment context is a hypothesis, not measured retention |

These are declared product preferences, **not learned commercial coefficients**. Higher measured density is proposed as stronger support for this narrow potential-customer-base construct, not automatically better net suitability. Correlated centrality can affect both; cap ownership to this single context budget and never award the same residents/jobs again in other domains. Do not describe two correlated observations as independent confidence. Finite sensitivity/real-case review must check whether the combined index is useful relative to R alone; no exhaustive research programme or hidden weight optimisation.

```text
S_exact = (w_R * P_R + w_J * P_J) / 100
S_display = final-only half-up(S_exact), integer 0..100
```

Keep rank arithmetic as exact fractions from `less/equal/N` and weights; reuse the existing pure rational helpers where appropriate without importing scripts or finance execution. Geometry/density comparison uses one explicitly pinned finite-number method and stable tie policy on both sides. No intermediate rounded component or dimension value feeds the total. No nonlinear penalty, interaction, quality multiplier, rent adjustment, numerical blocker cap or success probability.

Synthetic arithmetic examples **only**: R=80/J=40 yields coffee 58, restaurant 62, salon 72. R=40/J=80 yields 62/58/48. R=J=50 yields 50 for all. Those are not London scores or evidence of valid calibration. A score of 80 is not “80% chance of success” or “top 20% of commercial properties”. The composite itself is not a percentile, despite percentile-derived components.

No production Good/Excellent/poor-site score bands are proposed. Initially publish the integer, preliminary scope and component context, with the evidence-linked decision statement separately. The number cannot substitute for the actual answer or customer-friendly strengths/risks. Phase 12 handles wording; Phase 13 handles presentation after their approvals.

### 4.3 Missingness and publication

- `preliminary`: both R and J pass their own claim/comparator/identity rules; score is available **within the fixed limited scope**. Missing competitor strength, entrance verification, legal use, detailed offer, income or rent does not withhold this index. They remain visible in other assessments.
- `withheld`: either numerical component or its method is missing, invalid, materially conflicting, unpermitted or incompatible. Do not renormalise the surviving weight, impute zero/50, pick a more favourable cohort or switch a profile. Preserve the surviving descriptive metric.
- Optional logical bounds for known valid transforms: retain fixed missing slot over 0..100, `L = known weighted contribution`, `U = L + missing weight`. They are **logical missing-input bounds**, not a forecast/confidence interval or scored midpoint. If a transform itself is undefined, do not manufacture those bounds.
- `assessed_full`: reserved but **not produced in this baseline**. A future broader approved method is a new scope/version. Do not claim this preliminary index exhausts location attractiveness.
- No source failure makes a previously withheld broader score become a narrower favourable point. Scope is selected by approved method before source retrieval, not by available values. The current proposed preliminary method is always the same two-factor construct.
- Present two scored factors and broader unassessed domains explicitly. Internal numerical input presence can be 100% for this tiny index, but never display it as “100% evidence coverage” for the whole report.
- Separate readiness can bind the decision even beside a high number. Confirmed blocker does not change R/J arithmetic; it must dominate the decision statement. No signing/lease clearance follows from score.

If the proposed narrow construct or J footprint fails bounded QA, do not invent a substitute to fill the UI. Report the specific problem, deliver independent evidence/decision work, and request owner resolution of the numerical scope gate. No new providers or spending. This is the one explicit risk to preliminary-number activation, not permission to reopen every completed phase.

## 5. Claim admission, quality, conflicts and decision rules

### Admission before interpretation or scoring

Each material claim has an owned immutable input/property binding, source snapshot/bundle + checksum + operand path, claim type, unit/universe, statistical/physical scope, reference/effective/retrieval dates, method/rule version, required parents, source rights and limitations. `available` in a payload and a valid Evidence ID are necessary, not sufficient.

An admission decision is `admitted_for_scoped_fact`, `admitted_for_conditional_implication`, `context_only`, `blocked`, or `not_applicable`, with deterministic reason codes. Preserve underlying observations regardless of score eligibility. Required axes: identity/unit match; source representation permission; date fit **for the particular claim**; measurement/coverage; geographic/method/unit fit; parent adequacy; material conflict. Classify each axis adequate / limited / fails / unknown; no arithmetic trust hierarchy or quality-weight multiplier. Dated Census/BRES can support explicitly dated context while failing “current customer count”. Newly retrieved old evidence is not refreshed evidence.

Reuse inherited collection/cache freshness policies and the actual provider representation rules; no universal new 30/60/90-day truth rule. Currentness-dependent premises claims require established current exact-unit evidence, which existing history often lacks. If permission expires, follow the recorded permitted historical representation/retention policy; never regenerate a report to replace it.

### Conflicts

Group candidate conflicts by same construct/unit/time/geographic scope. Different purposes or dates can coexist without being a contradiction. Preserve all retained facts/references and scope limitations. Resolve only by an explicit claim-specific rule, recording why one applies: exact unit versus whole building, document effective status versus mere observation date, source contract versus local market estimate, compatible area basis. Never prefer newer automatically, average GIA/NIA, treat a directory removal as closure, or equate asking/estimated/contracted rent. Unresolved material conflict blocks the dependent numerical claim; independent sources/results survive.

### Business-specific useful reasoning

Extend existing reviewed-rule/proposition foundations, not an unrestricted LLM inference engine:

| Rule family | Permitted implication | Prohibited inflation |
| --- | --- | --- |
| Resident context | Dated resident concentration can support a conditional repeat/local customer proposition; stronger relative context can be explained using valid comparison | Residents are buyers, proven repeat custom or measured sales |
| Workplace context | Dated employment concentration gives a conditional weekday/lunch appointment/trade context, with concept-specific priority | Jobs are visitors, daytime population or spend |
| Access | A stored successful route supports that specific modelled connection; name/time/mode and limitations are explicit | Excellent general access from stop count; current usable/step-free services or first/last train from incomplete records |
| Market | Recorded relevant offers create a plausible overlap/differentiation question; a cluster can be both context and competition | Low/high saturation, unique competitor strength or percentile under D77; density alone proves unmet demand |
| History | Exact recorded application/certificate event supports its reported event/date, with provider/document scope | Implemented works/current permission, tenant interval, vacancy duration or cause of failure |
| Rental | A local asking benchmark is market context; matched valuation remains estimated with reported error | Broad average is this unit's rent, error is a statistical confidence interval, or lease is affordable from illustrative margins |
| Constraint | Only a matched current authoritative fact + applicable approved rule can establish a scoped blocker | Missing record/current certificate or historic restaurant/café use implies clearance or incompatibility |

Store rule IDs, prerequisites, supporting and opposing IDs, unknown dependencies, alternative explanations and result meaning. Direction `favourable / trade_off / conditional / no_basis` remains separate from evidence `insufficient / limited / sufficient`. A corroborating source adds support, not another score term. Mandatory material opposition cannot be omitted to improve prose. Never force a balanced list where no actual strengths or adverse facts exist.

### Premises assessment and Decision Readiness

Premises status: `supported_in_defined_scope`, `conditional`, `confirmed_incompatible_in_scope`, `unresolved`, `not_applicable`. Readiness: `targeted_checks_required`, `material_condition_to_resolve`, `confirmed_blocker`, `insufficient_basis`, or `supported_for_defined_next_step`. The last state permits only its recorded next step, **never universal lease-ready clearance**. No numeric premises/readiness score.

Rules prioritise: confirmed unit/concept blocker → material unresolved prerequisite → demonstrated commercial trade-off → smaller evidence gap. A priority is tied to decision consequence, not missing-field count or rhetorical severity. Collapse duplicate aspects of the same unresolved issue. Baseline current data will often produce targeted checks; this is not a failing or empty report.

Decision output: `investigate_further`, `resolve_material_condition_first`, `rework_present_concept`, `do_not_proceed_with_present_concept`, `insufficient_basis_for_case`. A confirmed blocker under an approved rule binds the latter concept-specific decision; an unknown is not a confirmed blocker. No automatic “buy/sign lease” verdict based on a high preliminary score. Emit concise reason/strengths/risks/actions references for Phase 12, not final generated report prose.

## 6. Data contracts and interfaces

New closed **proposed** `AssessmentBundle` schema 1 inside `lib/analysis/`, not a parallel scoring platform:

```text
identity: assessmentId, analysisId, inputId, propertyId, businessCategory,
          frozenContextDigest, generatedAt, methodId/version, configDigest
parents: snapshot IDs/checksums; history/discovery/rental bundle IDs/digests
evidence: validated scoped observations/capabilities with original paths/rights
admissions: claimId, policyId/version, disposition, axis states, reasons
claims: ruleId/version, kind, meaning, evidenceIds, oppositionIds,
        scope, limitations, unresolvedDependencyIds
comparators: frozen release/membership/geometry IDs+checksums, frame definition,
             eligibility/exclusions, target exclusion, N/less/equal, digest
score: fixedScope, profileVersion, publicationState, exact/display values,
       R/J operands/units/weights/contributions, withholding reasons/bounds
premises: state, definedScope, constraintIds, unresolvedIds
readiness: state, bindingConditionIds, permittedNextStep, actionIds
decision: stance, supportedClaimIds, adverseClaimIds, materialUnknownIds,
          orderedActionIds, mandatoryDisclosureIds
contentDigest, schemaVersion, sourceRepresentation/retention bindings
```

Technical limits proposed: 64KB per stored bundle, 64 material claims, 32 source/bundle parents, up to three primary next actions; explicit bounded optional evidence items, never truncate essential lineage to fit. Original large operand distributions remain in existing immutable source releases/snapshots, not copied into every assessment. Comparator trace includes exact metric/area method, predeclared complete membership definition/exclusions, member-set digest and rank counts. An independent operator reconstruction can recover permitted original operands from those releases; ordinary reopen reads the stored result and does not recalculate. Retention must retain the necessary permitted release representation; a hash alone is not sufficient reproducibility if the referenced data can disappear.

Inputs cannot contain exact-address text, email/account details, payment parameters or provider secrets in an AI-facing subset. Internal owned IDs/source metadata stay server-side as needed. Customer DTO contains conclusion/claim references, qualified numbers, scope/date/limitations and safe links, not private evidence envelopes or full provider responses. Phase 12 receives only the minimal approved evidence/rules/results; Phase 13 receives validated stored narrative plus this trace reference.

**Proposed API boundaries:** pure `admitAssessmentEvidence`, `evaluateDecisionRules`, `calculatePreliminaryContextScore`, `validateAssessmentBundle`; server-only `prepareAssessment`, `freezeAssessment`, `readStoredAssessment`. Names are design targets, not existing functions. Reads authorise first and return stored content; preparation reads/reuses frozen outcomes. No public scoring route or customer UI is introduced in Phase 11.

## 7. Persistence, ownership and reproducibility

Do **not** append new `evidence_items`, source snapshots or inputs onto an already ready Free analysis: `sitefit_guard_free_child` rejects that. Do not store scoring inside Financial Engine `economic_models`, disguise it as a premises event, or create a ready “Full Report” to store backend work.

Propose one small private table **`analysis_assessments`** through a forward migration, following existing history/discovery/economic owned immutable RPC patterns. This is an analytical result record, not request lifecycle or workflow infrastructure. Existing tables cannot safely hold this independent whole-report assessment without conflating domain/lifecycle or weakening Free guards; the extra table is a specific approval item.

Columns: UUID PK, composite owned analysis/input/property references, method/version/config/context/content digests, closed bundle, generated timestamp; unique `(analysis_id,input_id,method_version,config_digest,context_digest)`; minimal analysis/input lookup index. One immutable completed bundle per identical evaluation identity. Identical append returns original UUID/content; changed replay conflicts. New evidence/method comparison is a distinct assessment/version and never replaces a ready historical report's binding. A subsequent property check still creates a new Analysis. A recovery read is not a request to run a newer method.

RLS enabled; no anon/authenticated table SELECT/DML or RPC grants. Service-only narrow authorise/read/freeze RPCs use current `sitefit_access_owner`, verified permanent identity and server-confirmed active Test entitlement for paid-preparation writes; no Stripe contact/return URL authority. Existing authorised account claim/recovery must preserve original graph. Refund policy controls access/write eligibility, not content mutation. Later report consumer must enforce its own current paid access; no paid content leaked to the anonymous Snapshot. No change to payments, report-ready lifecycle, auth, claim proofs, Free tables or applied migration history.

SQL checks independently bind owned context/property/input, referenced snapshots/bundles/checksums and immutable source releases. Application checks numerical/semantic policy; reject forged manifest/profile/source paths and unsupported claims before persistence. Guard update/delete/truncate and revoke broad write grants. This is not exactly-once provider execution: Phase 11 should execute **no paid provider or AI requests**. Race uniqueness controls immutable result identity only.

Measure actual migrated database/relations/indexes plus six small proof bundles and stored read latency, retain original ready graph fingerprints and source release hashes. Phase 10 baseline is 374,396,595 bytes; internal 375MB checkpoint has only about 603KB headroom, though ~125.6MB remains under conservative Free allowance. Avoid a cohort bulk copy/new GIS materialisation. If actual essential migration/proofs threaten the checkpoint, report measured values and ask owner resolution rather than raising the allowance, deleting history or requesting a purchase automatically. No infrastructure upgrade in baseline.

## 8. Numbered execution steps — only after approval

Each step records actual progress in `docs/phase-11-status.md`, runs its named meaningful checks, preserves successes on independent failure, and records deviations. No complete status document or passed DoD exists at planning time.

| Step | Scope / artifacts | Acceptance and focused validation |
| --- | --- | --- |
| **11.0 — Lock owner-approved method and boundaries** | Record selected limited scope, profile priorities, publication/label policy, standalone assessment storage and later phase responsibilities as an accepted decision; pin source/code baseline | Approval explicit; older candidate/runtime unchanged; no provider/AI budgets implicitly transferred |
| **11.1 — Admission and closed assessment contract** | Extend existing evidence validation with claim-specific policy; closed bundle/claim/gap/conflict contracts; no generic graph platform | Reject wrong owner/property/input, bad parents/paths/dates/units/rights; preserve observed zero, unknown/unavailable/partial/N/A; lint/types + focused admission tests |
| **11.2 — Admit the two local comparisons** | Existing Census/OA resident density; new BRES/native-footprint density, all-London target-excluded frame, local bounded comparison RPC | Independently verify job universe, complete membership/area basis, units/release consistency, ties/coverage/exclusions/digest. Real source operands, no live API/paid calls; source facts survive comparator failure; focused PostGIS/derivative tests |
| **11.3 — Deterministic preliminary score and trace** | One shared evaluator + approved fixed profiles, exact rank/weighted fractions, final rounding, null/reasons/logical missing bounds | Independent 58/62/72 and 62/58/48 arithmetic, ties/half-up/endpoints, source-loss/duplicates/conflicts, no renormalisation or score from AI; lint/types/tests |
| **11.4 — Business decision, premises and readiness rules** | Existing-source strengths/risks/conditional implications, separate binding conditions and concise action priority | Same high context score cannot clear confirmed blocker; unknown is neither clearance nor risk; supported/adverse/sparse cases for three categories. No legal/footfall/sales/survival invention |
| **11.5 — Integrate history/discovery/rental evidence** | Read original Phase 9/9.5/10 bundles; retain source/digests, references-only exclusions, currentness/unit limits; no Financial Engine outputs | Agent rent unadmitted, planning unimplemented, EPC area basis unknown and rent-class conflict cases preserved; no finance or historical-name integration; stored source failure isolation |
| **11.6 — Private immutable persistence and stored projection** | Forward migration for narrow assessment relation/RPCs; generated types; server preparation/read/freeze; safe paid DTO/Phase 12 packet adapter | Fresh and hosted rollback ownership/claim/entitlement/replay/tamper/mutation/grants/refund checks; actual compute→freeze→read, zero calculator/provider/AI calls on reopen; original ready fingerprints unchanged |
| **11.7 — Bounded real-packet decision usefulness review** | Six existing London source packets, two per coffee/restaurant/shared salon, inner/outer where retained; two additional synthetic adverse/conflict controls; frozen config | Produce supported strengths/risks and at least one admitted preliminary trace per category **if the agreed numerical admission passes**. Compare scope clarity and R-only baseline; source-bound findings not fixture prose as gold labels. Record unsupported packets explicitly; no new paid packet collection |
| **11.8 — Regression, security, performance and handoff** | Required check/build/public HTTP, fresh/hosted DB tests, actual storage/lookup and retained-history hashes, safe projection/client/log scan, protected Preview deployment | `npm ci`, `npm run check`, production-server `npm run check:public`; no client secret/raw/claim/purchase leak; complete retained legacy replay and Auth/Test flow regression. Preview deployment/protection and unchanged public behaviour verified; no invented new customer/browser acceptance |
| **11.9 — Protected delivery and stop** | Final status/architecture/database/testing/roadmap updates; exact-head required CI, normal PR review/merge, post-main CI and clean main=origin | All mandatory revised gates evidenced, actual limits/deviations named, no unconditional score activation if scope QA failed; no Phase 12/13. Owner must resolve genuine gate change rather than silent pass |

No script/migration/function above is created by this planning task. Once approved, code stays inside `lib/analysis` and existing data/repository boundaries; no Node-only scripts imported into app.

## 9. Proportionate QA and costs

The finite six-real/two-synthetic packet review tests **decision usefulness, correct scope and honest direction**, not prediction of commercial success. Select cases by category and inner/outer coverage before inspecting score; use existing frozen sources and publicly identified QA premises from completed phases. Preserve exact packet/release IDs privately. If stored evidence cannot satisfy a category's prerequisite, label the failure, finish independent logic/security, and ask only for that gate's resolution. Do not quietly call PropertyData, rerun web discovery or request a new provider to populate it.

One focused perturbation matrix: approved R/J weights ±10 percentage points while preserving sum, one-component loss, one target-area boundary/missing-member case, ties and coherent release change on a **new** assessment only. Report score/ranking/disclosure changes; do not require equality under alternative preferences. Do not fit weights to the same six cases or loop over thousands of arbitrary coefficients. Check whether a close difference is overinterpreted; no “best location” ranking claim. Compare with R-only context to expose redundant centrality; systematic misleading decisions trigger a specific owner-reviewed revision, not endless calibration.

Security/historical invariants are mandatory, not supplementary: private grants/owned claims, entitled preparation, schema/value tampering, ready graph equality, zero-call reopen, source rights, exact-input/source binding, negative finding retention, safe errors/no logging private payloads. Failure of one evidence source retains others. Numerical hidden candidates cannot appear in a customer DTO as admitted results. Broader paid narrative is not sent to anonymous users.

No customer UI change in Phase 11, therefore no new cosmetic redesign or repeated manual Google/Stripe/200% ceremony merely for a backend change. Existing automated regression remains. If implementation actually changes an interface/navigation/accessibility boundary, verify the affected interaction at actual sizes/keyboard/material zoom and do not equate unit tests with owner acceptance. Full Report/Dashboard acceptance and launch UX remain Phase 13/later; existing UX/UI is **not approved for launch**.

**Baseline additional provider/search/AI cost: £0 / US$0; no dispatches.** This is a design budget, not measured implementation cost. Use existing hosted development/storage/local compute; no subscription, AI execution, new provider, trial renewal or credit consumption. Phase 10's remaining five credits and Phase 9.5's consumed single-search approval are not Phase 11 authority. Later paid AI/report operations need separate budget approval. Small source/read proofs need existing service credentials only, never credentials in chat.

## 10. Phase 12 / 13 contracts and exclusions

**Phase 11:** owns admission, deterministic comparisons/index/trace, rules, conflicts, scoped readiness, risk/action ledger, immutable assessment and safe packet contract. It can provide deterministic reviewed sentences/IDs for QA, but not a new generated paid report. It is not a new payment or Free collection feature.

**Phase 12, separately approved:** interprets only admitted assessment packets; extends existing bounded prompts/schemas, grouped customer/market/access/premises+rental tasks and validated-only synthesis; copies score unchanged; preserves mandatory opposition/binding conditions and exact claims. A broad narrative can be decisive within evidence without inventing precision. It must validate exact citation support, number/unit/scope and conclusion strength, not just ID existence; repairs are bounded and independent successful sections survive failure. No implicit browsing/new source collection or runtime weight choice. Finance prompts are excluded from main report under D82. GPT 6.1 Sol remains the existing owner constraint; live budget and packet/call limits require that phase's approval. This plan proposes responsibilities, not final prompt wording or dispatch authority.

**Phase 13, separately approved:** consumes original stored assessment + validated interpretation; delivers the genuine £29 Full Report/AI Native Dashboard/PDF with conclusion first, limited score scope beside number, separate premise/readiness conditions and per-section Why. Safe DTO explicitly supports preliminary/withheld states and does not force legacy four-factor Snapshot validation. Final UI uses shared report content, not read-time provider/score/AI work. Rental context appears independently; no Financial Engine forms/calculations in report or PDF. Financial Engine UI remains a separate experience under later explicit scope. Historical free projections remain byte-identical; no retroactive “fix” of stored conclusions. Phase 13 decides any prospective Free display extension only under explicit approval, not by merging this plan.

Exclude: new providers/history-name integration, paid research, market-competition score under D77, proprietary footfall, sales conversion, survival or success probability, income attractiveness, finance in main score/report, bespoke scoring platforms, nonlinear/correlation penalty machinery, risk caps, Monte Carlo, model training, long expert-calibration project, 24/27 AI calls, report Q&A/chat/vector store, jobs/leases/request ownership/reservations/billing ledgers/shared cache, broad cohort bulk storage, final UI/PDF/delivery/live payment/Production activation and Phase 12/13 implementation. No exhaustive new river/rail/barrier QA or speculative production scaling.

## 11. Risks, dependencies and owner decisions

| Risk / dependency | Treatment |
| --- | --- |
| Customer reads preliminary number as comprehensive site suitability | Visible fixed scope, broader strengths/risks beside it, separate binding readiness. Owner must approve narrow construct or choose broader gated alternative |
| Native density proxies centrality, not concept demand; R/J correlation | Explain what is measured, use modest inherited priorities, one context budget, limited comparison against R-only baseline; no causal/conversion claim |
| Historical Census/jobs are stale for current demand | Admit dated structural context only, dates visible; no “current demand measured” copy |
| J native footprint cannot be independently validated | Keep derivative blocked; no raw-count substitution, new provider or invented area; finish independent work and request numerical-gate resolution |
| Limited Phase 9/9.5 premises/rent evidence | Exact provider/building/currentness/rights states preserved; qualified rental-only bundle, missing prior occupier/use/layout remains visible |
| Source rights/retention incompatible with exact replay | Use permitted compact representations and retained release metadata; exclude unsupported facts rather than regenerate on reopen |
| Tight 375MB checkpoint | Reuse existing distributions; small measured assessment writes; report actual storage before changing capacity policy; no purchase |
| Free ready guards and old score DTO do not support new score | Narrow new private result table, no freeze exception; new paid contract consumed later, legacy UI unchanged |

**Approval genuinely required before implementation:**

1. Fixed limited preliminary resident/workplace score as the initial numeric product output, with exact visible scope; broader access/market/premises decisions remain qualitative. This is not final comprehensive calibration.
2. Proposed positive-context transform (native-density midrank), inherited 45:55 / 55:45 / 80:20 priorities, all-London same-unit frame, two-input publication/null policy, no universal score bands. These are policy hypotheses, not established truths.
3. One private immutable `analysis_assessments` result table and owned paid-preparation integration, without ready Free or payment lifecycle changes.
4. Revised Phase 11 scope/steps/DoD and six-real/two-synthetic bounded review; resume only this necessary numerical-method work now, leaving actual narrative generation and final presentation to Phases 12/13.

No purchase, credential entry, provider activation or separate subscription is required for this proposed baseline. Planning approval is not Production/live launch approval. No owner acceptance of current visual UX is assumed.

## 12. Definition of Done — proposed, all unchecked

- [ ] Explicit owner approval of Section 11 policy/scope decisions; implementation authority recorded separately from this proposal.
- [ ] Audit references/legacy/candidate status retained; new method never silently activates frozen 34-parameter config or rewrites Phase 6/8 outputs.
- [ ] Steps 11.0–11.9 complete with actual evidence and deviations in Phase 11 status.
- [ ] Claim-specific admission, semantic scope/date/rights/parents/conflicts/missingness verified; observed zero is not unknown and unknown is not favourable/adverse by default.
- [ ] Resident and proposed employee-job density/comparators independently admitted using matched existing releases, areas/universes/eligibility/target exclusion; failed derivative not substituted.
- [ ] One deterministic business-profile evaluator produces exact approved arithmetic and trace, final-only rounding, preliminary/withheld states; no dynamic weights, finance, D77 metric, hidden renormalisation or success probability.
- [ ] Finite real-packet review supports understandable scoped strengths/risks and at least one admitted trace for each category, or explicit owner-approved numerical-gate resolution; synthetic controls separately labelled. No missing proof recorded as passed.
- [ ] Market/access/history/rent limitations and counterevidence preserved; current premises suitability/readiness remains separate; high score cannot clear a confirmed blocker or erase unknowns.
- [ ] Private owned/entitled append, immutable replay, foreign input/source/tamper/grants/refund and safe projection gates pass fresh and hosted; reopening performs zero provider, AI or calculation calls.
- [ ] All original ready report fingerprints/source bindings unchanged; actual new storage/index/bundle/lookup measurements remain within approved capacity policy.
- [ ] Required lint/types/tests/build/public HTTP, relevant legacy Auth/Test/security regressions, protected Preview boundary, changed client/log/projection privacy checks pass on stated actual scope; no unverified launch/browser acceptance claimed.
- [ ] Phase 12/13 handoff/schema/prompts compatibility documented, with no final narrative/Full Report/UI/PDF/financial embedding or later-phase execution.
- [ ] No paid requests/provider purchase/subscription/new service/deferred infrastructure; any genuine dependency resolution explicit rather than silent scope waiver.
- [ ] Exact-head required CI, protected PR merge, post-main CI and clean main=origin pass for **implementation**, after separate approval. This planning PR does not satisfy implementation DoD.

Stop for review after this proposal. No Phase 11 implementation, historical mutation, Phase 12 or Phase 13 begins without approval.
