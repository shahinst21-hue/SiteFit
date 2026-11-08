# Coffee shop location landing page — 8 November 2026

## Authority and implementation

The owner requested implementation of `/coffee-shop-location-analysis` in the existing application. This is a marketing route, not new report-generation authority. Production deployment is explicitly excluded. Current Greater London analytical coverage remains authoritative; UK address acceptance is not described as UK-wide analysis.

The server-rendered page introduces café-specific site selection, an interactive walking-area example, four commercial questions, an editorial report preview, a viewing checklist, the existing journey/pricing and substantive FAQs. Presentation uses the existing system typeface, monochrome/lime identity, icons and shared header/footer. Page CSS is scoped to `.coffee-page`; no new package is introduced.

`CoffeeLocationDemo` receives only three public aggregate population/count pairs from the existing reviewed `sample-source-v2.json`, imported on the server. The cumulative 5/10/15-minute values are unchanged. Census 2021 estimates are labelled as resident context, never current customers, measured footfall or sales. Modelled walking areas and listing limitations remain explicit. Streets, rings and marker positions are schematic, with no exact property, basemap request, private customer payload or real-business positions. Marker visibility and area selection are local React state only; they run no analytical engine. The full public Sample Report remains the evidence/detail destination.

The report preview is an authored paraphrase of existing public sample conclusions, not a new saved report or a claim about the visitor's postcode. The existing Decision PDF was reviewed locally for decision hierarchy and limitations; no private PDF, private source pack, economics figure, property identifier or screenshot is published or copied into the route. Existing public sample export restrictions remain intact.

## Journey, measurement and SEO

The hero reuses `LocationEntry` and its postcode validation/router. Its existing context now permits the new landing route as an entry page. Handoff is one-use React memory to `/check-location`; no postcode URL, cookie, storage or analytics field is added. The checker retains address resolution and business selection. All pricing/purchase CTAs use that checker; there is no direct checkout or duplicate authentication/payment implementation. Pricing is read from `site-config.ts` and shared `PricingCards`.

The public-page registry supplies unique keyword-focused title/description, canonical, Open Graph and Twitter metadata and automatic sitemap inclusion. A footer link makes the route discoverable internally. WebPage, Service (Greater London) and BreadcrumbList JSON-LD describe visible content; no invented reviews, ratings or offers are marked up. FAQs are rendered as native accessible disclosures without promising rich results. [Google's structured-data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) informed the JSON-LD approach.

The existing consented GA4 runtime recognises the exact public route through `safePage`; landing/page-view and subsequent check/report/purchase events use existing handlers. Raw postcode queries remain outside the allowlist. No extra tag, event dispatcher, attribution store or commerce event is introduced. Existing Clarity eligibility is unchanged. Local/Preview remain noindex; Production eligibility continues to require the existing explicit release/indexing policy. No environment/service setting is changed.

## Validation and delivery

Node 24.12.0/npm 11.6.2 `npm ci --no-audit --no-fund` completed (219 packages). `npm run check` passed lint, strict types, all **560 tests**, and the production build. A subsequent scoped FAQ pseudo-element correction passed a fresh production build; final lint also passed. No dependencies/lockfile changed.

The built server passed `check:public -- http://127.0.0.1:3007 noindex`: 22 public pages/articles, 27 internal paths and 19 same-origin scripts, with metadata/JSON-LD/sitemap/robots/security/privacy/404/address-boundary assertions. The new HTTP assertion initially needed to account for React's text-node separator comments; this test-only correction passed on rerun. `check:measurement` and `check:marketing` passed against the actual production server. No generation or payment execution was performed by those probes.

Browser review covered 360/390/768/1440 CSS-pixel widths with no horizontal document overflow. The wide decorative orbit is intentionally clipped by its illustration container at 360px; no controls/content are clipped. Desktop and 390px hero/demo were visually inspected. Walking-area buttons changed the counts, bars and interpretation; marker visibility toggled. Enter activated a walking-area control and a native FAQ disclosure. Invalid postcode submission announced the error and focused the input. A valid public test postcode transferred through React navigation to `/check-location`, retained its value without appearing in the URL, and triggered the existing checker's normal address search; no address was selected, report generated or checkout started. Browser warning/error log was empty. The final FAQ has one expand symbol. Screenshots remain ignored under `.vercel/`.

`git diff --check` passed. Changed application files were inspected for privileged credential patterns; none found. Generated PDF-review images, screenshots and operator helpers stay ignored; no environment file, private PDF, schema or provider configuration is part of the changes. Physical-phone and genuine browser 200% zoom validation remain unverified. Existing regression tests cover authentication/payment/report preservation; no fresh live payment or inbox ceremony is claimed.

Implementation lives on `codex/coffee-location-landing`. Protected PR/required CI delivery and any Production release are separate receipts; local verification does not claim either.
