# Phase 1 infrastructure and environments

Recorded 2026-10-03. Scope: minimal Next.js shell, developer tooling, Supabase preparation and Vercel/CI configuration. No product UX, authentication flows, payments, application database schema, data adapters or AI are implemented. GitHub and Vercel account access is verified; hosted development Supabase connectivity passes. Deployment and CI results are tracked in phase-1-status.md.

## Tooling and directories

Use npm with the committed lockfile, Node.js 24.x and npm 11.x. `.node-version`, package engine constraints and CI agree. Next.js uses App Router, strict TypeScript, root `@/*` imports, Tailwind's PostCSS integration and ESLint flat configuration. The alias and CSS foundation support future shadcn/ui; no unused component dependency is installed. Fonts use system defaults and require no build-time external font fetch.

Next.js automatic agent-rule generation is disabled in `next.config.ts` so `npm run dev` does not append framework instructions to the project-owned `AGENTS.md`.

`app/` contains only layout, global CSS and the homepage placeholder. `scripts/` contains a Node-only connectivity check; lint prevents application imports from this directory. `supabase/` holds local development configuration; `tests/` uses Node's built-in runner and native TypeScript stripping, with strict type checking run separately. `docs/` records scope and configuration. `components/` and `lib/` are deferred until real files need them; no empty business abstractions were created.

That directory inventory records Phase 1. Phase 2 adds the public frontend, reusable presentation components, wizard/content/SEO contracts and a public-route smoke script. Supabase and secret boundaries are unchanged; see [phase-2-status.md](phase-2-status.md).

## Developer commands

| Command                   | Purpose                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm ci`                  | Install exactly from the lockfile.                                                                            |
| `npm run dev`             | Start local Next.js development server.                                                                       |
| `npm run lint`            | ESLint, with warnings treated as failures.                                                                    |
| `npm run typecheck`       | Generate Next route types, then strict TypeScript without emitting code. Works before a production build.     |
| `npm test`                | Run isolated Node unit tests without credentials or live requests.                                            |
| `npm run build`           | Create a production Next.js build without account access.                                                     |
| `npm run start`           | Serve the existing production build.                                                                          |
| `npm run check`           | Run lint, types, tests and build in order, failing on any check.                                              |
| `npm run check:supabase`  | Read-only configured Data API probe with timeout and redacted failures.                                       |
| `npm run check:public`    | Check actual public HTTP routes, SEO and 404s against a running production server. Optional argument: origin. |
| `npm run supabase:start`  | Start local Supabase; requires running Docker.                                                                |
| `npm run supabase:stop`   | Stop local Supabase.                                                                                          |
| `npm run supabase:status` | Inspect local stack; output may contain local keys, so do not paste or commit it.                             |

## Environment separation

| Environment | Application/runtime                                                                                                                  | Data and credentials                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local       | `npm run dev` on localhost; a local production build is also available.                                                              | Docker-backed Supabase or an approved development-only hosted project. Actual values belong in ignored `.env.local`.                                                    |
| Preview     | Vercel non-production deployment from a branch/PR or CLI. `NODE_ENV=production` here describes build mode, not business environment. | Separate development/preview Supabase project or branch with non-production data. Configure only Vercel Preview-scoped values. Never reuse production credentials/data. |
| Production  | Vercel production deployment, only when separately authorised.                                                                       | Dedicated production Supabase project/data and Production-scoped settings. No live service is created or activated in Phase 1.                                          |

Do not set `NODE_ENV=preview`; let Next.js manage its standard modes. Vercel supplies `VERCEL_ENV`; it is not a user-configured variable in this repository. Future business-environment validation must be added when product behaviour depends on it. Phase 1 has no browser-facing environment values and no environment-specific business logic.

`.env`, `.env.*` (except `.env.example`), `.vercel/`, dependencies, logs, Next output, TypeScript build cache and Supabase local metadata are ignored. `next-env.d.ts` is generated by Next tooling and ignored. Use `.env.example` only as a blank template, then set actual values privately. Do not store database passwords, privileged keys, provider tokens or credentials in documentation, source code, chat or Git.

`.vercelignore` also excludes every local `.env*` file from deployment source uploads. Vercel CLI may add broad environment ignores when linking; keep the final `.env.example` exception so the blank template remains tracked. Linking can update `.env.local` with a CLI-managed `VERCEL_OIDC_TOKEN`; this short-lived development token is optional tooling state, never application configuration and never committed or printed. Supabase entries remain privately stored locally.

## Introduced environment variables

| Variable                   | Consumer                                  | Requirement and exposure                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`             | Node-only `check:supabase` script         | Required only for the probe. Actual project origin; HTTPS except HTTP loopback for Docker development. No paths, embedded credentials, query or fragment. No public prefix.                                   |
| `SUPABASE_PUBLISHABLE_KEY` | Node-only `check:supabase` script         | Required only for the probe. Current publishable key from the selected project; legacy anon/service-role and privileged secret keys are intentionally rejected. No public prefix, logging or client bundling. |
| `SITE_URL`                 | Server metadata/sitemap/robots in Phase 2 | Optional non-secret HTTPS public origin for a future Production domain. Local fallback is localhost; Vercel Preview uses its supplied deployment URL. No public indexing without explicit Production origin.  |

No privileged Supabase key is required or introduced. No Stripe, Google, AI or database-password variables are introduced before their phase. Even though a Supabase publishable key is designed for public applications, Phase 1 has no browser need for it, so it stays in the Node script environment. Later auth work must establish the appropriate client/server boundary and RLS rather than reusing this diagnostic as an auth client.

The table above records Phase 1 consumers. In Phase 3 the same two env names configure the Supabase server and browser Auth clients. Login deliberately serialises only the validated URL/publishable key into its client props; no `NEXT_PUBLIC` duplicate or privileged application setting is needed. Actual values remain outside Git and source uploads. Vercel Preview-only settings are encrypted and refer to development; Production settings are not changed. Missing configuration disables sign-in while public builds/pages remain available. `SITE_URL` stays optional metadata configuration, not the runtime Auth redirect origin.

Development migrations are enabled; signups/email confirmations are enabled with one-hour OTP expiry and explicit localhost/127.0.0.1 callback/confirmation allowlists. Hosted default mail uses the same-browser PKCE callback; custom template upload is blocked on this free project without custom SMTP. That provider restriction is documented, not bypassed or upgraded. Preview callback URLs must be added explicitly after an actual deployment exists. Keep Vercel sign-in protection intact. No wildcard redirect or Production callback is needed.

Phase 3.5 adds only the observed refinement branch alias's exact confirmation/callback URLs to the existing development allowlist. The reviewed hosted config update changes only this declared list; post-push diff has no declared changes and retains the nine existing undeclared default differences. Existing encrypted Preview-only development variables, protected Preview access, Auth code, SMTP settings and disabled automatic Production deployment remain in place. Actual deployment and request results are recorded in [phase-3.5-status.md](phase-3.5-status.md).

Additional Phase 3 commands: `npm run check:database` (fresh PostgreSQL schema/security execution); `npm run check:auth:hosted` (explicit development Auth/application integration check with a running server, authenticated CLI and disposable accounts). The latter obtains a privileged verification credential transiently from the CLI into Node memory only; it is never an application environment variable, browser client, logged value or committed secret. Inbox delivery remains a separate human/browser check. Migration/type/security commands are documented in [database.md](database.md).

The check loads `.env.local` using Next's development env precedence. Process environment takes priority. When verifying Preview or Production settings, run it with securely supplied process variables for that environment; the script is not a public HTTP route and is not automatically run during build/CI. Missing values fail before any request.

## Supabase preparation and connectivity

The lockfile-pinned CLI provides local tooling; no Supabase JavaScript SDK is needed yet. `supabase/config.toml` uses a local project identifier, not a fabricated hosted project reference. Application migrations, seeds, user signups and automatic exposure of new tables are disabled. The local database major version is the CLI's Postgres 17 default; verify alignment with any actual hosted development project before schema work. No migrations, seed data, tables or auth flows are introduced. Local Auth/Storage service settings are platform preparation and do not implement the application's eventual flows.

If Docker is available, start the local stack and copy its actual API URL and publishable key into `.env.local`, then run `npm run check:supabase`. Never copy privileged keys into the example. For hosted verification, use an actual development-only Supabase project and its Connect/API Keys settings. Enable the Data API if disabled, then privately set the same variables and run the probe.

The probe requests the deliberately absent relation `/rest/v1/__sitefit_infrastructure_probe__` with a publishable API key. It requires exactly HTTP 404 with PostgREST code `PGRST205`, confirming authenticated access to the database schema cache without creating a relation or reading application data. A generic 404, 401, 500 or unexpected real relation fails. It refuses redirects and sets a ten-second timeout; no response body, key or raw network error is printed. Passing establishes gateway/PostgREST Data API connectivity; it does not establish direct SQL access, future RLS correctness, Auth flows or Storage behaviour.

The initial OpenAPI-root probe received `Secret API key required` from the actual hosted gateway, although the supplied publishable key was valid. The diagnostic was changed to the schema-cache probe rather than requesting a privileged key or adding an application migration. Actual hosted verification passed with the user's local configuration.

References: [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [PostgREST errors](https://docs.postgrest.org/en/v14/references/errors.html).

## Vercel preparation

`vercel.json` declares Next.js, `npm ci` and the build script. Node.js 24 is selected by package engines. No account/project IDs, tokens, deployment URLs or environment values are invented. A Git remote is needed for Git-triggered deploys and GitHub Actions; Vercel CLI can create a Preview directly from the local checkout without a Git remote once account/project access is authorised.

The checkout is now linked to `sitefit` under the user's Vercel account and connected to the actual GitHub repository. GitHub's default branch is `main`, so the local baseline branch is aligned to it for the initial push. Automatic Vercel deployments from `main` are disabled in `vercel.json` to keep this infrastructure task Preview-only; other branches can still produce Previews and explicit CLI Preview deployment is available. Enabling automatic production releases needs separate authorisation. The current shell has no remote Supabase variable consumer, so no credentials are copied to Preview or Production settings unnecessarily.

Setup procedure (completed for this checkout and Preview):

1. Sign in to Vercel and import the actual repository as a Next.js project, root directory `.`. Use Node.js 24.x and the committed configuration. Alternatively log in/link using Vercel CLI under the intended account.
2. Treat the repository's current branch as the production branch only after explicit agreement; do not trigger a production release to satisfy the Preview requirement. Use a separate review branch/PR or a CLI Preview deployment.
3. Set Preview variables only to a non-production Supabase project if needed for later server functionality. The current shell deploys without variables. Keep Production variables separately scoped; never add dummy values to either environment.
4. Create a Preview, open its actual URL and verify HTTP success, the SiteFit placeholder and loaded Tailwind styles. Record the deployment/build result and access/protection behaviour. A successful local build alone is not Preview verification.

References: [Vercel project configuration](https://vercel.com/docs/project-configuration), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind Next.js setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## GitHub CI and branch protection

The workflow runs on push and pull requests with read-only contents permission, disabled persisted checkout credentials, immutable action revisions, Node 24 and npm lockfile caching. Required lint, typecheck, tests and build run in separate steps with normal failure propagation. It needs no application secrets. Local execution of the same scripts is verification of the checks, not a remote Actions run.

The user authorised `https://github.com/shahinst21-hue/SiteFit.git` as `origin` and granted push access. Authenticated API checks confirmed repository admin rights; it is public and uses `main` as the default branch. Successful Actions runs are verified. Protection on `main` requires PRs, strict `Lint, types, tests and build` checks, conversation resolution and admin enforcement, and prohibits force pushes/deletions. Zero external approval reviews are required for this single-maintainer repository. Actual CI/protection results are recorded in [phase-1-status.md](phase-1-status.md); no account-plan limitation blocked configuration.

## Verification limits

See [phase-1-status.md](phase-1-status.md) for observed remote CI, branch protection, Vercel Preview and Supabase results. Docker-backed Supabase validation remains unavailable without Docker/Podman; hosted development connectivity is verified and no application schema is needed in this phase.

## Lint dependencies

ESLint 10 uses JavaScript recommended rules and TypeScript ESLint recommended rules, plus the infrastructure-import restriction. TypeScript 6.0 is within the current parser's compatibility range. The full Next/React lint preset is deferred: its glob dependency has an [unpatched advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) at this record date. It is unnecessary for the server-rendered placeholder and would add avoidable dependencies. Reassess framework/React-specific rules when Phase 2 introduces interactive UI; do not downgrade Next.js or use forced dependency overrides to silence the audit.
## Phase 4 server environment and verified Preview

Phase 4 adds blank template names ADDRESS_LOOKUP_PROVIDER, POSTIO_API_KEY and SUPABASE_SECRET_KEY. Provider selection defaults to postio; unknown configured providers fail closed. POSTIO_API_KEY is used only by the server factory/explicit local probe and sent as x-api-key to the fixed Postio origin. SUPABASE_SECRET_KEY must be the development sb_secret_ key: server-only, separate from publishable Auth configuration, never serialised or placed in a NEXT_PUBLIC setting. No privileged key is required to build, but selected/manual persistence requires it at runtime. Do not obtain/store a privileged application credential through the diagnostic CLI probe.

The user completed local POSTIO_API_KEY/SUPABASE_SECRET_KEY and Preview-only development server-key configuration on 2026-10-04. The redeployed protected Phase 4 Preview now verifies actual anonymous lookup, selected-ID resolve, canonical persistence/reuse and manual-unverified persistence. Actual values have not been shared, printed, copied automatically or committed. ADDRESS_LOOKUP_PROVIDER=postio is optional explicit non-secret configuration. Do not add these keys to Production, change domains, disable Preview protection or enable automatic main deployment.

The selected-address RPC is privileged because existing RLS denies ordinary client property writes; it does not relax Auth ownership. Fail-closed behaviour is tested. A successful keyless Preview build cannot satisfy real address persistence or Preview integration. See phase-4-status.md for verified runtime evidence and protected delivery.

Phase 4 adds only the observed stable branch alias’s exact Auth confirmation/callback URLs to development; reviewed push changes one declared allowlist property and preserves nine undeclared remote defaults. No wildcard or Production callback is added.

## Phase 5 authorised environment work — 2026-10-05

The revised plan is approved; [status](phase-5-status.md) records actual work. TfL live proof requires a server-only `TFL_APP_KEY`, securely configured by the owner in ignored `.env.local` (Preview only if needed), never printed or requested in chat. Public ONS/FSA require no application key. Non-secret collection region/probe guards will be introduced only at their steps; no public collector or production activation. Source quotas are process-local bounds initially, not global rate guarantees. No queue vendor, shared live cache, recurring commercial service or paid integration is enabled. Hosted development PostGIS capability/import quotas and CI spatial compatibility must be genuinely verified.

Spatial test capability: dev-only @electric-sql/pglite-postgis 0.2.8 matches PGlite 0.5.8. Windows and Linux CI use actual PostGIS, never mocked/skipped migrations. Hosted development now has PostGIS in gis; source_data and gis remain outside exposed Data API schemas.

Phase 5 internal transport/cache: fixed TfL StopPoint and FSA Establishments paths only; no URL proxy. Live timeout 8s, at most two total HTTP dispatches per source retrieval (including pages/retries), 2MB total response bytes; FSA at most two pages of 100 and 1km converted to miles. A longer Retry-After becomes a stored rate-limited outcome instead of an early retry. Process-local technical quota settings are applied by the proof factory; they are not subscription/global limits. Only reviewed normalised public results enter the finite 100-entry/2MB, ≤24h cache; original acquisition times remain. Private system_events receive allowlisted bounded summaries, with no response/body/address/headers/URL or raw error. Server-only module tests use Node react-server conditions; application build and customer runtime stay unchanged.

TfL local key configuration was confirmed by the owner and privately mapped to the expected TFL_APP_KEY name; no values printed. Preview setup is unnecessary for a CLI-only proof. The template includes only a blank name. Do not export this variable with a public prefix, put it into client requests, log query URLs or configure Production.

The internal framework probe is `npm run verify:framework`, requiring an explicit process-only DATA_SOURCE_PROBES_ENABLED=true and authenticated CLI identity sitefit-dev. It uses local SUPABASE_SECRET_KEY/TFL_APP_KEY; FSA is keyless and ONS reads the hosted pinned release. It never runs in CI/Production and introduces no public collection route or Preview key requirement. Normalised snapshot network transfers have an eight-second budget within the 30-second batch; indexed ONS/ownership/context lookups remain two seconds. See phase-5-status.md for the measured transfer-budget adjustment and actual proof.
