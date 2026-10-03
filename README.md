# SiteFit

Development preview of the London-first Single Location Due Diligence Report. Phase 2 provides the public website, four-step memory-only location checker and structured SEO Blog. Phase 3 adds migration-managed development persistence and email authentication; its verification is in progress. Analysis, payments, report generation and all later features remain unimplemented.

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

With that production server running, use `npm run check:public` for real route/metadata/404 checks. Browser-responsive and keyboard checks are documented in [docs/phase-2-status.md](docs/phase-2-status.md). Read [docs/blog-architecture.md](docs/blog-architecture.md) before changing editorial content or its source.

`npm run check:database` reconstructs the schema and executes real PostgreSQL ownership/Blog policies. See [docs/database.md](docs/database.md) for hosted migration, RLS and type-generation commands. With the production server on 127.0.0.1:3000 and authenticated CLI, `npm run check:auth:hosted` explicitly tests development Auth/application sessions using disposable accounts. It does not send email or prove inbox delivery. Do not run it against Production or in CI.

## Infrastructure

See [docs/infrastructure.md](docs/infrastructure.md) for environments, Supabase, Vercel, CI and secure configuration. `.env.example` contains names with empty values; never put real values in tracked files. See [docs/phase-1-status.md](docs/phase-1-status.md) for completed Phase 1 verification and documented limits.

The [verified Phase 2 Preview](https://sitefit-3anewlh7d-shahinst21-hues-projects.vercel.app) requires Vercel sign-in. Changes to protected `main` require a PR and successful [GitHub Actions checks](https://github.com/shahinst21-hue/SiteFit/actions). Automatic Production deployment from `main` is disabled.

The [Phase 3 Preview Login](https://sitefit-git-phase-3-database-auth-shahinst21-hues-projects.vercel.app/login) is verified with development configuration. [Draft PR #4](https://github.com/shahinst21-hue/SiteFit/pull/4) has passing CI and remains unmerged pending the real inbox/browser magic-link check. See the Phase 3 status record for exact human verification steps; never paste a sign-in link or credentials into chat.

Read [AGENTS.md](AGENTS.md) and all project documents before development. Phase 3 is explicitly authorised and in progress; [docs/phase-3-status.md](docs/phase-3-status.md) records actual results and outstanding gates. Phase 4 is not authorised. Automatic Production release remains disabled.
