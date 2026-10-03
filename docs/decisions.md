# Architecture Decision Log

Recorded 2026-10-03 from the user's approved Phase 0 contract. “Accepted” means the direction is approved, not implemented. No external service is configured. Each entry's date is the record date, not a claim about an earlier decision.

| ID | Date | Status | Decision | Reason and consequence |
| --- | --- | --- | --- | --- |
| D01 | 2026-10-03 | Accepted | London first; UK-only MVP. | Constrain initial coverage; geography expansion requires approval. |
| D02 | 2026-10-03 | Accepted | Three categories: Coffee Shop; Restaurant; Hair Salon or Beauty Salon. | The salon category is combined; no additional verticals without approval. |
| D03 | 2026-10-03 | Accepted | Single Location Due Diligence Report first. | Assess one property and business context, not portfolios. |
| D04 | 2026-10-03 | Accepted | £29 initial Full Report pricing assumption. | Implement configurable price later; never hardcode it in application business logic. |
| D05 | 2026-10-03 | Accepted | Pay per report rather than subscription. | Free Snapshot precedes paid Full Report; no subscription product in MVP. |
| D06 | 2026-10-03 | Accepted | Vercel hosting. | Prepare environments in Phase 1; access/deployment remains unconfigured. |
| D07 | 2026-10-03 | Accepted | Next.js App Router and TypeScript. | Use strict mode; single web application, created only in Phase 1. |
| D08 | 2026-10-03 | Accepted | Supabase Postgres, Auth and Storage. | Phase 1 development preparation; schema/auth/RLS in Phase 3; no migrations now. |
| D09 | 2026-10-03 | Accepted | Stripe Checkout. | Verified server-side payment events control entitlement; implement in Phase 7. |
| D10 | 2026-10-03 | Accepted | Provider abstracted AI. | OpenAI may be first; application logic must not bind to one model provider. |
| D11 | 2026-10-03 | Accepted | Google Places for place information; Google address resolution or Geocoding. | Verify endpoint capabilities, costs and permitted use before Phase 4 integration. |
| D12 | 2026-10-03 | Accepted | No proprietary footfall in MVP. | Mobility proxies must not be presented as premises footfall. |
| D13 | 2026-10-03 | Accepted | AI as analyst rather than data source. | Synthesise supplied evidence; never invent observations. |
| D14 | 2026-10-03 | Accepted | Deterministic economics. | Code calculates core metrics with explicit inputs, units, formula versions and tests. |
| D15 | 2026-10-03 | Accepted | Evidence backed important claims. | Retain traceability from claim to evidence, permitted source and derivation. |
| D16 | 2026-10-03 | Accepted | Unknown is a valid result. | Missing data remains Unknown or Insufficient Evidence; absence is not zero. |
| D17 | 2026-10-03 | Accepted | No success probability. | Decision support reduces uncertainty; it does not predict business success. |
| D18 | 2026-10-03 | Accepted | No enterprise platform before market validation. | Exclude enterprise dashboard, franchise/portfolio tools and complex enterprise functionality. |
| D19 | 2026-10-03 | Accepted | External providers behind internal adapters. | Changing providers must not break application-level logic; introduce boundaries in relevant phases. |
| D20 | 2026-10-03 | Accepted | Tailwind and a lightweight component library, preferably shadcn/ui. | Keep dependencies minimal; preference does not require unused components in Phase 1. |
| D21 | 2026-10-03 | Accepted | Prefer public data and low cost APIs; avoid fragile property-site scraping. | Verify permitted commercial use, availability and cost before each integration. |
| D22 | 2026-10-03 | Accepted | Conceptual benchmark fixtures with human-supplied addresses later. | Benchmark A/B/C are defined in product.md; absence of addresses does not block Phase 0 foundation. |

## Proposed mechanics, not accepted business decisions

The table design, pipeline mechanics and test procedures in the other documents are proposals for later refinement. No detailed scoring algorithm, report sufficiency threshold, queue provider, catchment radius or financial formula has been approved. Approval of the general direction is not approval of invented business rules.

## Open decisions and human inputs

| Input/decision | Needed by | Current treatment |
| --- | --- | --- |
| Three real London benchmark addresses | Before real-property benchmark validation, including Phase 4 | HUMAN INPUT REQUIRED; non-blocking for Phase 0 and infrastructure-only Phase 1. |
| Operational definition of London coverage | Phase 4 geography enforcement | London first is accepted; boundary implementation needs agreement. |
| Visitor-to-account transition and ownership | Phase 3 | Do not assume guest purchases or mandatory registration. |
| Free Snapshot section allocation and paid boundary | Phase 6 | Products accepted; exact allocation unapproved. |
| Tax, refunds and entitlement duration | Phase 7 | £29 is an initial configurable assumption, not a settled policy. |
| Provider licensing, retention, costs and capabilities | Before relevant Phase 4/5/8/9 integrations | Verify per dataset/endpoint and intended storage/display/export. |
| Formula definitions and scenario assumptions | Phase 10 | Deterministic calculations accepted; actual formulas need approval. |
| Evidence sufficiency/freshness and AI wording rules | Relevant engine phases, hardened in Phase 11/12 | No invented thresholds; unknowns remain visible. |
| Privacy, deletion, analytics, budget and launch targets | Relevant storage/operations/marketing/launch phases | Document and approve before dependent implementation. |

No open decision above prevents the authorised documentation foundation. GitHub, Vercel, Supabase, Google and Stripe access will be requested only when needed in authorised later work.

## Phase 1 engineering decisions

Recorded 2026-10-03 within the authorised infrastructure scope; approved product decisions above are unchanged.

| ID | Date | Status | Decision | Reason and consequence |
| --- | --- | --- | --- | --- |
| D23 | 2026-10-03 | Accepted | npm with committed lockfile and Node 24.x/npm 11.x. | No prior package manager existed. Conventional tooling, matching installed Node and Vercel-supported runtime; use `npm ci` in CI/deployment. |
| D24 | 2026-10-03 | Accepted | Node built-in test runner and native TypeScript stripping. | Minimal framework-free tests; separate strict type checking covers stripped types. |
| D25 | 2026-10-03 | Accepted | Supabase CLI and read-only Data API diagnostic only. | No runtime SDK, privileged key or application schema needed in Phase 1; future Auth/client design stays in Phase 3. |
| D26 | 2026-10-03 | Accepted | Build without external credentials; diagnostic variables remain Node-only. | Local and CI shell checks are reproducible; no premature public environment values. Missing configuration fails only the optional probe. |
| D27 | 2026-10-03 | Accepted | Minimal root App Router layout; defer empty component/service directories. | Alias and Tailwind support future components without unused libraries or business abstractions. |
| D28 | 2026-10-03 | Accepted | Supported ESLint 10 with minimal JavaScript/TypeScript rules. | Avoid an unnecessary unpatched transitive dependency in the full framework preset; reassess UI-specific rules in Phase 2. See infrastructure.md for scope and the advisory. |
| D29 | 2026-10-03 | Accepted | Verify publishable-key Data API access through an absent diagnostic relation. | Hosted OpenAPI introspection requires a privileged key; `PGRST205` establishes schema-cache access without credentials escalation, migrations or application data reads. |
| D30 | 2026-10-03 | Accepted | Initial `main` push runs CI without an automatic Vercel production deployment. | Git-triggered deployments from `main` are disabled; explicit CLI Preview verification meets Phase 1. Production activation remains separately authorised. |

These are implementation choices within the authorised Phase 1 direction, not new product rules. Current package versions and exact dependencies are recorded in the lockfile. Remote verification remains pending as documented in [phase-1-status.md](phase-1-status.md).
