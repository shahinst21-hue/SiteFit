# Proposed database design

Status: Proposal for Phase 3 and subsequent implementation, recorded 2026-10-03. Supabase Postgres is accepted; this schema is not final or implemented. There are no migrations, tables or RLS policies yet. Fields below are conceptual, not SQL.

## Proposed entities

| Table | Purpose and representative fields | Relationships and access considerations |
| --- | --- | --- |
| profiles | Application identity: auth user ID, permitted profile details, timestamps. | Links to Supabase Auth; users access their own permitted fields. |
| properties | Resolved property identity: internal ID, canonical address, coordinates, provider references and resolution confidence. | One property can have multiple analyses; public/shared versus private fields needs an explicit policy. |
| analyses | One assessment: ID, property ID, owner reference, business category, lifecycle status, version, timestamps and failure metadata. | Owns inputs, evidence and reports; owner model depends on the Phase 3 account decision. |
| analysis_inputs | Versioned user economics and context, units, periods, supplied/missing status. | Belongs to an analysis; distinguish unknown from zero and retain inputs used by each result. |
| data_snapshots | Provider, dataset/version, query context, retrieval and observation dates, availability state, permitted payload or reference, expiry. | Linked to analyses/evidence; provider licensing governs retention and reuse. |
| evidence_items | Evidence ID, claim/source classifications, value and units, geographic scope, source reference, dates, limitations, derivation and availability. | Links to snapshots or user inputs and downstream claims; preserve provenance. |
| competitors | Observed nearby businesses, classification, location, observation date and limitations. | Belongs to an analysis and links to evidence; presence does not establish commercial performance. |
| premises_events | Dated premises observations/events with type, confidence, references and unknowns. | Links to property, analysis and evidence; do not infer complete occupancy history. |
| economic_models | Deterministic inputs version, formula version, outputs, scenario assumptions and missing-input state. | Belongs to analysis; auditable links to analysis inputs/evidence. |
| reports | Report ID, analysis ID, report/schema version, evidence/input/model versions, generation status, provenance and timestamps. | Ownership and paid entitlement enforced; no unvalidated draft published. |
| report_sections | Section key/order, structured content, claim-to-evidence references and unknowns. | Belongs to report; important claims must reference evidence. |
| payments | Analysis/owner reference, provider checkout/payment references, configured price reference, amount, currency, verified status and timestamps. | Server-controlled; unique provider references for idempotency; no card details. |
| pdf_exports | Report/version reference, protected storage path, export status, timestamps and expiry where approved. | Same ownership as report; no public private-report bucket by default. |
| system_events | Event ID/type, analysis/payment/report references, correlation ID, outcome and timestamp. | Restricted operational access; redact credentials and minimise personal data. |

These tables are expected targets, not a mandate to build everything in Phase 3. Phase 3 establishes the minimum schema and access foundations; later phases add entities/fields through migrations as required.

## Proposed analysis lifecycle

```text
draft -> collecting_free_data -> free_ready -> awaiting_payment -> paid
      -> collecting_full_data -> calculating -> generating_report -> ready
```

The line break is visual only: `paid` transitions to `collecting_full_data`. `failed` is an explicit failure state reachable from processing stages when recovery cannot proceed under the agreed retry policy.

| State | Meaning and proposed transition guard |
| --- | --- |
| draft | Inputs started; collect free data only after required address/category validation. |
| collecting_free_data | Resolve/collect permitted initial data with explicit source failures. |
| free_ready | Snapshot generated from available evidence, including unknowns. |
| awaiting_payment | Checkout initiated; no full-report entitlement based on browser return. |
| paid | Payment confirmed by verified server-side provider event. |
| collecting_full_data | Gather permitted full-report evidence and premises observations. |
| calculating | Run deterministic calculations; missing inputs yield explicit insufficient evidence. |
| generating_report | Build and validate evidence-backed structured report. |
| ready | Validated report available under ownership and entitlement controls. |
| failed | Record stage and safe failure reason; preserve entitlement and retry context. |

This is a proposed processing lifecycle, not the complete payment state machine. Payment cancellation, refunds, disputes, retry/resumption and concurrent workers require explicit rules in their phases. Enforce legal transitions server side; retries must not duplicate payment or corrupt report versions. Missing individual sources may allow a report with Unknown sections if product rules permit; they do not imply all analysis must fail.

## Integrity, access and retention

Plan foreign keys, unique provider-event/payment references, explicit status constraints, timestamps and version links. Currency values need explicit currency and precise deterministic representation; units and formula rounding rules are specified with Phase 10.

RLS and storage policies must reject cross-user access. Privileged operations belong to trusted server contexts. Anonymous access and conversion to an account remain unresolved until Phase 3; do not implement permissive policies to bypass that decision. Raw payload retention, evidence sharing, personal-data deletion and report expiry require later licensing/privacy decisions. No retention duration or fabricated provider identifiers are approved here.
