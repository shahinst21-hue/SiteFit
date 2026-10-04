# Planned architecture

Updated 2026-10-04. The authoritative Phase 2.5 contract supersedes conflicting historical Phase 1/2 descriptions below. Architectural directions are accepted; later mechanics remain proposals. Phase 1 infrastructure is described in [infrastructure.md](infrastructure.md). Phase 2 now adds the public website, frontend-only wizard and authorised Blog/SEO foundation; see [phase-2-status.md](phase-2-status.md). GitHub protection and authenticated Preview remain in place. Analysis services are unimplemented; Production is not activated.

## Frontend and backend

Planned frontend: Next.js App Router, TypeScript in strict mode, Tailwind CSS and a lightweight component library, preferably shadcn/ui. A single web repository is sufficient. Vercel is the approved hosting direction. Phase 1 builds only a minimal deployment shell; public website and UX begin in Phase 2.

Planned backend: server-side Next.js handlers and application services separating inputs, provider retrieval, deterministic analysis and report presentation. Credentials and privileged operations stay server side. Long-running analysis execution, retries and persistence will be designed when pipeline requirements are known; no queue or additional infrastructure is selected in Phase 0.

## Database, authentication and storage

Supabase Postgres holds application records; Supabase Auth provides identity; Supabase Storage holds permitted report artifacts. Proposed entities and lifecycle are in [database.md](database.md). Phase 1 prepares development configuration only. Actual schema, migrations, authentication flows and RLS belong to Phase 3.

Phase 3 keeps public browsing and the in-memory checker accessible without registration. Private persistence is owned by a verified Auth identity. No analysis submission or guest purchase flow exists yet, so exact sign-in placement in those later journeys remains undecided. Database access enforces ownership; privileged access stays outside browser/application code.

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

Phase 1 creates `app/`, `scripts/`, `tests/`, `supabase/` and CI configuration alongside `docs/`. `components/` and `lib/` are deferred until useful files need them. Future folders must not be populated with business logic before their phase. No monorepo, mobile app, analysis engine, payment flow or authentication flow is implemented.

Phase 2 introduces useful presentation components and `lib/` contracts: public site/pricing configuration, wizard validation/normalisation, Blog domain/provider and metadata helpers. Phase 1 directory statements above are historical. Pages remain small server components, with client state confined to navigation and the checker. Native controls avoid an unnecessary component/global-state dependency.

## Phase 2 frontend and content boundaries

Public routes cover Home, How It Works, Pricing, Check a Location, Login, Privacy, Terms, Methodology, Contact and Blog/articles. Root layout owns navigation, skip link, main landmark and footer. No customer-facing development banner. Shared pricing, CTA and report-outline components serve actual reuse cases. System typography and Tailwind's existing CSS pipeline implement the light, near-black and lime Phase 3.5 presentation. Shared native SVG icons and an original schematic map need no additional dependency; the supplied wordmark's original geometry is a local image asset.

`lib/wizard.ts` owns a versioned `LocationCheckInput` contract, validators and explicit units. The address is an unresolved entered string. Four UI business identifiers map to three categories. Optional numerical inputs use null for missing and retain zero; rent/rates/staff/other costs are annual GBP, floor area m², margin %, opening days/week, hours/day and investment one-off. This is input validation, not financial calculation or an approved economic-model policy. Technical input bounds limit numbers/length, and can be revisited with Phase 10 rules. React state preserves entries between steps on the page; there is no localStorage, server persistence, request submission or address/provider call. Phase 2.5 replaces that completion with a brief/Snapshot destination: user-supplied context, professionally expressed unverified evidence and relevant checks. No sourced local findings are fabricated.

Login was disabled UI in Phase 2; Phase 3 replaces it with email magic links. Contact remains an honest availability page without a fabricated inbox or sending route. Privacy/Terms remain development drafts, updated to describe development Auth cookies/email processing. Legal/controller/contact/retention and purchase-policy review is required before launch, not implied by these pages.

## Phase 3 authentication and data foundation

`lib/supabase/browser.ts` creates the browser SSR client using intentionally publishable configuration supplied by the server-rendered Login page. `server.ts` is guarded by `server-only` and creates a cookie client per request. There is no application admin client/service-role variable. `proxy.ts` refreshes sessions only on Login, Account and Auth paths; public marketing/article routes remain static and independent of Auth availability. Proxy preserves refreshed cookies and private/no-store headers. Account/Login verify identity with `getUser()` rather than trusting cookie session objects; protected Account redirects signed-out visitors before rendering.

Magic-link requests use `signInWithOtp` and the default hosted email template, returning to `/auth/callback` with a PKCE code. The same browser must retain its verifier cookie. The callback exchanges the code, writes session cookies and redirects only to allowlisted local destinations. Invalid/expired/replayed or wrong-browser links return a fixed error with a new-link option. `/auth/confirm` supports a token-hash email link with explicit confirmation POST, used for integration tests and available for a later authorised custom SMTP template; GET does not consume a token. Default free-tier email templates cannot be customised, so this alternative is not the current email-delivery path. No password/social UI is introduced.

`/account` is a small verified signed-in state, profile read and sign-out, with an honest empty report state. It is noindex and outside the sitemap. Sign-out uses a same-origin Next Server Action and Supabase local-session revocation; failures permit retry. Auth responses are private/no-store and no-referrer. Supabase SSR session cookies are browser-readable by design; Secure is used on HTTPS and SameSite=Lax. They are not claimed to be HttpOnly. No user-specific server client is shared between requests.

The fifteen-table schema, enums, constraints, ownership, grants, RLS and deletion choices are documented in [database.md](database.md), installed through committed migrations. Input versions are distinct from sourced/calculated data. Derived writes, lifecycle/payment changes and operational events are restricted to future trusted services; ordinary clients cannot advance an analysis or forge a paid report. No location-checker persistence or processing endpoint is implemented.

The additional Blog requirement explicitly authorises basic SEO in Phase 2. See [blog-architecture.md](blog-architecture.md) for the serialisable rich-content model, read provider, publication filter, safe renderer, image boundaries, canonical/indexing strategy and future controlled publishing pipeline. No CMS/API/database/scheduler/agent is implemented. Replacing the adapter preserves the Blog UI; future publication events must also update route/sitemap/metadata caches.

## Phase 1 implementation boundary

The shell uses strict TypeScript, Tailwind/PostCSS and root `@/*` imports suitable for future lightweight components. The Supabase preparation is CLI configuration and a Node-only, read-only Data API diagnostic; there is no application database client, schema or auth flow. Local/Preview/Production configuration is specified in [infrastructure.md](infrastructure.md), with actual verification in [phase-1-status.md](phase-1-status.md). No runtime product pipeline or provider abstraction is created prematurely.

## Phase 2.5 product experience and future geographic routing

UK-wide launch covers England, Scotland, Wales and Northern Ireland. Future resolution stores nation/region/local authority and provider coverage at the identity/evidence boundary when needed; route sources by their actual jurisdiction, geography, capability, dates and licence. Do not apply London validation, TfL as national transport default, or assume uniform coverage. Existing generic address/coordinate fields have no London constraint; do not rewrite applied migrations or introduce speculative provider/schema changes now.

The anonymous acquisition path requires only address and business type, followed by Snapshot. Economics is progressive and optional afterwards; identity remains necessary for later private persistence, not initial value. Page memory preserves entries, with no address in URLs, localStorage or server submission. Phase 2.5 used direct entry. Phase 3.5 adds the authorised Homepage address field with a one-use React-memory handoff: checker consumption or leaving the entry/checker routes clears it, and reload discards it. This is a small presentation boundary, not analysis persistence.

Future analysis ordering is Source Data → Normalised Data → Deterministic Metrics → Evidence Objects → AI Interpretation → Validated Report. AI interprets conflicts, implications and business-specific risks from validated evidence; it cannot calculate finances or invent sources. Report presentation prioritises summary/opportunity/risk/gaps/next checks and section navigation on mobile. Decision relevance controls displayed fields, not provider response size.

Mobile First starts at 390px, with 360/375, 430, 768 and 1440 validation. System fonts, server-rendered public/report sample content, native controls and code-native schematic visuals avoid map/font/icon packages. Schematic maps and fictional Sample Report findings are labelled; real-address Snapshot evidence stays explicitly unverified. No live collection, analysis scoring, checkout or publication service in this phase.
