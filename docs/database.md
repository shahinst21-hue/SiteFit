# Phase 3 database foundation

Recorded 2026-10-03. The initial fifteen-table schema is implemented in [20261003210000_initial_sitefit_schema.sql](../supabase/migrations/20261003210000_initial_sitefit_schema.sql), applied to the hosted development project and rebuilt in isolated PostgreSQL tests. Later pipeline/entitlement/retention mechanics remain planned. See [phase-3-status.md](phase-3-status.md) for actual gates. Production has not been touched.

## Initial entities

| Table           | Purpose and representative fields                                                                                                                | Relationships and access considerations                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| profiles        | Application identity: auth user ID, permitted profile details, timestamps.                                                                       | Links to Supabase Auth; users access their own permitted fields.                                       |
| properties      | Resolved property identity: internal ID, canonical address, coordinates, provider references and resolution confidence.                          | One property can have multiple analyses; public/shared versus private fields needs an explicit policy. |
| analyses        | One assessment: ID, property ID, owner reference, business category, lifecycle status, version, timestamps and failure metadata.                 | Owns inputs, evidence and reports; owner model depends on the Phase 3 account decision.                |
| analysis_inputs | Versioned user economics and context, units, periods, supplied/missing status.                                                                   | Belongs to an analysis; distinguish unknown from zero and retain inputs used by each result.           |
| data_snapshots  | Provider, dataset/version, query context, retrieval and observation dates, availability state, permitted payload or reference, expiry.           | Linked to analyses/evidence; provider licensing governs retention and reuse.                           |
| evidence_items  | Evidence ID, claim/source classifications, value and units, geographic scope, source reference, dates, limitations, derivation and availability. | Links to snapshots or user inputs and downstream claims; preserve provenance.                          |
| competitors     | Observed nearby businesses, classification, location, observation date and limitations.                                                          | Belongs to an analysis and links to evidence; presence does not establish commercial performance.      |
| premises_events | Dated premises observations/events with type, confidence, references and unknowns.                                                               | Links to property, analysis and evidence; do not infer complete occupancy history.                     |
| economic_models | Deterministic inputs version, formula version, outputs, scenario assumptions and missing-input state.                                            | Belongs to analysis; auditable links to analysis inputs/evidence.                                      |
| reports         | Report ID, analysis ID, report/schema version, evidence/input/model versions, generation status, provenance and timestamps.                      | Ownership and paid entitlement enforced; no unvalidated draft published.                               |
| report_sections | Section key/order, structured content, claim-to-evidence references and unknowns.                                                                | Belongs to report; important claims must reference evidence.                                           |
| payments        | Analysis/owner reference, provider checkout/payment references, configured price reference, amount, currency, verified status and timestamps.    | Server-controlled; unique provider references for idempotency; no card details.                        |
| pdf_exports     | Report/version reference, protected storage path, export status, timestamps and expiry where approved.                                           | Same ownership as report; no public private-report bucket by default.                                  |
| system_events   | Event ID/type, analysis/payment/report references, correlation ID, outcome and timestamp.                                                        | Restricted operational access; redact credentials and minimise personal data.                          |

All fourteen core tables above now exist with persistence fields, constraints and RLS. `blog_posts` is the fifteenth table, explicitly authorised by the Phase 3 request. No processing engine, provider call, generated report, payment or publishing flow is implemented. The migration is the exact SQL source of truth; representative descriptions above are not extra promised columns.

## Proposed analysis lifecycle

```text
draft -> collecting_free_data -> free_ready -> awaiting_payment -> paid
      -> collecting_full_data -> calculating -> generating_report -> ready
```

The line break is visual only: `paid` transitions to `collecting_full_data`. `failed` is an explicit failure state reachable from processing stages when recovery cannot proceed under the agreed retry policy.

| State                | Meaning and proposed transition guard                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| draft                | Inputs started; collect free data only after required address/category validation.   |
| collecting_free_data | Resolve/collect permitted initial data with explicit source failures.                |
| free_ready           | Snapshot generated from available evidence, including unknowns.                      |
| awaiting_payment     | Checkout initiated; no full-report entitlement based on browser return.              |
| paid                 | Payment confirmed by verified server-side provider event.                            |
| collecting_full_data | Gather permitted full-report evidence and premises observations.                     |
| calculating          | Run deterministic calculations; missing inputs yield explicit insufficient evidence. |
| generating_report    | Build and validate evidence-backed structured report.                                |
| ready                | Validated report available under ownership and entitlement controls.                 |
| failed               | Record stage and safe failure reason; preserve entitlement and retry context.        |

This is a proposed processing lifecycle, not the complete payment state machine. Payment cancellation, refunds, disputes, retry/resumption and concurrent workers require explicit rules in their phases. Enforce legal transitions server side; retries must not duplicate payment or corrupt report versions. Missing individual sources may allow a report with Unknown sections if product rules permit; they do not imply all analysis must fail.

## Integrity, access and retention

The migration defines foreign keys, unique checkout/payment/idempotency references, explicit status constraints, database timestamps and version links. Payment amounts use integer minor units with a three-letter currency. Units/formula/rounding policies remain Phase 10 decisions; this phase calculates nothing.

RLS rejects cross-user access. Public browsing/checker remain anonymous and memory-only; private records require an authenticated owner. Exact later submission/purchase sign-in placement remains open. Raw payload retention, evidence sharing, deletion and report expiry need later licensing/privacy decisions. No retention duration or fabricated provider identifiers are approved. No application Storage buckets or public artifact URLs are created.

## Final ownership and access model

`auth.users.id → profiles.id → analyses.owner_id` is the identity chain. Minimal profiles store only optional display name and database timestamps, not authentication email or passwords. An Auth insert trigger with fixed empty search path creates a profile; existing identities are backfilled. It is not an executable client RPC. A canonical property is backend-managed; an authenticated user can read it only through an analysis they own. Property linking/resolution is not client-writable and no address resolver exists.

All private children link to `analyses.id`; reports additionally reference a specific input/model version. Report sections/PDFs link to their report and analysis through composite foreign keys. Snapshot/input/evidence/model/report/payment composite keys prevent a row from attaching another analysis's provenance. No child repeats a user ID. Additional analysis IDs on report descendants enforce the ownership/provenance chain, rather than trusting a supplied independent report reference.

Every application table enables RLS and revokes implicit public/anonymous/authenticated privileges before explicit grants. Authenticated users can SELECT their own profile/analyses/children, update only their display name or draft business choice, create an own draft without setting status/property, and append an input version only to their own draft. Inputs are immutable snapshots. Column grants prevent owner/status/property/timestamp/payment forgery even if an owner policy passes. No client DELETE is granted.

Derived tables are read-only to their owner and writable only by future trusted services; `system_events` has no client grants/policy. Ordinary users cannot advance lifecycle, publish reports, mark payments succeeded, alter evidence or issue exports. Future payment phases must add verified entitlement/transition logic before producing paid content; this schema alone is not a checkout or report engine. `service_role` receives backend grants, but no privileged application client is created.

## Field and integrity choices

- Profiles: Auth UUID identity, optional bounded display name, created/updated timestamps.
- Properties: canonical internal UUID, bounded formatted address, postcode, paired latitude/longitude with geographic bounds, unique nullable external place ID, knowledge/resolution state and timestamps. Canonical matching remains Phase 4.
- Analyses: owner, nullable property, four stable business choices mapped to the three approved categories, exactly ten approved lifecycle values, schema version, safe failure code and timestamps. Draft status is the default; no public transition function.
- Analysis inputs: unique analysis/version, schema version and object-shaped `user_supplied` JSONB. The version-1 wizard contract contains unresolved entered address, explicit GBP/units, null for unknown and retained zero. SQL checks the envelope; a future submission service must validate the full contract before writing.
- Snapshots/evidence: provider/dataset identity, retrieval/observation dates, availability, normalised/provider/cost metadata objects, permitted raw reference/expiry; six evidence classifications plus separate knowledge state, claim/value/units/geography/reference/limitations/derivation and same-analysis snapshot/input links. No raw response storage is presumed permitted.
- Competitors/premises: analysis/evidence links, observed business/category/address/coordinates or estimated start/end/vacancy/source/quality/confidence/knowledge. Confidence is nullable 0–1; missing dates/confidence stay unknown. No history research or scoring algorithm.
- Economic models: explicit model version, specific input version, inputs/output/scenario JSONB and missing-input keys. No formulas or calculated results are seeded.
- Reports/sections: analysis, specific input/economic model, report/schema versions, free/full tier, draft/ready/failed status, provenance and structured sections with the sixteen approved keys, positions and claim-evidence array. Claim-to-evidence semantic validation remains the future Evidence/Report engines.
- Payments/PDF/events: unique idempotency and nullable external references, configured price reference, minor-unit amount/currency/status/verification timestamp; export status/private path/expiry/report reference; restricted safe-metadata event type/correlation/outcome/date. No card details, signed URLs, payment events or analytics implementation.
- Blog: UUID, unique bounded clean slug, title/excerpt, rich-block JSONB array, image/author/CTA JSONB objects, alt, category/tags/featured, SEO/canonical/OG, four statuses, publication/modification/schedule and created/updated timestamps. Published requires a publication date; scheduled requires a schedule date; featured images require alt. Nested payload quality/security validation belongs to the controlled writer/adapter, not these top-level SQL checks.

Database-generated timestamptz is used consistently. Mutable records have a common updated-at trigger with fixed search path. Append-only snapshots/inputs/evidence/events retain creation/observation times. Obvious owner/status/property/analysis/report/publication indexes are present; no speculative search/analytics index is introduced.

Private relations use RESTRICT deletion to preserve financial/evidence/provenance. A minimal profile may cascade from Auth deletion only when no analyses reference it; otherwise deletion is rejected. No production retention/deletion policy is invented. The disposable Auth probe creates no analyses and removes its synthetic profiles/users safely.

## Blog persistence and visibility

Anonymous and authenticated SELECT are permitted only when `status='published'` and `date_published <= now()`. Draft, scheduled, archived and future-dated rows are hidden, and all ordinary client writes are denied. No admin role/CMS is invented. Future controlled editorial services need authorisation, full JSON validation and quality gates, publication logging and cache invalidation. See [blog-architecture.md](blog-architecture.md). The two public articles stay in the local adapter, so schema setup does not implicitly publish or migrate content.

## Migration and type workflow

1. Verify the CLI is linked to the approved development project and inspect remote/local history. Do not use Production.
2. Add a meaningful timestamped SQL migration; never rewrite an applied migration. Review grants, policies, constraints and rollback implications.
3. Run `npm run check:database` to reconstruct the application schema from an empty PostgreSQL database and execute the security suite.
4. Run `npx supabase db push --linked --dry-run --skip-vault`, then `npx supabase db push --linked --skip-vault --yes` after review. CLI authentication provides temporary SQL access; no database password is stored in source.
5. Verify `npx supabase migration list --linked`, the table/RLS inventory, and `npx supabase db query --linked --file supabase/tests/ownership.sql --output json`. Tests run in a rolled-back transaction using reserved synthetic identities.
6. Generate `lib/supabase/database.types.ts` with `npx supabase gen types typescript --linked --schema public`; inspect types without printing service keys. SDK clients use these types; wizard/Blog presentation contracts stay domain-level.
7. Run local/remote validation and the explicit hosted Auth probe/inbox browser test. Document observed results.

Rebuild tests bootstrap only minimal Supabase platform objects, then apply the exact committed application SQL. A real local Supabase `db reset` needs Docker, still unavailable here; hosted Postgres 17.11 and isolated PostgreSQL rebuild/security tests are verified separately. No hosted reset or destructive rebuild is attempted.

## Phase 2.5 geographic and input review

Reviewed 2026-10-04: the applied schema contains no London-only restriction. Properties use generic address/postcode and coordinate bounds; evidence carries geographic context. UK nation/region/local-authority/provider-routing fields are future resolver decisions, introduced only when needed with a new migration. Applied Phase 3 migration history remains immutable.

The customer journey no longer mirrors all analysis-input columns. Address/business type alone precede initial value; economics remains optional after Snapshot. Missing numeric inputs remain null, zero remains zero, and calculations require their actual dependencies. No persistence endpoint, derived outputs, guest-ownership exception or schema modification is introduced in Phase 2.5.
## Phase 4 canonical property identity

New applied migration: 20261004120000_property_address_identity.sql. Development had zero properties/coordinate rows before application. Existing migration history was not edited. Generated hosted types include the new columns and RPC.

Properties retain their UUID and add address provider/identifier, separate UDPRN and nullable future UPRN, post town, country, structured components, resolution provenance, coordinate source/precision and resolved timestamp. Postio UDPRN is the provider identifier, never a UPRN. A unique (address_provider, provider_address_id) constraint and atomic UPSERT preserve UUID/creation time under repeated or concurrent selection; separate delivery points remain separate. Refresh preserves a future independently supplied UPRN.

resolve_sitefit_property is SECURITY INVOKER with an empty search path; execution is revoked from PUBLIC, anon and authenticated and granted only to service_role. The server repository uses a separate request-scoped secret-key client, no cookies or persisted Auth session. Anonymous callers submit validated selections to the application, not direct database writes. Existing property SELECT still requires an owned analysis; no new client write or guest ownership policy exists. Only selected canonical records are retained, not postcode candidate inventories.

Provider-verified rows preserve available postal components and unknown missing geography. Postio coordinates are postcode_centroid; absent coordinates are unknown, never rooftop. Manual rows are manual_unverified, unknown knowledge status, and have no provider identifiers, UPRN or coordinates. Manual submissions have new UUIDs; no speculative manual-address deduplication is claimed. Run both rolled-back hosted suites: ownership.sql and property-identity.sql. The latter verifies identifier/precision constraints, canonical reuse, separate units, future UPRN preservation and denied client RPC/table writes. Local rebuild and both hosted suites passed; the real Preview application-to-RPC path, canonical UUID reuse and manual persistence are now verified with securely configured development credentials. See phase-4-status.md.
