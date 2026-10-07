# SiteFit scoring model v1 — independent design review

**Owner-approved architecture revision, 7 October 2026 (D76). Scoring and grouped analytical prompts are now frozen candidate designs, not final production calibration.** The absolute rejection of provisional scoring is withdrawn. Phase 8 data implementation is approved; final scoring activation, further weight/transform/formula/prompt/interaction/publication-band/calibration work is not. Phases 6 and 7 remain frozen; no Phase 9/10 work is authorised.

## Current authority: commercial location score, separate readiness

The main numeric SiteFit score represents **commercial attractiveness of the location for the selected business concept**, using location evidence that can be consistently measured and compared. Premises feasibility, binding constraints and Decision Readiness are separate assessments, as is Economics. A strong location score is not permission to sign a lease or proof that the business case works. The prior requirement for four complete dimensions, including Premises, is withdrawn for this future score architecture.

Preliminary/provisional scoring is **permitted in principle**, provided later approved policy controls explicit missingness, reproducible scope, ranges, stability and truthful labels. Do not invent a point estimate, a success probability or a neutral missing value. Neither a provisional score nor the final scoring model is activated in Phase 8. Required commercial dimension semantics and components, cohorts, transforms, weights, preliminary-score/range policies, labels, grouped prompts, synthesis and Economics interpretation will be reassessed during the separately authorised **Full Report generation phase**, using real London evidence and actual report packets.

The approved boundaries are deterministic numerical scoring, AI interpretation only, no runtime AI-selected weights/transforms, separate Economics and Decision Readiness, explicit missingness, evidence-linked conclusions, versioned reproducible results and no fabricated success probabilities. Approval does not endorse the candidate coefficients as calibrated facts.

Phase 8 now implements the approved provider/ingestion/normalisation/evidence/spatial/QA/storage architecture. Preserve permitted metric operands, comparator metadata, coverage/denominators/distributions, missing states, quality, release/source/rights versions and evidence lineage for later calibration. Do not spend Phase 8 refining or activating a speculative scorer simply because the UI has a score slot. Grouped prompt orchestration remains a reviewable architecture, not rewritten or enabled production prompts.

### Frozen prior audit

The independent audit below is retained as historical candidate research. Its formula/weights, four-dimension completeness requirement, rejection of provisional points, blocker-based overall suppression and publication/calibration recommendations are **not current architectural authority where they conflict with D76 above**. They must not become Phase 8 implementation requirements. No further numerical or prompt refinement was performed for this revision; the machine-readable config records the supersession and preserves prior operands under `frozen_previous_candidate`.

Review configuration: [scoring-model-v1.candidate.json](scoring-model-v1.candidate.json). Exact synthetic inputs, operands, sensitivity results, source digests and inert reproduction text: [scoring-model-v1.audit-results.json](scoring-model-v1.audit-results.json). Nothing imports these files into the application. The offline arithmetic exercise is not a production scorer or provider/AI verification.

## 1. Frozen prior candidate architecture and purpose

Recommend **C: fixed-budget location dimensions, separate feasibility/readiness, separate Economics**. Four dimensions remain Customer Base, Market Position, Customer Access and Premises. Preserve the existing analysis boundary. A main Location Suitability score may be published only after all four dimensions meet their own evidence and method gates. A confirmed blocker or unresolved critical feasibility question suppresses the overall number and leads the decision statement; it does not manufacture a score of 29 or 59. Independently complete dimension results remain inspectable.

The score means **degree of support for the stated location/concept fit under a frozen reviewed method**. It excludes the user's detailed rent, staffing, spend, margin, capacity scenarios and financial preferences. It is not an objective market truth, probability of success/profitability/survival, expected return, forecast revenue, guaranteed suitability or instruction to sign a lease. A weighted index necessarily allows commercial trade-offs; the separate non-compensatory readiness layer prevents those trade-offs clearing a legal, physical or operational blocker.

This is analysis-first: one useful scoped conclusion, its short reason, independent evidence strength, the most material open question, then closed **Why this result?** with comparisons, counterevidence and provenance. A withheld score does not mean an empty report. SiteFit should still interpret admitted observations and explain the decision consequence, without upgrading proxies to facts.

## 2. Existing architecture and changes requiring later approval

Inspected the documentation under `docs/` and the current Product Contract, decisions, architecture, database/source records, Phase 6/7 completion and Phase 8 proposal. Read `lib/analysis/scoring.ts`, `evidence.ts`, `section-engine.ts`, `ai-provider.ts` and `lib/snapshot/model.ts`. The review branch starts from Phase 8 planning commit `25ec75a0cc3f56542b73574203c80eb32cd625c9`, above completed Phase 7 main `55b2435fc45bc128ab9d8647230f66137b36850c`.

| Actual implementation | Design consequence |
| --- | --- |
| Four fixed component manifests; all components required; source coverage ≥90%; valid direction/comparison/precision/evidence/version required | Reuse this strict admission approach; do not quietly substitute available-data averages |
| Midrank percentile; ≥30 unique target-excluded peers, ≥90% eligible coverage, nonconstant distribution | Keep for descriptive metrics; a percentile is not suitability and cannot compare whole OAs with walk catchments |
| `Evidence` v1 validates identity, same analysis/input, source, lineage, licence and bounded payload | Extend the existing versioned contract for claim-specific quality and new permitted geographies; do not create another evidence engine |
| Four bounded section interpretations and validated synthesis; model `gpt-6.1-sol`, eight dispatches, 12KB packets, 1,800 output tokens, 25s dispatch, bounded generation | Preserve limits; 24 analytical sections cannot imply 24 calls |
| Ready `free_ready` reports and sections immutable; stored projection/history with owned account access | New method applies to a new Analysis, never recomputes or rewrites an old report |
| Snapshot DTO v1 requires four components and checks a linear overall value; current real overall is unavailable | Linear architecture is compatible in principle. New semantics/readiness/trace still require a new versioned projection and tests; no runtime change here |
| Existing `time-specific-transport` customer component risks overlapping Access | Proposed future replacement is `trading-window-customer-fit`: customer/activity timing, not repeated service frequency; old reports keep their original identifier |
| Economics execution and full/PDF delivery do not exist | Keep financial outputs outside main score; never infer an implemented calculator from the synthetic documents |

D71's score-ready presentation and earlier AI-backed method wording do not give GPT runtime numerical authority. The latest owner request explicitly requires deterministic scoring. Any future implementation extends `lib/analysis/scoring.ts` and existing section/evidence/projection services under a new method; no `lib/scoring` or parallel pipeline.

## 3. Competing architectures

| Criterion | A: strict weighted dimensions, numeric risk ceilings | B: attached quality-weighted sections, downside and ceilings | C: fixed dimensions + separate readiness, selected |
| --- | --- | --- | --- |
| Interpretation | Simple mean, but ceiling conflates appeal and feasibility | Two weight layers, quality weights, family caps, penalty and gates | Transparent contributions; explicit statement of appeal versus ability to proceed |
| Robustness | Good with complete fixed operands; ceiling discontinuity | Variable denominators; within-section compensation can hide downside | Fixed denominator; missing required input withholds number; risk cannot be averaged away |
| Commercial usefulness | One short number, potentially misleading cap | Detailed-looking assessment, unproven extra precision | Useful result and binding question, with number only where warranted |
| Data need | Complete dimensions and risk evidence | 34 parameters across 17 score-bearing sections, including economics | Complete approved components; fewer independent score inputs; diagnostic evidence need not score |
| False precision | Moderate; arbitrary ceiling bands | High from uncalibrated knots, priorities, λ and quality/cap coefficients | Still a hypothesis index; no pseudo-confidence, precision limited to integer display |
| Complexity | Low–moderate | High | Low–moderate, mostly existing boundary plus readiness projection |
| Missingness | Suppression if implemented honestly | Sparse candidate can reach 97.5 with 8.62% coverage | No published increase from losing a source; score becomes unavailable |
| Compatibility | Close to existing engine | New aggregation/DTO semantics and orchestration | Closest to current complete-component composition; ownership cleanup is explicit |
| Calibration | Weights/rules/caps all need validation | Many interacting assumptions need larger evidence base | Independently review constructs/rules/weights first; penalties can be added only if proven useful |

For a fourth alternative, geometric aggregation or multiplicative risk adjustment reduces compensation but creates stronger scale dependence, zero collapse and another penalty parameter. There is no demonstrated decision benefit over C. An outranking model could later compare specific candidate properties, but would add pairwise rules and is not required for a single-property report.

## 4. Audit of material candidate choices

| Candidate choice | Disposition | Reason / replacement |
| --- | --- | --- |
| 24 analytical sections | KEEP domain separation; MODIFY orchestration | Reporting/questions are not 24 independent score owners or calls; mapping below |
| 34 closed parameters | KEEP as audited evidence registry; MODIFY scoring role | Exclude diagnostics, duplicate constructs, economics and unsupported survival inputs from independent weighting |
| Four business profiles | KEEP concept distinctions; REQUIRE CALIBRATION of split weights | Stored salon category unchanged; hair/beauty initially share existing salon weights |
| Priorities 0–5, parameter × section importance | MODIFY | Replace two heuristic weight layers with existing fixed component budgets; retain original numbers only as audited candidate operands |
| Correlation cap max-priority | REMOVE as selected arithmetic; KEEP fixed-budget ownership | A common factor cancels inside a section; it does not itself solve duplicate constructs |
| Quality geometric mean of six axes | MODIFY | Adequacy per essential claim, weakest required parent and explicit failure gates; source class is not a numerical trust rank |
| Reliability alters utility weights | REMOVE | Reliability concerns what can be claimed; it must not make an adverse observation less important and improve fit |
| Weighted coverage | KEEP; clarify denominator | All applicable fixed weights, including missing; component presence separate from geographic/source coverage |
| Quality = coverage × reliability × contradiction discount | MODIFY | Keep separate diagnostics; exclude unresolvable scoring conflicts instead of arbitrary 0.1/0.4 quality discounts |
| Missingness leaves values null | KEEP | No zero/50 imputation, no data-dependent applicability, no redistribution |
| Present-section denominator | REMOVE for published scores | Full score requires every fixed component; partial bounds are internal, not an available-data point score |
| Nonlinear `−λB`, λ=.25 | REMOVE from v1; REQUIRE CALIBRATION for reconsideration | Re-penalises already adverse utility, misses within-section weaknesses, does not solve true blockers |
| Interaction terms | DEFER, all coefficients zero | No independently validated incremental effect; candidate bounds are not evidence for activating bonuses |
| Confirmed risk states | KEEP | Current unit/concept matched evidence and deterministic severity rules required |
| Critical cap 29/material cap 59 | REMOVE | Arbitrary numeric discontinuity; clearer binding readiness and overall suppression |
| Overall aggregation | MODIFY | Four equal dimension budgets, fixed component weights, no extra section/parameter contributions; all reviewed hypotheses |
| Final-only half-up rounding | KEEP for new method | Unrounded operands throughout; older stored rounding is unchanged |
| All 24 sections required for publication | MODIFY | Only score-owning components required; diagnostic report sections need correct states, not numeric outputs |
| ≥90% coverage | KEEP source/geographic adequacy | All essential scoring components still needed. Presence 100% is not source coverage 100% |
| Global quality ≥70 | REMOVE as sufficient criterion | Averages can conceal one unfit essential input; replace with adequate claim-specific policy for every component |
| No fundamental contradiction / critical claim gates | KEEP | Never average conflicting unit/time/scope data to manufacture fit |
| Provisional point score | REMOVE for first release | Smaller scope can have its own explicitly reviewed metric/rule; incomplete full scope cannot masquerade as 76/100 |
| Economics inside full nonlinear model | REMOVE from main score | Assumption-sensitive financial case is a separate historical supplement; optional usage does not reduce product value |
| Two comparable 0–100 scores | DEFER | Financial adequacy is better expressed through deterministic requirements/headroom/sensitivity than another attractive integer |

These are proposed dispositions, not additions to accepted `decisions.md` or silent changes to the Product Contract.

## 5. Independent algebra and stress tests

Reconstructed the attached registry, seven demo transforms and priorities from the supplied files. Group caps are fixed at the **original profile** maximum priority; perturbing weights or losing data does not recompute a larger cap. Economics S13/S14 share the fixed original maximum section priority. All unconfigured interactions are zero. Arithmetic uses full precision and strict JSON finite numbers.

For candidate parameter `i`, `t_i=p_i m_i q_i`, with `m_i=q_i=1`. A group has `w_i=t_i min(1,K_g/Σ_g t)`. With admission `k_i`, reliability `r_i` and utility `u_i`:

```text
E_s = Σ_i w_i r_i k_i u_i; Z_s = Σ_i w_i r_i k_i
v_s = E_s/Z_s if Z_s>0, otherwise null
C_s = Σ_i w_i k_i / Σ_i w_i
R_s = Σ_i w_i r_i k_i / Σ_i w_i k_i
Q_s = 100 C_s R_s (1-h_s)
A = Σ_s a_s n_s
V = Σ_s a_s n_s v_s / A
B = Σ_s a_s n_s max(0,-v_s)^2 / A
S_pre = clamp(50 + 50(V + I - λB),0,100)
S_final = half_up(min(S_pre, confirmed caps)) if publication passes
```

`C_s R_s = Z_s/Σ_i w_i`: quality is admitted reliable weight coverage, not an independent confidence estimate. In a section with only one observed parameter, its `r_i` cancels from `v_s`; low quality changes publication but cannot moderate the number. Six quality factors of `[1,1,1,1,1,.25]` produce `r=.793701`, passing a global 70 threshold despite a seriously weak essential method factor. A zero factor removes its effective contribution entirely, potentially improving an available-data score.

If all parameters of one section belong to the same correlation group, `d` cancels from `E/Z`. A cross-section cap also cancels when each affected section has one group; fixed section priorities determine influence. Group caps reduce a group's share only **relative to other groups within the same section**. They are not a substitute for ownership. The proposed economics family cap genuinely limits the combined section budget, but does not make its scenario evidence independent.

`B` is calculated after section averaging. Two equally weighted utilities `+1,-1` give section utility zero and **B=0**, hiding a severe individual weakness. The synthetic mixed-moderate case likewise has no negative section mean and no downside penalty. For fixed admitted inputs and I=0, a negative section's derivative is `a_s/A × (1−2λv_s)>0`: increasing its utility cannot reduce its score. Nonetheless changing the admitted set changes denominators and can reverse rankings. There is no global monotonicity in evidence availability.

### Exact reproduction of the attached examples

| Synthetic fixture | Reproduced internal candidate | Weighted coverage | Quality index | Public score |
| --- | --- | --- | --- | --- |
| Coffee fixture 001 | 70.329541606 | 23.0493% | 17.2870 | null |
| Restaurant fixture 002 | 82.326745411 | 18.8889% | 14.1667 | null |
| Beauty fixture 003 | 65.704929408 | 20.8812% | 15.6609 | null |

All three agree with supplied trace operands within `1e-10`. This checks arithmetic, not source truth, permission, complete costs or market calibration. The separate five-section example reproduces `A=22`, `V=.290909091`, `B=.049090909`, `I=−.02`, result `62.931818182`, displayed 63, versus linear mean `64.545454545`.

### Scenario matrix

Below are deliberately synthetic **candidate internal pre-cap** scores. Full parameter operands are in the audit JSON. All use coffee priorities and reliability 1 unless stated. They are not assessments of actual properties; hypothetical legal gates are not jurisdiction-specific rules.

| Scenario | λ=0 | .125 | .25 | .5 | What the experiment establishes |
| --- | --- | --- | --- | --- | --- |
| Mostly strong, severe Access weakness | 82.24 | 81.70 | 81.16 | 80.09 | Penalty still permits a strong average; does not establish feasibility |
| Mixed moderate parameters | 52.97 | 52.97 | 52.97 | 52.97 | Within-section cancellation leaves B zero |
| High demand, critical property constraint | 83.79 | 83.36 | 82.93 | 82.07 | True blocker needs separate authority; attached cap forces 29 |
| Excellent Access, weak Economics | 67.41 | 67.07 | 66.72 | 66.03 | Financial assumptions contaminate location assessment |
| Strong Economics, weak customer base | 60.43 | 59.88 | 59.33 | 58.22 | Economics can compensate for customer weakness; scope must be explicit |
| High score, poor coverage | 97.50 | 97.50 | 97.50 | 97.50 | Only S10 observed; coverage 8.6207%, public result null |
| Low fit, excellent evidence | 20.00 | 17.75 | 15.50 | 11.00 | Quality and desirability are different; λ adds up to nine points of penalty here |
| Many unknowns | 60.00 | 60.00 | 60.00 | 60.00 | Coverage 17.43295%; no publishable point estimate |
| One confirmed licence blocker | 85.34 | 85.02 | 84.70 | 84.05 | Candidate critical cap always 29; selected model withholds overall and exposes blocker |
| Multiple moderate weaknesses | 66.38 | 66.11 | 65.84 | 65.30 | Penalty changes little in this mixture; no evidence .25 is optimal |
| Correlated station proximity/frequency | 59.14 | 59.14 | 59.14 | 59.14 | +1/−1 cancellation; group cap does not resolve contradictory usefulness |
| Correlated population/reach | 58.82 | 58.81 | 58.80 | 58.78 | Group priority asymmetry, not independent evidence, drives remaining change |
| Every utility −1 / every utility +1 | 0 / 100 | 0 / 100 | 0 / 100 | 0 / 100 | Clamp bounds preserved; lower clamp loses discrimination among extreme bad cases |

Without clipping, increasing λ from 0 to .5 reduces score by `25B`, at most 25 points. It is an explicit preference coefficient, not learned loss probability. Two synthetic cases with `V=.12,B=.44` and `V=.10,B=0` reverse ranking at `λ>.045455`; nonlinear reversal is a policy choice, not necessarily an error. No evidence selects one λ from the tested set. The selected model fixes λ=0 and deals with binding conditions outside arithmetic.

## 6. Sensitivity results and limits

The audit records 5,712 candidate weight evaluations: **every P01–P34 weight ±20%, every S02–S18 priority ±20%, all four profiles, 14 explicit scenarios**. Other S01/S19–S24 priorities are zero by design; ±20% remains zero. Fixed group/family budgets remain pinned. A separate 204 sparse-fixture parameter perturbations evaluates parameters with and without data; changing a missing parameter's declared priority can still alter coverage.

| Test | Observed result | Interpretation |
| --- | --- | --- |
| Candidate parameter ±20% | Maximum score movement .5144 points in the scenario suite | Small local change does not validate the underlying utility construct |
| Candidate section priority ±20% | Maximum 1.6432 points, Coffee S10 down 20% | Section hierarchy matters more than individual weights in this suite; rank reversals and band switches recorded |
| Sparse-fixture parameter ±20% | Maximum .2205 points | Homogeneous group factors often cancel; do not confuse apparent insensitivity with valid independence |
| Every parameter reliability 1→.5, individually, all profiles | Maximum .5551-point change in mixed scenario | Downweighting poor adverse evidence can improve fit; quality shouldn't be a favourability weight |
| All reliabilities .25→1 on positive case | Fit stays 90; quality spans 25→100 | Candidate gate flips at .70 despite identical point score; cancellation explicitly measured |
| Demo knot locations ±20%, every K1–K7 knot, all three fixtures | Maximum 5.1136 points | Unproven transform thresholds dominate local weight perturbations; keep demo knots out of production |
| Drop negative P25 | +4.8381/+7.2003/+4.3060 points for fixtures 001/002/003 | Score improves when adverse economics disappears; coverage and quality fall, all remain withheld |
| Drop positive P07 | Fixture 001 **+1.6310**, 002 −4.1584, 003 −7.2650 | Even removing a positive below-average section can improve a sparse candidate |
| Drop high-priority P23 | Fixture 001 −1.6039, 002 **+.7946**, 003 −5.5315 | Sign of the lost observation alone does not determine direction after redistribution |
| Switch business weights, identical synthetic inputs | Maximum profile spread 3.5345 points | Between 1 and 5 pairwise rank reversals across profile pairs; not a valid business comparison |
| Change comparator for same resident count 18,000 | 61.6667, 28.3333, 55.0000 percentiles across three 30-peer cohorts | Cohort choice moves result by 33.3333 points; pin scope before looking at target |
| Candidate h=.1/.4 on every strong section | Fit 90 unchanged; Q falls to 90/60 | Publication changes at material contradiction discount; underlying conflicting fit remains unaltered |
| Selected-model 17 component weights and four dimension budgets ±20%, four profiles, 12 synthetic complete cases | 2,016 evaluations; max component .8174, max dimension 1.00395 points | Fixed complete operands; no coverage/quality/gate changes from weights alone; rank/band changes recorded |
| Selected-model each required component removed, all profiles | 68 cases: overall null; unaffected dimensions retained; fixed-weight coverage decreases | No public score improvement through source removal |

Raw per-case deltas, label switches, rank reversals, gate/coverage/quality changes and each perturbation are stored in JSON, not inferred from a single headline maximum. Candidate labels `<50`, `50–<70`, `70–<80`, `80–<90`, `≥90` are **test bands only**, not accepted customer claims. The selected arithmetic scenarios use independent explicit component values; candidate parameter rubrics are not invented to populate them.

Against λ=0, the .125/.25/.5 candidate runs reverse 1/1/3 scenario pairs respectively, with no test-band switch in that specific suite. Across the selected component/dimension perturbations there are 294 pair-reversal occurrences and eight band-switch occurrences (summed over perturbations, not 294 unique location pairs). Small point changes can still reorder close candidates; the proposed simpler architecture does not eliminate ranking uncertainty. Do not present a small score difference as a meaningful commercial advantage without the future paired robustness evidence.

These are deterministic one-at-a-time structural experiments, not empirical robustness proof. No provider quality, business outcome or expert preference was measured. Joint weight/quality/knots/source variations, real paired London locations, alternative plausible cohorts, category coverage and blinded held-out evaluation remain prelaunch calibration work. Do not label synthetic rankings commercially validated.

## 7. Risk gates: numeric caps versus decision readiness

| Policy on an otherwise 95-point case | Critical issue | Material issue | Assessment |
| --- | --- | --- | --- |
| Hard ceiling | 29 | 59 | Flattens many unlike sites, changes arbitrary thresholds and mislabels reason for low number |
| Multiply by .5 (test assumption) | 47.5 | 47.5 | Can still look acceptable; severity coefficient arbitrary, repeated risks may overpenalise |
| Piecewise softened ceiling `cap+.25(score−cap)` | 45.5 | 68 | Smoother arithmetic, but blocker can again look middling/supportive |
| No numeric change, no readiness | 95 | 95 | Unacceptable: blocker hidden behind appeal |
| Separate binding readiness + overall withholding, selected | No overall number; do not proceed with present concept | Number, if otherwise admitted, alongside binding mitigation/rework result | Clear authority, no invented numeric risk equivalence |

The audit tests caps 29/59 ±5 across pre-scores 28,29,30,58,59,60,80,95. Changing a cap changes high outcomes by five points without any evidence change. At a fixed severity, `min(score,cap)` is continuous in score but has a derivative kink and a flat upper tail. The real discontinuity is classification: a 95 case can become 29 at the boundary from unresolved to confirmed blocker. Multiple caps use minimum, so extra confirmed risks may have no further numeric expression. The separate risk register preserves each issue and its practical consequences instead.

Readiness states are `clear_in_defined_scope`, `manageable`, `confirmed_material_risk`, `confirmed_blocker`, `unresolved`, `not_applicable`. They require scoped versioned rules and current matched documentary evidence. Confirmed blocker means the **present concept cannot proceed under the established constraint without changing the case**; no AI-generated legal assurance. An unresolved treatment, licence transfer, survey or use question is not evidence of incompatibility. Empty/partial registers cannot mark clear.

Critical unresolved or confirmed blocker suppresses the overview numeric headline, preserves genuinely complete component/dimension evidence, and binds stance to resolution or not proceeding with the present concept. A material risk must stay adjacent to the conclusion and may require rework or mitigation; it does not automatically subtract 41 points. Overlapping legal/use/works documents yield one risk with linked aspects, not repeated penalties. This is non-compensatory **decision policy**, not a hidden transformation of suitability.

## 8. Scope: Location versus Business Case

Architecture A, a location assessment, can remain comparable when the user's rent or staffing scenario changes. Architecture B, a business-case composite including S13/S14, changes with both premises context and assumptions; a lower assumed salary could raise its score without improving the site. Two integers would invite false comparison and conceal which assumptions changed.

Select **one main location assessment plus a separate Economics assessment**. Economics shows break-even sales, required daily customers/transactions/covers/bookings with correct mappings, capacity/headroom under explicit assumptions and cost/rent sensitivity. Do not create an economic 0–100 score in v1. A £/sqft/year modelled commercial rent benchmark is contextual quoting rent, not the user's signed rent, achieved rent or verified full occupancy cost.

P23–P26 are future Phase 10 supplement evidence. P24 independent operating capacity belongs there, while verified physical fit can inform Premises without importing financial assumptions. Financial feasibility may affect the overall **decision stance** after a supplement, but never rewrites the frozen main Location score. A new financial scenario creates a linked supplement/input/model/result version, not an updated historical report. No financial execution or calculations are added by this review.

## 9. Parameter registry: all 34 audited

The JSON records each definition, unit, kind, source, minimum evidence, owner, availability, original priorities, direction, transform status, relevance and double-counting control. Original candidate numbers are review operands, **not selected numerical parameter weights**. Every selected direct parameter weight is zero: parameters feed one fixed component assessment rather than an additional importance layer. `Input` below means potential evidence for a future approved component rule, not a scoreable parameter today.

Availability relates to the **proposed** Phase 8, conditional on its live dataset/coverage/licence/precision gates. `Ready` means a narrowly defined metric can be evidenced, not that its normative suitability transform is ready. No all-34 complete first production score is promised.

| ID | Revised definition / unit and kind | Availability | Selected role / minimum evidence / disposition |
| --- | --- | --- | --- |
| P01 | Usable area/layout against requirements; m² + observed plan/rule | Phase 9, user, manual | Input Physical fit; matched plan and activity requirements; DEFER |
| P02 | Non-price lease obligations against limits; documented rule | Phase 9, user, manual | Input Lease/history; current lease and explicit limits; DEFER; rent not scored here |
| P03 | One walking-catchment usual-resident total; calculated persons | Phase 8 ready, conditional | Metric percentile / future Residential input; precise origin, routing, TS001, allocation/cohort; MODIFY demo K1 |
| P04 | Barrier/origin adequacy; modelled metres/seconds/validation | Phase 8 partial | Admission check for P03, no bonus; REMOVE independent fit weight |
| P05 | Customer/concept alignment; observed/rule | Phase 8 partial, user, Phase 9 | Input Customer fit; explicit segment and relevant independent support; REQUIRE CALIBRATION |
| P06 | Actual repeat visits; observed visits/customer/period | User, not currently defensible | Diagnostic; behavioural denominator needed, not resident-based retention; DEFER |
| P07 | Mean equivalised disposable household income AHC; modelled GBP/year MSOA + interval | Phase 8 ready, conditional | Context/P08 parent, not spending-power score; MODIFY K2 and label |
| P08 | Conditional price-tier affordability; reviewed rule | Phase 8 partial, user, Phase 9 | Input Purchasing-power fit; P07 + explicit prices/service mix + validated rule; REQUIRE CALIBRATION |
| P09 | Customer/activity trading-window alignment; observed/modelled time intervals | Phase 8 partial, user, Phase 9 | Input Customer timing; explicit hours and valid customer linkage; REQUIRE CALIBRATION |
| P10 | Genuine unmet offer demand; compatible observed/modelled supply/demand | Not currently defensible | Diagnostic; no adequate demand/supply frame, no low-POI gap inference; DEFER |
| P11 | Competitive pressure from relevant offers; observed listings + rule | Phase 8 partial, user, Phase 9 | Input Direct competition; dedup, coverage, overlap, comparator, contextual demand; REQUIRE CALIBRATION |
| P12 | Proposition differentiation; observed/rule | Phase 8 partial, user, Phase 9 | Input Differentiation; explicit concept and verified offers; REQUIRE CALIBRATION |
| P13 | Useful complementary trip linkage; modelled/observed route/audience fit | Phase 8 partial, user, Phase 9 | Input Complementary trade; destinations, path/time/audience linkage; REQUIRE CALIBRATION |
| P14 | Complementary-hours overlap; observed/calculated minutes | Phase 8 partial, user, Phase 9 | Supports P13 only; actual hours needed, not complete from Overture; DEFER |
| P15 | Matched stock/flow momentum; observed/calculated changes/eligible stock | Phase 9; currently unsupported | Diagnostic; verified longitudinal trading denominator, directory edits insufficient; DEFER |
| P16 | Documented local works/change; dated observation/scoped effect | Phase 8 partial, Phase 9 | Diagnostic risk/access input once; official notice and actual relevance; MODIFY |
| P17 | Walking distance/time to useful transport entry; modelled metres/seconds | Phase 8 partial | Metric / future Useful journeys input; precise entry/origin, route and concept/service relevance; MODIFY K3 |
| P18 | Usable departures in stated trading window; timetable/calculated departures/hour | Phase 8 partial, user, Phase 9 | Input Service hours; verified timetable, directions, days; StopPoint insufficient; DEFER K4 |
| P19 | Daytime-person/resident ratio at matched scope; modelled ratio | Not currently defensible | Diagnostic only; BRES jobs are not daytime people; REMOVE K5 |
| P20 | Relevant activity timing; observed/modelled temporal rule | Phase 8 partial, user, Phase 9 | Supports P09 only; NUMBAT station context not walk-by pedestrians; MODIFY |
| P21 | Reusable fit-out against concept; observed assets/rule | Phase 9, manual | Physical-fit support; current condition and consent, not former tenant category; DEFER |
| P22 | Verified disruptive premises turnover; observed events/rule | Phase 9, manual | Lease/history input; independent disruption evidence, no closure causes inferred; DEFER |
| P23 | Base operating headroom/fixed cost; calculated ratio | Phase 10, user | Economics only; complete frozen ledger/approved model; DEFER K6 |
| P24 | Independent operating capacity; calculated service units/day | Phase 10, user, manual | Economics only; service duration/seats/staff/equipment, not forecast sales; DEFER |
| P25 | Downside result/same fixed cost; calculated ratio | Phase 10, user | Economics only; named frozen scenario and complete costs; DEFER K7 |
| P26 | Independent cost-shock sensitivity; calculated GBP/year delta | Phase 10, user | Economics only; explicit shock/model, same assumptions not independent evidence; DEFER |
| P27 | Permission compatibility; register/document + rule | Phase 9, user, manual | Input Permitted use + readiness; unit/current activity/conditions match; DEFER |
| P28 | Works/consent compatibility; document/rule | Phase 9, user, manual | P27 support/readiness; exact proposed works and consent; DEFER |
| P29 | Activities/licence compatibility; document/rule | Phase 9, user, manual | Input Licensing + readiness; exact treatments/operator/unit/hours; DEFER |
| P30 | Licence-condition compatibility; document/rule | Phase 9, user, manual | P29 support; current conditions and transfer status; DEFER |
| P31 | Utilities/extraction/plumbing fit; observed capacities/rule | Phase 9, user, manual | Input Physical fit with P01; qualified assessment, EPC not extraction proof; DEFER |
| P32 | Unit hazards/access fit; observed/modelled scoped rule | Phase 8 partial, Phase 9, manual | Physical support/readiness; map constraints + unit assessment, no survey from area data; DEFER complete score |
| P33 | Matched cohort persistence; calculated censored-period rate | Not currently defensible | Diagnostic only if later validated longitudinal frame; REMOVE score |
| P34 | Matched cohort exit; calculated same-period rate | Not currently defensible | Diagnostic only, often algebraically overlaps P33; REMOVE score |

### Phase 8 evidence that can genuinely become numerical

**P03** is the strongest candidate for admitted descriptive walking-reach comparison after the actual precise-origin/routing/Census/cohort proof. It does not alone complete Customer Base or establish buyers. **P07** can become a native-MSOA income comparison with intervals, not a property-level purchasing-power or spend score. **P17** can become a verified walking-time metric; useful access needs additional journey/time/concept evidence.

Competition/complementary **observations** behind P11–P14 can become counts and maps after Overture/FSA matching/coverage QA, not calibrated pressure or extra-customer scores. P20 can display modelled **station** activity at its original time/station scope. Selected property facts/constraints behind P01/P16/P32 remain partial unit-fit context. The commercial rent benchmark is numerical context outside the location score. BRES workplace **employee jobs** is a separate descriptive input not represented adequately by P19; do not quietly substitute it into a daytime-person ratio. Its future relevance rule belongs to the existing daytime-workplace component under an explicit new metric identifier.

Therefore **no complete attached suitability parameter is automatically ready for scoring at Phase 8 completion**, and no four-dimension overview is promised. P03 has a potentially defensible **metric percentile**, P07 native-scope income statistics, P17 route time, inventory counts and activity observations can inform bounded interpretation. Full normative utilities require independently reviewed business rules/comparators; Phase 9 premises/concept gaps and Phase 10 financial dependencies stay explicit. No new provider is approved by this finding.

## 10. Frozen prior numerical specification — not activated

The config makes all active and blocked coefficients explicit. It is a review representation, not executable runtime configuration. Unapproved transforms are intentionally `numeric_output_allowed:false`, `knots:null`, `rule_ids:[]`; this is an explicit readiness block, not a hidden default or a licence to choose knots during implementation.

For an approved future component, let `x_c ∈ [0,100]` denote a validated deterministic fit utility. With every required component admitted:

```text
D_d = Σ_c fixed_weight[d,profile,c] × x_c / 100
Location = .25 D_customer + .25 D_market + .25 D_access + .25 D_premises
Published = round_half_up(Location) only if every dimension and overall gate passes
λ = 0; I = 0; numeric readiness adjustment = 0
```

Do not round `x` or `D` before the overall calculation. Preserve exact numeric operands and specified arithmetic/serialization versions. Floating-point equality in admission uses the reviewed numerical contract, not a secret additional tolerance; tests must cover binary floating-point and half-up boundaries. A future implementation may use a defined decimal representation where needed, with a versioned method.

Component weights below are the **current initial product hypotheses**, retained as the most compatible baseline for review, not empirical commercial effects. Every row sums to 100. Section priorities and parameter priorities do not multiply these weights.

| Dimension; ordered components | Coffee | Restaurant | Hair / Beauty shared baseline |
| --- | --- | --- | --- |
| Customer Base: residential, daytime-workplace, purchasing-power, customer-fit, trading-window-customer-fit | 25/30/15/20/10 | 25/20/25/20/10 | 40/10/20/25/5 |
| Market Position: direct-competition, complementary-trade, cluster-context, differentiation | 35/20/25/20 | 30/25/25/20 | 40/15/15/30 |
| Customer Access: walking-reach, service-hours, useful-journeys, travel-fit | 30/30/25/15 | 25/25/25/25 | 35/15/20/30 |
| Premises: permitted-use, physical-fit, planning-environment-licences, lease-rates-history | 40/25/20/15 | 40/30/20/10 | 40/20/20/20 |

The four overall budgets are equal 25% as a transparent starting hypothesis, not equal real-world importance. Binding feasibility is enforced separately. No overall score ships merely because owner approves this architecture: domain rules, complete evidence and independent robustness/calibration gates must pass first. If validated expert results show equal budgets mask important commercial weaknesses, review a new manifest rather than adding an ad hoc AI penalty.

Seventeen existing component **slots** are not seventeen independently obtainable API fields. Multiple P inputs can jointly determine one fit rule. Inputs marked support/diagnostic/admission add no separate weight. Empty parameter-ref lists in config mean the candidate registry does not specify enough admissible evidence for that component; `additional_evidence_dependency` names the gap, and scoring remains blocked. Do not invent an eighteenth scored variable to make it complete.

### Transforms and directionality

Remove demo K1 population thresholds 10k/25k/50k, K2 spending index 80/100/120, K3 distance 300/800/1500m, K4 20/60/100 departures/hour, K5 daytime ratios .5/1/1.5/2, K6/K7 financial .25 thresholds from selected production config. They are preserved only in audit evidence to reproduce the candidate. Sensitivity does not establish their commercial validity.

Metric midrank is defined exactly, but its output is descriptive position, not automatically `x_c`. A utility transform needs a declared construct, observable predicate, domain-specific evidence, monotonic or conditional direction, scope, units, boundary behaviour, comparator and independently reviewed knots/rule IDs. Generic F/X adjectives are insufficient. Unknown is null, never rubric balance. A high density or income cannot uniformly imply better concept fit; competition may be a cluster signal and a pressure simultaneously. Legal incompatibility may support adverse fit/readiness but cannot be invented from historic use.

No runtime AI selects these rules or thresholds. A future reviewed rubric may map discrete verified compatibility levels to utilities, but its domain predicates and cut points require separate sign-off. This review declines to fabricate those missing calibrations.

## 11. Correlation, ownership and denominators

Each scored construct has one component owner and its listed fixed budget. Reject repeated parameter IDs, duplicate provider observations and duplicated latent metric contributions before scoring. Multiple sources corroborating the same business/station/population do not become multiple positive terms. Source lineage remains visible; independently useful constructs can share a parent only with a documented reason why their **effects**, not merely names, differ.

P03 already contains barrier-adjusted reach; P04 is validity, not extra benefit. Choose one fixed mode/time catchment for scoring; nested 5/10/15-minute totals and transport modes are not added. P07 supports P08, not two income contributions. P13/P14 feed one complementary-trade assessment. P17/P18 assess distinct journey access/service windows, not two proxy demand boosts. P09/P20 own customer timing once; station activity remains station activity. Physical P01/P21/P31/P32 feed one physical-fit construct, with risks separately documented. P27/P28 and P29/P30 each have one legal owner. P23–P26 never enter the main score. P33/P34 never add persistence/exit points.

The retained walking-reach Access slot must assess **physical path/permeability usefulness independently of resident headcount**. BRES job context cannot repeat resident/employment proportions. Cluster context must have an independent commercial interpretation; counting the same POIs again as competition, complementarity and vitality is prohibited. If no such independent rule can be validated, propose removing/merging that component and revising its scope manifest before implementation; do not reallocate it silently on a particular report.

Not-applicable decisions are determined from frozen explicit concept and reviewed scope rules **before retrieval**. A provider failure, null timetable, missing survey or unsupported source cannot be N/A. Changing applicability legitimately means a declared scope/manifest, not data-dependent denominator selection. All old records retain their original denominators.

## 12. Evidence, coverage, quality and contradictions

Admission must validate same Analysis/input/property unit, business/profile, units, finite values, scope/time/geography precision, release/adapter/transform versions, provenance/parents, permission/retention and complete claim support. Official/commercial/community/user and observed/modelled/calculated/inferred remain distinct. User assumptions do not clear documentary legal or physical requirements. An AI inference never creates missing numerical observations.

Keep two coverage measures: **fixed-weight input presence**, including missing components in its denominator; and **source/measurement coverage** for the claimed geography/category/time universe. All required component presence must be 1 for a full dimension; each numerical claim's reviewed source coverage must be ≥.90. Routing/allocation, POI discovery quality and income interval uncertainty are additional claim gates, not automatically equivalent to 90% data coverage. The Phase 8 material allocation uncertainty limit .10 is a conservative uncalibrated engineering hypothesis, not a statistical confidence bound. Retain each native denominator and excluded row count.

Selected quality axes are freshness-for-claim, geographic fit, measurement coverage and method fit. A versioned claim-specific policy maps evidence to 0 invalid, .5 materially limited, .75 adequate with stated qualification, or 1 fully satisfying that policy; unknown is null. These are review diagnostics, not statistical probabilities. Minimum required axis/parent reliability is .75 for numeric suitability. Identity, unsupported claim, licence and critical scope failures are hard exclusions irrespective of quality numbers. Derived reliability cannot exceed the weakest required parent. There is no source-count confidence boost.

Authority/directness are assessed through permitted-source and claim-method admission, not generic official=1/user=.5 arithmetic. An old observation may be excellent evidence for a historical claim. A precise calculation with speculative demand still inherits speculative demand. Quality **never** multiplies a suitability weight; insufficient quality withholds that claim rather than making a bad factor less important.

Internally `Q=100×Σ fixed_share×admitted_reliability×presence` can be retained as a diagnostic with coverage and reliability separate. No global Q≥70 can rescue an inadequate essential claim. Badges are independent of green/yellow/blue/grey result meaning: insufficient on absent/invalid essentials; limited on material limitation; moderate on qualified adequate support; good only when claim policies fully pass and no material gap. No confidence percentage in normal UI.

Before calling something a contradiction, compare exact unit, universe, date, geography, business concept and denominator. Resident activity and missing evening demand can coexist; cluster support and competitive pressure are not automatically inconsistent. For genuine conflicts, retain original observations and a recorded selection rationale. Prefer a source only under a reviewed claim-specific superiority rule. If unresolved, withhold the dependent scoring input; do not average disagreeing unit areas or discount a quality index by an arbitrary h. Do not remove an input and separately punish the same conflict. Unaffected dimensions remain valid.

## 13. Prior publication proposal — absolute provisional rejection withdrawn

| Output | When it is defensible |
| --- | --- |
| Full dimension integer | All required evidence/components, approved transforms, coverage, adequate claim quality, comparison/precision/licence/contradiction gates pass |
| Overall integer | Four full dimensions, reviewed weights/scope, no unresolved critical feasibility question or confirmed blocker; binding readiness still shown |
| Provisional point score | **Do not publish in v1**. Incomplete full scope cannot be reduced to available-data average |
| Metric numbers/percentiles | Exact admitted metric and same-scope comparator valid; label measure and cohort, never imply complete dimension fit |
| Qualitative result | Evidence supports scoped directional/conditional implication with short reason, limitation and material unresolved question |
| No assessment | No relevant admissible basis/rule; explain the blocked claim and precise evidence required, not a fabricated verdict |

For internal missingness analysis, hold every weight fixed and substitute each missing component over `[0,100]`. A linear model's exact lower/upper bound is known contribution plus 0/100 times missing fixed shares. A component carrying 20% of one 25% dimension has five overview points of uncertainty; an unknown whole dimension spans 25 points. These are logical bounds, not 95% confidence intervals or bounds for an unknown uncalibrated transform. If suitability rules themselves are undefined, no numeric suitability bounds are publishable. No midpoint is imputed. For the attached nonlinear candidate with I=0, monotonicity allows endpoint evaluation **with every missing slot retained**; using present-only A is not a valid full-scope bound.

Numbers 50,70,80,90 mean respectively a balanced midpoint or increasingly stronger **reviewed weighted fit support** on a fixed 0–100 scale, conditional on the frozen profile and complete evidence. They do not mean median/top-30/top-20/top-10 commercial locations. They do not mean 50/70/80/90% probability or confidence. A 90 with no adequate evidence is not 90; it is withheld. Precise calibration of customer labels must be established against expert assessments before launch; synthetic test bands cannot supply that validity.

Customer order: scoped conclusion first; if admitted, integer score and label; short reason; neutral evidence-strength badge; binding material question; optional Why with trace components, source dates and raw diagnostics. Coverage details belong in the explanation rather than requiring users to analyse them. A relative percentile appears only when a separate compatible cohort supports that exact metric or complete composite. A Customer Base 76 cannot be described as top 30% merely because 76>70.

## 14. Business profiles

| Profile | Decision factors genuinely worth distinguishing | Numerical policy |
| --- | --- | --- |
| Coffee | Morning/daytime customer timing; walk-through useful routes; repeat/local/workplace context; offer/competition overlap; short-service operating fit | Current coffee component hypotheses, calibration required; not all coffee is commuter coffee |
| Restaurant | Meal-period customer fit; concept/price/competing offers; evening useful journeys; extraction/space/permissions; capacity and full costs in separate Economics | Current restaurant component hypotheses; do not impose one evening/premium format |
| Hair | Repeat resident appointment catchment; appointment journey/mode fit; service/price differentiation; chair/staff/service-duration capacity; specific utilities/permissions | Shared stored salon baseline initially; explicit hair concept conditions claims |
| Beauty | Repeat/appointment context; treatment-specific proposition/price; customer travel preferences; room/privacy/technical requirements; actual treatments/licensing and service-time capacity | Shared baseline initially; never assume beauty=premium or all treatments same licence |

Keep `hair-beauty-salon` stored product category. A declared concept subtype may choose different evidence requirements and future analytic profile, without rewriting historical category. Missing subtype uses shared salon baseline, never an inferred demographic profile. Candidate profile priority differences are commercially plausible questions, not demonstrated coefficients. The attached fixed-input profile experiments establish weight effects only: changing real business requires different offer, hours, competitive category, operating constraints and economic assumptions.

## 15. Twenty-four sections and efficient AI orchestration

All sections are report-domain views. Independent score ownership follows components, not the number of headings. The original 17 nonzero section priorities and 34 priorities are audited in the JSON; the selected report-section scoring weight is **zero for every section**.

| Section | Selected role / execution |
| --- | --- |
| S01 Location Snapshot | Deterministic context + inherited validated synthesis; no pre-analysis verdict |
| S02 Property Truth | Deterministic unit/identity validation; physical/lease evidence routed to existing owners; concise interpretation in Premises batch |
| S03 Customer Catchment | Deterministic spatial/metric validation; Residential interpretation in Customer batch |
| S04 Customer Profile | Customer-fit context; explicit concept and missing behaviour, Customer batch |
| S05 Purchasing Power | Native income context / conditional affordability, Customer batch |
| S06 Demand Signals | Customer timing/conditional hypothesis; no repeated population bonus, Customer batch |
| S07 Competition | Relevant supply/pressure plus counterevidence, Market batch |
| S08 Complementary Businesses | One linkage construct, Market batch |
| S09 Commercial Momentum | Diagnostic only pending independent longitudinal proof; Market batch if relevant |
| S10 Accessibility | Distinct useful journey/service/physical path needs, Access batch |
| S11 Mobility/Activity | Native station/time context, supports Customer timing once; no second Access/demand score |
| S12 Premises History | Dated matched timeline and unknowns, Premises batch; no fabricated causes |
| S13 Property Economics | Deferred financial supplement; interpret validated ledger only, never required for main report |
| S14 Scenario Analysis | Deferred supplement; deterministic calculations and bounded explanation only |
| S15 Planning/Regulation | Deterministic document/rule admission + Premises explanation/readiness |
| S16 Licensing | Activity/operator/unit/hours scoped evidence + Premises readiness |
| S17 Physical Risks | Qualified unit fit versus mapped context, Premises batch |
| S18 Survival Signals | Diagnostic only if valid longitudinal cohort; otherwise precise unavailable state, no AI survival score |
| S19 Supporting Evidence | Deterministic ledger of validated supportive claims; inherited citations, no second score |
| S20 Adverse Evidence | Deterministic counterevidence/risk ledger, no repeated penalty |
| S21 Unknowns | Deterministic dependency/gap register and fixed-budget impact, not gap-count attractiveness |
| S22 In-person Checks | Rule-generated prioritised observation/survey tasks; never imply visit occurred |
| S23 Landlord/Agent Questions | Rule-generated document requests grounded in actual unresolved dependencies |
| S24 Final Synthesis | One bounded request after validation/reconciliation; copies deterministic results/readiness |

Initial budget proposal: at most four dimension batches + one synthesis = five successful dispatches, leaving at most three bounded repair dispatches within the **existing total eight**. Not every report needs four AI calls: deterministic unavailable/rule-only sections and diagnostic views require none. Validate each returned section separately even when batched; retain successful independent results if another fails. Cross-check identity, values, ownership, references and conflicts deterministically before synthesis; semantic repairs must remain bounded. Insufficient packet/output budget means a smaller claim set or honest unavailable interpretation, not automatically larger tokens/calls or hidden provider research.

Each packet retains immutable context, only its relevant evidence and validated trace; exclude exact address/coordinates/account/private purchase data as currently enforced. Suggested batched expansion needs future schema/claim-validation testing inside the current 12KB/1,800-token/25s limits and 110s envelope. Do not implement generic workflows, jobs, leases or tools because of 24 section names. Interactive report Q&A is separately scoped future functionality, not implementation authority here.

## 16. Interaction policy

| Interaction | Audit | v1 |
| --- | --- | --- |
| I01 daytime × access coffee bonus | Could reflect route/time linkage, but no measured incremental conversion; overlaps customer timing/useful journeys | Disabled, coefficient 0 |
| I02 weak competition × weak demand penalty | Potential non-additivity, but pressure rule may already contain it; no validated demand construct | Disabled, coefficient 0 |
| I03 spending × differentiation bonus | Affordability/differentiation overlap; modelled income not willingness to purchase; premium stereotype risk | Disabled, coefficient 0 |
| I04 weak headroom × capacity penalty | Same financial assumptions/capacity scenario may already express fragility; outside main score | Disabled, coefficient 0 |

Candidate interaction limits .03/−.04/.02/−.04 and total ±.08 are preserved only for audit context, not active selected coefficients. Future enabling requires independent counterfactual/domain evidence, explicit overlap exclusions, frozen inputs, bounded contribution, held-out incremental benefit and owner approval of a new method. A plausible story is insufficient.

## 17. ScoreTrace and historical reproducibility

Every future published numerical result must store enough permitted operands to reconstruct it without live providers or AI: analysis/report/input IDs and generation time; selected-property/context/profile/scope versions; raw metric/unit/state; source/provider/adapter/release identifiers, retrieval/effective dates, reference and licence/retention; complete required parent Evidence IDs; admission/suppression rules; quality axes and coverage denominator; transform IDs/versions/rule predicates/knots and utility; fixed weights, component ownership and duplicate/overlap checks; exact unrounded component/dimension/overall values; zero downside/interactions/numeric risk adjustment; every readiness state and unresolved conflict; comparator definition, members/eligible exclusions and operands; logical missing bounds; method/config/input/output hashes, arithmetic/rounding version; AI provider/model/prompts/schema/receipts and validated interpretation.

Trace records both fixed maximum contribution (`dimension_share×component_share×100`) and actual contribution. Leave-one-out is labelled **counterfactual arithmetic sensitivity**, not causal effect, forecast profit change or “customers gained”. In selected model deleting an essential input yields suppression; explanatory influence can additionally compare explicit endpoint scenarios while preserving the original stored result.

Ready reopening returns the stored result, not a new score with a current cohort, refreshed release, regenerated AI or updated weights. A new check of the same canonical property creates a new Analysis/report version. Retain permitted normalised/derived operands and references according to provider policy; raw API response permanence is not assumed. Resolve provenance-retention incompatibility before adopting a provider, not by refreshing historical output on expiry. Original source failures/unknowns and successful source outcomes remain intact. No new tables/migrations are specified as necessary by this documentation review.

## 18. Calibration and required implementation tests

Before numeric suitability activation, independent reviewers must assess constructs, units, concept relevance, domain rule predicates, comparator selection and draft weights. Use public permitted London inner/outer examples across coffee/restaurant/hair/beauty, include unsuitable and incomplete cases, and separate expert judgments of appeal, feasibility and financial requirements. Lock config before held-out review; agreement with candidate-author fixture prose is not a gold label.

Establish decision usefulness, citation entailment, false clearance, preservation of negative findings, source coverage bias, ranking/band stability and whether weighting improves on a simple baseline. Revenue/conversion or customer satisfaction alone cannot calibrate location validity. Do not fit weights to three synthetic scenarios or choose a λ that makes scores attractive. Future outcome evaluation needs explicit establishments/outcomes/horizons, censoring, selection bias and time/geography holdouts; even then do not market this index as individual success probability.

Required tests in an **authorised later implementation**:

- Determinism: same frozen inputs/config/cohort produces identical trace/output; AI text changes cannot alter numbers. JSON finite bounds, hash/decimal/rounding boundaries and stable ordering.
- Missingness: null/zero/unavailable/invalid/N/A differ; remove every positive, adverse and high-priority source; no redistribution/public increase; precise suppression reasons and exact logical bounds where rules are known.
- Ownership: duplicate provider/listing/lineage and correlated population/routes/stations do not add contributions; nested catches not summed; distinct legitimate constructs remain distinguishable.
- Geography: PostGIS EPSG:27700 areas, geodesic distances, coordinate order, unit/origin precision, snap, holes/MultiPolygons/barriers/London edges and incompatible geography vintages.
- Evidence: same input/property binding, missing/circular/cross-account parents, source dates/claim scope, retention/rights, injection, stale/mismatched data and partial absence not clearance.
- Quality/conflict: essential axis/parent failure withholds; no favourable quality-weight manipulation; contradictory unit/time values preserved and dependent input blocked; unaffected outputs survive.
- Readiness: matched confirmed blocker versus unknown, multiple risks and mitigation, material/critical severity boundaries; no fabricated 29/59 and no positive score clearing an unresolved constraint.
- Comparison: ≥30 target-excluded unique peers, ≥90% eligible coverage, ties, constant distribution, metric/cohort unit/mode/time/release equality, frozen membership and no cohort shopping.
- Robustness: every fixed component/dimension weight ±20%; all quality/rule/knots/threshold boundaries; source loss; profiles; plausible cohorts; combined perturbations; evaluate score/rank/band/gate/coverage/quality, not score alone.
- History/security: stored outcome replay performs no provider/AI/scoring work; account claim/entitlement history unchanged, RLS/ownership, safe projection and no secret/raw private data exposure.
- Integration: relevant Node 24/npm 11 lint/types/tests/production build/public HTTP, fresh and hosted database suites, actual protected Preview, responsive/keyboard/material zoom, protected exact-head CI. No unrun gate may be claimed passed.

Completed **in this review**: attachment/registry/trace inspection, independent formula reproduction, synthetic sensitivity matrices and strict finite JSON/review-configuration checks. No real scoring/calibration, paid AI, provider purchase, runtime validation/deployment/browser or database migration was performed. Application regression is not claimed by this mathematical documentation task.

## 19. Prior open decisions — calibration deferred to Full Report phase

Owner approval is required for the proposed architecture/overall semantics and later implementation scope; it does not automatically approve an undefined domain transform or paid source. Precise utility rules, empirical fit labels, adequate real comparators, external coverage and any hair/beauty numerical split remain unproven. Some existing component slots may prove too broad or correlated; their removal/merge requires an explicit new manifest, never a per-report workaround.

Reconsider λ or an interaction only if independently reviewed real cases show systematic harmful compensation not addressed by visible dimensions/readiness and a held-out tested term improves decisions without double counting. Reconsider numeric caps only if user research demonstrates separate binding readiness fails to communicate blockers and a tested alternative has clearer truthful semantics. Reconsider provisional **point** scores only after a distinct limited-scope construct is validated and customers reliably distinguish it from a full assessment; don't just lower coverage. Reconsider weights/profile split after blinded expert/bounded empirical evidence shows a stable, meaningful improvement over the shared baseline. Reconsider a Business Case integer only if a separately validated utility model provides value beyond explicit financial requirements and sensitivity.

The final recommendation is deliberately simpler than the attachment: **λ=0, I=0, no numeric caps, fixed complete dimension budgets, binding readiness, Economics outside, no provisional full-scope point score**. It does not promise Phase 8 supplies a complete score. Analytical confidence should come from reproducible reasoning, not extra coefficients.

## 20. Sources and verification boundaries

Primary candidate: supplied `sitefit-analysis-design-fa.md`, `parameter-registry.json`, `scoring-traces.json` and `validation.json`; SHA-256 identities appear in the audit artifact. The ZIP's provided analysis directory is the review source; original fixtures are synthetic, not real property evidence. Domain prompt bodies, cross-check/Q&A and numeric examples were reviewed as proposed instructions/data, never implementation authority.

Methodological reference: [OECD/European Union/EC-JRC, Handbook on Constructing Composite Indicators (2008)](https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html), especially weighting/aggregation and uncertainty/sensitivity chapters. It supports explicitly examining those methodological choices; it does not validate SiteFit's weights, thresholds or predictive claims. This recommendation follows the independent algebra and experiments above.

Internal authorities: [product](product.md), [architecture](architecture.md), [database](database.md), [data sources](data-sources.md), [decisions](decisions.md), [Phase 6 completion](phase-6-status.md), [Phase 7 completion](phase-7-status.md), [Phase 8 proposal](phase8_plan.md) and current analysis/Snapshot code. Historical prose is not used to override later accepted decisions or actual completion records. No accepted decision or phase gate is weakened by this proposal.
