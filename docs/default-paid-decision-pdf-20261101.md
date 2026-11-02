# Default paid PDF finalisation — 1 November 2026

## 2 November — direct Full Report download control

The owner now authorises a scoped change to the purchased-report download control, superseding the earlier dashboard-preservation restriction for this control only. Replace the Export dropdown with one compact, clearly labelled “Download full report” PDF link using the existing white surface, fine border and restrained green accent and the description “All sections, evidence & action plan”. Remove the Full/current-page submenu and all section-specific download choices from this dashboard. Public samples and incomplete/structured previews do not advertise a complete report download. Report section navigation is unchanged.

This is presentation only: the existing owned `/reports/[id]/pdf` destination, frozen Decision Edition selection, historical PDF fallback, measurement/consent handling, authentication, prices, credits and generation pipeline remain unchanged. No schema change, report generation, AI/source call or Production release is required to prepare it. Protected delivery and existing mandatory checks apply; actual verification is recorded in the delivery PR. Production activation requires separate explicit release approval.

## Scope and authority

The owner's finalisation instruction authorises the minimum backend integration for future eligible paid Full Reports. The existing dashboard, navigation, report display, account, authentication, payment and £29 price remain unchanged. Production deployment and schema application require a later explicit approval. This supersedes the earlier PDF-default restriction, not the dashboard-preservation rule. No new report page or download control is added.

## Reused implementation and evidence

PR160/161 are already incorporated through protected PR162; PR163's credit settlement corrections are also in main. The current Production application is `b9a263ba4712d8ee2f5130c4c4a1ab4358f95ebf`; its separate forward SQL corrections are recorded under main `8c2105d6d8c59106ac918eee586aad746395ba37`. No earlier implementation or migration is repeated.

Reuse the frozen DecisionReport, exact financial engine, category/customer input binding, automatic competitor classifications, qualified network segments, archived maps/contours, private artifact loading and renderer `decision-pdf-2026-11-01.5`. Accepted Ruislip/Broadway Market evidence, PDF page inspection, mobile/desktop/200% review, immutable replay, ownership and cache checks remain in PR160/161 and `decision-report-integration-20261101.md`. There is no new acquisition, AI analysis, property research, design, financial method or Full generation.

## Minimal backend change

The normal owned dashboard read supplies server-only frozen-edition metadata to the existing Full PDF endpoint. The unchanged Full report PDF button/URL selects the saved Decision Edition when present, using the same digest/renderer cache path as the already implemented Decision export. Cache hits skip map hydration and rendering. Downloads never prepare an edition, fetch providers, run AI/calculations or take payment. Corrupt frozen editions fail closed; they do not silently export a different report.

Historical reports without a frozen edition retain their original renderer, artifact paths and attachment behaviour. The reviewed Ruislip research pack is not automatically attached to historical exports. Current-page PDF exports keep their existing behaviour. Existing separate Decision URLs are retained for compatibility; none is added to the customer journey.

One forward migration changes only the existing Full material reader. New Production preparations qualify after verified paid ownership, current payment mode/access, confirmed supply, an existing commercial provider reservation and the exact active fulfilment lease. Existing scoped testing credits retain their eligibility. Environment flags alone cannot grant admission. The existing compiler freezes the edition before Ready; old Ready projections and PDFs are never migrated. Existing provider ceilings and read-time ownership/rights checks remain in force.

## Additional verification and release gate

Only the export integration gains a route regression: new whole-report selection, cached replay without renderer/hydration, unchanged historical/current-page bytes, denial of foreign/draft reports and fail-closed corrupt content. The existing paid SQL fixture additionally checks preparation before supply/lease, active paid admission and expired-lease denial. Existing analytical/PDF evidence is reused. Normal mandatory checks and required protected CI follow these targeted checks.

Production has not been changed for this task. The new migration and application changes must be released together after explicit deployment approval. Reuse existing proof artifacts for post-approval export checks; do not create a Stripe purchase, provider test or another Full Report solely to repeat accepted evidence. Current default-export verification and exact-head protected status are recorded in the delivery PR.


## Verification receipt — 2 November continuation

The new existing-route regression passed. Fresh PostgreSQL/security tests passed with the new paid supply/lease assertions; the mandatory full local check passed lint, strict types, 556 tests and build. A final build includes the fail-closed new-Production-preparation guard. No dashboard, component, account/authentication, payment or price file differs from main.

A read-only integration probe fetched the existing Broadway Market frozen JSON and cached PDF from private Development Storage, then exercised the actual existing PDF route with the owned-read dependency supplied from that saved report. The real archive/digest loader validated the original saved reference. Two downloads returned the accepted 16-page artifact byte-for-byte (SHA256 8706f497a6928fb3371be91e05990af739dc22c76806f698a827f67f74b761d1), with zero render, hydration, AI, provider, payment or artifact-write calls. This isolates the changed routing integration; it is not a new live authentication or report-generation proof. The unchanged reviewed Ruislip artifact retains 14 pages and its recorded digest. Prior page-by-page visual, maps/tables/fonts and mobile/desktop review is reused because neither PDF renderer nor document bytes changed. Historical/current-page fallbacks and foreign/draft/corrupt denial were exercised in the new route regression.

Production was rechecked read-only after routine CLI credential refresh: its Ready application is still dpl_3R5aDf3tQvE1FP8fvrkB2Sm3vGpW at b9a263ba4712d8ee2f5130c4c4a1ab4358f95ebf; main is 8c2105d6d8c59106ac918eee586aad746395ba37. No Production schema, deployment, account, credit, provider or payment change was made for this finalisation. Protected exact-head CI and Preview status are tracked in the delivery PR; deployment approval remains outstanding.
