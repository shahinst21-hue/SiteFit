# Phase 9: Premises History — approved implementation plan

Owner authorised immediate implementation on 9 October 2026. This supersedes the previous proposal. D78/D79 govern the work. No new provider research, account, integration, purchase or subscription. GLA and the reviewed-source importer are removed from baseline. [Status](phase-9-status.md) records actual evidence.

## Scope and architecture

Deliver a private section-ready, immutable premises evidence timeline using existing PropertyData Planning, EPC, and frozen Phase 8 FSA/Overture/context outcomes. Planning applications and decisions are dated property events, not proof of implemented works, current consent or tenancy. Certificate dates are not opening dates. Register names and changed observations do not establish tenancy intervals, closure reasons or vacancy. Explicit unknowns are required.

Reuse existing server-only transports, EPC non-address normaliser, frozen enriched inputs, source policies and claim ownership helpers. Add a focused premises-history module; no generic workflow infrastructure. Extend the existing unused premises_events table with one immutable JSON bundle per analysis/input/version and a narrow service-only writer. Bundle source outcomes, selected normalised events/evidence paths and frozen Phase 8 snapshot references. Leave legacy estimated dates/confidence null. This avoids weakening ready Free Snapshot guards or duplicating each fact into multiple stores. Stored replay performs no provider/AI/scoring calls; later checks use a new Analysis.

Strict v1 contract binds analysis, input, property, UPRN and context digest. Each event carries provider record ID, date meaning/precision, conservative identity scope, fact, public reference and source receipt/evidence path. Receipts retain retrieval time, query bounds/exclusions, outcome/error, truncation and licence. Thirty events/100 KB maximum; strict runtime validation and secret/URL/date checks. RLS follows existing authorised account claims; cross-owner/input writes and mutation denied. No public collector or private receipts in browser payloads.

## Provider and retention rules

PropertyData: existing approved trial, at most ten planning candidates/one credit per request, no retries, twenty Phase 9 credits including proofs. Query frozen OS building point; exact primary/street/postcode match required, conflicting sub-unit rejected. Record default type exclusions, radius, no age filter and capped scope. Retain only selected dated factual metadata and authority references under existing historical policy. Discard nearby candidates, applicant/personal fields, documents and raw bodies. Existing post-termination/launch display-rights review remains open; trial approval is not renewal permission.

EPC: existing approved API, one UPRN discovery page/ten results and at most three CEPC detail calls. Only existing permitted non-address fields/OGL normaliser; no restricted postal/assessor data. Preserve discovery cap and ambiguity; no latest/current or trading-unit claim.

FSA/Overture: reuse frozen IDs/checksums and as-of observations, never manufacture historical occupancy from current inventory. D77 qualified inventory/count restrictions remain. Source failures preserve successful independent outcomes. No new data bulk load, paid fallback or AI spend.

## Execution and acceptance

| Step | Scope | Required proof |
| --- | --- | --- |
| 9.0 | Scope, trial/capacity, historical baseline | Owner authorisation, actual credits/storage/digests |
| 9.1 | Closed contracts and conservative matching | Exact building, adjacent/sub-unit rejection, date/URL/claim validation |
| 9.2 | PropertyData Planning | Real commercial event, nearby rejection, finite credit/error/schema tests |
| 9.3 | EPC history and frozen context | Real certificate, cap/missing states, permitted fields/provenance |
| 9.4 | Business observation qualification | Names only as recorded facts; no unsupported tenancy/closure dates; no importer |
| 9.5 | Deterministic projection | Sort/dedup, evidence links/gaps, independent failure preservation |
| 9.6 | Immutable persistence/security | Fresh/hosted owner/claim/input/write/replay tests; old reports unchanged |
| 9.7 | Proportionate London QA | Small coffee/restaurant/salon/ambiguous/sparse set, two actual dated property events; no exhaustive recall QA |
| 9.8 | Integration/regression | Private stored section projection and protected Preview; existing customer runtime unchanged |
| 9.9 | Delivery | Exact-head required CI, protected merge/post-merge CI, clean main=origin |

The former mandatory exact prior-tenant proof is replaced by qualified existing-source observations and explicit unknowns, following the owner coverage decision. This never authorises fabricated tenancy dates. Positive dated property events must demonstrate useful capability.

Run targeted Node tests/lint/types during runtime changes; final Node 24/npm 11 npm ci, npm run check, npm run check:database, real production-server npm run check:public, relevant hosted SQL and protected Preview proofs. No repeated payment ceremony or new 200% gate for untouched UI. Automated tests are not user acceptance; current UX/UI remains not approved for launch.

Measure actual PostgreSQL database/relation/index footprint and owned stored read p50/p95. Proof increment target ≤500 KB; lookup p95 ≤1 second. Preserve Phase 8 storage margin and existing admission policy. No upgrade, silent ceiling relaxation or deletion of historical reports. Stop only the dependent part for genuine owner decisions.

## Definition of Done

- [x] Owner authorised revised existing-provider-only scope.
- [x] Steps 9.0–9.9 and required evidence completed.
- [x] Real planning/EPC evidence admitted; two dated events; conservative identity and date semantics.
- [x] Unknown, unavailable, capped, sparse and not-applicable states explicit; no fabricated occupancy/closure/vacancy.
- [x] Historical graphs unchanged; immutable replay makes zero external/AI/scoring calls; failures preserve successes.
- [x] Runtime, ownership/claim/RLS and cross-input security checks pass locally and hosted; no private/raw/restricted leakage.
- [x] Credits, licence limits, actual storage/latency and useful evidence yield recorded.
- [x] Regression, protected Preview, exact-head/post-merge CI pass; protected merge; clean main matches origin.
- [x] No new provider/service/purchase/subscription, Full Report generation, economics/PDF, scoring calibration or Phase 10.

No new durable lifecycle, lease tokens, queues, distributed ownership, billing ledgers, monetary reservations, distributed caches or exactly-once execution claims. No UI redesign. Customer report delivery and pre-launch rights remain later gates.

