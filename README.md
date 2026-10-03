# SiteFit

Phase 1 application foundation for the London-first Single Location Due Diligence Report. The homepage is an infrastructure placeholder. Product UX and every later phase remain unimplemented.

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

## Infrastructure

See [docs/infrastructure.md](docs/infrastructure.md) for environments, Supabase, Vercel, CI, secure configuration and outstanding account actions. `.env.example` contains names with empty values; never put real values in tracked files. See [docs/phase-1-status.md](docs/phase-1-status.md) for observed validation and outstanding verification.

Read [AGENTS.md](AGENTS.md) and all project documents before development. Phase 1 completion never authorises starting Phase 2.
