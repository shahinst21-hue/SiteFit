# Phase 12 reuse and prompt audit

10 October 2026. Planning only, based on clean main `13ca65a76821cc45f1f8fe4bb11963d1ad393247` and completed Phase 11. See [implementation proposal](phase12_plan.md). This audit does not reopen completed phases or activate the external scoring candidate.

## Implemented assets and disposition

| Asset | Actual implemented capability | Phase 12 disposition |
| --- | --- | --- |
| `lib/analysis/ai-provider.ts` | Server-only GPT 6.1 Sol Responses, low reasoning, strict JSON, store:false, 12 KB packets/4 KB instructions/4 KB schema, 1,800 output cap, 25s timeout, 8-dispatch in-process cap, token/time receipts | Reuse transport/guards; separate Full config/prompts/receipts and persisted four-dispatch budget. Do not change Free limits or use its prompt-version heuristic for new groups |
| `interpretation.ts`, `section-engine.ts` | Reviewed proposition selection/role/evidence rules; four parallel sections, dependent synthesis, limited repair and digest-bound restoration | Reuse anchored validation and validated-only synthesis; three-call Full grouping, shared repair. ID validity is not entailment proof for arbitrary prose |
| `generate.ts`, `generate-enriched.ts` | Free generation; ready read returns first; failure checkpoints in report provenance; ready Free freeze | Preserve. New Full preparation/orchestration, not direct reuse of Free upsert/finaliser |
| `assessment.ts`, `assessment-repository.ts`, `decision-assessment.ts` | Closed Phase 11 immutable assessment/reference bundles, scoped claims, independent constraints/readiness, stored replay and paid permanent access | Consume exact assessment. Expand validated history/rent fact projection; don't mutate assessment or infer history facts from an event ID alone |
| `context-index.ts`, native comparison repositories | Versioned hypothetical residential/job-density policy, native cohorts, exact trace, admission/method gating | Copy only admitted Resident & Workplace Context Index. No overall score, new weights/bands/calibration |
| Phase 8 spatial/evidence/release repositories | Frozen London sources, walking polygons/routes, native demographic/job/income evidence, qualified places | Reference stored releases and scope; no enrichment refresh, extra QA programme or duplicate geometry |
| Phase 9 history, Phase 9.5 discovery | Scoped immutable event/compact legally admitted web evidence; specific dates/match/limitations | Reuse existing bundles only; no complete tenancy story/new search budgets |
| Phase 10 economic/rental contracts | Separate deterministic economic engine; rent benchmark and compatible property valuation/error | Rental facts only in Full packet. Economic assumptions/results/scenarios excluded |
| Phase 7 payments/account claims | Verified permanent identity, independent server-confirmed Test entitlement, authorised historical access | Reuse ownership/claim/entitlement. Refund changes access, never report facts; no email identity authority |
| Initial `reports`, `report_sections` + Phase 6 guards | Full tier foundation exists; ready Free child guard blocks any new sections for that analysis | Narrow new forward guards/writers essential. No `ai_interpretations` table; use existing report provenance checkpoints |
| Existing customer projection/sample dashboard | Frozen safe Free DTO and fictional sample | No forced reuse where newer reference layout differs. Phase 13 implements new Full view; samples never become evidence |

## Earlier prompt package, reviewed as proposals

The external `sitefit-analysis-design` package (6 October) contains 27 prompt files, parameter registry, candidate model and prior audit material. It is not deployed code or approval of 27 calls. All prompt files were reviewed; [Phase 11 audit](phase-11-design-audit.md) preserves earlier calibration findings. Map responsibilities, not unsupported output requirements:

| Files (numeric prefix) | Reuse | Changes/exclusions |
| --- | --- | --- |
| 01 location snapshot; 24 decision synthesis | Result-first synthesis of validated claims | No overall suitability/provisional score or lease clearance; no economics business-case panel |
| 02 property truth; 12 history; 15 planning; 16 licensing; 17 physical risks | Group B identity/scope/date/unknown discipline | Historic/building evidence cannot establish unit permission or complete occupancy intervals |
| 03 catchment; 04 profile; 05 purchasing power; 06 demand | Group A context and conditional concept relevance | Jobs not daytime people; income not spend; residents not observed demand |
| 07 competition; 08 complementarity; 09 momentum | Group A inventory/context/trade-offs | D77 unique counts/percentiles blocked; no saturation, closure cause, unsupported chain strength or future-opening pipeline |
| 10 accessibility; 11 activity | Group A routes/station context | No visibility score, shop footfall or actual entrance/service assurance |
| 13 property economics; 14 scenarios | Separate later Financial Engine interpretation | Exclude main report/PDF packets under D82; rental evidence gets its own nonfinancial Group B contract |
| 18 business survival | Source-frame caution | Unsupported longitudinal capability, not a separate call or score |
| 19 for; 20 against; 21 unknowns | One validated claim/gap ledger | No extra calls/weights; preserve material opposition without manufactured balance |
| 22 on-site; 23 landlord questions | Synthesis ranked decision-changing actions | Few meaningful actions; not one checklist item per missing field |
| 25 cross-check | Deterministic identity/value/scope/conflict checks | No baseline extra AI judge; unresolved conflict remains visible |
| 26 Q&A | Scoped immutable report answers | Existing-evidence only, deterministic common intents first, separately bounded single-call path; no financial calculator, new browse or report mutation |
| 27 final editor | Clear decision first, user/evidence layers, important caveats nearby | Remove older score/coverage economics requirements; structured anchored output, not free-form report text; dashboard is the product, PDF an export |

No final prompt wording optimisation/calibration experiment is run in planning. Implement only the minimal versioned instructions needed for these existing responsibilities after approval. The old candidate JSON and synthetic study remain historical; do not edit them to make the new dashboard appear complete.

## Existing evidence and measurements

Phase 11 completion: 269 tests, fresh/hosted security, six-area scoped method review, actual native R/J proof and unchanged 28 historical ready graphs. Context-index sensitivity reached 8.37 points under the declared weight perturbation; this is hypothetical density policy, not calibrated commercial success. Native operand storage 286,720 bytes and assessment relation 81,920 bytes are already in the database baseline.

Phase 6 final Free samples: 24.7–30.8s and estimated $0.0097–$0.0135, only three Preview observations and short selected-vocabulary output. Do not use those figures as Full generation SLA/cost. Phase 8 receipt inventory documented 40,430 input/2,389 output tokens across 32 identities, with its disclosed missing-receipt boundary; no complete invoice claim. Phase 9.5 recurring discovery remains separately unapproved.

Fresh read-only database measurement on 10 October: **374,855,347 bytes**. The owner changes the internal checkpoint to **400,000,000 bytes**, leaving **25,144,653**. No hosted write or new AI/provider request in this audit. Existing ingestion SQL still enforces historical 375,000,000 guards; policy documentation is not a deployed gate migration.

## New work genuinely needed

Compact permitted history/rental claim atoms; explicit new Full prompt/receipt/schema versions; narrow Full edition persistence and ready guards beside ready Free; actual-stage checkpoints/recovery; safe structured report sections/exports; grounded question boundary and budget counter; finite semantic/value/security QA. No new collection framework, scoring engine, financial UI or provider is justified by this audit.
