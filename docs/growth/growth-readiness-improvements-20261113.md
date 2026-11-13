# SiteFit growth readiness improvements · 13 November 2026

Implemented locally on `codex/growth-readiness`, based on production revision `b27fce7`. The Search Console submission and crawl requests were performed on the live domain property. The code is ready for review and a separate release decision. The [acquisition plan](organic-customer-acquisition-plan.md) is registered with all stages Not Started.

## 1. Search Console and indexing

Domain property `sc-domain:sitefit.co.uk`. Before submission the visible sitemap report only listed the legacy `http://www.sitefit.co.uk/sitemap.xml` with Couldn't fetch and zero discovered pages. Verified the current `https://sitefit.co.uk/sitemap.xml` returns HTTP 200 and contains 18 public URLs. Submitted it and read back **Success**, submitted and last read **13 November 2026**, **18 discovered pages**. The historical HTTP/www row still shows its old error. The HTTPS sitemap is the active successful submission.

| Public page | Search Console observation | Action |
|---|---|---|
| Homepage | URL is on Google, page indexed | Existing coverage verified |
| Coffee Shop Location Analysis | Discovered, currently not indexed, HTTPS sitemap associated | Indexing requested, Google confirmed priority crawl queue |
| Pricing | Discovered, currently not indexed, HTTPS sitemap associated | Indexing requested, Google confirmed priority crawl queue |
| Sample Report | Unknown to Google at inspection | Indexing requested, Google confirmed priority crawl queue |

All 18 sitemap URLs returned HTTP 200, same-domain self canonicals (homepage slash equivalence), index/follow and no restrictive X-Robots-Tag. Public robots allows the marketing pages and lists the HTTPS sitemap. Checker and authenticated/customer routes are intentionally excluded. Index status for other sitemap entries was not individually inspected. The three crawl requests remain pending indexing. Follow up in URL Inspection after Google has had time to crawl. [Google URL Inspection](https://support.google.com/webmasters/answer/9012289) · [Google sitemap reporting](https://support.google.com/webmasters/answer/7451001)

## 2. Conversion funnel measurement

Reviewed the same-day audit and evidence in the original SiteFit workspace at `docs/marketing-performance-audit-20261113.md` and `docs/marketing-performance-evidence-20261113.md`, plus the current implementation. GA4 SiteFit Website property 560168986 was linked to Ads customer 855-719-5993. Ads uses the existing primary imported GA4 purchase. Stripe Live and the application payment ledger are the financial authority. Both showed zero genuine purchases in the audited campaign window. These figures come from the same-day audit.

| Decision stage | Signal | Interpretation |
|---|---|---|
| Arrival | Existing landing page, page_view, source/medium, consented acquisition | Compare users by landing route and known source. Consent and attribution limit coverage. |
| Start Free | New `start_free_clicked` on homepage and café hero form submission | Counts intent including invalid form submits. Footer and other links into checker are represented by the existing checker route event. |
| Property search | New `property_search_started` when checker dispatches first valid postcode or typed address lookup | Includes hero handoff and direct checker entry. A successful result/selection is a separate signal. Manual entry has no search step. |
| Selection | Existing `address_selected` and `business_selected` | No address or identifier in transmitted custom payload. |
| Free result | Existing `free_analysis_started`, `free_analysis_completed`, `free_report_viewed` | A reopened eligible report can emit the existing completion milestone. Use Ready rows to confirm genuinely new reports. |
| Paid offer | New `full_report_offer_viewed` when the purchasable Full Report dialog opens | Measures a concrete offer interaction. Credits and demo are excluded. Landing-page prices are marketing copy, not offer-dialog views. |
| Checkout | New `checkout_attempted` before checkout navigation and existing retry path. Existing `begin_checkout` after the Stripe session is verified | A checkout attempt can lead to sign-in or fail before session creation. Distinguish the milestones. |
| Payment | Existing verified Stripe-return `purchase` and server deduplication claim | Reconcile with settled Live Stripe and verified application payment, excluding owner proofs, credits and tests. |

The four new milestones use the existing consented runtime, fixed local deduplication keys, and the existing safe page and event schema. They count first observed actions within the browser tab's session, with homepage and café hero submits distinguished locally. Search query, postcode, address, report ID, and customer details are absent from new payloads. No new Google tags, conversion actions, database tables or consent purposes. Audit live GA4 stream history page views, form, file and site-search settings with actual payloads before considering config changes. These may overlap with manual page-view measurement or use different event names. Native event receipt and genuine purchase attribution for this new code remain unverified until a permitted release or isolated analytics destination. Do not use GA4 alone to infer sales.

## 3. The £29 report on the café page

The hero now explains what the Free Snapshot covers and what the Full Report adds. The report preview uses the saved public sample's Conditional shortlist and three priority checks: measured layout, written permitted use, and the draft lease. It gives a tangible reason to buy before a viewing or lease decision and retains the interactive sample and current design. Reviewed the public report content and the existing frozen Decision PDF verification record in [default paid PDF finalisation](../default-paid-decision-pdf-20261101.md). Private paid report artefacts were not accessed or copied. Price, calculations, report generation, and checkout decisions remain as in the existing implementation.

## Verification and remaining work

- Node 24.12.0/npm 11.6.2, `npm ci`, `npm run check`. Lint, strict types, 562 tests and Production build passed. A targeted measurement test independently exercised all four new events under denied and granted consent, deduplication and payload minimisation.
- Built server HTTP checks passed for `check:public`, `check:measurement` and `check:marketing`. Public checks covered 22 pages/articles and 28 internal paths. Stripe admission, purchase-flow and report regressions ran in the existing suite.
- At 390 × 844, the café form and £29 explanation fit without horizontal overflow. Keyboard activation of the empty form showed the postcode validation message. The example link opened the live local Sample Report and displayed the cited conditional recommendation and lease checks.
- No real lookup, report generation, payment or analytics event was sent. Browser receipt on an authorised analytics destination, live payment attribution and Google indexing remain outstanding. Production code and Google Ads were untouched. No merge or deployment performed.
