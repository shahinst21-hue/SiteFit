# D98 commercial rental correction and technical proof

12 October 2026. Rental correction implemented; the single authorised live proof **failed Synthesis validation**. Phase 12/new paid release is **BLOCKED**, no retry authorised or performed. No completion claim.

## Source and pipeline audit

Actual owned frozen input has **one** `propertydata-rent` / `rents-commercial` snapshot: restaurants, £35/sq ft/year, 20 analysed properties, NIA, average 1,259 sq ft, independently reported annual modelled quoting average £43,524, native radius 0.57 with **unknown units**, retrieved 8 October. No retained Retail observation exists for this input. George's retail/restaurant radius claims are not admitted and do not replace this response.

Request uses the selected OS building point, `GET /rents-commercial`, `location=51.5374622,-0.0613296&type=restaurants`, privately supplied header credential. Normalisation preserves area, annual figure, sample, native radius, missingness and modelled basis. Phase 8 stored the candidate with `admitted:false`; it remains unchanged. Old Full preparation only consumed already-attached economic supplements; D97 repaired the new-preparation bridge. D98 preserves average area/annual figure through catalog → Synthesis packet → immutable projection → dashboard/PDF, separately by cohort. Phase 11 assessment/index and historical Full revision 7 remain unchanged.

Optional future Retail retrieval: same endpoint/location, `type=retail`, documented ceiling **one Commercial request/credit**. It is unnecessary for this proof and **not authorised/performed**. Coffee supports either/both independently; restaurants exclude retail, salons exclude restaurant. Original source bindings/checksums/identity/licensing gate each cohort. No sample summation, unit-rent calculation, GIA/NIA conversion or invented radius/median/distribution.

## Provider methodology

[API contract](https://propertydata.co.uk/api/documentation/rents-commercial) defines quoting rate, analysed properties, average area and annual quoting rent. Its commercial-method section describes a proprietary model from VOA rateable values and MHCLG areas adjusted for market conditions, type grouping/outlier exclusion and interquartile means. It is **not proof of live commercial listing prices**. Published method mentions 2026 rating-list/2024 comparables, but this stored API outcome returns no model date; do not assert its specific vintage. Radius units are undocumented in endpoint outputs and stay unknown. Sample populations may overlap. Average annual figure is independently supplied, never the product of the other averages.

[Valuation endpoint](https://propertydata.co.uk/api/documentation/valuation-commercial-rent) requires GIA for restaurant/retail valuation; this NIA benchmark cannot supply that input. No verified compatible exact-unit GIA exists. [Licensing](https://propertydata.co.uk/api/documentation/licensing) permits enhanced reports and dated historical observations; no raw responses or current-cache claims are added.

## Proof and safeguards

One private operator-only new immutable edition uses the **actual repository preparation path**, frozen source/assessment and permanent Test entitlement. Verification-run marker is not accepted by customer HTTP handlers and is denied in Production. Before dispatch: PostgreSQL capacity/fingerprints, fresh migration/security suite and request preflight (`gpt-6.1-sol`, tier `default`, store false, no tools, output 3k/3k/6k, unchanged input bounds), standard pricing and remaining reservation. Forward migration changes only report-start ceiling to 1,840,000 microdollars; question ceiling and prior reservations unchanged.

Reserve before dispatch, at most once per group, persist only safe rule/path diagnostics on rejection, never retry. Ready/retrieval/replay/dashboard/both PDF export types require actual successful verification. Failure leaves release blocked. Source/web spending stays disabled: empty registry, absent grants. Real-secret/raw-response rejection remains alongside D97 false-positive corrections.

## Actual results

Full `npm run check` passes lint, strict types, **320 tests**, actual fresh PostgreSQL/PostGIS migration/security suite and production build. Running production HTTP smoke passes 13 public pages/articles, metadata/404s and safe boundaries. Hosted development forward budget migration applied: private grants/text rejection pass, report cap US$1.84 and entire question function hash unchanged. Before writes: 375,772,851 bytes, Ready fingerprint `d1b7ad7acdac8d86cde7fbbb89bba27c`, reserved US$1.54, zero search grants. No purchase/pruning.

Dry **actual repository preparation** confirms one qualified restaurant cohort including 1,259 sq ft/£43,524; no source/AI call. Request sizes **14,109 / 6,130 / 23,942 bytes**, outputs **3,000 / 3,000 / 6,000**, tier `default`, model `gpt-6.1-sol`, no tools/store. [Official standard pricing](https://developers.openai.com/api/docs/pricing), rechecked 12 October: $2/M input, $2.50/M cache-write, $10/M output. Higher cache-write input rate, 68,500 conservative bounded input tokens including framing, 12,000 output cap/no discounts give **US$0.29125**, below US$0.30 reservation. One-shot local marker/durable reservation prevent another dispatch; private script enforces at most three requests, no provider/search egress.

Implementation head `cbff09232e6dd55a62ddfdf16d4dfe50eea60519` passed both exact-head CI runs **38238549989 / 38238472907** (clean install/check/build/public smoke). D98 actual repository path reserved one new edition `69045f3d-33ea-477b-ac71-9d7624310346` on frozen case: three requests, no retries/source calls.

| Group | Validation | Input / output tokens | Duration | Estimated US$ |
|---|---|---:|---:|---:|
| Context | Accepted | 3,484 / 289 | 6,854 ms | 0.009858 |
| Premises / rental | Accepted | 1,260 / 190 | 6,081 ms | 0.004420 |
| Synthesis | **Rejected** | 5,323 / 5,697 | 112,641 ms | 0.067616 |
| Total | Draft, not Ready | **10,067 / 6,176** | **121,928 ms** end-to-end script | **0.081894** |

Safe receipt: `unsupported_narrative_claim`, rule **`unsupported_outcome`**, path **`sections[7].conclusion`** (Appendix conclusion). Provider returned a completed result below the 6,000 output-token cap; rejection occurs in deterministic narrative validation, before publication. No inference about the exact phrase, fabrication or false positive is justified: rejected prose is unretained. No validator change/retry or further spend follows this failure.

Post-failure actual owned read: revision 6, draft, projection null, **zero published sections**. Frozen preparation retains the qualified £35 NIA restaurant benchmark, 20 properties, average 1,259 sq ft and independently supplied £43,524; original candidate/assessment unchanged. All prior Ready rows and the prior failed edition's whole digest match; prior Ready graph `d1b7ad7acdac8d86cde7fbbb89bba27c`, rent-source fingerprint `bf9f402054b6b946540ab92d2ac2f8ec`, question function hash unchanged; foreign owner gets 42501. No partial customer content or rejected prose.

Database **375,830,195 bytes**, +57,344 from before proof, **24,169,805 bytes** below 400 MB. Total conservative reservations **US$1.84**, including all earlier unknown costs, remain intact; US$0.081894 is usage-derived estimated cost for this proof, not an invoice or freed reservation. Search grants zero, registry empty, paid fallback inactive.

## Acceptance ledger

| Owner criterion | Actual result |
|---|---|
| 1. Rental evidence through new Full | Preparation and accepted group verified; **final Ready publication unproved** |
| 2. Independent concept-relevant cohorts | Implemented/tests pass; real case has restaurants only, Retail not captured |
| 3. Missing/invalid figures withheld | Actual TSX/PDF fixture regression passes; no invented prices/placeholders |
| 4. PropertyData-first fallback safeguards | Implemented/tested, inactive, no new source/search call |
| 5. New V1 → Ready → retrieval/replay | **FAILED** at Synthesis validation; no Ready/replay claim |
| 6. Historical/security/budgets | Actual owned/foreign reads, digests, grants/reservations verified unchanged |
| 7. Actual new Ready dashboard/PDF | **OPEN/BLOCKED by criterion 5**; component/exports tested, not a live new report |
| 8. Required checks/CI | 320 tests/build/fresh PostgreSQL, hosted guards/ownership, implementation exact-head CI pass; final documentation/delivery CI receipt in PR |

Deliver [PR #41](https://github.com/shahinst21-hue/SiteFit/pull/41) only into gated development/Preview. Main parent PR #35 remains draft; no Production, customer paid activation, Phase 14 or additional budget request. Development source-proof pages are not a newly generated Ready report. The overall owner acceptance criteria are **not satisfied**.
