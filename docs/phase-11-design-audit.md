# Phase 11: scoring, evidence and prompt audit

9 October 2026. Repository baseline: `02a0d4c011548dde0aa13dba7b46948c1b1811e5`, following Phase 10 protected PRs #28/#31 and successful post-main CI 37986830919. **Audit and proposal only.** The owner requests a useful answer to “What strengths and risks does this location have for opening a coffee shop?”, followed by an evidence-supported business-specific score. That request does not approve arbitrary numbers or Phase 11 implementation. [Proposed execution plan](phase11_plan.md).

## 1. Authority and chronology

| Record | What was approved or actually done | What was not approved |
| --- | --- | --- |
| D66–D69, [Product Contract](product.md), [Phase 6 plan](phase6_plan.md) | SiteFit analyses for the customer; conclusion, short reason, independent evidence strength, optional reasoning; result colours are not quality colours | An LLM inventing observations, success probabilities or numerical rules |
| D70; commit `fb66715`; protected PRs #15/#16, [completion](phase-6-status.md) | Implemented four deterministic dimension manifests, business hypothesis weights, strict gates, descriptive percentiles, evidence-linked proposition selection and synthesis | Calibrated attractiveness or any complete real composite score; all four real dimensions remain unscored |
| D71; commit `2230b38`, PR #18, [UI record](free-snapshot-ui-status.md) | Overall score presentation contract and isolated fictional fixture | Actual customer overall score, runtime AI weight selection or calibration; the fixture is not an algorithm or verified property assessment |
| External 6 October design package, below | Reviewable advanced prototype and 27 proposed prompts; synthetic arithmetic | No recorded approval of its coefficients, downside penalty, hard caps, 24-call execution, Q&A or production deployment |
| Commit `29e98d9cecc07563592a5074957f565cc034a11c` | Independent mathematical/design audit and inert candidate config | Application implementation; its selected simpler model was itself a proposal |
| D76; commit `c691759`, protected squash `7cd60717fc0233fb3ee74126dd436f74104aadc0`, PR #23 | Main score = commercial location attractiveness for selected concept; deterministic numbers; separate premises/readiness/Economics; **absolute provisional rejection and four-complete-dimension prerequisite withdrawn** | Final weights, transforms, bands or calibration. Both scoring and grouped prompts frozen as candidates during Phase 8 |
| D77, [Overture QA](phase-8-overture-qa.md) | Qualified inventory may be retained | Unique competitor counts, competition percentiles, complete inventory or a pressure/saturation score |
| D78/D79 | Revenue validation first; complete essential scope, remove low-value extra engineering; Phase 11 numerical/decision work precedes Phase 12 interpretation and Phase 13 delivery | Weakening truth/security/history or automatically authorising later phases |
| D80/D81, [Phase 9](phase-9-status.md), [Phase 9.5](phase-9.5-status.md) | Existing-source dated history; bounded discovery and narrow independent FSA admission | Complete tenancy history, closure causes, unrestricted agent content, recurring paid searches |
| D82, [Phase 10](phase-10-status.md) | Separate deterministic Financial Engine; independently qualified rental context | Finance in location score/Full Report/PDF; final engine UI; new history integrations |
| Current owner request | Phase 11 **planning/review** and use of the strongest earlier foundations | Implementation, activated new scoring, modifying completed reports, Phase 12/13 or purchases |

Later decisions supersede dated prose. In particular, the older candidate's “no provisional score”, four equal dimension budgets including premises, and blocker-based suppression of *location arithmetic* are not current approved policy. D79 supports proposing Phase 11 scoring work now; the older D76 wording about later Full Report calibration is not blanket approval of this plan or a reason to start Phase 12/13.

## 2. Exact implementation inventory

These paths refer to the baseline above; no source file was modified by this audit.

| Repository reference | Implemented behaviour / status | Phase 11 disposition |
| --- | --- | --- |
| `lib/analysis/scoring.ts`: `scoringVersions`, `weightManifest`, `composeDimension` | `dimension-v1`, `business-hypothesis-v1`; 17 required component slots across four dimensions; every profile row sums to 100. Missing/invalid/coverage <0.9/precision/comparator/direction/version/reference failures suppress dimension. `Math.round` on composed dimension | Keep unchanged for historical readers; new versioned limited-scope method, not silently loosening this function |
| Same file: `percentileMidrank`, `residentDensity`; `lib/analysis/metrics.ts`: `residentialMetric` | Midrank `(less + equal/2)/N * 100`, ≥30 peers, ≥90% eligible coverage, unique membership, variation; target excluded by residential comparison validator. Whole OA Census density within same authority; descriptive, not commercial suitability | Reuse arithmetic/admission principles; any changed geography/cohort/direction has a new method ID and new lineage |
| `lib/analysis/comparison-repository.ts`; `lib/analysis/native-comparison.ts`, `native-comparison-repository.ts` | Private frozen distributions. Native MSOA income descriptive rank; BRES native job counts explicitly **unranked**, `commercialScore:null` | Do not turn either existing rank/count into attractiveness by renaming it. New employee-job **density** comparison needs its own admission |
| `lib/analysis/enrichment-metrics.ts`; `catchment-operands.ts` | Dated Census walking operands, job/income/native inventory metadata; directions unreviewed, score null. Allocation sensitivity and partial footprint explicit; no matched walking cohort | Reuse as facts/context; no walking percentile against OA/LSOA peers; no nested-catchment summation |
| `lib/analysis/evidence.ts`: schema 1/2, `evidenceIndex`, `requireClaimEvidence` | Closed evidence envelope; same analysis/input, parent DAG, rights/expiry, section scope. Schema 2 separates origin from statistical geography, pins 13 release IDs and checksums | Reuse; add claim-specific admission/decision links in a separate assessment contract. Existing section membership/citation validity alone does **not** prove semantic entailment |
| `lib/analysis/enriched-evidence.ts`, `enriched-packets.ts`, `packets.ts` | Source-bound facts/capabilities and reviewed propositions; enriched packets explicitly reject activated numeric scores | Frozen Free pipeline remains unchanged. Paid-preparation assessment is a new version, not an exception to that guard |
| `lib/analysis/interpretation.ts` | `bounded-propositions-v1`, shared `interpretationInstructions`, closed ID-only `selectionSchema`, material opposition/unknown/alternative validation | Strong reusable safety baseline. Do not describe this as unconstrained authored Full Report prose |
| `lib/analysis/section-engine.ts` | Four section tasks; insufficient sections deterministic; one bounded validation repair; synthesis chooses approved headline/section IDs and retains unresolved gaps; stored restoration validates digest | Reuse boundary and stored replay; broader report narrative belongs to Phase 12 |
| `lib/analysis/ai-provider.ts` | GPT 6.1 Sol only; section/synthesis v3 receipts, 8 dispatch maximum, 12KB packets, 1,800 output tokens, 25s dispatch, `store:false`, no tools; private identity/exact-location key exclusions | Do not spend or dispatch in planning/Phase 11. Phase 12 must explicitly budget its larger tasks within reviewed limits |
| `lib/analysis/generate.ts`, `generate-enriched.ts`; `projection.ts`, `enriched-projection.ts` | Frozen input/source/metrics/weight/method/AI audit and stored ready projection; real scores withheld | Do not regenerate old Free reports; safe new assessment projection is a different contract |
| `lib/snapshot/model.ts`: `scoreIsDisplayable`, `validateSnapshotView`, `snapshotFromStored` | Legacy view requires four weighted factors for a displayed overall; real adapter still says complete demand/competition/access/premises needed. `authoredBy:ai` is a legacy metadata option, not runtime authority | Identified compatibility debt with D76. Preserve existing reader; Phase 13 uses a new explicit preliminary-score/readiness view. No four-factor fixture coercion |
| `lib/snapshot/demo.ts`; `app/dev/snapshot/page.tsx`, `fixtures/free_snapshot/kingston_coffee_shop.json`, `tests/snapshot-view.test.ts` | Presentation states and fictional score demonstration, not real numerical calibration | Keep isolated; never feed scored demo values into customer data |
| `lib/premises-history/model.ts`, `planning.ts`, `epc.ts`, `repository.ts` | Immutable building-matched applications/decisions/certificate dates, receipt/missingness and source references | Dated premises context, not current permitted use, fit-out verification or vacancy/tenancy intervals |
| `lib/web-evidence/model.ts`, `verify.ts`, `rent.ts`, `repository.ts` | Exact-unit/reference/rights validation. Initial independent admission is FSA observed name; rent review retains no agent content where permission unknown | Reference-only leads cannot become score facts or confirmed prior tenants |
| `lib/economics/rent.ts`, `repository.ts`, `bundle.ts` | Qualified rental-only bundle independent of financial scenarios. Conditional valuation preserves area basis and reported error | Full Report rental evidence/terms question; **zero location-score weight** |
| `lib/economics/calculate.ts`, `prepare.ts`, `period.ts`, `rational.ts` | Actual deterministic finance, illustrative prepopulation/stresses and immutable replay | Separate product; not report operands or an AI scenario score |
| `tests/analysis-scoring.test.ts`, `analysis-metrics.test.ts`, `analysis-evidence.test.ts`, `analysis-enriched-evidence.test.ts`, `analysis-interpretation.test.ts`, `analysis-sections.test.ts`, `analysis-projection.test.ts`, `premises-history.test.ts`, `web-evidence.test.ts`, `economics.test.ts` | Existing contract/security/arithmetic regressions. Synthetic adequate scores test code, not market validity | Preserve tests; add focused new-method cases only in approved implementation |
| `supabase/migrations/20261006120000_free_snapshot_persistence.sql`, later lineage/payment/history/discovery/economic migrations | Ready Free child inserts/updates/deletes frozen; raw derived rows private; owned supplement RPCs separate from payments | No migration edits or widening of ready guards; dedicated private assessment persistence proposed in plan |

The existing manifests: Customer Base `residential / daytime-workplace / purchasing-power / customer-fit / time-specific-transport`; Market `direct-competition / complementary-trade / cluster-context / differentiation`; Access `walking-reach / service-hours / useful-journeys / travel-fit`; Premises `permitted-use / physical-fit / planning-environment-licences / lease-rates-history`. These are analytical slots, not 17 available API fields. None is a calibrated production transform merely because it has a weight.

## 3. Advanced prototype: what it actually is

Original review package exists outside the repository at:

`C:/Users/Shahin/.codex/visualizations/2026/10/06/01a112d6-d8bb-7d10-a7ce-9c21e6aa978c/sitefit-analysis-design/`

Exact artifacts: `sitefit-analysis-design-fa.md`, `parameter-registry.json`, `scoring-traces.json`, `validation.json`, `prompts/01_location_snapshot.txt` through the named 24 section files, `25_cross_check.txt`, `26_question_answering.txt`, `27_final_decision_report.txt`. They explicitly call themselves proposals; demo inputs are fictional. Repository-preserved audit, original source hashes, operands and results: [review](sitefit-scoring-model-v1.md), [candidate](scoring-model-v1.candidate.json), [audit JSON](scoring-model-v1.audit-results.json). None is imported by the application. `runtime_enabled:false` and all 34 parameter `enabled_for_runtime:false` were inspected.

Method: four proposed profiles, 34 parameters grouped into 24 report sections (17 score-bearing); parameter priority × adjustments × quality within section; correlation-group caps; section-priority aggregation; coverage/quality gates; nonlinear downside penalty, optional interactions and confirmed-risk hard ceilings. Its key calculation is:

```text
section utility = sum(admitted weight * reliability * utility) / sum(admitted weight * reliability)
V = weighted mean of present section utilities
B = weighted mean of max(0, -section utility)^2
candidate = clamp(50 + 50 * (V + interactions - lambda * B), 0, 100)
lambda = 0.25 in the example; final critical/material ceilings = 29 / 59
```

Strengths: explicit evidence registry, business relevance, missing values, source provenance, distinct score/diagnostic/inherited roles, negative findings, trace and testable arithmetic. Weaknesses established by the **existing synthetic audit**, not guessed rejection motives:

- Two heuristic weight layers and reliability denominators make the number difficult to explain. Removing adverse evidence can improve its internal candidate.
- A sparse Access-only case reaches 97.5 internally at 8.62% weighted coverage; it was **withheld**, not published.
- Strongest reproduced fixture values 70.3295/82.3267/65.7049 had only about 23.05%/18.89%/20.88% coverage; all public scores were null.
- Within-section positive/negative cancellation can hide downside before the nonlinear penalty. Group caps can cancel algebraically; they do not replace one-owner anti-duplication rules.
- Quality is not commercial favourability; lowering reliability of an adverse term can improve appeal. The audit's weak-essential-axis example passed a global quality average.
- Demo knots mattered more than local weight changes: max 5.1136 points under the recorded knot perturbation. Cohort choice changed the same synthetic resident metric by 33.3333 percentile points.
- Hard 29/59 ceilings conflate feasibility with location attractiveness. Finance and assumed sales contaminate the location number.
- The prior alternative four-dimension complete model fixes some arithmetic weaknesses but creates the product problem the owner identified: missing nonnumeric facts can withhold every useful score indefinitely.

No recorded final owner approval of the advanced numerical model exists in the inspected repository history. It is inaccurate to say the whole design was “rejected”: the independent audit proposed revisions; D76 approved boundaries, withdrew absolute provisional rejection and **deferred calibration**. The record supplies no other rejection reason. No new 5,712/2,016-case experiment was run in this planning task; those are preserved prior synthetic studies, not London commercial validation.

### Component disposition for Phase 11 proposal

| Element | Reuse / revise / exclude |
| --- | --- |
| Evidence/claim roles, source dates, one-owner contributions, immutable trace, final-only rounding | Reuse |
| P03/P04 resident context | Reuse available whole-OA density comparison for the proposed limited index; walking population remains separate context, not silently the same parameter |
| `daytime-workplace` slot | Revise to explicit native BRES **employee-job density**, requiring new matching-area comparison. Do not reuse invalid P19 daytime-person ratio |
| P05–P10 profile/affordability/repeat/timing/unmet demand | Conditional reasoning only when support exists; no demographic stereotype, inferred spending or numeric default |
| P11–P15 competition/complementarity/momentum | Qualified evidence and hypotheses; respect D77. No unique counts, pressure percentile, opening/closure trend or numerical bonus |
| P17/P18/P20 access/service/activity | Supported route and station context; no numerical access transform in initial index. Useful service/entrance/hours remain qualified |
| P01/P02/P16/P21/P22/P27–P32 premises/legal/physical/history | Separate suitability/readiness and scoped risks. No current permission from historical planning; no tenant failure story |
| P07 income | Native-area qualified context; no richer-is-better points |
| P23–P26 finance, capacity, downside, sensitivity | Existing separate Financial Engine only; remove from Full Report prompt path under D82 |
| P33/P34 survival/exit | Exclude numerical or causal use; no adequate longitudinal frame |
| Quality as weight multiplier, parameter × section weights, present-data renormalisation | Exclude |
| Nonlinear lambda, interactions, 29/59 ceilings, geo/catchment bonuses, survival probability | Exclude |
| All required legacy components / four complete dimensions | Historical-only reader behaviour; not new score eligibility |
| A point for any arbitrary subset of data | Exclude; proposed smaller **fixed** scope must be approved and named before retrieval |
| Hair/beauty coefficient split | Defer; shared salon profile, subtype-specific premises questions without inferred luxury segment |

## 4. Prompt inventory and compatibility

Implemented prompts are the shared `interpretationInstructions` in `lib/analysis/interpretation.ts` and synthesis instruction/schema in `lib/analysis/section-engine.ts`, with versions/receipts in `ai-provider.ts`. There are not 24 implemented specialist calls. The external proposed file suffixes are the exact artifact names below; their prefix numbers identify the proposed section, not authority to execute.

| Proposed prompt files | Useful responsibility | Compatibility/change for later Phase 12/13 |
| --- | --- | --- |
| `01_location_snapshot.txt`, `24_final_decision_synthesis.txt` | Inherited summary after validated analysis | Copy new preliminary scope/score/readiness exactly; no four-complete gate or numeric cap; no implicit sign-lease instruction |
| `02_property_truth.txt`, `12_premises_history.txt`, `15_planning_and_regulatory_constraints.txt`, `16_licensing.txt`, `17_physical_property_risks.txt` | Identity/date/constraint/feasibility reasoning | Existing Phase 9 building matches and EPC cannot clear exact-unit/current use; D80 exclusions apply |
| `03_customer_catchment.txt`, `04_customer_profile.txt`, `05_purchasing_power.txt`, `06_demand_signals.txt` | Customer context and conditional business relevance | OA context is not walking headcount; BRES jobs not people; income not spend; exact concept/hours not inferred |
| `07_competition.txt`, `08_complementary_businesses.txt`, `09_commercial_demand_and_local_business_momentum.txt` | Offers, alternatives and contextual trade-offs | D77 blocks unique counts/competitive percentiles; no automatic strength, momentum or referral/customer estimates |
| `10_accessibility.txt`, `11_mobility_and_activity_signals.txt` | Modelled routes versus station activity/service | No footfall, step-free/entrance/service guarantee or repeated customer-base contribution |
| `13_property_economics.txt`, `14_scenario_analysis.txt` | Interpretation of validated finance | Remove from the main Full Report/PDF packet group under D82. Separate Financial Engine only in a later authorised experience |
| `18_local_business_survival_signals.txt` | Historical frame and censoring questions | No baseline survival assessment; explicit unsupported capability, not a number |
| `19_evidence_supporting_the_location.txt`, `20_evidence_against_the_location.txt`, `21_unknowns_and_evidence_gaps.txt` | Validated strength/risk/gap ledgers | Derive once from accepted claims; no extra score/penalty, no forced balance or missingness-as-risk |
| `22_things_to_check_in_person.txt`, `23_questions_for_the_landlord_or_agent.txt` | Few decision-changing checks | Deduplicate, rank by impact, do not turn every missing field into a customer checklist |
| `25_cross_check.txt` | Identity/value/contradiction/lineage review | Deterministic checks first; model may flag interpretation issues, never waive admission or rewrite trace |
| `26_question_answering.txt` | Report-grounded interactive answers | Deferred; no Phase 11 chat/retrieval/orchestrator. Financial calculation requests cannot mutate report |
| `27_final_decision_report.txt` | Result-first customer view plus optional evidence; supports provisional outputs in principle | Useful editorial structure. Replace suitability/coverage pseudo-confidence wording, remove Economics/scenario outputs from main report, inherit approved scope and blockers; final rendering is Phase 13 |

Reuse the grouped four-theme + synthesis idea as a **Phase 12 proposal**, not 27 requests. Phase 11 provides admissible facts, rule-supported implications, mandatory counterevidence/gaps and deterministic outputs. Existing strings are not rewritten or executed here. Exact sentence-level semantic validation, bounded repair and live interpretation budget remain Phase 12 responsibilities. Neither a valid Evidence ID nor a cleaner prompt alone proves a claim.

## 5. Evidence actually available at Phase 10 completion

| Evidence | Can support | Cannot support |
| --- | --- | --- |
| Frozen ONS residents/OA area; 2021 walking allocation | Dated resident density, area-estimated resident reach and native comparison | Present buyers, purchases, repeat rate, conversion or sales |
| BRES2024 and OA→LSOA membership | Employee-job counts; proposed matched footprint density after admission | Daytime population, visitors, worker spending or route footfall |
| Income AHC FYE2023 MSOA mean/interval | Modelled household context at native scope | Catchment sum, individual disposable spend or premium-concept demand |
| Stored walking polygons/matrices, reviewed station/NUMBAT joins | Specific modelled reach/time; dated station activity where reviewed | Universal nearest-service coverage, current timetables, entrance/step-free verification, shop footfall |
| Qualified Overture/FSA | Recorded offers and source-specific observations; explicit limitations | Complete unique competition, saturation, sales/quality, commercial-site percentile |
| Phase 9 provider planning metadata / official EPC | Dated building-level events/certificate; unknown implementation/current unit status | Previous occupier intervals, licence/lease clearance, current extraction/layout or closure causes |
| Phase 9.5 FSA/name observation; reference-only leads | Admitted register observation with scope/date; a lead to investigate | Verified historical tenant/rent facts from unadmitted brochures or first-party narratives |
| Phase 10 rental-only bundle | Qualified local asking benchmark or compatible property estimate with provider error | Contracted selected-unit rent, profit forecast, rent-derived attractiveness or invented GIA/NIA |
| Economic scenario bundle | Separate conditional arithmetic | Factual attractiveness, consumer Full Report/PDF finance |

This is enough for useful scoped strengths/risks and a proposed **limited preliminary numerical index**, not a comprehensive calibrated location score. Publication must make that distinction visible. [Plan](phase11_plan.md) specifies the recommended compromise and genuine approval decisions.
