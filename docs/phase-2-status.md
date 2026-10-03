# Phase 2 verification record

Recorded 2026-10-03. Scope: UX Foundation and Public Website, plus the user's additional first-class Blog/SEO architecture requirement. Phase 3 and all later backend phases remain unstarted. Local implementation/validation is complete; remote CI and protected merge are pending at this record's initial commit.

## Pages and UX

Implemented Home (`/`), How It Works (`/how-it-works`), Pricing (`/pricing`), Check a Location (`/check-location`), Login (`/login`), Privacy (`/privacy`), Terms (`/terms`), Methodology (`/methodology`), Contact (`/contact`), Blog (`/blog`) and articles (`/blog/[slug]`). Two original general-guidance articles exercise the article frontend. A custom 404, checker loading state, recoverable error UI and honest empty/unavailable states exist. No real report data is shown.

Home communicates the pre-lease use moment, supported businesses, planned report areas, evidence/unknowns, Free Snapshot versus Full Report and initial one-off pricing. Shared navigation/footer reach all public pages. Every page retains the early-preview availability notice. Login controls are disabled; Contact does not invent an address or send a message. Privacy/Terms are development drafts, internally marked for legal review before launch.

Components: site header/footer, text wordmark, arrow/link CTA, page introduction/closing CTA, reusable pricing cards/report outline, location wizard, Blog cards/content/images/CTA. System serif/sans typography, restrained green/paper colours, native controls and existing Tailwind pipeline create the presentation. No design/global-state/CMS dependency is added.

## Wizard contract and validation

Four steps: Property Address → Business Type → Business Economics → Analysis. React page state preserves inputs while moving Back/Next. Address is required, length-bounded entered text with a minimal format check; it is not resolved, geocoded or validated as a London property. Four stable business identifiers retain Hair/Beauty selection while mapping to the approved three categories.

All ten economics are optional: annual rent, annual business rates, floor area m², average transaction £, gross margin %, annual staff costs, annual other fixed costs, opening days/week, opening hours/day and one-off investment £. Decimal syntax, precision, finite non-negative numbers and technical input limits are checked. Margin is capped at 100, days at 7 (integer), hours at 24; other bounds are technical safeguards, not financial-model policies. Missing is null; zero is retained. No financial metric is calculated.

`normaliseInput` produces a version-1 `LocationCheckInput` with unresolved address, subtype/category and explicit currency/units. Preparation is local only; its brief loading state represents that work, not fake analysis. Completion says no analysis ran or report was generated. Entries are not sent, persisted or placed into URLs/browser storage. Reset works; leaving/reloading intentionally discards state. Field errors and linked summary guide focus; native radios/buttons support keyboard input.

## Blog and SEO

The typed domain model includes all required publication/SEO fields, structured rich blocks, image references/dimensions/alt and reusable CTAs. Pages consume an asynchronous repository with local implementation and published-only reads. Zero/single/multiple content, filters/pagination/related data, unsafe URLs, invalid metadata and duplicate slugs are covered by tests. Scheduling states are modelled without a scheduler. Full details and future controlled publishing/quality gates are in [blog-architecture.md](blog-architecture.md).

Unique Metadata API titles/descriptions/canonicals, Open Graph/social cards, generated social PNG, truthful script-safe BlogPosting JSON-LD, repository-derived sitemap and robots are implemented. Articles are statically generated/server-rendered, with minimal client JS. Local/Preview remain noindex; published public Blog pages are indexable only with an explicit HTTPS production `SITE_URL`. No production domain is invented. Draft/scheduled/archived/future content stays outside public reads/sitemap; missing posts return real HTTP 404. Future private/content routes have indexing exclusions, not implemented endpoints.

## Observed validation

- Clean `npm ci` passed; audit reported zero vulnerabilities. Existing dependencies and lock are retained.
- Lint, strict types, 22 Node unit tests and production build passed. New cases cover meaningful wizard/pricing and content/SEO boundaries, not visual snapshots.
- Build generated public routes, both articles, sitemap, robots and social image, without external application credentials.
- `npm run check:public` passed against the production server: twelve public page/article responses, twelve internal paths, metadata, server article markup, JSON-LD, sitemap, robots, 1200×630 PNG and unknown page/article HTTP 404s.
- Browser inspected all twelve routes at 320, 768 and 1440 px: no horizontal overflow, duplicate IDs, missing alt attributes or unlabelled controls; one H1 per page and en-GB language. Visual checks included desktop Home/articles and mobile Home/Pricing/checker/articles.
- At 390 px, browser exercise covered menu open/close, empty address/business errors, field focus, keyboard radio/button progression, invalid margin, preserved address/type/economics across Back, blank versus zero, review, honest finish and reset.
- Console error/warning capture was empty for tested pages/journey. Focus outlines, skip link/landmarks, native labels/fieldset, textual status/errors, table caption/headers and keyboard-scroll region support accessibility basics. No formal WCAG/screen-reader certification or measured Core Web Vitals claim is made.
- A real check found streamed missing-article HTTP 200. Scoping loading to the checker and early `notFound()` metadata resolution fixed it; runtime now returns 404/noindex. CI runs these HTTP checks after its build.
- Before commit, documentation links, secret patterns/actual local values, generated files and phase boundaries are reviewed. Actual environment files/Vercel metadata remain ignored; `SITE_URL` is blank in the tracked template.

## Remote delivery

Branch: `phase-2-public-ux`, from clean, updated `main` at `2cadc14`. Required workflow: branch push → PR → successful required CI → permitted merge → clean updated `main`. Remote CI, Preview and final merge evidence will be added after those checks pass. Production auto-deployment remains disabled.

## Deferred work and limitations

No database/schema, Supabase Auth, Google resolution, real analysis, data/evidence collection, economic engine, Stripe/payment, premises history, AI report, PDF/email, admin or analytics is implemented. Login/contact availability, draft legal text, unverified address and absent analysis are deliberate Phase 2 boundaries. Legal/controller/contact details, final purchase/tax/refund terms, benchmark addresses and live services are later prerequisites, not blockers for this preview.

Blog publishing is local content plus rebuild today. A future controlled writer needs complete raw-payload validation, editorial/evidence checks, publication events/cache invalidation, approved assets, logging, scheduling, redirects and access control. The local validator is not a factual-claim verifier or secure publishing API. External image delivery is supported; storage-host raster optimisation is deferred until a real host is selected.

## Definition of Done

- [x] Public navigation and Home positioning work.
- [x] How It Works and centrally configured Pricing exist.
- [x] Check a Location, Login UI, Privacy, Terms, Methodology and Contact exist.
- [x] Wizard includes Address, Business Type, Economics and Analysis steps.
- [x] Required/optional validation, Back/Next preservation and reset work.
- [x] Loading, empty, recoverable error and disabled/unavailable states are represented appropriately.
- [x] Responsive layouts and accessibility basics are checked.
- [x] No fake analysis or later-phase backend is implemented.
- [x] Blog index/articles, typed source boundary, rich content/images/CTAs and future publishing design exist.
- [x] Unique metadata, social images, safe JSON-LD, published-only sitemap and indexing policy work.
- [x] Local lint, typecheck, tests, production build and HTTP checks pass.
- [ ] Remote CI passes for the final Phase 2 revision.
- [x] Relevant documentation and known limits are recorded.
- [ ] Protected PR merged and final `main` clean.

Outstanding Phase 2 human actions: none. Remaining remote checks are Codex work, not a request for credentials or aesthetic approval.
