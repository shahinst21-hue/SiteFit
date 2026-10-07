# Phase 8 status — London data enrichment

Started 7 October 2026 under owner-approved [phase8_plan.md](phase8_plan.md) and D76. **In progress; not complete.** Phases 6 and 7 remain frozen. Final scoring and grouped analytical prompts are frozen candidate designs; provisional scoring is permitted in principle but not activated/calibrated here. Location attractiveness is separate from Premises/Decision Readiness and Economics.

## Implementation sequence

| Step | State | Evidence / remaining gate |
| --- | --- | --- |
| 8.0 Baseline/contracts | Complete | npm ci/check/public/fresh and nine hosted legacy suites pass. Legacy fixture/migration digest manifest pinned; all six hosted ready-graph fingerprints unchanged after additive polygon migration. Geometry/native-statistics validators and source/release admission map recorded; combined regression passes 154 tests/lint/types/build. |
| 8.1 Property resolution | In progress; live QA gap | Owner confirmed trial access; key found locally. Bounded server-only resolver/exact match gate tested. Live unit mismatch suppressed; whole-building match; residential alias unresolved; empty no-match. OS join/new precise context/persistence pending; no subscription purchase/renewal authorised. |
| 8.2 Official Customer Base | In progress; Census admission verified | Four pinned native OA releases loaded/ready in hosted development, 26,369 profiles each, exact geography join and native totals/distributions verified. TS007 single-year bulk has no OA, so no fabricated OA 16–64 count. Income/BRES and catchment integration/QA remain pending. |
| 8.3 Overture | Pending | Existing planning probe is research, not an admitted production inventory. London ingestion and expanded coverage/category/entity QA pending. |
| 8.4 Walking geometry | In progress; first live polygon proof passes | Owner confirmed Free Local access. Kingston 300/600/900-second polygons validate in typed boundary and hosted PostGIS, cover origin and nest. Matrix, expanded barriers/borders, actual credits and immutable observation replay remain pending. |
| 8.5 Transport/activity | Pending | Existing TfL adapter remains; new NUMBAT release/time/day-type/station normalisation and QA pending. |
| 8.6 Premises/benchmark | Pending dependent sources | Approved PD access and chosen official constraint coverage/precise-unit proofs pending. No legal clearance, history or financial engine. |
| 8.7 Metric/cohort evidence | Pending | Retain reproducible operands/distributions/missingness; no final scoring calibration. |
| 8.8 Existing projection | Pending | New evidence/data/geometry wiring under versioned validators, historical readers unchanged; no final prompt rewrite. |
| 8.9 Full verification/delivery | Pending | Local/fresh/hosted/Preview/security/CI/protected merge/post-merge gates not claimed passed. |

## Approval and scope

The owner explicitly authorises Phase 8 data implementation. PropertyData trial/recurring subscription requires separate approval; free provider registration credentials stay local/secure and are never requested in chat. Existing public-source permissions are rechecked for the exact admitted representation. Provider failure must preserve independent successes. No distributed workflow/cache/lease/monetary reservation infrastructure, Production activation, live payment, Full Report generator, financial execution, PDF or Phase 9/10.

Preserve metric values and units/universes, input/origin precision, source/provider/release/schema/adapter/method versions, retrieval/effective dates, comparator membership/distribution/eligible exclusions, source coverage, missing reasons, quality/freshness, permitted representation/retention and parent evidence. Reopening any ready report performs no enrichment, scoring or AI work and preserves its original graph.

## Current validation

Node 24.12.0/npm 11.6.2; npm ci passed, zero reported dependency vulnerabilities. Baseline npm run check passed lint/types/145 tests/build; public HTTP checks, fresh database and nine existing hosted rollback suites passed. Latest Census/walking-adapter checkpoint passes 158 tests/lint/types/production build. Fresh database includes the Census release/import/immutability/privilege suite; that suite also passes hosted development. All nine hosted legacy rollback suites pass again after Census ingestion. Future source/integration/Preview gates are not covered by this checkpoint.

Migration `20261007130000_enrichment_polygon_contract.sql` is applied to hosted development after a dry-run showing only that migration. It adds a service-only pure polygon validator in existing source_data: no table/report/payment changes. Fresh and hosted tests pass for holes/disjoint parts, projected area and invalid/self-intersecting/empty/Z/CRS rejection and grants. Existing ready history has 21 analyses/inputs/reports, 42 source snapshots, 111 evidence rows and 70 sections; all six before/after fingerprints match. No raw history or account identifiers are published.

Planning PR #22 merged through protected CI at `46007a0`; revised candidate/authority PR #23 merged after rebase/exact-head CI at `7cd6071`. Implementation is on `codex/phase-8-data`, not complete or merged.

Live PropertyData schema probe plus four cases use header authentication, one bounded call per case and no retries; candidate lists remain memory only. Four proof calls report 10/10/10/1 credits. A prior single schema probe's receipt was not captured; its documented ceiling is 10 credits. Unit 1 Hutton House returns the whole-building `PP` record and is not an exact trading-unit match. Hutton House without Unit 1 matches one UPRN; point stays unknown precision pending OS. Residential candidate `RD06` is not permission to operate commercially. No-match returns empty. This proves access/adapter behaviour, not completed commercial-unit or canonical persistence gates.

OS Open UPRN September 2026 CSV archive passes the official 619,271,161-byte size/MD5 check. Local SHA-256: `107503d45bedaab7f74511766eedbd617f9ca3592113363711e94f4b6458d55a`. Embedded metadata dates extraction to 14 August 2026; September filename is not the retrieval/reference day. Regional extraction/exact UPRN QA continues; no new release is active yet. Prior scoring audit remains synthetic candidate evidence, not new data verification. [Data contract/admission map](phase-8-data-contracts.md) distinguishes artifacts from admitted runtime releases.

### Census admission checkpoint

Migration `20261007140000_native_census_profiles.sql` is applied to hosted development after its isolated dry-run and fresh suite. Service-only native profiles extend existing immutable dataset releases; loading releases are inaccessible to ready readers, identical batches replay safely, conflicting batches fail, activation requires every frozen London OA and ready rows cannot change. No historical input/source/report or payment schema is rewritten.

All four releases join geography `248a9600-59cb-4fbe-9791-d64f9cb28aa1` and have 26,369 OA profiles with zero missing cells. Stored totals and p10/p50/p90 of the native OA total match the validated local representation:

| Dataset | Hosted release | Native total | OA total p10 / p50 / p90 |
| --- | --- | --- | --- |
| TS007A | `3738fcbc-486a-4abf-99b7-2a89dbd56fc9` | 8,799,243 usual residents | 220 / 329 / 454 |
| TS003 | `b046c1dd-d84f-4b9f-b452-8fc526b6d078` | 3,424,979 households | 98 / 127 / 167 |
| TS045 | `ac73e7eb-6cdb-4c34-b9f1-69e76761f05a` | 3,423,705 households | 98 / 127 / 167 |
| TS066 | `f5d5f231-61d1-4f15-9bd0-5ebcefc6dcf3` | 7,104,534 residents aged 16+ | 183 / 264 / 362 |

These are descriptive native distributions, not scoring cohorts or calibrated transforms. Household totals differ by 1,274 across disclosure-controlled tables; no forced reconciliation or fabricated fractional age band is applied. Original hierarchy, units/universes, exact archive/header/normalised checksums, Census reference day and actual download timestamps are pinned. National temporary ZIPs are discarded after successful admission; permitted London profiles/provenance remain. All six historical ready-graph fingerprints remain unchanged after ingestion.

### Geoapify first live proof

Owner confirmed Free Local configuration; no paid service or Preview key transfer. One bounded Local request for the cross-checked whole-building Kingston point returned 10,727 bytes and three MultiPolygons. Hosted PostGIS validates each, covers the requested origin and finds zero smaller-area fraction outside the next polygon. Areas in EPSG:27700 are 239,643.53 / 922,622.34 / 2,032,697.32 m²; vertices 71 / 151 / 237. This whole-building technical proof does not repair the unresolved Unit 1 identity gate. Echoed origin is not a verified snapped entrance; routing version/snap and observed billing remain unknown. Expected isoline cost is six credits; no receipt is invented.

The server-only adapter discards provider metadata and exposes only validated geometries/settings/unknowns, sanitises URL-reflecting errors, bounds bytes/time and rejects centroid/unknown origins. Geoapify requires query authentication; safe deployed outgoing-request telemetry/redaction is still a gate before runtime Preview wiring. PostGIS admission, matrix/border/barrier QA, London gating and stored replay remain required; adapter shape alone does not admit an analysis.

## Deviations

D76 explicitly defers final scoring/prompt calibration and withdraws the absolute no-provisional policy; this is an owner-approved boundary amendment, not a relaxed data/rights/security gate. No implementation deviation recorded yet.
