# Public indexing activation — 26 October 2026

The owner explicitly approved correcting the remaining prelaunch crawl/indexing restriction after the actual Google URL Inspection failed on `robots.txt`. Safe Browsing, Search Console Security Issues and Manual Actions are clean; Google Ads' malicious-software classification remains unresolved and is not explained by this correction. AdsBot ignores the wildcard robots group according to [Google's documentation](https://developers.google.com/crawling/docs/crawlers-fetchers/google-special-case-crawlers). This work does not send an appeal, message or indexing request, activate a campaign or claim advertising approval.

## Minimal correction

`publicIndexingEnabled` reuses the existing admitted Production-origin predicate plus the explicit `SITEFIT_PUBLIC_INDEXING_ENABLED=1` switch. It no longer separately requires the old global `productionApproved` capability, which is false even on the admitted public release. The global capability object is unchanged; no payment, execution, measurement, source, budget or ownership capability is broadened. Exact origin and existing Production/trial configuration remain checked; Preview, Local and malformed/unadmitted origins stay closed.

Only public marketing pages and published articles become index/follow. Login/checker/privacy/terms retain their existing noindex metadata. Robots retains every account/report/purchase/auth/internal/dev/preview/admin/API/checker exclusion. Existing private authentication, RLS, no-store, no-referrer and noindex headers are unchanged; robots is not an access control. Draft/scheduled/archived articles stay outside the repository read boundary and sitemap.

The existing HTTP smoke check has explicit `indexed` and `noindex` modes to verify metadata, public headers and the actual robots file. CI uses `noindex` on its unactivated build; the Production check must use `npm run check:public -- https://sitefit.co.uk indexed`. Unit regressions cover admitted origin/explicit activation, disabled/Preview rejection, public/published metadata and retained private exclusions without granting other release capabilities.

## Controlled release

Validate locally and through protected PR CI, then change only the existing Production-scoped indexing flag to `1`. Confirm that it covers Production alone and compare the digest of all other environment records. No schema migration or new service is needed. Build the merged source with the Production environment without switching the domain, verify the candidate, and promote only after required checks pass. The previous Ready release `dpl_3u3mRR3M9sZedHj677qNMoKMR576` remains the rollback target. Rollback can restore that artifact or disable the same indexing flag and rebuild; do not alter private/history/budget controls.

After release, verify actual public metadata/robots and private boundaries, then repeat the genuine Google Search Console live URL test. Google's robots cache can lag; record an observed result rather than assuming immediate refresh. Google Ads policy review remains separate. The delivery PR records the actual CI, deployment and hosted crawl receipts; private evidence is retained under ignored `.vercel/public-indexing/`. The regression changes are covered by the same required CI as application code.
