# SiteFit operating instructions

Read all files in `docs/` before making changes. `docs/product.md` is the Product Contract; `docs/decisions.md` records approved decisions; `docs/roadmap.md` defines phase gates.

## Current state

Phases 0–2 are complete, including the user-authorised Blog/SEO foundation. Phase 0 is preserved in `5e35f57`; Phase 2 implementation merged through PR #2 with successful post-merge CI. See `docs/phase-2-status.md` for actual results and limits. `main` is protected: deliver changes through a PR and required CI. Vercel Preview is authenticated; automatic Production deployment from `main` remains disabled. Three benchmark addresses are still non-blocking. No application migrations, auth flows, payments, analysis, data integrations or AI exist. Phase 3 and all later phases require a new instruction.

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

## Phase 0 documentation-only validation

Check the eight required documents exist, cross-references resolve, terminology and phase boundaries agree, benchmark addresses remain explicitly unfilled, no implementation was introduced, no credentials exist, and Git status is understood. Application lint, type checks, tests and builds begin in Phase 1.
