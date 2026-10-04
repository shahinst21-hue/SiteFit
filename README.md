# SiteFit

SiteFit is a UK-wide commercial location decision product. Phase 3.5 refines the approved temporary brand, product-led Homepage, anonymous Address → Business Type → Free Snapshot journey, optional progressive economics, fictional Sample Report and structured SEO Resources. Phase 3 provides verified migration-managed development persistence and email authentication. Real address resolution, analysis, payments and report generation remain later phases; the current Snapshot organises the user’s brief and relevant checks without inventing local evidence.

## Local development

Use Node.js 24.x and npm 11.x. Install the locked dependencies and start the application:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Public pages build without credentials. Email authentication requires existing development Supabase URL/publishable configuration in ignored `.env.local`; never paste credentials or put them in `.env.example`. Development mail may restrict recipients to Supabase organisation members. Open the requested sign-in link in the same browser.

## Validation

```sh
npm run check
```

This runs ESLint, strict type checking, Node's built-in unit tests and the production build, stopping on the first failure. Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. To serve a production build: `npm run start`.

With that production server running, use `npm run check:public` for real route/metadata/404 checks. Phase 3.5 validation and delivery are recorded in [docs/phase-3.5-status.md](docs/phase-3.5-status.md); the prior responsive and keyboard baseline is in [docs/phase-2.5-status.md](docs/phase-2.5-status.md). Read [docs/blog-architecture.md](docs/blog-architecture.md) before changing editorial content or its source.

`npm run check:database` reconstructs the schema and executes real PostgreSQL ownership/Blog policies. See [docs/database.md](docs/database.md) for hosted migration, RLS and type-generation commands. With the production server on 127.0.0.1:3000 and authenticated CLI, `npm run check:auth:hosted` explicitly tests development Auth/application sessions using disposable accounts. It does not send email or prove inbox delivery. Do not run it against Production or in CI.

## Infrastructure

See [docs/infrastructure.md](docs/infrastructure.md) for environments, Supabase, Vercel, CI and secure configuration. `.env.example` contains names with empty values; never put real values in tracked files. See [docs/phase-1-status.md](docs/phase-1-status.md) for completed Phase 1 verification and documented limits.

The [verified Phase 2 Preview](https://sitefit-3anewlh7d-shahinst21-hues-projects.vercel.app) requires Vercel sign-in. Changes to protected `main` require a PR and successful [GitHub Actions checks](https://github.com/shahinst21-hue/SiteFit/actions). Automatic Production deployment from `main` is disabled.

The current [Phase 2.5 Preview](https://sitefit-git-phase-2-5-product-redesign-shahinst21-hues-projects.vercel.app) is verified with protected access and development Auth configuration. [PR #6](https://github.com/shahinst21-hue/SiteFit/pull/6) and post-merge CI passed.

The [Phase 3 Preview Login](https://sitefit-git-phase-3-database-auth-shahinst21-hues-projects.vercel.app/login) is verified with development configuration. The user confirmed real Magic Link delivery, same-browser PKCE callback, Account access, refresh persistence, sign-out and consumed-link rejection. [PR #4](https://github.com/shahinst21-hue/SiteFit/pull/4) merged through branch protection and post-merge CI passed. See the Phase 3 status record for the verification evidence; never paste a sign-in link or credentials into chat.

Read [AGENTS.md](AGENTS.md) and all project documents before development. Phases 0–3 and Phase 2.5 are complete; Phase 2.5 delivery is recorded in [docs/phase-2.5-status.md](docs/phase-2.5-status.md); [docs/phase-3-status.md](docs/phase-3-status.md) records the completed Definition of Done. Phase 4 is not authorised. Automatic Production release remains disabled.
