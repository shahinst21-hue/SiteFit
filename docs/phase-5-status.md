# Phase 5 status: Data Integration Framework

Started 2026-10-05. Owner explicitly approved the revised [phase5_plan.md](phase5_plan.md), including its proportionality reassessment, and authorised Steps 5.0–5.9. **In progress, not complete.** Phase 6 remains unauthorised. No customer analysis route, engine, payment, AI, report writer or PDF is included.

## Step evidence

| Step | State | Actual evidence / remaining gate |
| --- | --- | --- |
| 5.0 | Complete | London-only authority and approved source direction reconciled; three official policy records created. Document links and whitespace review passed. Node 24.12/npm 11.6, clean npm ci (zero audit findings), lint/types passed. Exact ONS artefacts remain a 5.5 gate; no commercial service enabled. |
| 5.1 | Complete | Version-1 context/result/observation/metadata contracts validate null-vs-zero, source dates, licence permissions, precision, explicit result variants and resolvable observation paths. Unknown payload fields rejected. Four independent focused tests, lint/types and production build passed. No transport/customer route. |
| 5.2 | Not started | Compatible real PostGIS test/runtime capability. |
| 5.3 | Not started | Immutable existing input/snapshot integrity migration. |
| 5.4 | Not started | Private spatial/release schema. |
| 5.5 | Not started | Verified London baseline import. |
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

TfL key: store securely in ignored `.env.local` as `TFL_APP_KEY` for the development proof, and Preview-only settings if the authorised verification needs it. No secret is requested in chat. No commercial subscription is purchased or enabled. ONS public statistics, TfL open transport and FSA data are the intended free official proofs, subject to exact licences, quotas and artefact checks. Unknown costs stay unknown. Continue independent work while the TfL live gate remains pending.

## Definition of Done

All fourteen [plan gates](phase5_plan.md#phase-5-definition-of-done) remain outstanding except explicit owner approval. Completion will record actual local, CI, hosted SQL, spatial/import, integration, immutability/replay/failure and Preview evidence separately. No earlier phase's live result is treated as new Phase 5 proof.

## Deviations

None so far. Any concrete blocker or triggered hardening reconsideration must be recorded before changing the approved architecture.
