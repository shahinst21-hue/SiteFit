# SiteFit operating instructions

Read all files in `docs/` before making changes. `docs/product.md` is the Product Contract; `docs/decisions.md` records approved decisions; `docs/roadmap.md` defines phase gates.

## Current state

Phases 0–3 are complete; see `docs/phase-3-status.md` for the verified Definition of Done. The development schema, migrations, Auth code and RLS are implemented, hosted security/session checks pass, and the user verified real Magic Link delivery and same-browser PKCE. Implementation merged through protected PR #4 and post-merge CI passed; completion documentation follows the same gated workflow. `main` is protected: deliver changes through a PR and required CI. Vercel Preview is authenticated; automatic Production deployment from `main` remains disabled. No analysis, address/provider integration, payment execution, reports or publishing agent exists. Phase 4 and later require a new instruction.

## Working rules

- Work one Phase at a time. Never start the next Phase before the current Definition of Done passes. Completion does not itself authorise starting another Phase.
- Never change product scope without explicit user approval. Document non-critical unknowns; do not silently turn proposals into accepted business decisions.
- Never invent missing data. Preserve Unknown or Insufficient Evidence, and distinguish observed facts, source types, estimates, inference and user inputs.
- Never expose secrets or commit API credentials. Keep real credentials in ignored local environment files or secure service settings. Never ask for secrets in source files or chat.
- Prefer simple architecture, minimal dependencies and a single repository. Avoid premature abstractions; implement provider boundaries only when the relevant Phase needs them.
- AI must not calculate core financial metrics, fill missing data, or claim success probabilities. Important report claims must be traceable to evidence. External providers must sit behind internal adapters when implemented.
- Run relevant validation at the end of every implementation Phase, inspect output and fix introduced failures. Never claim an unrun check or unverified deployment passed.
- Update documentation when architecture or decisions change. Label planned, proposed, implemented and verified states accurately.
- Stop and request HUMAN ACTION REQUIRED whenever external credentials, account actions or material business decisions are genuinely required. First finish independent authorised work where possible. Do not block on the benchmark addresses during Phase 0 documentation work.
- Before finishing, check scope, generated files, environment handling, secrets and Git status. If a credential was exposed, report it without reproducing it and recommend rotation.

## Human action format

Use this exact structure when blocked and then stop:

HUMAN ACTION REQUIRED

What I need:
State the specific input or access required.

Why:
Explain the dependency.

What you should do:
Give exact steps, including secure storage locations if credentials are needed.

What to send back:
Request non-secret confirmation or the required business information.

## Developer validation

Use Node.js 24.x, npm 11.x and `npm ci`. Run `npm run check` for lint, strict types, Node unit tests and production build. Use `npm run dev` for the shell. Read `docs/infrastructure.md` before environment or service work. Never import Node-only `scripts/` into the application. The shell builds without Supabase credentials; `npm run check:supabase` requires real values privately configured. CI, deployment and live connectivity need separate actual verification.

After building, start the app and run `npm run check:public` for real HTTP/metadata/404 checks (also run in CI). Inspect responsive and keyboard behaviour in a browser. Read `docs/blog-architecture.md` before content changes. Blog pages must consume structured posts through the repository boundary; never introduce arbitrary HTML/MDX execution or agent-written frontend code. Keep unconnected features and legal drafts honest, and published content separate from drafts. Wizard entries remain page memory only in Phase 2. Hair/Beauty selections share the approved salon category. Pricing and display name belong in `lib/site-config.ts`.

Phase 3 clients use publishable credentials only. The login page deliberately exposes the publishable configuration; privileged keys never enter application code. Create a new server client per request; authorise using verified identity and database RLS. Public pages/checker stay public. Read `docs/database.md` before migrations. Never edit applied migration history. Run `npm run check:database` for a fresh PostgreSQL rebuild/security suite and the documented hosted SQL suite separately. `npm run check:auth:hosted` is an explicit development-only integration probe requiring a running production server and authenticated CLI; its admin credential stays in process memory, its synthetic accounts are deleted, and it does not prove inbox delivery. Do not run it in CI/Production. Do not merge Phase 3 while required hosted/end-to-end gates are outstanding.

## Phase 0 documentation-only validation

Check the eight required documents exist, cross-references resolve, terminology and phase boundaries agree, benchmark addresses remain explicitly unfilled, no implementation was introduced, no credentials exist, and Git status is understood. Application lint, type checks, tests and builds begin in Phase 1.
