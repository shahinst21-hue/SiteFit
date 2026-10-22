# Google Ads / GA4 launch measurement — implementation candidate

## Consent banner correction — 22 October 2026

The initial banner was incorrectly conditional on Google measurement being enabled. A stale local withdrawal block also masqueraded as a saved rejection. The interface now prompts whenever no valid persisted decision can be restored, independently of the measurement flag. A withdrawal block cannot restore an older grant; missing, expired, invalid or unreadable consent remains ungranted. Failed consent reads show the banner without starting the tracking runtime. Saved rejection/acceptance and the preferences control remain available while measurement is disabled.

Validation: lint, strict types, all 478 unit tests and the production build passed. Built-app HTTP public/measurement checks passed. Actual isolated Edge browser contexts at 390×900 and 1280×900 verified first-visit display, equally styled 44px-or-larger accept/reject controls, acceptance, rejection, granular choices, persistence through refresh and withdrawal. No horizontal overflow, Google network requests, page errors or console errors occurred with measurement explicitly disabled. An aborted initial consent request still displayed the banner. Mobile results are viewport emulation, not physical-device verification. Browser screenshots: consent-fixed-390.png and consent-fixed-1280.png. This correction does not enable Google measurement, change account filters, start a payment or publish Production. Preview/exact-head CI read-back is recorded separately.

Owner authority: the attached **SITEFIT: GOOGLE ANALYTICS AND GOOGLE ADS LAUNCH READINESS** instruction, 22 October 2026. Implementation and isolated verification are authorised; Production deployment/configuration, paid services, advertising activation/spend and live-payment changes are not. Public commercial gates remain unchanged. Launch readiness is **incomplete** until the external and release gates below pass.

## Audit and architecture

Baseline: protected controlled release `21e063af5dedea19f38b3b5ca202891b0d8bb8a1` (PR125), matching the last verified Production application. `main` is an older architecture; no broad branch promotion is proposed. Existing migration files include the previously reconciled Production history. New migration is additive, not a history repair or replay. No new migration has been applied to a hosted database by this work. New observational inserts also retain the existing 450,000,000-byte internal capacity checkpoint and fail closed without affecting payment/report delivery.

Existing infrastructure:

- App Router root layout, Supabase SSR verified-session ownership and anonymous-to-permanent account continuity; public checker and private saved reports.
- Explicit optional `sf_campaign` allowlist, HTTP-only session cookie, private first-touch campaign association and fixed interaction aggregates. No Google tag, GA4 loader, GTM container or complete cookie-preference UI was installed.
- Stripe Checkout/retry, signed guest intent through authentication, immutable attempts, signed webhooks and direct server reconciliation. Paid status is verified against the bound Session/PaymentIntent, amounts, account and mode; a redirect is not payment evidence. Existing owner-only/public gates remain.
- Current Stripe policy admits a single configured one-off GBP product, £29, with promotion codes/automatic tax/adaptive pricing disabled. The payment verifier already enforces that price. This work does not generalise/change that payment policy. Analytics reads the verified actual Session amounts, rather than embedding £29 in events.
- Ready reports and archived PDFs, no-store private routes, safe error codes, consent-selected internal campaign export. No new error-monitoring vendor/dashboard is added.

The old footer campaign prompt is replaced by unified cookie preferences. Old campaign RPCs, historical aggregate records and enablement gates are retained; an old campaign choice is never treated as Google consent. Google acquisition metadata uses the existing owned report identity and account-owner resolver. Its new table is necessary for bounded UTM/click identifiers and consent/cutover; the historical three-code export is not silently reinterpreted.

## One shared Google tag

Owner-verified account configuration (not independently verified in the Google UI here):

| Setting | Existing value |
| --- | --- |
| Shared Google tag | `GT-NBBS5VJ4` |
| Official installation / Ads destination | `AW-18530541419` |
| Connected GA4 destination | `G-ZRCDT4R80E` |
| Ads customer | `855-719-5993`, GBP |

The single asynchronous loader uses `https://www.googletagmanager.com/gtag/js?id=AW-18530541419`. The official arguments-object queue is retained. One `config` command targets AW; **no second GA4 loader, GA4 config, GTM container or direct Ads conversion event** is added. Custom/ecommerce events explicitly route to the connected GA4 destination with `send_to`. Receiving through the shared destination must still be observed externally; do not add another config speculatively.

Default consent is queued before any config/event command or external loader. `send_page_view:false` is set globally and on config. The App Router sends manual, sanitised first views; **disable automatic history/scroll/click/download/form measurement in Google settings before activation**, otherwise remote enhanced measurement can duplicate events or capture sensitive links/text. The code cannot override every remotely managed automatic detector. User-provided data/enhanced conversions and Google signals are not enabled by this change. Script requests use no-referrer.

Sources: [Google basic consent implementation](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), [routing](https://developers.google.com/tag-platform/gtagjs/routing), [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views), [automatic detection settings](https://support.google.com/analytics/answer/12131703?hl=en).

## Conservative Basic Consent Mode v2

All visitors use the stricter UK/EEA baseline; no geolocation service is needed. `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` start denied. Accept all / Reject all have equal visual prominence. Preferences provide unchecked Analytics, Advertising measurement and Advertising personalization; personalization cannot imply ad consent. Footer access/change/withdraw is always available, independent of purchase.

Because the one shared tag serves both destinations, the initial **strict shared-loader policy requires both Analytics and Advertising measurement**. Analytics-only/ads-only choices are saved, but do not unblock that shared external loader. This stricter limitation is stated in the dialog. Personalization is separate. We do not use denied-purpose cookieless pings as a substitute for consent. A more permissive per-destination mode would require independent network validation before changing this policy.

The essential HTTP-only `sitefit_consent_v1` cookie remembers the versioned choice for 180 days. No optional cookies/Google requests are created by initial consent GET. Missing/malformed/expired choices fail closed. On reduction/withdrawal, application events stop immediately; Google consent is updated, optional cookies are cleared and a loaded library is unloaded by page refresh after persistence. A necessary local block survives an unsuccessful withdrawal save and prevents automatic reloading from an older grant. Already transmitted/in-flight data cannot be recalled. Google-managed behaviour after an update still needs network/Tag Assistant verification.

No optional consent is inferred from sign-in, payment, the Terms of Sale or the old campaign cookie. The rendered Privacy notice has a separate current Google/cookie disclosure. Historical sale-policy snapshots and archived contract PDFs remain unchanged. Review the relationship between the new notice and the versioned privacy wording used for future purchase confirmations before commercial activation; implementation does not certify legal sufficiency. [ICO guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/).

## Event specification

`A+M` below means Analytics and Advertising measurement granted, live/test environment admitted, loader ready; personalization is not required. No events are backfilled after refusal. All parameters below are strict admitted values. Every event also carries a fixed deployment_environment (production/test); debug_mode is enabled only for the separate test destination, never used as Production isolation. No names/emails/phones, addresses/postcodes/coordinates, report text, search terms, raw page titles, account/report URLs, user IDs or credentials are exported.

| Event | Actual trigger / source | Parameters | Consent / deduplication | Purpose |
| --- | --- | --- | --- | --- |
| `page_view` | First admitted route view after consent; App Router | Virtual page URL/title, empty referrer, permitted campaign only | A+M; once per normalised page per consented browser-tab session | Page reach, not raw repeated page loads |
| `landing_view` | First measured route after consent | Safe page context beyond safe page context | A+M; once per tab session | Landing reach |
| `check_started` | Checker route reached | Safe page context | A+M; once per tab session | Enter checker |
| `address_selected` | AddressLookup commits returned/manual selection | No address/ID exported | A+M; internal property key in session dedup only | Property selection |
| `business_selected` | User changes business radio | Allowlisted `business_type` | A+M; property/category key per tab | Concept choice |
| `free_analysis_started` | Real generation submit, excluding proofs/rehearsals | `business_type` | A+M; existing nonce per tab | Generation start |
| `free_analysis_completed` | Successful stream result, or first eligible owned Ready Snapshot view | `business_type` | A+M; same report key in both paths | Observed successful free analysis |
| `free_report_viewed` | Eligible owned saved Snapshot rendered | `business_type` | A+M; report key per tab | Free value reached |
| `begin_checkout` | Valid server-generated/recovered Stripe URL; permanent account, bound open/unpaid Session | `currency`, `value`, `tax`, `shipping`, fixed product `items` | A+M; persistent unique Session/destination dispatch claim | Genuine Checkout initiation |
| `purchase` | Paid return/status rendered, then owner-only server endpoint re-reads bound Stripe Session; DB already has verified payment | `transaction_id`, actual `value`, GBP, tax/shipping and product items | A+M; persistent unique PaymentIntent/destination claim | Principal paid conversion |
| `full_analysis_completed` | First eligible, verified Ready Full dashboard observed | `business_type` | A+M; Full report key per tab | Browser-observed fulfilment success, not background completion telemetry |
| `report_viewed` | Eligible Ready Full dashboard rendered | `business_type` | A+M; report key per tab | Purchased report use |
| `pdf_downloaded` | Consented fetch succeeds with PDF content type and blob download begins | `business_type` | A+M; report/section key per tab | Successful export response, not proof the user saved/opened bytes |
| `analysis_failed` | Actual wizard generation failure | `business_type`, fixed `failure_category` (timeout/unavailable/rejected) | A+M; nonce per tab | Funnel failure; never raw errors |
| `refund` | Same owner-verified payment observation finds successful Stripe refunds | Original transaction ID, actual refund amount/items | A+M; persistent unique Refund/destination claim | Revenue correction; browser-observed only |

Private report IDs/attempt keys are used for local deduplication/ownership, never emitted as GA dimensions. Virtual paths replace IDs and remove queries/fragments; titles are fixed. Ordinary views deduplicate within a browser tab; clearing session storage/using another tab may create another view. This is not a unique-person guarantee. Payment deduplication is independent of browser storage and survives tabs/browsers/reloads.

## Trusted ecommerce and persistent dispatch

`/api/measurement/purchase` is same-origin POST only, bounded body, no-store/no-referrer. It requires saved relevant consent, active measurement config, a verified permanent account, owned payment, expected Stripe account/mode and activation cutover. It never trusts a success/cancel query. It uses existing `verifiedSession` binding and actual `amount_total` / `total_details`; no card/email/provider payload is returned. A paid event additionally requires the existing `verified_at` and succeeded/refunded record. It does not confirm a payment or alter fulfilment. A missing/expired campaign association does not suppress a valid consented purchase; that purchase can remain unattributed.

The additive `claim_sitefit_google_event` RPC is service-only, row-locks the existing payment and inserts an immutable unique `(destination,event,provider_key)` dispatch before returning an allowlisted ecommerce payload. Test payments cannot dispatch to the live GA4 destination. Existing controlled proof/trial purchases and pre-cutover records are excluded. Stable `sf_<payment UUID>` is the opaque transaction ID; original Stripe IDs stay private. Repeated webhooks do not send analytics; reload/status/report reopening cannot issue another purchase claim. There is **one browser delivery path and no Measurement Protocol credential/server fallback**.

Claims are **at-most-once dispatch authority, not Google delivery receipts**. A lost response, blocker, tab close, loader failure or consent withdrawal after claim can undercount; there is no unsafe ambiguous resend. Google transaction ID provides a further receiving-side defence but is not our sole persistent fence. Stripe remains the financial source of truth.

For the current zero-tax/digital-shipping policy, successful refunds are emitted once when this payment is observed again. No browser return means no refund event, so reconcile Analytics revenue with Stripe; do not treat GA4 as the accounts ledger. Future taxed/shipped refunds are deliberately not allocated speculatively: exact refund tax/shipping facts would need a separately verified extension. Promotions/tax settings are untouched. The pure analytics amount adapter covers discounted/taxed totals; this does not claim that the existing restricted Checkout currently accepts them. [Google ecommerce reference](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce).

## Attribution and authentication

Only known publisher-controlled UTM values are admitted; arbitrary user/search text is not. Current campaign allowlist is `campaign-01/02/03`; source/medium/content/term allowlists are in `lib/measurement/attribution.ts`. Publish ads with those values or add a reviewed fixed value before use. For example:

`https://sitefit.co.uk/?utm_source=google&utm_medium=cpc&utm_campaign=campaign-01&utm_content=ad-01&utm_term=coffee-shop-location`

Google auto-tagging may append `gclid`, `gbraid` or `wbraid`; bounded encoded click IDs are admitted only with Advertising measurement consent. No identifier is appended to SiteFit navigation, authentication, Checkout metadata or Stripe redirect URLs. Pending campaign data is memory-only before consent. The HTTP-only first-touch acquisition cookie lasts up to 90 days, crosses SiteFit auth/checkout paths, and restores permitted campaign context on return. Manual Google events receive a virtual analytics-only `page_location` containing admitted acquisition parameters; the address bar remains unchanged.

New owned Free reports receive a private first-touch association; historical/old views are not retroactively attributed. Existing `sitefit_access_owner` resolves supported anonymous/account claims when relating the association to the final purchaser. Same-browser Google identity is maintained by its consented first-party cookies; no identity is inferred from Stripe email. Cross-browser, cookie loss, delayed/refused consent and attribution windows can lose attribution. Do not label unattributed purchases organic automatically.

Acquisition rows expire at 90 days and are opportunistically purged on binding. Before activation, integrate `purge_expired_sitefit_google_attribution()` into the authorised daily database-retention runbook; the function is operator-only, not a new public job/service. Minimal dispatch tombstones remain to prevent duplicate conversions; they do not contain addresses or click IDs. Operator-only `sitefit_google_rights_plan` and CAS/hold-reviewed `erase_sitefit_google_attribution` extend existing rights handling without removing financial history. Consent withdrawal immediately stops future application collection; historical records follow rights/retention review.

## Environment and activation

| Setting | Use |
| --- | --- |
| `SITEFIT_GOOGLE_MEASUREMENT=1` | Explicit separate measurement activation; unset by default |
| `SITEFIT_GOOGLE_LIVE_FROM` | ISO UTC Production cutover; excludes prior owner tests. Required with exact `SITE_URL=https://sitefit.co.uk` |
| `SITEFIT_GOOGLE_TEST_INSTALLATION_ID` | Optional standalone test GA4 tag; must equal the test Measurement ID (defaults to it); no Preview AW tag |
| `SITEFIT_GOOGLE_TEST_MEASUREMENT_ID` | Standalone test GA4 destination; must differ from live |
| `SITEFIT_GOOGLE_UI_REHEARSAL=1` | Local/protected Preview synthetic UI + in-memory command queue; no Google/Stripe/measurement DB requests. Ignored in Production |

Production IDs are the owner-supplied public IDs above, not secrets. No MP secret, Ads API token, new package, paid CMP or recurring infrastructure cost is required. Never use live IDs in Local/Preview; DebugView is **not** isolation. Production controlled-trial/proof flags disable Google measurement even if its flag is accidentally set. No environment values have been activated in Production.

## Manual Google configuration and launch checks

Keep campaigns paused. These are instructions, not claims of completed account actions:

1. Verify the existing shared tag/destinations in Ads customer **855-719-5993** and GA4 **SiteFit Website**. Do not add/disconnect/merge a tag. In tag settings disable automatic history, scroll, clicks, downloads/forms and user-provided-data detection; keep manual page views. Check no independent GA4/Ads purchase tag exists. Configure Stripe/payment and authentication domains as unwanted referrals where appropriate; do not tag Stripe or add unnecessary cross-domain tracking.
2. GA4 **Admin → Data display → Events / Key events**: confirm `purchase` is a key event (it may already be one). Use **once per event**, not once per session, for purchases; transaction IDs deduplicate the same sale. Register `business_type` and `failure_category` as event-scoped custom dimensions if reporting needs them; do not register transaction/report IDs as high-cardinality custom dimensions.
3. In **GA4 Advertising → Tools → Conversion management → New conversion**, choose Ads **855-719-5993**, select `purchase`, category **Purchase**, review/save. If this interface is unavailable, use **Google Ads Goals → Conversions → Summary → New conversion action → Import → Google Analytics 4 (Web)** and select the existing purchase key event. Do not import/create a second duplicate purchase action. [Official import instructions](https://support.google.com/google-ads/answer/10632359?hl=en-GB).
4. Inspect that imported action: **Primary**, value from each event, **GBP**, count **Every**, appropriate attribution/window. Confirm the intended campaign's account-default or campaign-specific goal includes this action. Funnel events remain observational or Secondary, excluded from bidding goals. Do not activate campaigns.
5. Verify Ads auto-tagging is enabled, billing readiness and advertiser verification in the existing account. Do not edit budgets, billing, enable campaigns or authorise automatic spend in this task.
6. In GA4 **Admin → Data streams → Web → Google tag settings**, review unwanted referrals for actual Stripe checkout/link and supported auth return domains; review data retention/Google Ads linkage/transfer settings. [Referral guidance](https://support.google.com/analytics/answer/10327750?hl=en).
7. On an **existing isolated test destination** with Preview Test Mode only, use [Tag Assistant](https://support.google.com/tagassistant/answer/10039345?hl=en): connect the exact protected Preview URL without exposing protection tokens. Fresh session must show zero Google requests before choice, all defaults denied. Test reject, granular partial choice, both measurement grants, personalization change and withdrawal. Confirm one loader/config, only sanitised URLs, intended GA4 receiving destination and no direct Ads primary conversion.
8. Verify GA4 Realtime/DebugView and network requests for each event. Complete one **authorised Stripe sandbox** transaction, cancel/fail/retry and replay the same webhook/return; confirm a single purchase, actual GBP amount/transaction ID and preserved campaign. Confirm refund handling for the supported zero-tax case. Never send synthetic/test purchases into live GA4, even with debug_mode. No sandbox transaction was initiated by this implementation without an isolated destination.
9. Build a GA4 **Explore → Funnel exploration**, using total users/closed funnel and a consistent time window: landing/check/address/business/free start/free complete/free view/begin_checkout/purchase/full complete/report view/PDF. Segment by session source/medium/campaign and business category. Use user progression, not ratios of unlike event-count grains. Review Stripe totals versus consented GA4 purchases and dispatch claims. The claims ledger is not proof of delivery.
10. Obtain approval for the additive hosted migration, current disclosure/privacy-version review, retention cadence and Production deployment/configuration. Run required protected CI and hosted integration/security tests, apply only the new migration through the existing process, then deploy a Production-built artifact with measurement still off until account/consent receiving proof is approved. Request a separate explicit approval for advertising activation and a spending cap.

## Verification ledger

- Implemented and locally verified: pure consent/config/attribution/redaction/amount boundaries; single-loader/manual-event runtime with a stubbed sink; isolated SQL ownership/mode/verified-payment/unique claim/immutable-history tests. These do not claim real Google receiving or real multi-connection hosted contention.
- Implemented and locally verified: lifecycle instrumentation, cookie controls, API routes, full suite and migration rebuild; exact results follow below. Protected head CI is reported on the PR.
- Not externally verified: Tag Assistant, GA4 Realtime/DebugView receiving, shared linked destination routing, Ads Primary/Every/value configuration, advertiser verification/billing/auto-tagging, real Stripe sandbox/hosted integration.
- Not deployed/activated: hosted migration, Production code/flags, campaigns. No paid requests, charges, advertising spend or new services are authorised/performed.

The Definition of Done remains **incomplete** while any receiving/consent/purchase external test is outstanding. Repository tests alone cannot prove launch readiness.

### Verified implementation candidate — 22 October 2026

- `npm run check`: passed lint, strict types, **476 tests** and the Production build. After the final additive SQL capacity guard, all seven measurement/SQL tests passed again; protected CI must validate the committed head.
- `npm run check:database`: passed the fresh full migration rebuild/security suite (one aggregate test). SQL test concurrency is serialized PGlite, not a hosted multi-connection proof.
- Built-server `check:public`, `check:marketing` and `check:measurement` passed. Measurement HTTP checks include no-consent denial, CSRF rejection, strict bodies and no initial optional cookies.
- Actual browser UI rehearsal at **390×844, 738×1000 and 1280×1000**: consent controls fit without horizontal overflow; reject persisted; analytics-only left the shared loader blocked; both measurement grants created exactly one synthetic loader, retained across SPA navigation; personalization remained separately optional. Withdrawal reloaded with zero loader markers and zero external Google scripts. Escape closed the native dialog and restored focus to Cookie preferences. The postcode checker remained usable after withdrawal without submitting a search/report.
- Browser rehearsal deliberately made **no Google requests**. It verifies UI and loader admission, not real Google network traffic, receiving, cookies, or purchase attribution. Screenshots are local release evidence (`google-consent-mobile.jpg`, `google-consent-tablet.jpg`, `google-consent-desktop.jpg`). No physical-phone test was performed.
- Owner confirmed no isolated Google test destinations currently exist and deferred external verification to release approval. Do not create destinations or send synthetic events to live IDs as a workaround.
- Hosted migration, account configuration, sandbox ecommerce receiving, Production deployment and advertising activation remain unperformed. No real charge or report was initiated.

## A–P implementation report

| Item | Classification | Result |
| --- | --- | --- |
| A. Existing infrastructure | Implemented but not externally verified | Existing shared tag/destination IDs supplied by owner; existing owned Stripe confirmation, retry, Auth, retention and protected release paths reused. Account UI/linkage not independently verified. |
| B. Changes | Implemented and verified | Consent UI/API, guarded runtime, actual lifecycle hooks, verified ecommerce boundary, persistent dispatch authority, private attribution and additive SQL tested locally. |
| C. Files | Implemented and verified | Exact file inventory is the protected PR diff; grouped implementation is documented above. No dependencies added; existing frozen sale/privacy receipts and payment rules unchanged. |
| D. Google installation | Implemented but not externally verified | One AW loader/config for existing shared tag; manual events target linked GA4. Default off, no independent second GA4 config or direct Ads purchase conversion. |
| E. Consent | Implemented and verified | Local browser + deterministic Basic Consent tests passed; actual Google network consent behaviour still external. |
| F. Events | Implemented and verified | Event contract and actual lifecycle instrumentation tested locally; delivery/receiving not externally verified. |
| G. Stripe | Implemented but not externally verified | Owner/mode/session/paid server verification and actual GBP totals; no live or sandbox payment initiated. |
| H. Deduplication | Implemented and verified | Immutable unique SQL claim, row lock and stable transaction IDs; retries/repeated claims covered. Real hosted contention and receiver observation remain unverified. At-most-once authority can undercount. |
| I. Attribution | Implemented but not externally verified | Consent-gated allowlist, private first touch and auth-safe ownership tested; external Ads-to-GA4 purchase attribution not verified. |
| J. Tests | Implemented and verified | Results above. Protected head CI reported separately on PR. |
| K. GA4 receiving | Not implemented | External verification deferred by owner; Realtime/DebugView proof is outstanding. Receiving capability code exists but account receiving is unverified. |
| L. Ads conversion setup | Not implemented | Manual import/Primary/Every/value/goal/account checks documented; no account mutations or campaigns activated. |
| M. Environment | Implemented and verified | Strict Production/test separation and default-off controls tested; required settings listed above, no live activation performed. |
| N. Manual setup | Not implemented | Follow ten-step activation checklist, privacy review, retention cadence and hosted migration checks before enabling. |
| O. Launch readiness | Blocked | External receiving/critical conversion proof and hosted release checks are required for launch; intentionally deferred to approval. |
| P. Next action | Not implemented | Review protected PR/CI, then approve a separate hosted release and isolated external verification stage. Keep campaigns paused. |

## Follow-up review — 22 October 2026 (PR126)

Owner now authorises a bounded Stripe Test Mode / existing-GA4 DebugView verification, without creating another property, provided it cannot affect Ads bidding or attributed conversions. This supersedes the earlier preference to defer external tests/use a separate test property. It does not authorise Production deployment or advertising.

Review corrections implemented:

- Preview can use a standalone GA4 test tag; an AW installation is no longer required, and Preview AW/combined installation is rejected. This remains a fallback capability, not a request to create a property. Production's one shared AW installation is unchanged.
- The verified paid return now mounts the measurement observer for sandbox payments as well as real ones. Server owner/mode/verified-state checks and SQL environment fences remain authoritative. Unpaid/uncertain screens still cannot claim purchase.
- Test config and every manual test event set debug_mode=true; Production omits the parameter. Google explicitly notes that debug_mode=false does not disable debug mode. [Official DebugView instructions](https://support.google.com/analytics/answer/7201382).

Live read-back: Vercel Production Branch is main; PR126 targets codex/phase-12-intelligence. vercel.json additionally disables automatic main deployments. No custom Production deployment action exists in the PR CI workflow. Merging this PR to its current base would create a Preview, not automatically publish Production, under these settings. No setting was changed.

Only this PR branch's Preview variables were prepared: verified existing sandbox Stripe key/product (£29 GBP, no charge), exact stable branch origin, test purchases enabled; Google measurement/rehearsal, paid fulfilment, commercial execution, controlled trial/proof and Zoho sending are explicitly off. Separate Preview/Production Supabase endpoints are configured. Existing deployments do not pick up environment changes until rebuilt. Production variables are untouched.

External blockers established:

- The selected Google browser account (owner account) displays the Analytics provisioning welcome rather than the SiteFit property. The connected read-only Analytics account inventory is empty. No filter/property configuration or receiving proof is accessible. Do not create a replacement property or switch to an unrelated Google account.
- Existing-property debug purchase is **not currently enabled**: the code/SQL intentionally reject the live GA4 destination for sandbox ecommerce. A narrowly reviewed, non-Production-only exception requires actual account proof first: Active Exclude Developer Traffic filter (not merely Testing), its effective operation, DebugView access, and Ads import/tag-linkage review. Google documents a possible 24–36-hour filter application window; do not send purchases before exclusion is effective. Debug mode alone is not an Ads isolation guarantee. [Developer filtering](https://support.google.com/analytics/answer/13296662).
- Initial zero-row schema probes returned PGRST205. This was resolved during follow-up: the exact additive migration was installed once on CLI-verified sitefit-dev through the authenticated Management API, with its migration-history row in the same transaction. Migration count changed from 96 to 97. Read-back confirmed both tables, RLS, one immutable-history trigger, no anonymous/authenticated claim permission and service-only claim execution. Zero dispatches were created. Database bytes: 381,867,699, below 450,000,000. Production is untouched. Real hosted multi-connection claim contention remains unverified.
- No Stripe checkout/payment, webhook replay or external Google event was initiated in this review. End-to-end purchase receiving and deduplication remain unverified.

Safe next action: open the existing SiteFit property with an authorised Editor account, verify its Active developer filter and Ads isolation, then prepare the narrowly gated shared-property debug path and run the bounded sandbox journey using the installed Development migration. Do not merge or deploy while these acceptance checks remain outstanding.

Follow-up validation: exact code commit 80f7521 passed npm run check (477 tests, zero failures, lint, strict types and build). Both GitHub push/PR CI checks and Vercel Preview passed on that code commit. The subsequent documentation-only receipt must also pass exact-head CI before any merge. No merge or Production deployment was performed.

The owner supplied Property 560168986 / account 412974950 with authuser=5. In the available browser session that account index is unavailable; both the supplied and canonical property URL return to provisioning under the default account. The connected Analytics tool also reports no connection. No property or developer filter was created or changed. The remaining blocker is access to this existing property and verification that its Developer Traffic filter/Ads setup excludes the proposed test activity, not a requirement to create another property.
