# Planned architecture

Recorded 2026-10-03. The architectural directions below are accepted; detailed mechanics are proposals to refine in their implementation phases. Currently only Git and documentation exist. No service is connected or provisioned.

## Frontend and backend

Planned frontend: Next.js App Router, TypeScript in strict mode, Tailwind CSS and a lightweight component library, preferably shadcn/ui. A single web repository is sufficient. Vercel is the approved hosting direction. Phase 1 builds only a minimal deployment shell; public website and UX begin in Phase 2.

Planned backend: server-side Next.js handlers and application services separating inputs, provider retrieval, deterministic analysis and report presentation. Credentials and privileged operations stay server side. Long-running analysis execution, retries and persistence will be designed when pipeline requirements are known; no queue or additional infrastructure is selected in Phase 0.

## Database, authentication and storage

Supabase Postgres holds application records; Supabase Auth provides identity; Supabase Storage holds permitted report artifacts. Proposed entities and lifecycle are in [database.md](database.md). Phase 1 prepares development configuration only. Actual schema, migrations, authentication flows and RLS belong to Phase 3.

The visitor-to-account transition and report ownership policy remain open for Phase 3 approval. Do not assume guest purchase or mandatory registration. Database and storage access must enforce the resulting policy, with privileged server access kept outside browser code.

## Payments

Stripe Checkout is planned for pay-per-report purchases. Use configurable server-side pricing and verified, idempotent webhook handling; a browser redirect must not establish payment success. Initial £29 is a business assumption, not a code constant. Phase 7 must settle tax, refunds and entitlement policy before implementation depends on them.

## AI abstraction and external adapters

AI sits behind an internal provider boundary; OpenAI may be the initial provider. Application services consume validated structured output, not provider-specific response objects. Provider/model choice, prompts and schemas should be versioned when implemented. AI receives supplied evidence and deterministic results, and cannot fill missing inputs or calculate core financial metrics.

Every external data provider will sit behind an internal adapter. The application consumes normalised results with provenance, timestamps, geography, units, licensing restrictions and explicit availability states. Avoid implementing speculative interfaces now. Google Places and Google address resolution or Geocoding are planned; OpenStreetMap may be appropriate. Other candidates are in [data-sources.md](data-sources.md), pending capability and usage verification.

## Analysis pipeline

Proposed flow: user inputs -> resolved property identity -> free collection -> Free Snapshot -> verified payment -> full collection and premises evidence -> deterministic economics -> evidence validation -> AI synthesis -> validated report -> UI/PDF delivery.

The lifecycle in [database.md](database.md) describes planned states. The evidence contract must be defined in Phase 5 for safe early collection; Phase 11 hardens claim traceability rather than adding provenance for the first time. Partial retrieval must not become fabricated completeness. Retry and failure policies must preserve paid entitlements and avoid duplicate charges or report generation.

## Evidence architecture

Keep source snapshots, normalised evidence and report claims distinguishable. Link claims to evidence IDs and evidence to permitted source references, retrieval/observation dates and derivations. Record claim type independently of official/commercial source classification. Modelled values need input provenance and method versions. User inputs remain identifiable; AI inference is labelled. If storage of raw provider data is restricted, keep only permitted material and references. Retention and licensing determine what can be persisted.

## Report generation

Persist a versioned report and sections derived from a specific input/evidence/calculation version. Validate important claims and output schema before publishing. UI and PDF should express the same evidence and unknowns. Delivery and regeneration must respect ownership, payment and provider usage restrictions. Phase 13 implements UI, PDF and delivery; no renderer is selected here.

## Security principles

No credentials in Git, documentation or browser bundles. Only intentionally public values may use a public environment prefix. Apply least privilege, ownership enforcement, RLS and protected storage access. Validate server inputs, webhook signatures and AI output. Treat external text as untrusted data rather than instructions. Avoid sensitive values in logs; collect only required personal information. Retention, deletion and privacy policies need approval in later phases.

## Environment separation

Planned environments: Local for developer work and test data; Preview for branch review with non-production resources; Production for live users. Keep credentials, data and payment modes separate. Preview must not access production data or use production payment credentials. No environment files, variable names, project IDs or credentials are introduced in Phase 0. Phase 1 must create a safe `.env.example`, ignore actual environment files, document introduced variables and verify configuration where access permits.

## Planned directory structure

```text
app/          Next.js routes and application shell
components/   UI components as needed
lib/          Server services, calculations and provider boundaries as needed
supabase/     Local configuration, then migrations in Phase 3
tests/        Tests introduced with relevant implementation
docs/         Product, architecture, decisions and validation records
```

Only `docs/` exists today. Future folders must not be populated with business logic before their phase. No monorepo, mobile app, analysis engine, payment flow or authentication flow is implemented in Phase 0.
