# Phase 5 status: Data Integration Framework

Started 2026-10-05. Owner explicitly approved the revised [phase5_plan.md](phase5_plan.md), including its proportionality reassessment, and authorised Steps 5.0–5.9. **In progress, not complete.** Phase 6 remains unauthorised. No customer analysis route, engine, payment, AI, report writer or PDF is included.

## Step evidence

| Step | State | Actual evidence / remaining gate |
| --- | --- | --- |
| 5.0 | Complete | London-only authority and approved source direction reconciled; three official policy records created. Document links and whitespace review passed. Node 24.12/npm 11.6, clean npm ci (zero audit findings), lint/types passed. Exact ONS artefacts remain a 5.5 gate; no commercial service enabled. |
| 5.1 | Complete | Version-1 context/result/observation/metadata contracts validate null-vs-zero, source dates, licence permissions, precision, explicit result variants and resolvable observation paths. Unknown payload fields rejected. Four independent focused tests, lint/types and production build passed. No transport/customer route. |
| 5.2 | Complete | PGlite 0.5.8 with dev-only PostGIS plugin 0.2.8 passed genuine isolated-schema, EPSG:27700 transform, geography metre-distance and GiST checks on Windows and both Linux CI runs at 7099cfe. Existing migration/security rebuild passed; hosted offers PostGIS 3.3.7 (not yet installed). Audit zero; lint/types/build passed. |
| 5.3 | Complete | `20261005110000_data_snapshot_integrity.sql` passed fresh full rebuild/ownership/property/framework suites and hosted development dry-run/apply/rolled-back framework SQL. Generated public types and server-only repository compile. Two independent privileged clients raced synthetic append in hosted development: one UUID/outcome, exact replay, ready collection/late-write denial passed; fixtures removed and triggers restored. Trusted UPDATE/DELETE and TRUNCATE are blocked. Lint/types/build passed. No lifecycle/lease tables. |
| 5.4 | Complete | `20261005120000_london_spatial_releases.sql` adds isolated gis/source_data, immutable releases/features/statistics, bounded service-only import/activation/lookup RPCs and context-release/geography validation. Fresh full PostGIS suites, hosted dry-run/apply/rolled-back spatial/framework SQL, generated public types, five focused contracts/geography tests, lint/types/build passed. CRS/metres, shared edges, outside coverage, null/suppression, version reuse/new version, incomplete activation and private-role access are checked. |
| 5.5 | In progress | Official full-resolution OA2021 BFC V8/Region2021 BFC/lookup V3 and Nomis TS001 selected; OGL and boundary notices recorded. Bounded London-only importer and two corruption/CRS/join tests, lint/types/build pass. Actual hosted import is running; activation/storage/query evidence pending. |
| 5.6 | Not started | Policy/transport/cache/telemetry. |
| 5.7a | Not started | ONS local adapter. |
| 5.7b | Not started | TfL adapter; live key dependent gate outstanding. |
| 5.7c | Not started | FSA adapter. |
| 5.8 | Not started | Finite collection/proof persistence and replay. |
| 5.9 | Not started | Complete regression/security/hosted/Preview/CI/protected delivery. |

## Architecture and scope

Follow the approved plan: trusted `resolved_context` on immutable `analysis_inputs`; snapshots reference exact input versions and have unique logical lookup identity. Versioned London local releases, genuine PostGIS, validated observations and source/quality/freshness/licence metadata are required. No historical overwrite or ready-record collection. Candidate address lists are not persisted by this framework.

Deferred request lifecycle tables, lease tokens, distributed ownership, generic workflows, detailed billing ledgers, monetary reservations and shared live caches remain absent. Process-local coordination cannot prevent all cross-instance upstream calls; database uniqueness protects persisted history. Exactly-once provider execution/billing is not promised.

## External dependencies and costs

Owner confirmed TfL keys configured locally; expected server-only variable mapped privately without printing values. Actual live proof is still pending. TfL key: store securely in ignored `.env.local` as `TFL_APP_KEY` for the development proof, and Preview-only settings if the authorised verification needs it. No secret is requested in chat. No commercial subscription is purchased or enabled. ONS public statistics, TfL open transport and FSA data are the intended free official proofs, subject to exact licences, quotas and artefact checks. Unknown costs stay unknown. Continue independent work while the TfL live gate remains pending.

## Definition of Done

All fourteen [plan gates](phase5_plan.md#phase-5-definition-of-done) remain outstanding except explicit owner approval. Completion will record actual local, CI, hosted SQL, spatial/import, integration, immutability/replay/failure and Preview evidence separately. No earlier phase's live result is treated as new Phase 5 proof.

## Deviations

Step 5.5 encountered an actual official BFC V8 invalid self-touching ring (OA E00018302). The first import correctly stopped inactive after 17,200 features. A narrow third migration adds explicitly versioned, opt-in PostGIS MakeValid polygon normalisation only when the EPSG:27700 area difference is ≤0.01m²; the observed source case differs by 3.64e-12m². Materially changed/empty/invalid repairs remain rejected. Original response checksums, algorithm revision and per-repaired-row runtime/area metadata preserve provenance. This is a necessary source-normalisation repair, not deferred execution hardening; it changes no ready history or product scope. Independent synthetic zero-area and materially changed polygon tests are required before resuming.
