# Future testing strategy

Recorded 2026-10-03. The strategy below covers future phases. Phase 0 introduced no executable tests. Phase 1 now introduces lint, strict types, Node unit tests and production build scripts with a GitHub Actions workflow. Later phases add tests alongside implemented behaviour, not speculative suites or tests that merely mirror code.

## Validation by layer

| Layer | Planned checks and meaningful failure cases | First relevant phase |
| --- | --- | --- |
| Linting | Enforce agreed Next.js/TypeScript conventions and catch unsafe patterns; CI fails on violations. | 1 |
| Type checking | Strict TypeScript; check server/client boundaries and typed inputs; required CI failure on type errors. | 1 |
| Unit tests | Small deterministic functions and validation behaviours with independent expectations; initial infrastructure tests cover real shell/config behaviour. | 1 onward |
| Production build | Run the production build with documented environment requirements; inspect errors and generated client exposure. | 1 onward |
| Integration tests | Exercise implemented route/service/database boundaries, failures and idempotency against isolated non-production resources. | 3 onward |
| Critical path end-to-end tests | Address -> category -> optional economics -> Free Snapshot -> test checkout -> Full Report -> PDF/delivery. Include ambiguity, missing inputs, payment cancellation and access denial when those flows exist. | Incrementally 4–13; full review 15 |
| Database security and RLS | Anonymous, owner, other-user and privileged cases; reject cross-user reads/writes, forged ownership and private artifact access. Test approved guest/account policy explicitly. | 3 onward |
| External adapters | Normalise real verified provider shapes; test empty, malformed, timeout, rate-limit, stale and partial responses. Check provenance, permitted storage and geographic/unit handling. Keep live probes separate from deterministic CI. | 4–5 onward |
| Economic calculations | Independently calculate expected results for approved formulas; zero/negative/invalid values, missing inputs, unit conversion, periods, margin boundaries and rounding. Validate scenario assumptions and version reproducibility. | 10 |
| AI schema validation | Reject invalid structure, fabricated evidence IDs, unsupported important claims, altered financial outputs, missing-data invention and success probabilities. Include untrusted-source/prompt-injection cases; bound retries. | 12 |
| Evidence integrity | Important claim -> evidence -> permitted source/derivation; broken references, contradictions, stale observations and mismatched geography/versions. Keep source class separate from claim type; unavailable data is not factual absence. | Contract in 5; hardening in 11 |
| Payment webhooks | Verified signature, invalid signature, duplicates, reordered/delayed events, cancellation/failure and forged checkout returns. No duplicated entitlement; payment amounts/currency match configuration. | 7 |
| Report generation | Approved 16 sections, evidence/input/model version linkage, explicit unknowns, retry/recovery and protected publication. No fabricated completeness. | 12–13 |
| PDF | Render and inspect pages for clipping, overflow, missing glyphs, broken links and consistent section order; verify evidence, currency and unknowns match web report. Test permissions and export failure recovery. | 13 |

## Test data and benchmarks

Use isolated test accounts/resources and approved synthetic data for unit and failure-path tests; synthetic cases must never be displayed as observations about real properties. Test secrets belong in secure CI/service settings or ignored local files, not fixtures.

The conceptual Benchmarks A/B/C in [product.md](product.md) cover the three business categories. Each real address remains HUMAN INPUT REQUIRED. Once supplied, capture retrieval dates, permitted evidence, user economics and reviewed expectations. Do not invent address-level outcomes. Exact live responses can change, so assert coverage, provenance and rules rather than brittle real-time counts. Stable snapshots must respect source retention/licensing restrictions.

External live checks require authorised credentials and must report actual results separately from mock/contract tests. Passing mocks is not proof of Supabase connectivity, provider availability, Vercel deployment or live payment success.

## Phase gates and records

At every implementation phase, run relevant lint, strict type checking, tests and production build, plus phase-specific checks. Inspect output and repair introduced defects. Document commands, date, environment, outcome and limits; do not mark checks passed if unrun or unavailable. CI must fail on any required check failure. Phase 15 broadens security/reliability review but does not postpone essential security tests from earlier phases.

## Phase 0 validation

Check the eight documents, internal links, accepted decisions and planned phase boundaries. Confirm no actual application/configuration/migrations/tests or secrets were introduced. Check environment ignores and Git status. Lint, type checking, unit tests and build are not applicable until Phase 1; their absence in Phase 0 is intentional.

### Validation record: 2026-10-03

- All eight required documents exist and are non-empty; relative document links resolve and no trailing whitespace was found.
- Roadmap contains Phases 0–17 in sequence. Product terminology, accepted directions and proposed implementation boundaries were reviewed for consistency.
- Three benchmark address placeholders remain HUMAN INPUT REQUIRED; all 14 expected tables and the ten proposed lifecycle states are documented.
- Workspace contains only the eight documents and protective `.gitignore`; no application, dependencies, migrations, external-service configuration or executable tests were created.
- All file contents were reviewed and checked for common credential patterns; no credentials or sensitive values were found. Git has no tracked files or commits, so no secrets have been committed.
- Git ignore checks confirm `.env`, `.env.local`, `.env.production`, private key and PEM files are ignored; a future `.env.example` is eligible for tracking. No environment files or keys exist.
- Git is initialised. Documentation and `.gitignore` are untracked and ready for review/staging; no commit or remote was created. Application lint/type checks/tests/build and live infrastructure checks are not applicable to this documentation-only phase.

The Phase 0 documentation Definition of Done passes. Real-property benchmark validation remains pending user-supplied addresses and later implementation; Phases 1–17 remain not started.

## Phase 1 checks

Use `npm run check`, or its individual lint, typecheck, test and build commands. `next typegen` makes type checking possible on a fresh installation before building. Node's built-in test runner executes `.test.ts` files; TypeScript stripping does not type-check, so the separate strict check is required. The diagnostic tests exercise missing/malformed configuration, privileged-key rejection, request boundaries, response validation and redacted failures, with all requests stubbed against a reserved `.invalid` host and inert test-only strings. They do not prove live connectivity.

Required checks are also defined in `.github/workflows/ci.yml`; remote execution needs an actual GitHub repository. Run `npm run check:supabase` only after actual values are stored securely, and separately verify the deployed Vercel Preview. Record observed results and unavailable checks in [phase-1-status.md](phase-1-status.md). The earlier Phase 0 record is historical, not the current repository inventory.

Phase 1 final validation: nine tests passed locally and in GitHub Actions. The additional template test rejects populated `.env.example` values without printing them. The Data API diagnostic requires exactly the authenticated absent-relation response (HTTP 404/PGRST205), rather than privileged OpenAPI introspection; generic 404s and unexpected successful relation responses fail. The complete lockfile was regenerated from a clean directory and verified by actual Linux CI and Vercel builds. Hosted Supabase and protected Preview HTML/CSS were checked separately; see the linked completion record for URLs and results.
