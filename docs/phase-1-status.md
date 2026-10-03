# Phase 1 status

Recorded 2026-10-03. Local foundations are implemented and validated. Phase 1 is blocked on external configuration and verification; Phase 2 has not started.

## Preserved baseline

Commit `5e35f57` (`docs: establish SiteFit Phase 0 product contract`) preserves all Phase 0 files using the existing Git author configuration. No user identity was invented and no remote was created.

## Implementation

Minimal Next.js App Router shell, strict TypeScript, Tailwind/PostCSS, ESLint, npm/Node 24 tooling, blank environment example, protective ignores, Node unit tests for the connectivity diagnostic, Supabase CLI preparation, Vercel repository configuration and GitHub Actions workflow. See [infrastructure.md](infrastructure.md) for exact commands and boundaries.

## Validation

| Check | Observed result |
| --- | --- |
| `npm ci` | Passed from the repository lockfile on Node 24.12.0/npm 11.6.2. No dependency vulnerabilities reported. |
| `npm run lint` | Passed with warnings treated as errors. |
| `npm run typecheck` | Passed route type generation and strict TypeScript. |
| `npm test` | All seven unit tests passed; isolated/stubbed requests only. |
| `npm run build` | Passed; only `/` and framework `/_not-found` output. No Supabase values required. |
| Production HTTP smoke | `npm run start` on loopback: homepage HTTP 200, SiteFit heading, en-GB language, linked stylesheet HTTP 200 with compiled Tailwind utilities, missing route HTTP 404. Test server stopped afterward. |
| Development HTTP smoke | `npm run dev` on loopback: homepage HTTP 200 and SiteFit heading. Test server stopped afterward. |
| Vercel repository configuration | JSON keys checked against the official schema; no hosted project or Preview verified. |
| Supabase CLI/configuration | CLI 2.119.0 installed; config parsed without warnings. `supabase:status` reached container inspection and failed because Docker/Podman is unavailable. Local services not started. |
| `npm run check:supabase` | Expected missing-configuration failure names SUPABASE_URL without exposing values or making a request. Actual project connectivity remains unverified. |
| Security and repository review | Baseline Git history and tracked/untracked source reviewed/scanned; no credentials found. Blank example, safe environment/generated-file ignores and local documentation links verified. No application schema or later-phase implementation. |

The GitHub workflow was reviewed and required scripts were executed locally. The remote Actions run and branch protection are not verified. No external service is configured. After disabling framework-generated edits, the full `npm run check` passed again and a development restart served HTTP 200 while preserving the AGENTS.md checksum. Final `npm audit` reported zero findings and `git diff --check` passed.

## Files created or changed

Created: `README.md`, `.env.example`, `.gitattributes`, `.node-version`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vercel.json`, `.github/workflows/ci.yml`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `scripts/check-supabase.ts`, `scripts/supabase-connectivity.ts`, `tests/supabase-connectivity.test.ts`, `supabase/config.toml`, `supabase/.gitignore`, `docs/infrastructure.md` and this status document.

Updated: `.gitignore`, `AGENTS.md`, `docs/product.md`, `docs/roadmap.md`, `docs/architecture.md`, `docs/decisions.md` and `docs/testing.md`. Product scope remains unchanged. Database and data-source proposals remain future work.

Phase 1 changes remain uncommitted and ready for review/staging. The Phase 0 baseline commit remains intact. No remote or user identity was created.

## Outstanding human configuration

- Actual GitHub repository URL/access for remote CI, plus branch protection account configuration.
- Vercel account/project access and an actual verified Preview deployment.
- Actual development Supabase URL and publishable key securely stored in `.env.local` for connectivity verification; no schema or auth flow is needed.
- Docker installed/running if local Supabase stack verification is desired; it was not found on PATH during initial inspection.

These are external verification dependencies. Three benchmark property addresses remain non-blocking Phase 0 inputs and are not required for this infrastructure work. No product-scope decisions are changed.

## Definition of Done

Local shell, strict TypeScript, Tailwind, environment strategy/example/ignores, legitimate tests, required package checks/build and infrastructure documentation pass. Supabase development configuration and Vercel/CI repository configuration are prepared. Actual Supabase connectivity, Vercel Preview, remote CI and branch protection remain outstanding human-dependent checks. Phase 1 cannot be marked complete on local results alone.

Known limits: no Docker-backed stack was run; connectivity verifies only the Data API, not SQL/Auth/Storage/RLS; the shell has no product functionality; UI-specific lint rules are deferred as documented in infrastructure.md. No known remaining local check failure or dependency audit finding is recorded.
