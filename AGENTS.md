# SiteFit operating instructions

Read all files in `docs/` before making changes. `docs/product.md` is the Product Contract; `docs/decisions.md` records approved decisions; `docs/roadmap.md` defines phase gates.

## Current state

Phase 0 documentation foundation is complete. Three real benchmark addresses remain outstanding human inputs, explicitly non-blocking for that foundation. No application, infrastructure, migrations, integrations or automated tests exist. Phase 1 and all later phases are planned only and require a new user instruction to begin.

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

## Documentation-only validation

Check the eight required documents exist, cross-references resolve, terminology and phase boundaries agree, benchmark addresses remain explicitly unfilled, no implementation was introduced, no credentials exist, and Git status is understood. Application lint, type checks, tests and builds begin in Phase 1.
