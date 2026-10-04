# Phase 2.5 product and experience record

Started 2026-10-04 from clean main at `130b4dcb5d83ccb5c170e2f2748ad24780a25627` on `phase-2-5-product-redesign`. Contract/architecture/roadmap/decisions were updated before UI code. Phase 2.5 is complete. Local validation, final-head remote CI, authenticated Preview, protected implementation merge and post-merge CI passed. Main was verified clean and matching origin at `87312709b1045a0af26f1fd3c34b4268e4f3dd16`. This completion record uses the same protected PR workflow. No Phase 4 work is authorised.

## Product direction and implementation

The authoritative [Product Contract](product.md) now covers England, Scotland, Wales and Northern Ireland. Historical London-first assumptions are superseded. Provider coverage must later be verified by jurisdiction; TfL is not national transport coverage. Database review found no London restriction requiring a migration. No applied migration changed.

Mobile First is mandatory: design at 390px, then validate 360/375/430/768/1440. A coherent ink/teal visual system uses native controls, system fonts, lightweight server-rendered SVG schematics and progressive disclosures. No map SDK, image/font service, icon library, animation framework or application dependency was added. Homepage proposition, direct free entry and trust details precede the illustrative location visual on mobile.

£29 buys decision-quality interpretation, risks, opportunities, practical questions and evidence transparency, not raw counts or a success score. The contract records source → normalisation → deterministic metrics → evidence → AI interpretation → validated report. AI is an analyst, not a data source or financial calculator. This is a documented future architecture, not an implemented analysis engine.

The anonymous journey is Address → Business Type → Free Snapshot. Structural address validation accepts four-nation examples but does not resolve or verify a property. Four business choices retain the approved shared salon category. No economics, login or payment gate precedes the Snapshot. Entries remain page memory only, with no address in URLs, browser storage or persistence.

The Snapshot organises the entered brief, demand/competition/access priorities, evidence gaps, a generic premises risk to resolve and practical next checks. It explicitly says local evidence has not been verified; it produces no measured local findings. Extra details are collapsed. Economics is offered afterwards: rent, average transaction value and rates first; seven further fields on request. All fields are blank/optional, skip is visible before fields, zero is preserved, invalid optional inputs cannot block the initial Snapshot, and no financial results are calculated.

Customer-facing development banners and London-only positioning are removed. Homepage, How It Works, Methodology, Pricing, Contact, Privacy/Terms, Login/Account and Blog CTAs use mature, truthful language. Legal/service information does not invent a business identity, support inbox or reviewed legal policy. Pricing remains centrally configured at £0/£29; the paid proposition links to a sample rather than pretending checkout exists.

The new `/sample-report` is a fictional Coffee Shop at Market Quarter, clearly labelled at entry and throughout. It presents a decision summary, opportunity/risk/critical gap, practical checks, all 16 report sections, illustrative observation versus interpretation, limitations and a free-check CTA. No real address, source retrieval, measured catchment, calculation or live report is represented. The schematic has an explicit accessible description and disclaimer.

Blog repository/publication filtering, safe structured rendering, article model and SEO boundaries are preserved. Sample Report joins public metadata/sitemap. Private Auth remains noindex and guarded. Existing Supabase Auth/server clients/RLS were not redesigned.

## Observed validation — 2026-10-04

- `npm ci`: succeeded; locked dependency installation, zero reported audit vulnerabilities.
- `npm run check`: final run succeeded after source formatting; strict lint/typecheck, all 30 tests and optimised production build (19 generated static pages). Tests include real PostgreSQL migration/RLS execution, existing Auth/content/SEO/security checks, minimal Snapshot gating, progressive economics and four-nation address examples.
- `npm run check:public`: final built server passed 13 public pages/articles, 13 internal paths, metadata, JSON-LD, sitemap/robots, social image, 404 and existing Auth guard/callback assertions.
- Hosted Auth integration: development session, verified identity, cross-user protection, token consumption/replay and sign-out checks passed using disposable synthetic accounts; cleanup confirmed. No email is sent by this test.
- Browser: 390px checked first. All 14 route requests (13 public/Login pages and protected Account redirect) at 360/375/390/430/768/1440 had no horizontal overflow, one H1, no duplicate IDs or unlabelled controls. All widths also passed actual authenticated Account and optional economics layout checks; input text is 16px.
- Browser flow: empty address and business errors focus the right control; Coffee Shop reaches Snapshot with zero fields and no account; optional economics starts with three fields and expands to ten; invalid collapsed secondary input reveals/focuses on save; skipping invalid unsaved input works; rent zero is retained without fabricated results. Snapshot responsive layout and state editing/reset checked. Heading focus stays below the sticky header.
- Mobile menu opens, Escape closes and restores toggle focus, navigation closes after route selection; the skip link focuses main content. Pricing FAQ works by keyboard; report anchor/disclosure works; mobile/desktop Home, Pricing, Sample, Blog/article and economics visually inspected. Login rejects empty/malformed email without sending email.
- Actual browser development Account: signed in with disposable no-email confirmation fixture, refreshed with session retained, inspected at all six widths, signed out to Login and rejected a consumed confirmation link; synthetic user deleted. Phase 3 human-verified real inbox/same-browser PKCE results remain applicable; Auth flow code is unchanged.
- Browser console: no warning/error logs in the tested session. Mobile/desktop homepage screenshots saved outside the repository as review evidence.
- Secret review: tracked/new reviewable files and existing Git history scanned against private environment values; no matches. Local environment, Vercel state and temporary fixture are ignored. Relative documentation links resolve; `git diff --check` passes. No package/lockfile change or Phase 4 backend was introduced.

## Delivery

Dedicated branch: `phase-2-5-product-redesign`. Required protected-main check: `Lint, types, tests and build`, strict and administrator-enforced. [PR #6](https://github.com/shahinst21-hue/SiteFit/pull/6) merged through the existing strict, administrator-enforced branch protection after both required final-head checks passed. Initial head `46db1ee` passed push and PR required CI ([PR run](https://github.com/shahinst21-hue/SiteFit/actions/runs/37183638761)). Vercel deployment `dpl_H8kH53c9GyP3CwhmUyx9tYurVRBJ` is READY for that SHA at the [stable branch Preview](https://sitefit-git-phase-2-5-product-redesign-shahinst21-hues-projects.vercel.app). Auth environment variables remain encrypted and Preview-only. The exact branch `/auth/confirm` and `/auth/callback` redirects were added to development `sitefit-dev`; reviewed config push changed only those allowlist entries and post-push diff reports zero declared updates. Final head `89fb6d1a2704b5bf2ed588b959529f17135089ec` passed [push CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37183821068) and [PR CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37183823265). Its Vercel deployment `dpl_9ezJbhB2a6gNWCdxs5maEHidWGs2` is READY at the same stable branch alias; final-head Sample Report returned HTTP 200 with fictional labelling and noindex. Authenticated hosted checks passed Home, Sample Report, Blog, Pricing and Login (200), protected Account (307 to Login) and missing-credential callback (303 to fixed invalid-link with no-store). No Vercel protection bypass was published or persisted. Merge commit `87312709b1045a0af26f1fd3c34b4268e4f3dd16` passed [post-merge main CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37183917984); local main equalled origin and the working tree was clean. Automatic Production deployment from main remains disabled.

## Known limitations and deferred work

The current Snapshot is an input brief and checks, not collected location evidence. UK-wide positioning does not certify complete provider coverage. Sample content is fictional. Economics is optional input, not analysis. Real address resolution/providers/Snapshot collection, Stripe, calculations, evidence/AI report engines, PDF, CMS/publishing bot and all Phase 4+ work are deferred. Real benchmark properties, provider permissions, financial rules and reviewed legal/support launch information remain future gates. Existing protected Vercel Preview requires authorised access; no Production activation is performed. Hosted inbox delivery was verified by the user in Phase 3, not claimed from synthetic probes.

## Definition of Done

- [x] Product Contract reflects UK-wide coverage.
- [x] No customer-facing London-only product limitation remains.
- [x] Mobile First is a mandatory documented principle.
- [x] Primary journey is Address → Business Type → Free Snapshot.
- [x] Economics does not block initial value.
- [x] Economics is optional and progressive.
- [x] Homepage presents a mature analytical product.
- [x] Visual/verbal prototype positioning is removed.
- [x] Customer beta/preview/development language is removed or appropriately replaced.
- [x] Evidence limitations are truthful and professional.
- [x] Visual system is coherent.
- [x] Mobile navigation works.
- [x] Key flows work at approximately 390px.
- [x] Desktop quality is visually checked.
- [x] Pricing remains £0 / £29.
- [x] Full Report proposition visibly explains deeper decision value.
- [x] Blog remains functional.
- [x] SEO remains functional.
- [x] Authentication remains functional.
- [x] No Phase 4 backend implemented.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Remote CI passes.
- [x] Documentation updated.
- [x] Repository clean after protected merge; local main matches origin.
