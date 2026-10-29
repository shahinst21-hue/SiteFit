# Microsoft Clarity — 29 October 2026

## Authority and scope

The owner approved the proposed limited public-page installation and supplied the existing project's screenshot. The public project ID is **z574qs9jlu** (lower-case L, not digit 1); its official tag endpoint returned HTTP 200 and consent-required configuration (`track:false`). No account creation, new cost, advertising activation, payment, provider/AI execution or migration is part of this work.

Keep the existing Google installation and three-purpose consent contract. Add a separate replay decision in the essential HttpOnly/SameSite=Lax `sitefit_clarity_consent_v1` cookie (180 days). A saved Google grant never authorises Clarity. Existing visitors see the amended choice; they may retain Google and decline replays. Recording requires **Analytics + Advertising measurement + Session replays and heatmaps**; personalization remains optional. This conservative policy admits Microsoft's advertising cookies only after the corresponding explicit grant.

## Implemented boundaries

- Live script requires `SITEFIT_CLARITY_MEASUREMENT=1`, Vercel Production and exact `SITE_URL=https://sitefit.co.uk`. No live-project Local/Preview path exists. `SITEFIT_CLARITY_UI_REHEARSAL=1` creates an inert Local/Preview marker, never Microsoft requests; Production ignores it.
- Exact allowlist: homepage, Pricing, How it works, Sample Report, Methodology, Contact and Blog index. Checker, Snapshots, private reports, accounts, authentication, purchase, API, legal/development routes, articles and unknown slugs are excluded. Query strings/fragments and non-public referrers fail closed rather than attempting arbitrary redaction.
- Whole-body `data-clarity-mask="true"` is independent of dashboard defaults. No identify, custom events/tags, report/property/account IDs or unmask calls. The home postcode remains in the existing one-use React-memory handoff.
- Each document records its initial public page only. Capture-phase link/form/history/back/forward/pagehide guards stop before navigation; recording cannot resume in that document. A fresh full page load can start another eligible capture. Public SPA navigation intentionally does not provide continuous coverage in this version.
- The hosted two-stage queue/executor is guarded: a delayed download after navigation cannot replay its queued start on a private page. Guards do not prevent Next navigation or move postcodes into URLs/storage. Vendor `stop` is used because denied `consentv2` restarts cookieless collection. No denied-purpose pings are intended. Already transmitted/in-flight public data cannot be recalled.
- Withdrawal stops before persistence and refresh unloads a previously loaded library. Failed persistence blocks the document and sets the existing local withdrawal block; a stale grant cannot reload next visit. The consent endpoint expires host-only and apex-domain `_clck`/`_clsk` without touching Auth cookies. SiteFit cannot erase Microsoft-domain cookies.
- Banner, preference purpose and current public Privacy notice disclose Clarity, masking, cookies, processing, retention and rights links. Frozen sale-policy snapshots, contract PDFs and historical reports remain unchanged.

## Verification and delivery

Implementation candidate. Focused tests pass for environment isolation, explicit/expired consent, URL admission, single loading, terminal stop, stop-before-history ordering and late initialization. Full local/HTTP/browser checks, protected CI, merge and activation are recorded below when actually observed. Loader/unit tests do not prove dashboard receiving.

Rollback: disable the Production Clarity flag and deploy the last verified application through the existing protected process. Retain privacy disclosure, consent choices and all audit/payment/report history. No new service credentials are required.

References: [ConsentV2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2), [masking](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking), [cookies](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies), [retention](https://learn.microsoft.com/en-us/clarity/session-recordings/recordings-overview), and Microsoft's [queue](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/queue.ts), [history](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/core/history.ts) and [stop](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/clarity.ts). Observed hosted version: `0.8.77-beta`; vendor changes require renewed verification.
