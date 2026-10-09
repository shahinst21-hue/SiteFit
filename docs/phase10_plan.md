# Phase 10: Economic Engine — approved implementation plan

Prepared 9 October 2026. **Implementation authorised by the owner, including the amendments below.** No new purchases, subscriptions or later phases are authorised. D78/D79/D80 and the [Product Contract](product.md) govern the proposal. Phase 9 is complete; its completion does not authorise Phase 10. [Focused research](phase-10-research.md) records current sources and the separate historical-name investigation.

## Recommendation and customer value

Build a small deterministic operating model, not a revenue predictor or accounting system. Answer: **What sales and daily trade would this business need, what surplus remains under your assumptions, and which costs change the case most?** Support coffee shops, restaurants, hair and beauty salons through one calculation kernel with concept-specific input explanations and trade units. Use existing PropertyData only for clearly qualified rent context. Actual/user-confirmed terms take precedence. No new paid provider is needed.

Economics remains separate from location attractiveness, premises feasibility and Decision Readiness. The Financial Engine is a separate product experience, never a form, calculation section or optional feature embedded in the Free Snapshot, Full Report or PDF. Purchase and delivery never require engine access or inputs. Phase 10 implements its underlying contracts, deterministic capabilities and immutable persistence only; final interactive UI requires separate later approval. Independently, the future Full Report receives qualified rental evidence from existing PropertyData endpoints. No second feature fee is introduced here.

## Reviewed current capabilities and constraints

- `lib/wizard.ts` already names annual rent, business rates, transaction value, gross margin, staff/other costs, opening days/hours, size and investment. Its permissive optional-input parser is not a financial model. Reuse field terminology where appropriate, but use a new closed runtime contract rather than importing old numeric assumptions blindly.
- Phase 8 retains PropertyData `rents-commercial` candidates, currently **unadmitted**, bound to frozen OS point/UPRN/release. The existing database guard allows restaurants context for coffee/restaurant, not salon. Unknown radius units, observation/model vintage, dispersion and selected-format fit remain genuine gaps. Do not rewrite those snapshots or change `admitted:false` in historical payloads.
- EPC certificate area is not lease NIA, verified trading area or capacity. ONS income/residents/jobs, NUMBAT and FSA/Overture do not establish store turnover, spend or conversion. D77's competitor-count restrictions remain.
- Phase 9 supplies private immutable premises event bundles and current claim-aware ownership helpers; it supplies no rent, rates, vacancy-duration or turnover guarantee. Preserve its original bundles and the ready Free Snapshot graph.
- `economic_models` already has analysis/input/model, inputs, outputs, scenario assumptions, missing inputs and timestamps. Authenticated table SELECT is revoked. Ready Free guards prohibit new `analysis_inputs`, `data_snapshots` and `evidence_items` on that analysis. Therefore economic assumptions must live inside a new immutable supplement row referencing the **existing** input, not a new input/source graph or an exception to its freeze.
- Phase 7 binds permanent account, analysis and server-confirmed Test entitlement. Email is never ownership/entitlement authority. Production purchase is disabled. Existing UX/UI is **not approved for launch**.

## Scope and input contract

Proposed modules: `lib/economics/model.ts`, `calculate.ts`, `rent.ts`, `service.ts`, `repository.ts`, `projection.ts`; focused tests and one development-only proof script under `scripts/`. Pure calculation code has no provider, database, AI or browser dependency. Server service/repository remain server-only. Reuse validation, canonical hashing, provider transport and access helpers. No general modelling platform.

Closed `EconomicInputV1` binds analysis/input/property/business, input-context digest, model/schema version, currency GBP, planning year, explicit period, assumptions and source references. Every operand contains value or null, unit, period, basis, origin (`verified_source`, `user_assumption`, `user_reported_document`, `provider_market_estimate`, `official_rule`, `illustrative_assumption`), date/reference when available, missing reason and exclusions. A user-described lease/bill is **user-reported**, not independently verified. Do not collect uploaded documents, employee names or bank information.

Amounts enter as decimal strings with at most two places, become integer pence. Rates use integer basis points; computed fractions retain exact numerator/denominator internally. Serialize integers safely as decimal strings where needed. Never persist BigInt values as JSON numbers or use binary floats for money. Reject unknown keys, non-finite/exponent/negative amounts, invalid units/periods, excessive sizes and inconsistent totals; losses are valid **outputs**. Money limit £100m/year; spend £1m/unit; rates 0–100%; days/week integer 1–7; trading weeks/year decimal 1–52; direct annual open days integer 1–366. No claim that broad limits are plausible business assumptions.

| Input | Treatment and requirement |
| --- | --- |
| Annual rent | User-reported lease/agent figure or explicit user estimate; alternatively a separately acknowledged compatible market-derived estimate below. Blank remains unknown. |
| Rates, service charge, insurance, utilities, maintenance, software/licences, waste, marketing, other fixed costs | Annual operating amounts, net of recoverable VAT where appropriate. Separate named lines or one explicitly inclusive total, never both. Unknown vs zero vs not applicable is recorded per material group. Rates use expected bill after known relief, not rateable value or domestic council tax. |
| Staffing | Annual **fully loaded** total including wages, employer NI/pension, paid leave/cover as applicable. User confirms scope. No exact payroll estimator or flat statutory loading percentage. |
| Owner labour | Explicit annual remuneration allowance, or explicit exclusion. Show its impact separately so owner-operated businesses cannot appear profitable merely by treating labour as free. |
| Average spend | Gross customer receipt per transaction, restaurant cover or salon appointment, with selected trade unit. Legacy ATV is a transaction, not automatically one unique customer. |
| Gross margin | User-assumed margin after goods/ingredients/consumables, **before** staffing/other operating costs. Alternative direct goods cost percentage is mutually exclusive. Missing margins are represented only by labelled versioned illustrative scenarios, never verified sector defaults. |
| Additional variable costs | Net-sales percentage for delivery/commission etc plus net cost per trade unit if required. Card fees quoted on gross takings are converted explicitly. Each line has one basis; no duplicated COGS/staff/commission. |
| VAT | Explicit registered/not registered/unknown; registered mode requires standard-rated share of gross receipts and applicable rate. Confirm costs are net of recoverable VAT; otherwise flag/reject mixed cost basis. No automatic tax-status transition. |
| Trading calendar | Direct annual open days OR days/week × trading weeks/year; mutually exclusive. Display the selected planning convention and expected closures. Hours are optional and never multiply revenue by themselves. |
| Assumed daily trade | Optional nonnegative transactions/covers/appointments per open day, or annual gross sales; mutually exclusive scenario revenue drivers. Needed for surplus/margin, not break-even. |
| Capacity | Optional user-estimated maximum trade units/day, with basis. For salon, appointments are not inferred from floor area or opening hours. Restaurant covers differ from bills; coffee transactions differ from unique visitors. |
| Investment | Optional one-off setup amount retained as context, excluded from recurring operating break-even. No payback/ROI forecast in V1. |

Minimum complete break-even case: acknowledged rent, all fixed-cost groups explicitly supplied/covered/zero/not applicable, owner-labour treatment, spend/unit, positive contribution and open days, consistent VAT/cost basis. Progressive capture can start with rent/spend/rates; these three fields **alone are insufficient** for a whole-business break-even. Display the remaining specific inputs. Prepopulation selects compatible trusted facts first, then explicitly labelled illustrative assumptions for missing financial operands; no customer fields are mandatory to purchase or receive a report. No massive mandatory wizard: aggregate staffing/other cost totals are accepted with explicit inclusions. Partial known-cost totals may be shown as such, never as a complete break-even or profit.

Every output has `available`, `missing_input`, `unavailable`, `not_applicable` or `no_finite_break_even`, a nullable value and explicit reasons. Record exact dependent operand paths; missing daily trade suppresses profit but not a complete break-even, missing capacity suppresses capacity comparison only, and missing compatible area suppresses the rent estimate without suppressing user-rent calculations. Bundle state is complete/partial/invalid; invalid submissions are rejected rather than saved as successful. Do not hide useful independent results because an optional output is unknown.

## Calculation specification: `economics-v1`

All calculations refer to one representative planning year without automatic seasonal, inflation or growth assumptions. Period conversion: monthly ×12, weekly ×52, annual ×1. Trading weeks are independently specified; staff/lease annual costs continue through closures unless the user supplied otherwise. Square metres to square feet uses exactly `1 / 0.09290304` and preserves area basis.

Let G = gross spend per chosen trade unit; q = fraction of gross receipts standard-rated; t = standard VAT rate; m = gross margin after goods; v = other variable net-sales fraction; k = additional net cost/unit (including explicitly converted gross card fees); F = fixed operating costs excluding owner allowance; W = owner allowance; D = annual open days. Registered: **A = G × [(1 − q) + q/(1 + t)]** net sales/unit. Unregistered: A = G and costs include unrecoverable VAT. Unknown VAT prevents net/profit/break-even outputs. The weighted formula is essential: `G/(1+q*t)` is incorrect for a mixed gross sales basket.

**Contribution/unit C = A × (m − v) − k.** A margin input of 70% means m=0.70, not a 70% markup. Variable fractions must use net-sales basis; gross-takings card fee f becomes k = f×G, plus any fixed transaction fee. Negative/zero contribution means no finite break-even under this model, not zero required customers. Cost/margin omissions never become zeros.

| Output | Exact calculation and customer meaning |
| --- | --- |
| Fixed costs | F and F+W, with full inclusion list and missing/excluded items |
| Break-even trade/year | B = (F+W)/C, conditional on C>0 and complete inputs |
| Break-even net/gross sales | B×A / B×G; both labelled, avoiding VAT ambiguity |
| Trade needed per open day | B/D exact; display rounded **up** whole trade units/day, retaining exact calculation. Multiplying the displayed ceiling back into annual sales is a distinct conservative scenario. |
| Customers needed | Only when spend is explicitly per customer/cover or an explicit units-per-customer assumption exists; otherwise display transactions/appointments needed and customer conversion unavailable. Never label these unique daily people. |
| Scenario gross/net sales | N×D×G / N×D×A for assumed daily trade N; annual-gross-sales driver uses sales/G to obtain model trade units |
| Operating result before owner allowance | Annual contribution − F |
| Planning surplus after owner allowance | Annual contribution − F − W; before tax, interest, depreciation, financing, capex and working capital. This is conditional planning profitability, not take-home pay or a forecast. |
| Surplus margin | After-owner surplus/net sales; unavailable at zero sales, not Infinity or 0% by default |
| Target-surplus trade | (F+W+explicit annual target surplus)/C/D, rounded up; target is a user assumption |
| Capacity pressure | Required units/day compared with user capacity; excess is a conditional constraint, not proof of physical infeasibility |
| Rent headroom at assumed trade | Annual contribution − non-rent fixed costs − W; negative remains negative. It is operating headroom under this scenario, not market valuation or recommended bid. |

Round monetary displays half-up to pence (whole-pound summaries may have a separate declared display rounding). Round required whole trade/customer units upward only at the final presentation boundary. Percentages use declared precision; compare exact rational operands. Do not round intermediate net spend/contribution. If all acknowledged fixed costs are zero and C>0, break-even is legitimately zero with a prominent exclusion check. D=0 is invalid; 100% goods cost and fees, missing costs, invalid VAT mix, overflow and incompatible units fail explicitly. No clamp of losses or silent margin reallocation.

A nonregistered scenario exceeding the pinned ordinary taxable-turnover threshold gets an explicit VAT-review warning: it remains a hypothetical nonregistered case, never a claim that this status is permissible at that sales level. Users can run a separate registered scenario with a declared sales mix and cost basis. Do not deduct VAT from every fixed cost: wages, rates and different supplies have different treatment. Costs must be supplied on the consistent economic basis; unknown recovery cannot silently inflate profitability.

Deterministic section implications can say: “At your assumed spend and costs, about X appointments a day are needed to cover operating costs and the owner allowance.” They must expose the decisive assumptions and conditions. No claim that the locality will supply X customers. AI may interpret frozen results in Phase 12; it cannot produce/alter operands, financial calculations or success probabilities.

## Commercial rent: reuse with honest qualification

Reuse the Phase 8 outcome first. Do not refetch a historical candidate because a supplement is reopened or a scenario changes. A later explicit new analysis may collect a fresh candidate. For a genuinely absent type-specific outcome, a bounded development/approved collection can call existing `rents-commercial` once: restaurants for coffee/restaurant; **retail as a qualified salon proxy**, not a salon rent dataset. A new salon outcome belongs to the economic bundle, not a fabricated Phase 8 snapshot or relaxed legacy guard. Preserve the existing transport's fixed endpoint, secret header, no retries, timeout and byte/credit bounds.

Two levels: (1) retain provider average annual quoting rent and £/sqft/year as **area market context**, with count, returned type, NIA/GIA, radius/value/unit unknown, retrieval time, model/vintage gaps and source-policy version; (2) calculate `rate × user-confirmed same-basis lease area` as a **conditional size-based market estimate** only after explicit type/area acknowledgement. Require positive rate, nonzero sample, valid measurement basis and finite output. This is an eligibility rule for a labelled estimate, **not** market comparability calibration or a statistical confidence threshold. Never use average provider area or EPC area to guess the selected lease area. If type fit/area basis is unknown, level (2) is unavailable; level (1) can still help the customer ask about an agent quote.

Do not promote a provider average total annual rent to the unit's rent. No claimed rental confidence interval: provider dispersion is absent. A user-chosen ±rent stress range is a scenario, not a market range. Landlord terms exclude/integrate rent-free incentives, rent VAT, service charges, rates, repairs and reviews explicitly; V1 is headline annual cost, not lease valuation. User inputs supersede market estimate in calculations while retaining both provenance paths. A provider failure leaves user-input calculations working.

[Endpoint documentation](https://propertydata.co.uk/api/documentation/rents-commercial) describes commercial data as relatively simplistic and quoting rents as modelled from VOA/MHCLG inputs. Retrieval date is not an observation date; record published methodology separately without filling absent per-response vintage. Existing `admitted:false` remains true to its original Phase 8 meaning. Economic estimate classification has its own version and never becomes location-score evidence.

## Scenarios and adjustable assumptions

One explicit baseline plus up to four explicitly selected variants per run. Initial convenience stress options: rent +20%, daily trade −20%, gross margin −5 percentage points, and fully loaded staff cost +10%. These are **proposed product stress choices**, not sector statistics, percentiles or forecast probabilities. Show exact changed operands; customer can replace values. No automatic optimistic/pessimistic forecasts. Baseline incomplete means dependent scenario outputs remain incomplete; a variant can supply an explicitly missing operand but never quietly fill baseline.

Recalculate using the same pure kernel, no provider/AI calls. Show changes in daily break-even, surplus and capacity pressure. Persist only on explicit run/save, not every keystroke. Draft edits stay page memory in the future form. New saved assumptions create a new append-only supplement with parent ID; prior versions remain selectable and unchanged. Double submission with the same client run UUID/content returns the same row; UUID with different digest rejects. A later intentional run gets a new UUID. No distributed/exactly-once provider claim.

## Persistence, access and integration

One forward migration extends existing `economic_models` with supplement metadata: schema version, context/content digest, run UUID, optional parent supplement ID and server completion timestamp. Inputs contain the immutable economic context; outputs contain all baseline/scenario values, derivation paths, rounding, warnings/missingness and source receipts. `input_id` remains the original frozen resolved analysis input. Model version and canonical digest bind all assumptions and results. Cap a bundle at 100 KB, fixed cost lines at 20 and variants at four; no per-metric database rows.

Use a narrow service-only atomic writer and stored reader, following Phase 9 ownership patterns. Verify current `sitefit_access_owner`, permanent account, existing analysis/input/property/business binding and server-confirmed entitlement; never accept caller owner ID or email as authority. Reader is claim-aware. Parent must belong to the same analysis/account and cannot form a cycle. Deny ordinary table/RPC access, mutation/deletion/truncate of completed rows, foreign input/source/parent references, changed-content replay and forged account claims. Do not weaken ready Free/main report guards. Source references require owned snapshot checksums or a validated bounded rent receipt; calculations link exact operand paths and formula version. The engine stays independent of report sections/PDF. A separately frozen rental evidence projection is available for later Full Report preparation; it contains no financial calculations.

The server service recomputes all outputs from the validated assumptions and approved model before invoking the private writer; client-supplied totals, formulas, rent receipts and calculated verdicts have no authority. The database independently enforces bindings, grants, content identity and append-only rules, without introducing a second SQL financial engine. Service-side model/receipt validation remains required even when a JSON payload hashes correctly.

Calculation remains independent of access checks; the server orchestration enforces them before persist/project. Development proofs may use real permanent accounts with existing **Test** entitlement; they demonstrate supplement mechanics, not a ready purchased Full Report. Customer execution stays unconnected until separately approved interactive-engine UI work. Internal proof entry points are CLI/service only, not unauthenticated HTTP calculators or production debug routes.

Stored reads return validated minimal section output/assumption labels, not raw provider bodies, private purchase parameters or privileged keys. New calculations never change payment/analysis status. Reopening invokes zero calculator/provider/AI calls; replay tests pin bytes/digests even if active model/tax references change. Licensed historical retention and access restrictions apply; expiry never triggers silent refresh/regeneration. Privacy deletion remains the later explicit legal/retention workflow, not a database mutation escape introduced here.

## Sources, licensing and cost

| Source | V1 use, rights and spend boundary |
| --- | --- |
| User assumptions / reported bills | Primary financial inputs; private, attributed as user supplied, no independent-verification claim. No employee personal data. |
| Existing PropertyData | At most one new commercial rent request per missing eligible type/context, one credit; zero on stored scenario/read. Raw response discarded, permitted normalised dated historical subset/derivatives and receipt retained. No bulk/current searchable cache. Existing historical/termination review remains a launch gate. |
| GOV.UK/HMRC official references | Dated versioned VAT guidance and cost-scope explanations, OGL attribution where copied. No live tax API, tax returns, automatic payroll/relief calculator or new integration. |
| Existing Phase 8/9 | Bind property, identity, permitted source receipts and limitations; no population-to-sales model or historic occupancy/rent inference. |

Published PropertyData minimum API plan is £28/month for 2,000 credits: £0.014/credit **only at full utilisation**, versus £2.80/report if a £28 plan supports just ten reports/month. Its 500-credit trial is temporary, not a free operating plan. Engine/scenarios use no AI or paid calls beyond eligible rent collection. No subscription/renewal approval is implied. Proposed Phase 10 live proof ceiling **six rent credits**, preferably zero by reusing stored outcomes; confirm active trial and available balance before dispatch. Do not redo paid identity resolution to populate a benchmark. If trial is expired or terms require purchase, mark new rent proof dependent and continue pure/user-input/persistence work; ask only for that genuine spend/access decision. Approval of this plan should explicitly include the six-credit existing-trial ceiling, not paid access.

Storage target: six small proof supplements plus indexes ≤500 KB added, no bulk load; measure actual database/relation/index/TOAST bytes. Phase 9 database was 374,199,987 bytes, leaving only 800,013 before the existing 375 MB checkpoint. Recheck current storage before migration/proofs. Crossing that checkpoint requires reporting actual figures and the existing admission process; do not silently adopt the 500 MB ceiling as target or purchase an upgrade. Stored owned lookup p95 target ≤1 second; pure calculation target <50 ms for five scenarios on the development machine. These are small verification budgets, not production SLA/load certification.

## Execution sequence and required QA

| Step | Deliverable | Evidence required before moving on |
| --- | --- | --- |
| 10.0 | Approved scope/formulas/stress choices; baseline/trial/storage inventory; create status | Approval, unchanged historical fingerprints, actual available credits/bytes; no secrets |
| 10.1 | Closed economic/source/units contract | Missing vs zero, cost basis and duplicate-line rejection; business trade units/VAT/period validation |
| 10.2 | Pure contribution/break-even kernel | Independent hand-calculated coffee/restaurant/salon cases and zero/negative contribution, VAT basket, rounding/overflow boundaries |
| 10.3 | Costs/profit/calendar/owner treatment | Annual/month/week equivalence, closures, costs inclusions, zero-sales margin, no free owner labour or duplicated commission |
| 10.4 | Rent context and conditional estimator | Stored candidates preserved; real existing-provider shape where permitted; incompatible area/category and outage paths; salon retail proxy qualified |
| 10.5 | Scenario kernel and useful projection | Stress monotonicity, exact deltas, missing dependencies, no provider/AI dispatch, correct customer/trade-unit labels |
| 10.6 | Forward migration and owned immutable supplements | Fresh and hosted RLS/claim/entitlement/foreign-input/changed-replay/mutation tests; server-only grants; actual storage/latency |
| 10.7 | Private future-section integration | Entitled Test account explicit run → saved projection → new version → zero-call stored read; original reports/history unchanged |
| 10.8 | Proportionate real evidence / financial QA | Three concept calculations with clearly synthetic business assumptions attached to existing London contexts; real rent receipts separated; one sparse/unmatched and one provider failure; no new customer sales claim |
| 10.9 | Regression/security/protected delivery | Required checks, protected Preview boundaries, exact-head CI, protected merge/post-merge CI, clean main=origin; final limitations/status |

Independent expected-value fixtures (GBP, annual, explicitly synthetic) establish core arithmetic, not local viability:

| Case | Assumptions | Independently expected result |
| --- | --- | --- |
| Coffee | Unregistered; G £5, margin 70%, no extra variable fees; F £60,000, W £12,000, D 300; 100 trades/day | C £3.50; BE net/gross £102,857.142857…; 68.571428… trades/day → 69; surplus £33,000 |
| Restaurant | Registered, all receipts standard-rated at 20%; G £30/cover, margin 65%; F £150,000, W £30,000, D 300; 40 covers/day | A £25; C £16.25; BE net £276,923.076923… / gross £332,307.692307…; 36.923076… covers/day → 37; surplus £15,000 |
| Salon | Unregistered; G £50/appointment, goods margin 90%, variable commission 40% of net; F £70,000, W £20,000, D 250; 16 appointments/day | C £25; BE £180,000; 14.4 appointments/day → 15; surplus £10,000. Commission excluded from fixed staffing |
| VAT basket | Registered; G £12, half gross receipts standard-rated at 20%, half zero-rated | Net A £11 exactly, not £10.90909… |

QA validates formulas against independent arithmetic, not a second production calculator. One bounded set covers all concept semantics; no exhaustive postcode/route QA or dozens of paid fixtures. Regulatory references do not certify customer assumptions. Required final commands: Node 24/npm 11 `npm ci`, `npm run check`, `npm run check:database`, production-server `npm run check:public`, relevant hosted SQL/security suite, minimal private owned service proof and protected Preview/public-shell/secret boundary checks. Existing Auth/purchase/claimed Snapshot regressions remain required; do not repeat live Google/inbox/Stripe ceremonies for untouched flows. Any changed customer control requires actual browser/keyboard/responsive and material 200% usability checks; otherwise record UI unchanged, not new user acceptance.

## Definition of Done — implementation gates, implementation progress recorded in phase-10-status.md

- [ ] Owner approves formulas, labelled stress assumptions, cost/VAT/owner treatment and bounded existing-trial proof permission.
- [ ] Steps 10.0–10.9 complete within approved scope; `docs/phase-10-status.md` records actual evidence and deviations throughout.
- [ ] Coffee, restaurant and salon deterministic contribution, break-even, daily trade/customer qualification, surplus and scenario outputs match independent expectations.
- [ ] Verified source facts, market estimates and user assumptions remain distinct; missing costs, VAT, type/area and nonpositive contribution do not produce misleading complete outputs.
- [ ] Rent context/conditional estimation reuses existing access with recorded rights/credits, no fabricated unit quote/confidence interval and no compulsory provider dependency for user-input cases.
- [ ] Supplement versions, source/operand/model/rounding provenance and zero-call reopening are immutable; original Phase 6–9 history remains unchanged.
- [ ] Permanent-account/claim/entitlement/input binding, RLS/grants, raw/private leakage and replay/security tests pass fresh and hosted.
- [ ] Small real-provider/user-assumption proofs, actual storage/lookup measurements, required regression/build/public/Preview gates and limitations recorded honestly.
- [ ] Exact-head required CI, protected merge and post-merge CI pass; final main=origin and working tree clean.
- [ ] No paid purchase/renewal, Production activation, new provider, Full Report/PDF/UI redesign, scoring or AI prompt calibration or Phase 11+ implementation.

## Exclusions, risks and owner decisions

Exclude payroll/tax/benefit eligibility engines, VAT filing and automatic registration, accounting integrations, bank feeds, legal lease analysis, business valuation, financing/loan schedules, working-capital/cash-flow forecast, investment payback, Monte Carlo/probability modelling, sector benchmark acquisition, population→revenue conversion, invented margins/footfall/capacity, AI calculations, new historical-name adapters and generic workflow/jobs/leases/cache/billing/reservation infrastructure. No historical report deletion to free capacity. No additional infrastructure spend.

Largest product risk: users mistake conditional arithmetic for a sales forecast. Mitigate with assumption-led result wording, owner-labour inclusion, explicit costs/missingness, VAT basis and useful sensitivity. Largest data risk: a broad restaurant/retail benchmark is mistaken for actual lease terms; require acknowledgement and compatible area or leave estimate unavailable. Largest delivery risk: bolting supplementary inputs onto a ready frozen graph; use existing-table append-only bundles and keep customer flow integration in Phase 13. Trial expiry/storage/termination rights may block rent-dependent work, not deterministic implementation.

Owner approval is recorded: implement this revised scope with a maximum of six existing PropertyData trial credits. No additional paid calls or subscriptions are authorised. No new account, paid provider or infrastructure is necessary for the baseline. Paid PropertyData renewal/launch rights, legal policy and customer dashboard delivery remain separately approved later gates. No new historical-business-name integration is permitted. Reuse existing admitted Phase 9/9.5 evidence only where it genuinely supports the claim. Do not treat planning approval as live payment, launch or later-phase authority.

## Authoritative owner amendments — 9 October 2026

These supersede conflicting older references to forms, optional report sections and manually populated baselines. AI-native means source-first prepopulation and review/edit on request; unsupported costs, trade, margins and sales remain explicitly illustrative. AI may propose adjustments/explanations; strict validation and the deterministic kernel remain authoritative. No paid AI execution is authorised by this phase.

### Both existing PropertyData rent endpoints

- [rents-commercial](https://propertydata.co.uk/api/documentation/rents-commercial): local modelled headline quoting benchmarks, never the selected premises' agreed rent. Preserve returned area basis, sample, native radius and unknown vintage/dispersion.
- [valuation-commercial-rent](https://propertydata.co.uk/api/documentation/valuation-commercial-rent): full postcode, commercial type and internal area required; sqft default or explicit sqm. The documented input requires GIA for retail/industrial/restaurants/pubs and NIA for offices. JSON costs one credit; PDF adds another credit and is excluded. Preserve returned estimated rent and reported margin of error without manufacturing confidence or contracted rent.
- There is a documented basis conflict: benchmark methodology describes NIA for retail/leisure whereas the valuation input requires GIA for retail/restaurants. Do not multiply an NIA benchmark by GIA or silently convert between them. EPC unspecified certificate area does not establish lease GIA/NIA. Missing compatible exact-unit area means property-specific valuation unavailable, while qualified local benchmark remains available without user form completion.
- Reuse validated historical rental/Phase 9.5 evidence first. Rights/retention policy and exact selected-property/input provenance remain required. No automatic refresh on reopening and no rewrites of historical unadmitted snapshots.
- Step 10.4 includes both endpoint adapters, compatible/incompatible area paths, provider-reported error semantics and six-credit cumulative live verification accounting. Step 10.7 supplies independent rental-report and engine projections, no final UI.
- Acceptance requires source/prepopulation precedence, labelled illustrative scenarios, minimal validated overrides, independent rental context, both endpoints evaluated, explicit fallback, unchanged historical reports and all remaining original security/CI/measurement gates.
