# SiteFit

Public preview of the London-first Single Location Due Diligence Report. Phase 2 adds the public website, four-step frontend location checker and a structured SEO Blog. Entries stay on the current page; analysis, accounts, payments and every later backend phase remain unimplemented.

## Local development

Use Node.js 24.x and npm 11.x. Install the locked dependencies and start the application:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No environment variables or external accounts are needed for the shell. Only the optional Supabase connectivity check needs project configuration.

## Validation

```sh
npm run check
```

This runs ESLint, strict type checking, Node's built-in unit tests and the production build, stopping on the first failure. Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. To serve a production build: `npm run start`.

With that production server running, use `npm run check:public` for real route/metadata/404 checks. Browser-responsive and keyboard checks are documented in [docs/phase-2-status.md](docs/phase-2-status.md). Read [docs/blog-architecture.md](docs/blog-architecture.md) before changing editorial content or its source.

## Infrastructure

See [docs/infrastructure.md](docs/infrastructure.md) for environments, Supabase, Vercel, CI and secure configuration. `.env.example` contains names with empty values; never put real values in tracked files. See [docs/phase-1-status.md](docs/phase-1-status.md) for completed Phase 1 verification and documented limits.

The [verified Preview](https://sitefit-6ry6vgwxj-shahinst21-hues-projects.vercel.app) requires Vercel sign-in. Changes to protected `main` require a PR and successful [GitHub Actions checks](https://github.com/shahinst21-hue/SiteFit/actions). Automatic Production deployment from `main` is disabled.

Read [AGENTS.md](AGENTS.md) and all project documents before development. Phase 1 completion never authorises starting Phase 2.

Phase 2 was explicitly authorised. Its completion never authorises Phase 3; automatic Production release remains disabled.
