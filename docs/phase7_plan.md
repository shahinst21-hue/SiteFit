# Phase 7 plan — permanent accounts, Test Mode payment and entitlement

Prepared 2026-10-06 against clean `main`, commit `11bdbe1952bd13ac744437f10dbdbcca715766b1`, after protected PR #18. **Owner approved Steps 7.0–7.9 on 2026-10-06.** Implementation evidence is recorded in [phase-7-status.md](phase-7-status.md); approval does not mean completion. Phase 6 and its presentation refinement are complete and frozen.

## 1. Authority and objective

The owner's later authentication/purchase policy supersedes the first payment brief wherever it suggests anonymous Checkout, post-payment registration or Stripe-email recovery. Accepted product requirements:

- Free Snapshot remains available without signup through the existing anonymous Supabase session.
- Before Stripe Checkout creation, the purchaser must have a verified **permanent SiteFit account**, using Google or email.
- Authentication preserves the existing analysis, selected property, inputs, evidence and exact ready Snapshot. No duplicate analysis, provider retrieval, AI invocation, scoring or report rewrite.
- The permanent account owns the durable purchase entitlement and can recover its history after signing out or losing the original browser session.
- Full Location Due Diligence Report costs **£29 once**, includes future Economics access, and is not a subscription or separate Economics charge.
- Phase 7 establishes **Stripe Test Mode only**, Local and protected Preview only. Production purchasing and all live credentials/payment objects are prohibited.
- Payment does not generate or imply a ready Full Report. No Phase 8 collection, paid AI, financial calculation, PDF, report-ready email or later product functionality.

Objective: a permanent verified owner of an eligible stored Free Snapshot can safely initiate/reuse one intended £29 test Checkout; verified Stripe confirmation durably establishes the appropriate account/analysis entitlement, with safe retries, refunds/reversals and account recovery. The existing Snapshot and analytical lifecycle stay unchanged.

Product policy and the bounded implementation mechanisms, limits and Test Mode refund rules below are approved. They are not completion evidence or settled live commercial terms. The owner's sole amendment requires the verified permanent account email as frozen server-side Checkout contact when available; it cannot establish any authentication, ownership, claim, entitlement or recovery authority.

## 2. Inspected repository baseline

The documentation inventory includes every current document under `docs/`, historical phase plans/status records, provider policies, London manifest/runbook and Phase 6 design documents. Current implementation records supersede historical proposed descriptions. Relevant foundations: [Product Contract](product.md), [architecture](architecture.md), [database](database.md), [decisions](decisions.md), [roadmap](roadmap.md), [infrastructure](infrastructure.md), [testing](testing.md), [Phase 6 status](phase-6-status.md), [PR #18 UI contract/status](free-snapshot-ui-status.md). Earlier Phase 6 status examples of Economics without inputs are superseded by PR #18's transient input-outline preview; neither version calculates anything.

| Actual boundary | Finding and Phase 7 consequence |
| --- | --- |
| `app/api/analyses/generate/route.ts` | Same-origin explicit POST verifies `getUser()`, creates an anonymous session only when absent, and preserves signed-in identity. Do not place the purchase auth gate here. |
| `lib/analysis/generate.ts`, `lib/data/*`, `lib/analysis/*` | Owned frozen inputs, ONS/TfL/FSA outcomes, section interpretation and synthesis, resumable unfinished work, stored ready replay. Purchase code must not import execution paths. Current London-only evidence gaps and withheld scores remain. |
| `app/snapshots/[id]/page.tsx` | Dynamic private, noindex, owner-verified read of `read_sitefit_free(p_report)`, followed by runtime projection validation; route ID is **report ID**, not analysis ID. Resolve the analysis through the owned report on the server. |
| `lib/snapshot/model.ts` | Stored FreeProjection v2 → pure SnapshotView v1. Overall-score readiness is a presentation contract; real score remains unavailable. Payment is a separate access projection, never patched into frozen report JSON. |
| `components/free-snapshot.tsx`, `components/snapshot-finance-preview.tsx` | £29 primary action currently opens a disclosed non-paying outline. Transient finance inputs show an outline only. Phase 7 connects an eligible real report action to purchase/auth without redesigning factors, maps, scores or finance. Development fixture must never become purchasable. |
| `components/login-form.tsx`, `lib/auth/flow.ts`, `app/auth/*` | Supabase email magic link via `signInWithOtp`, same-browser PKCE exchange; explicit token-hash confirmation POST is an alternative probe path. No Google UI. Existing callback allowlist accepts only `/account` and `/check-location`. Ordinary email sign-in is **not** anonymous identity upgrade. |
| `lib/supabase/server.ts`, `proxy.ts` | Per-request SSR cookie clients and authoritative `getUser()` checks. Browser-readable Supabase cookies are not claimed HttpOnly. Proxy refresh matches Login/Account/Auth only; new private purchase/status routes need reviewed matcher coverage. |
| `app/account/page.tsx` | Verified account/guest status, profile and last 20 ready Free Snapshots via `list_sitefit_free()`, sign-out. Add a compact server-owned purchase/status/history view and bounded pagination, not a dashboard. |
| `lib/data/server-client.ts` | Existing server-only, short-lived privileged client using development `SUPABASE_SECRET_KEY`, no persisted service session. Can underpin narrow payment/claim repositories; cookie client stays separate. |
| Initial `payments` table | Already has analysis FK, provider, unique idempotency key, unique checkout/payment references, price reference, bigint minor amount, uppercase currency, constrained status, verification/timestamps. **No direct account column, entitlement writer, Stripe SDK, route or webhook exists.** Extend this table rather than create another payments table. |
| `system_events`, `lib/data/telemetry.ts` | Existing private operational events and allowlisted bounded summaries. Reuse the semantic event boundary; no marketing analytics dependency. |
| Database grants | Payment SELECT currently derives ownership from `analyses.owner_id`; ordinary clients have no payment writes. Raw report/evidence/source rows are private even to their owner; validated free RPC is the read boundary. |
| Historical guards | `sitefit_guard_analysis_context` freezes source owner/property/business once context exists. `sitefit_guard_free_analysis` rejects **every** update/delete once a free report is ready; child/report guards also block trusted writes and TRUNCATE. Changing ready owner/status to `paid` is incompatible. |
| Environment/delivery | Ignored `.env.local`, blank `.env.example`, server-only secrets; authenticated Vercel Preview, automatic main Production deployment disabled, protected `main` with required CI. No Stripe or Google configuration is asserted verified by this planning task. |
| Existing checks | Node 24/npm 11, locked install; `npm run check` includes lint/types/unit tests/build. Fresh PostgreSQL/PostGIS runs in `tests/database.test.ts`; public HTTP smoke and production demo-404 checks run in CI. PR #18 records 114 passing tests; this is baseline evidence, **not Phase 7 verification**. |

All eight applied migrations must remain untouched:

1. `20261003210000_initial_sitefit_schema.sql`: fifteen tables, initial payment fields/lifecycle enum, profiles/RLS.
2. `20261004120000_property_address_identity.sql`: canonical selected postal/manual identity.
3. `20261005110000_data_snapshot_integrity.sql`: frozen input context/owner, immutable source snapshots and collectability.
4. `20261005120000_london_spatial_releases.sql`: private versioned releases/PostGIS.
5. `20261005130000_bounded_boundary_normalisation.sql`: bounded geography ingestion correction.
6. `20261006110000_analysis_comparison_context.sql`: frozen comparator context.
7. `20261006120000_free_snapshot_persistence.sql`: owned submission/finalisation, validated reads/history, comprehensive ready freeze.
8. `20261006130000_bounded_comparison_provenance.sql`: bounded stored comparison provenance/resume.

## 3. Recommended proportional architecture

Use hosted Stripe Checkout, one server-only Stripe SDK adapter and small typed payment/auth-claim repositories and services. Pin the SDK and a compatible **stable** API/webhook version during implementation; record actual versions after checking official support. No browser Stripe SDK or publishable Stripe key is required for a hosted URL redirect.

Proposed application seams, introduced only when used:

- `lib/payments/config.ts`, `contracts.ts`, `stripe.ts`, `repository.ts`, `service.ts`, `webhook.ts`: configuration, runtime validation, hosted provider boundary, controlled SQL operations and pure state reduction.
- `lib/auth/purchase-flow.ts` and a narrow claim repository: guest upgrade, existing-account claim and trusted return intent. Extend existing Auth components/callbacks rather than create custom Auth.
- Server POST routes for purchase intent/Checkout and claim completion; a raw-body `POST /api/stripe/webhook`; private server purchase return/status pages and read-only status endpoint. Exact route names can follow existing conventions; no arbitrary return URL or provider proxy.
- Existing `read_sitefit_free`/`list_sitefit_free` and relevant owner policies recognise an authorised historical account claim. Existing frozen data remains the source of the Snapshot. Future report generation consumes entitlement separately, after its own approval.

Database recommendation: **extend existing `payments`; add `payment_events` and one narrowly scoped `guest_account_claims` table**. Derive durable entitlement from confirmed payment plus current access disposition; do not add a duplicate `entitlements` table. The claim table also holds the expiring pre-auth continuation, avoiding a second auth workflow table. These are necessary payment/identity integrity records, not generic jobs, leases, billing ledgers or distributed workflow infrastructure.

No subscription engine, Customer portal, accounting ledger, monetary reservation, scheduler, queue, distributed cache, lease tokens or exactly-once provider claims. Process-local throttles are only local bounds; database constraints and Stripe keys provide payment retry integrity. Reconsider broader infrastructure only after a measured implementation blocker/approved trigger.

## 4. Purchase eligibility and complete journey

1. Visitor completes the existing anonymous Free Snapshot and reads the stored result without signup.
2. Activating **Check the Full Case · £29** submits a same-origin, bounded purchase-intent request carrying only the report locator. Server verifies the current identity and reads the eligible owned report/analysis; client-supplied IDs are locators, never ownership proof.
3. Eligibility requires a genuine ready `tier=free`, schema-compatible stored report with frozen input lineage and an actual owned `free_ready` analysis; reject draft/failed/foreign/development-fixture targets. Unknown evidence does not invent a new eligibility score or force regeneration. One report product per analysis; no payable full report exists yet.
4. Already permanent verified owner: skip signup and call the server Checkout operation. Already entitled: show account payment state instead of charge again. Unresolved reversal/dispute: do not auto-create another charge.
5. Guest: establish a server-verified, expiring continuation before leaving the guest session. Show **Create your account to keep your report and access it later.** Actions: **Continue with Google**, **Continue with email**, **Already have an account? Sign in**, and unobtrusive return to Snapshot. Explain Test Mode adjacent to the purchase action in Local/Preview.
6. New identity links/upgrades the guest's underlying Supabase UUID where supported. Existing-account sign-in uses the validated claim procedure below. Neither path collects source data or edits historical content.
7. Successful linked Auth callback/verified email completion returns to a fixed purchase-resume page, rechecks permanent identity, continuation, ownership and eligibility, then automatically sends the same-origin Checkout POST. No mutating Checkout creation from callback GET, no second purchase CTA hunt. Callback errors/cancellation do not claim or pay.
8. Server creates/reuses the appropriate durable attempt and returns only the trusted hosted Stripe URL. Payment is `mode=payment`, quantity one, server-chosen Price. Stripe Checkout is the only payment-instrument UI.
9. Stripe returns to a fixed private success/cancel route containing only a non-secret purchase locator. Server checks logged-in account ownership again. Webhook confirmation establishes payment entitlement independently of whether the browser returns.
10. Account history shows original Free Snapshot, test payment/entitlement status and original dates. Reopening calls neither provider nor AI/scoring. Signing out and signing back into the permanent account restores access from server records.

Production keeps its non-paying outline; server rejects **all** purchase/auth-claim/payment mutation endpoints there even if test credentials are accidentally configured. Existing normal login remains usable; no production purchase gate is activated.

## 5. Supabase identity continuity, conflict handling and recovery

### 5.1 New account — preserve UUID

Supabase documents anonymous conversion by linking an identity, requiring manual identity linking to be enabled: `updateUser({ email })` for email and `linkIdentity({ provider: 'google' })` for OAuth. OAuth linking supports PKCE. Anonymous users also use the `authenticated` database role, so that role alone cannot satisfy purchase authentication. [Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous), [linkIdentity](https://supabase.com/docs/reference/javascript/auth-linkidentity).

Recommendation:

- **Google:** guest upgrade uses `linkIdentity`, not unconditional `signInWithOAuth` that may replace the guest UUID. Ordinary existing-account login uses Supabase Google OAuth. Verify the actual hosted manual-linking flag and successful same-UUID outcome before marking this step complete. Do not admin-force-link Google identities.
- **Email:** retain passwordless Auth. Guest uses `updateUser({ email })` followed by the platform's verified email-change link/OTP; returning account uses the existing magic-link/PKCE sign-in. Recommend same-page email-change OTP for guest upgrade if supported by the actual hosted template/configuration, avoiding default callback type mismatch. Otherwise implement only the reviewed `email_change` callback/confirmation path alongside existing `email` PKCE. A generic `signInWithOtp(shouldCreateUser: true)` is not the upgrade operation. Do not add password/reset complexity without a concrete platform blocker. [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).
- Re-fetch the user from Supabase after confirmation; verify it is non-anonymous with an actual supported confirmed identity. Email string, editable `user_metadata`, client anonymous flags or role claims alone are insufficient. Refresh cookies/claims after upgrade; database routines additionally validate the corresponding `auth.users` permanent state under controlled privileges.
- Same UUID means **zero ownership-row mutation**. Record the completed continuation/audit event with original guest and permanent IDs equal; all existing RLS/frozen lineage still applies.

Hosted template/settings support for email-change verification is an implementation proof gate, not an assumed fact. Preserve the default magic-link path and its tested single-use/same-browser PKCE behaviour. No SMTP purchase or provider change is silently authorised. Google configuration follows [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

### 5.2 Existing permanent account — narrow account claim

Supabase identity conflicts require application conflict handling; do not treat an email match as automatic authority to merge application records. [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

**Recommended solution: an immutable account claim/access relation, not updating frozen `analyses.owner_id`.** That field and frozen resolved context continue to identify the original owner at generation. The authenticated account becomes the current access/purchase principal through the relation. UI/payment APIs use that principal; historical provenance preserves the original UUID. This distinction must be explicit in types and documentation.

`guest_account_claims` proposed minimum fields:

| Field/group | Rule |
| --- | --- |
| ID, original guest UUID | Server-generated ID; unique original guest UUID; FK with restricted deletion. Source must be a genuinely verified anonymous account at preparation, with no prior completed transfer or payment. Never transfer a permanent account. |
| Intended analysis/report | FKs/same-analysis binding; server resolves an owned ready report. This is the return/purchase target, not proof supplied by the client. |
| Continuation proof | SHA-256 of a random ≥256-bit one-use capability, separate per-flow browser binding, requested auth method, initiation time and expiry. Never persist raw capability, Auth token, email OTP or PKCE verifier. |
| Target permanent UUID | Null until trusted completion; FK, then immutable. Same UUID allowed for an in-place upgrade. Different target must independently authenticate, with fresh identity proof from this initiated flow. |
| State/timestamps | Pending, completed or expired/cancelled; creation, expiration and completion timestamps; bounded safe audit reason/version. Completed claims cannot retarget or be deleted by application roles. |

Recommended pending lifetime one hour, matching current email link expiry; this is a technical limit subject to hosted proof, not a commercial access duration. Store the capability only in a dedicated HttpOnly, Secure on HTTPS, SameSite=Lax, path-scoped purchase cookie; Supabase's own session cookies retain their existing design. No capability in query strings, localStorage, logs, Stripe metadata or client HTML. A pending row grants **no access** to any other account.

Preparation verifies the guest session and selected owned Snapshot on the server **before** replacing Auth cookies. Successful completion requires both the unexpired original capability/browser binding and a freshly verified permanent identity from the matching Google/email flow. For email, bind the intended email verification to that flow without trusting a body-supplied target UUID. For Google, use platform OAuth/PKCE state, not application-supplied account IDs. Reject unrelated login callbacks, mismatched intent/method, missing/expired cookies and account substitution; validate allowed origins and return route. Capability theft/XSS is not solved by database UUID secrecy; preserve existing XSS controls and minimise capability exposure.

A service-only transaction locks the claim/source profile, revalidates original ownership/target identity and report binding, confirms there is no completed conflicting claim, then records the target and one audit event. Same claim/same target replay returns existing success; another target is rejected. Audit errors roll back the claim. Idempotency never bypasses current caller authorisation. Explicit claim completion is a same-origin POST; OAuth/email callback GET only establishes Auth and a fixed resume destination.

Claim scope is the **verified guest account's existing history**, including the intended ready Snapshot. It does not claim other guest/permanent accounts, merge properties, copy analyses or mutate content. A single source guest maps to one permanent target; no transitive alias chains. Target must be a permanent account. Preserve the old `auth.users`/profile record for historical restricted FKs; don't delete it or store its refresh token. Existing permanent histories coexist without deduplicating same-property analyses.

After different-UUID completion, the former guest's leftover sessions must **not** retain access or create new owned work. Effective ownership of its historical records is the target, not either account interchangeably. Apply this rule to read RPCs, account history, linked-property access and relevant owner RLS; deny consumed guest writes/generation at the Auth/ownership boundary. Do not change collection/scoring/finalisation engines or relax historical guards. Any service-role caller must explicitly enforce current access principal; service-role bypass is not ownership proof. Tests must cover direct old-guest database/RPC access, not only the web page.

New work by the permanent user has that user's normal owner UUID. Existing stored context retains the original guest UUID. Later Full Report execution must explicitly distinguish historical input owner from current access principal when using this relation; Phase 7 documents that integration contract but does not change collectors to run against a ready analysis.

### 5.3 Cancellation, multi-tab and browser loss

- Failed/cancelled authentication leaves the claim pending/cancelled and original guest ownership intact; do not pre-emptively sign out/delete the guest. Snapshot back navigation remains usable. Successful login but failed claim never creates Checkout: display a safe recovery/retry state, not another analysis.
- One active continuation per guest source; reuse a matching intent. A conflicting second tab must not silently replace the first analysis/method/capability; ask that tab to finish/cancel the active flow. Callback duplication returns the completed intended result only to its verified target. Missing PKCE verifier or consumed callback cannot claim again.
- Account selection is explicit in Google/email Auth. Detect unrelated permanent-session changes and reject/ask the user to restart, rather than silently purchasing under a different account.
- Losing the anonymous session **before** a trusted continuation/upgrade can still lose guest access; no email/address/analysis-ID recovery bypass. After completed upgrade/claim, ordinary later Google/email login reads durable account history independently of that capability or original cookies. Unfinished intent expiry does not delete a Snapshot.

## 6. Price, Stripe metadata, identity and environments

Use `STRIPE_FULL_REPORT_PRICE_ID`, not browser `price_data`, Payment Links or inline amounts scattered through routes. Retrieve the configured Price and associated product with the test key, validate active one-time fixed per-unit GBP amount **2900**, expected `full_location_due_diligence_report` product marker, no recurring/custom/adjustable amount, `livemode=false`. Fail closed on mismatch. This expected amount comes from central `lib/site-config.ts`, extended as needed with one minor-unit value/currency alongside the current display configuration; future approved price changes update that config and the environment Price mapping deliberately. Stripe's retrieved Price and verified Checkout totals are authoritative payment facts. Do not silently accept a different product merely because it costs £29. [Price object](https://docs.stripe.com/api/prices/object).

Session parameters: hosted Checkout, `mode=payment`, one line item/quantity one, card payment methods initially, no subscriptions, promotion codes, adjustable quantity, shipping, automatic tax, adaptive currency or after-expiration recovery links. Proposed Test Mode total is exactly £29; this is **not a VAT/tax/legal decision for launch**. Live tax treatment remains an owner launch gate.

Metadata: internal payment UUID (`purchase_id`), server-resolved `analysis_id`, `product_type`, contract version, duplicated onto PaymentIntent metadata for failure/reversal correlation. `client_reference_id` can be purchase UUID. **Do not send the anonymous or permanent Supabase UUID**: internal purchase→permanent owner mapping is sufficient. No exact address, inputs, evidence, capability or Auth credentials in Stripe metadata. Binding account/analysis comes from the immutable internal record; metadata alone cannot create or retarget ownership.

Owner-approved amendment: use the verified permanent SiteFit account email as server-side `customer_email` when available and freeze it in private immutable durable attempt parameters. Retries use that exact original value even if the account email later changes. This is contact/prefill only: Supabase permanent identity and internal account/analysis/purchase bindings establish all authority. Do not expose the frozen email in client projections, events, logs, raw errors or claim/recovery logic. Stripe may retain contact/payment information under its own settings. No marketing, report-ready mail or mandatory persistent Stripe Customer; retain contact only within the minimum necessary private attempt record.

| Variable/configuration | Planned use/scope |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-only test key in ignored `C:\Users\Shahin\Desktop\SiteFit\.env.local` and Vercel **Preview only**. Refuse live key configuration; validate returned objects' modes too. |
| `STRIPE_WEBHOOK_SECRET` | Server-only endpoint signing secret; local CLI listener and Preview endpoint have different secrets. Never use one as proof for the other. |
| `STRIPE_FULL_REPORT_PRICE_ID` | Server-only non-secret test Price locator; validate product/amount/currency/mode with Stripe. |
| `SITEFIT_TEST_PURCHASES_ENABLED` | Explicit opt-in, default false. Effective only Local development verification or `VERCEL_ENV=preview`; hard rejection in `VERCEL_ENV=production`. A locally built production server is allowed only for a clearly bounded localhost verification process. |
| Existing Supabase variables | Publishable client Auth values and separate server secret retain current boundaries; Google client secret lives in Supabase provider settings, not browser/source. |
| Trusted app origin | Existing reviewed site/Preview origin handling; bind fixed success/cancel/OAuth URLs to the actual deployment, never raw request Host/X-Forwarded headers or client `next`. Add a non-secret explicit purchase origin only if existing handling cannot provide that guarantee. |
| Preview automation bypass | Owner-managed Vercel automation secret only if the protected webhook ingress requires it; not a payment/provider secret or public browser configuration. See external gate below. |

No `STRIPE_MODE` is necessary: the implementation supports only test; an enable flag, environment guard, test credential check and `livemode=false` validation must all pass. Empty config builds safely and disables purchases; CI contains no real credentials. Production must fail closed even with a correct test key/enable flag or forged host/header. No configuration/account actions are performed by this plan.

## 7. Payment persistence and durable entitlement

### 7.1 Extend the existing payment record

Create new forward migrations; do not edit or repurpose applied migration history. Confirm actual existing rows privately before backfill/constraint changes. If legacy rows exist, isolate/migrate them explicitly; do not invent permanent owners or treat old `succeeded` as verified entitlement.

Proposed new/clarified fields:

- Immutable `owner_id` (permanent account FK), product type/version, test-mode flag, bound free `report_id`/`input_id` with same-analysis FKs, Stripe product/Price reference and fixed expected amount/currency at intent creation.
- Existing unique `idempotency_key`, `checkout_reference`, `payment_reference`; optional charge reference for reversals. One immutable attempt UUID, created/requested expiration timestamps and a validated parameter digest/contract version for identical provider retries.
- Session binding/expiration timestamps, payment confirmation timestamp (`verified_at`) and confirming event ID. Preserve original verified amount/price even when later config changes.
- Existing status refined by new constraint: `pending`, `succeeded`, `failed`, `expired`, `refunded`. Keep/migrate legacy `cancelled` explicitly; browser cancellation is not an authoritative payment state transition.
- Separate small access disposition `none`, `active`, `suspended`, `revoked`, with reason/time; bounded cumulative successful refund amount and dispute state/reference where relevant. `succeeded` remains a historical payment fact even if access is suspended. Do not erase original success or overwrite paid dates.

One active pending attempt per `(analysis_id, product_type, test_mode)` through a partial unique index. No overlapping replacement when a prior creation result is ambiguous. At most one non-revoked purchase for the same analysis/product; transactionally enforce grant uniqueness and reject already-entitled purchases. `owner_id` must match effective current owner at creation, and cannot change via webhook/return. Claim completion precedes any payment row; guest checkout/direct writes denied. Validate permanent status inside controlled SQL as well as server Auth.

Retried terminal unpaid attempts may create a new attempt only after prior Stripe outcome is proven unpaid/expired. A later independently generated analysis, even for the same property, is a new legitimate purchase scope. Never impose property-level purchase uniqueness.

### 7.2 Minimal event receipt, atomic access

`payment_events`: unique Stripe event ID, event type, provider object ID, payment/analysis reference when matched, test flag, provider event timestamp, receipt/processing timestamp, outcome/version and an allowlisted normalised summary. Private RLS, no ordinary client reads/writes. No raw payload, customer email, address, card details, signature, request headers or raw errors. Unmatched verified events can be acknowledged with a bounded reason; unknown sessions must not create arbitrary payments.

Signature verification and required Stripe retrieval happen before a short SQL transaction. Within it lock the payment, verify immutable binding, insert unique event receipt, apply the validated state/access change and semantic confirmation event atomically. Any failed transaction rolls back the receipt as well as entitlement so redelivery can retry. Matching event replay returns acknowledged success; different event IDs for the same object/state still produce one logical grant. Preserve reversal facts received before completion; late success cannot resurrect revoked access. Event timestamps are provenance, **not a last-write-wins ordering rule**.

No separate entitlement table: a durable server projection/RPC answers `full_report_entitled` from verified payment, fixed product/analysis/account and `access_disposition=active`. Confirmation and that access state are stored in the **same transaction**, so there is no paid-without-grant split. Ordinary clients cannot set either. The RPC exposes only safe purchase/status fields; revoke raw payment SELECT if its expanded columns exceed the customer boundary. Account recovery uses permanent owner plus claim-aware history, never Stripe email or cookies from the original guest.

Entitlement means the intended Full Report product has been purchased in **test mode**; it does not mean `reports.status=ready`, PDF available, main report delivered or economics calculated. A future production feature must explicitly reject test-mode entitlements. Refund/suspension affects paid access only: Free Snapshot/history/content are preserved.

## 8. Checkout retries and payment lifecycle

Reserve/read one durable pending attempt transactionally **before** Stripe creation. Stripe key derives from that server attempt UUID/contract; never accept a browser idempotency key as authority. Persist exact private create parameters including fixed URLs/Price/expiration and the verified account email when available so retries do not change them. Never omit or add parameters selectively on retry. Frozen email/contact parameters are private and must not enter client responses, operational events or arbitrary JSON logs.

No database transaction stays open across Stripe HTTP. Concurrent workers get the same pending row and submit the same provider idempotency key/parameters; a normal idempotency-in-use response is retryable, not a new attempt. A crash after Stripe creation but before DB binding retries that same key. A webhook arriving first can bind the known internal attempt using validated metadata and immutable parameters in the confirmation transaction.

Reuse only a verified same-owner/same-analysis/same-product **open, unpaid, unexpired** stored Checkout Session. Retrieve it server side on retry; the client never supplies a URL/session to reuse. Completed paid goes to entitlement state; completed but not paid remains verification-required. Stripe supports expiring an open Session; confirm expiration/unpaid state before replacing it. [Expire Checkout Session](https://docs.stripe.com/api/checkout/sessions/expire).

Recommend a one-hour Checkout lifetime. Stripe allows 30 minutes–24 hours. Before each create retry ensure the stored expiration is still in the allowed range; a late retry with less than 30 minutes remaining must reconcile rather than changing parameters or issuing a fresh key blindly. [Create Checkout Session](https://docs.stripe.com/api/checkout/sessions/create).

Stripe may prune idempotency keys after at least 24 hours; identical retries can also preserve the first error response. Therefore ambiguous attempts are **not** automatically replaced or resubmitted after the safe retry window. Reconcile existing session/event/object references with a development-only operator procedure; if absence cannot be established, block that dependent purchase with a safe status and document it. Do not claim indefinite exactly-once creation or add lease/job infrastructure. [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests).

| Trusted observation | Stored outcome / access |
| --- | --- |
| Internal attempt, no confirmed Stripe result | Pending / none; eligible for same-key bounded retry only. |
| Verified open unpaid Session | Pending / none; reuse if eligible. |
| Browser cancel/back | No payment-state mutation; local UX cancellation only. |
| Card attempt fails | None unlocked; record safe attempt failure event. Session may still accept another card, so do not terminate pending solely on `payment_intent.payment_failed`. |
| Verified terminal unsuccessful/no payable Session | Failed or expired / none; a new attempt only after reconciliation. |
| Valid paid Checkout with successful corresponding PaymentIntent, exact scope/amount | Succeeded + confirmation timestamp/event / active, unless already refunded/disputed. |
| Pending refund/dispute | Succeeded historical fact / suspended under proposed test policy. |
| Successful full refund or lost dispute | Refunded (where full refund applies) / revoked; preserve payment/history. |
| Failed/cancelled refund, or won dispute | Re-evaluate current Stripe facts; reactivate only if the verified purchase remains paid and no other reversal applies. |

Legacy `analyses.status` includes `awaiting_payment`/`paid`, but **do not use or remove them in Phase 7**. Ready analyses remain `free_ready`; `reports`, projection, dates and input/evidence hashes stay identical. Separate payment/access state resolves the old diagram's conflict. Later full generation needs a new approved lifecycle/lineage design, not an unfreeze here.

## 9. Webhook, security and ordering

Endpoint uses Node runtime, bounded **raw** request bytes and Stripe's SDK signature verification with the endpoint secret and normal timestamp tolerance. No JSON parsing/middleware transformation before verification, no disabled tolerance. Reject missing/invalid signatures, wrong mode/account/context and malformed bodies without logging payloads. This endpoint is exempt from browser CSRF checks because Stripe authenticates the raw payload; browser purchase/claim POSTs are not. [Stripe webhook guidance](https://docs.stripe.com/webhooks).

Recommended initial event allowlist, card-only Checkout:

| Event | Necessary action |
| --- | --- |
| `checkout.session.completed` | Retrieve Session/line items/PaymentIntent/current relevant reversal facts; validate paid status, exact test product, quantity, GBP amount, internal binding. Atomic confirmation/access. Never grant on `complete` with unpaid payment status. |
| `checkout.session.expired` | Verified unpaid expiration; no grant. Cannot downgrade already confirmed success. |
| `payment_intent.payment_failed` | Safe matched attempt telemetry/status detail; no grant and no premature Session termination. |
| `refund.created`, `refund.updated`, `refund.failed` | Retrieve matched charge/refund state; handle pending, succeeded, failed and partial/full refund dispositions. Refund creation alone is not successful full refund. |
| `charge.dispute.created`, `charge.dispute.closed` | Suspend/revoke/re-evaluate only the matched intended purchase; no ownership/content changes. |

No subscriptions, invoices or customer lifecycle events. No asynchronous payment methods: `checkout.session.async_payment_succeeded/failed` are unnecessary initially; explicitly enable/test them before ever admitting delayed methods. A simple card decline is retryable within Checkout; a `payment_failed` event never becomes entitlement. Official [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment) explains paid-status validation and delayed-method differences; [refund guidance](https://docs.stripe.com/refunds) and [refund object](https://docs.stripe.com/api/refunds/object) distinguish refund status.

Match events through existing payment/session/PaymentIntent references or server-created metadata **plus** exact immutable internal binding. Verify test mode on event and retrieved objects; reject mismatching price/product/amount/currency/quantity/analysis/payment mapping. No event may create a new analysis, change account, enqueue collection, generate reports or invoke AI. Do not use Stripe event `created` as total ordering: delivery may be duplicated/reordered. Retrieve current relevant provider objects, lock the payment and preserve known reversal dominance; concurrent stale success cannot clear a newer refund/suspension.

Acknowledgement: return 2xx only after durable transaction or a deliberate safe ignored/duplicate result. Transient provider/DB errors return retryable non-2xx; failed processing must not leave an event marked completed. Small bounded synchronous verification is sufficient initially; no queue. Document controlled manual re-delivery/reconciliation for webhook outages and unknown creations.

Other mandatory boundaries:

- `getUser()` for current identity, supported confirmed permanent identity and explicit effective ownership; fresh checks before Checkout, claims, return/status and account reads.
- Fixed trusted deployment origin and allowlisted callback/resume paths; never arbitrary `next`, Host-controlled redirects or external return URL. Extend current two-destination allowlist narrowly, using opaque continuation lookup rather than an address or capability URL.
- Same-origin/Origin/Fetch Metadata validation and body limits for purchase/claim POSTs; do not reuse a helper trusting arbitrary forwarded host without reviewing trusted proxy configuration. Next Server Actions retain same-origin protections if used.
- New sensitive pages/API responses are dynamic, private/no-store, no-referrer, noindex and excluded from sitemap; no shared user cache. Proxy refresh coverage reviewed; clients remain per request.
- Service-only writes and explicit owner checks in privileged repository/RPC calls. Client/public roles cannot mutate payment, event, claim or entitlement states. SECURITY DEFINER functions have fixed empty search path, narrow grants and explicit identity checks; no public arbitrary target UUID writer.
- Validate provider redirect origin against the SDK's hosted Checkout URL contract; never log or store reusable Checkout URL as an analytics field. No session ID/capability/PII in public analytics.
- Scan actual configured secret values privately in tracked/untracked files, emitted JS, HTML, safe runtime logs and browser requests; report counts/outcomes only. Stripe secret/webhook and Supabase privileged values cannot appear in browser. Hosted Checkout's own payment network traffic is distinct from SiteFit's client payloads.

## 10. Success/cancel, history and minimal events

Success route checks owned purchase status from SiteFit DB. While webhook is pending show **Payment confirmation is being verified**, bounded read-only polling (recommended 2-second interval, maximum 30 seconds, stop on hidden/unmounted page/terminal state), then a refresh/account link rather than an endless spinner. Polling cannot confirm payment, claim ownership or invoke generation. An authenticated explicit operator reconciliation is separate from browser return. Forged success query values never unlock; foreign locators return protected generic not-found/access denied.

After trusted confirmation, Local/Preview may show **Test payment confirmed. Full Report generation is not enabled in this development phase.** Clearly separate purchased test entitlement from nonexistent report/PDF readiness. No such development message/checkout is introduced to public Production.

Cancel: **Your Free Snapshot is still saved. You can return to it or try Checkout again.** Reuse the verified still-valid Session where safe; no pressure/countdown, lost evidence or cancellation charge. A cancelled return racing an already-paid webhook shows trusted confirmed state, not “unpaid”.

Account extends existing history with business type/original generation date, Free Snapshot link, test payment/access state and clear full-report-not-generated state. Use bounded server pagination so histories beyond 20 remain recoverable; no arbitrary raw source/Stripe objects. Future PDF/Economics/report history remain documented product entries, with no active download/run controls until implemented. Sign-out/new browser sign-in restores access through permanent identity and claim/payment records. Expiration/refund does not remove free historical results.

Minimal `system_events`: `purchase_auth_started`, `purchase_account_linked`, `checkout_started` (Session bound), `checkout_redirected` (optional UI intent, not proof of navigation), `checkout_cancelled` (optional non-authoritative UI observation), `payment_confirmed`, `payment_attempt_failed`, `payment_expired`, `payment_access_changed`. Confirmation emits once in the trusted transaction; safe telemetry failure must not create a second payment or weaken confirmation integrity. Existing relational IDs may link private operational rows; `safe_metadata` contains only bounded product/test/flow/outcome/version codes, no addresses, account email, full Stripe objects, reusable URL, capability, card data, secrets or raw errors. `payment_events` is the authoritative provider receipt; optional client telemetry never unlocks anything.

## 11. Proposed refund/access policy and privacy

Phase 7 implements **test** refund/reversal handling, not refund issuance UI, dispute evidence submission or a finance system. Recommend: full successful refund/lost dispute revokes test entitlement; pending refund/open dispute suspends it; partial successful refund suspends pending explicit owner disposition; failed refund/won dispute restores only when current verified facts justify access. Do not silently keep a fully refunded purchase entitled. Re-purchase while suspended/disputed is blocked; after confirmed full refund, a fresh approved retry may be allowed with a new attempt rather than altering the original success.

This conservative partial-refund rule, no automatic entitlement expiry in Test Mode, and restoration rule are proposed defaults for plan approval. Live refund rights, partial-refund policy, tax/VAT, access duration, record retention/deletion and launch terms remain **owner decisions before live activation**. No legal compliance claim or fixed statutory retention period is invented. Store minimum payment/audit/claim provenance while needed for recovery and required audits; clear expired pending capabilities/browser cookies through explicit bounded maintenance/retention policy, not a new scheduler. Retain completed claim identity lineage while its historical records depend on it; preserve RLS during cleanup.

## 12. Required verification matrix

All below are **future gates**. Mocks, baseline Phase 6 checks or a successful deployment cannot replace hosted Auth/Stripe proofs.

| Suite | Required cases/evidence |
| --- | --- |
| Unit/service/contract tests | Central price/product/version configuration; permanent identity admission; report→analysis binding; all lifecycle/refund/dispute transitions; stale/reordered state reduction; exact create-parameter stability; bounded response/logging/error behaviour. New `tests/payment-*.test.ts` and `tests/purchase-auth.test.ts` use existing Node runner and injected Stripe/repository seams. |
| Anonymous/returning Auth | No-signup free generation/read; guest direct Checkout denied; gate appears only when needed; Google/email permanent owners proceed; new-identity same UUID upgrade; existing-account conflict and safe claim; returning account skips signup. |
| Claim adversarial | Foreign guest/analysis, permanent source, forged target/email/metadata, missing/expired/stolen-cross-flow cookie, invalid PKCE/state, unrelated callback, duplicate callback, same/different target races, two tabs/different intents, failed/cancelled auth, consumed guest direct reads/writes, claimed account lost cookies and later sign-in; no silent source deletion or duplicate analysis. |
| Historical invariance | Hash/count exact analysis, selected-property resolved context, inputs, snapshots, evidence, projection, report/sections and timestamps before/after upgrade/claim/payment/refund/read. Source owner unchanged for different-UUID claim; access relation alone changes. Provider/AI/scoring/generation spies all **zero**. Ready guards/TRUNCATE remain enforced even to service role. |
| Checkout abuse/concurrency | Other owner/analysis/product/price/currency/body tampering; unknown IDs, fixtures, draft/failed reports, guest claim pending; double click/two workers/multi-tab produce one active attempt/session; crash before/after Stripe response/before binding; webhook before binding; idempotency conflict/cached error/late retry/24h ambiguity; unexpired reuse, paid already-entitled, proven expired replacement, new analysis legitimate purchase. |
| Webhook | Official raw-body signature acceptance; missing/invalid/stale/wrong-secret signature rejection; altered/oversized body; live event/object rejected; wrong scope/Price/quantity/money; duplicate event and distinct same-object events; out-of-order expire/failure/success/refund/dispute; DB rollback and redelivery; unknown event/session safe ignore; no duplicate grants/events. |
| Return/status | Forged success URL/query/client state never unlock; wrong-account/session access denied; webhook delayed/lost browser return; finite read-only polling; cancellation preserves original Snapshot; cancel racing success respects DB; browser refresh/network failure/sign-out recover without generation. |
| Database/RLS | Extend `tests/database.test.ts` fresh migration execution with `supabase/tests/payments.sql` and claim SQL suite. Model actual permanent/anonymous platform fields/claims accurately in isolated tests. Test all grants, direct Data API/RPC attempts, account claim joins, payment/event writes, source/target/third-account isolation, unique races, amount and same-analysis FKs, stored entitlement, refund revocation. Repeat actual SQL/security suite on hosted **development** separately. |
| Secrets/privacy | Actual JS/HTML/request/log scans; no secret/capability/address/email/raw Stripe payload leakage, no marketing; database raw derived content stays private; return locators non-authoritative, credentials ignored, .env.example blank. |
| Environment | No credentials → safe build/no purchase. Test-enabled Local/Preview works. Production always rejects purchase/webhook/claim writes, including test keys/forged host/enable flags. Live key, Price, Session, Intent or event blocked. Existing demo production404 and public/Auth/SEO regression remain. |
| Real Auth | Actual new Google link and returning Google account, new email verification and existing email sign-in, exact UUID/history continuity or authorised claim, account refresh/sign-out/later new-session recovery. Real delivery/callback required; admin-generated tokens do not prove inbox/Google flow. |
| Real Stripe | Official Test Mode successful card, 3DS/challenge if applicable, decline, cancellation and verified expiration; real objects→real signature/webhook→one durable confirmed payment/active entitlement; no Full Report. Refund lifecycle/dispute tests as supported by official test tooling; induced duplicates/replay/out-of-order events are separate explicit security proofs. Use [official test methods](https://docs.stripe.com/testing), never real card details. |
| Responsive/accessibility | Existing design retained; purchase gate/Google/email/status/history/CTA at 360/375/390/430/768/1440, keyboard focus/errors/back, short height, screen-reader status and real 200% zoom. Earlier human Phase 6 zoom does not certify new Auth/payment surfaces or PR #18 layout. |
| Regression/delivery | Node 24/npm 11, `npm ci`, `npm run check`, `npm run check:database`; running production build + `npm run check:public` and `node scripts/check-snapshot-ui.ts <local-origin> production`; development hosted Auth/security checks with scoped disposable fixtures, zero unapproved paid AI/provider calls; real protected Preview, exact-head required CI/protected PR merge/post-merge CI, clean matching main/origin. |

Future live scripts must be development-only, explicit opt-in, bounded and redacted, use disposable accounts/test data and no CI secrets. Cleanup must not disable ready freeze globally or delete real history. For immutable proof records, retain only labelled synthetic test lineage when scoped cleanup cannot safely remove it. Do not rerun generation just to get a payment fixture: use existing owned ready history or an approved test fixture writer that cannot enter Production.

## 13. External owner actions — after implementation approval

No secret is needed to finish this plan. Do not ask the owner to paste any credential; request non-secret confirmation only when its dependent implementation proof is ready.

1. **Stripe:** access/create the intended development Stripe account/test environment; create one test Product marked for Full Location Due Diligence Report and an active one-time GBP £29 Price. Securely save the test secret key and Price ID locally and Preview only. Do not enable Live Mode, real-money testing or Production variables. Business verification/onboarding only if Stripe actually requires it for these test operations; no speculative launch blocker.
2. **Local webhook:** authorised Stripe CLI login/listen for the minimal events to the running local handler; store that listener signing secret privately in local env. CLI simulated trigger alone does not replace a genuine Checkout payment linked to a SiteFit attempt.
3. **Preview webhook:** deploy the implementation to a stable protected branch alias first. Configure a test event destination for the real `/api/stripe/webhook` and chosen stable API version, store its distinct signing secret as Preview only, redeploy. Endpoint URL is not fabricated in this plan.
4. **Protected ingress decision:** Vercel protection also intercepts Stripe server POSTs. Its documented automation bypass for third-party webhooks uses a secret URL query when custom headers cannot be set. This is a project-wide capability and can enter infrastructure request URLs; it is **not** a path-only exception or ordinary Stripe webhook secret. Owner must approve secure dashboard-only configuration and verify URL/query redaction in actual Vercel/Stripe/access logs; never place that URL/token in code, docs, analytics, chat or client flows. Keep other Preview protection enabled; rotate/redeploy/remove the temporary bypass after verification. If available controls cannot prevent unsafe token logging, this is a genuine **Preview webhook proof blocker**; evaluate an approved protected ingress alternative, not silently disabling protection or buying an add-on. No bypass is configured by this plan. [Vercel automation bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
5. **Supabase linking:** securely enable/review manual identity linking in the existing hosted development project while preserving anonymous sign-in, RLS, confirmed email and current defaults. Verify guest email-change template/OTP path and email delivery limits. No bulk admin merge or account deletion.
6. **Google:** owner creates/selects a Google OAuth client/consent configuration, configures the Supabase development Google provider with its client credentials securely, authorises the exact Supabase callback and required Local/stable Preview return URLs/test accounts. No Google secret in SiteFit JS/env.example. No wildcard redirect, Production OAuth/purchase setup or paid service enabled.
7. **Auth return URLs:** add exact actual Local/Preview callback/resume settings after deployment exists; review declared remote diff. Resolve any same-browser provider/template constraint with the smallest supported Supabase flow.
8. **Human/browser proofs:** actual email inbox/verification, Google consent/account selection, Stripe official test payments, sign-out/later sign-in recovery and actual 200% zoom. Supply only confirmation/results; owner may complete actions that automation cannot safely do.

Configuration/access dependencies block only their dependent tests. Schema, runtime validation, mocked service/RLS/adversarial tests, disabled-config build and regression work continue independently after approval. No fixed recurring service or commercial integration purchase is proposed.

## 14. Implementation sequence and per-step gates

Execute one defined step at a time **only after explicit plan approval**. Create `docs/phase-7-status.md` during Step 7.0, record actual checks/remaining gates after each step, label real deviations before proceeding. Applicable code steps run targeted tests plus lint/strict types; route/UI/config changes also run production build. No step quietly weakens a gate to avoid an external dependency.

| Step | Scope | Exit checks |
| --- | --- | --- |
| **7.0 — Baseline/accepted policy** | Confirm clean actual head/applied schema/rows/settings names without secrets; freeze Phase 6 hash/read invariants; record approved plan/Test Mode boundary and pending owner gates. Settle proposed test refund/claim mechanisms under plan approval. | Docs/link/scope audit; baseline regression evidence; no code/external config yet. |
| **7.1 — Account continuity/access schema** | New migration for narrow guest continuation/completed access relation, trusted identity/claim operations, current-owner RLS/read/history adaptation. Existing-owner in-place path and consumed-guest denial. No frozen-row edits. | Fresh + hosted SQL when available; original/direct/claimed/third-owner RLS, source-owner freeze, claim races/no transitive transfer; targeted tests/lint/types/build. |
| **7.2 — Google/email purchase Auth** | Lightweight gate; Supabase link/verified email-change flow, existing-account sign-in/conflict claim, fixed callback/resume, proxy/private headers; preserve generic login and no-signup free generation. | Auth/claim unit/adversarial tests; actual hosted Google/email/UUID/recovery when configured; cancellation/multi-tab/PKCE/zero execution. External gates remain explicitly pending. |
| **7.3 — Payment persistence/configuration** | Extend existing payments, add minimal event receipts, unique constraints/atomic access reducer/read projection; blank env template and server-only test/Production guards; no checkout generation yet. | Fresh SQL/permanent requirement/FKs/constraints/grants/refund transitions, type regeneration, missing/live/Production configuration tests, lint/types/build. |
| **7.4 — Stripe adapter/Checkout** | Pinned official SDK, Price/product validation, exact durable attempt params, scoped metadata, same-key retry/reuse, trusted redirect and eligibility. | Mock provider/tampering/crash/concurrency/late ambiguity tests; real test Price/Session proof when configured; no generation imports. |
| **7.5 — Verified webhook/access** | Raw signature endpoint, minimal event allowlist, bounded Stripe reads and atomic receipt/payment/access/events; reorder/refund/dispute handling and safe reconciliation runbook. | Signature/replay/rollback/out-of-order/reversal/first-event-binding SQL and service tests; real local webhook and test objects; no reports/provider calls. |
| **7.6 — Purchase return and Account** | Wire real ready Snapshot CTA in Local/Preview; automatic same-origin resume, bounded read-only status polling, success/cancel, minimal paginated account entitlement/history. Production outline unchanged; finance preview unchanged. | Actual HTTP/privacy, all UI states/keyboard/responsive/200% checks; owner sign-out/new browser login recovery, claimed original content unchanged. |
| **7.7 — Protected Preview proof** | Configure authorised test-only variables/Google callbacks/webhook ingress; deploy stable Preview; actual new/existing Google/email + success/decline/cancel/expiry/refund/duplicate events and account recovery. | Record actual endpoint delivery, modes, object/row counts, one entitlement, correct owner and zero Phase 8/AI/scoring/report execution; secret/log scans. No real-money transactions. |
| **7.8 — Complete regression/security** | Full required checks; hosted migration/RLS/Auth, immutability hashes, client/log secrets, concurrency/reversal, disabled Production and no later-phase execution. Resolve actual defects only. | Every DoD item below proven with distinct evidence; baseline public/Blog/SEO/demo/security passes; unresolved genuine gates prevent completion. |
| **7.9 — Protected delivery and stop** | Final status/decision/schema/infrastructure/testing records, exact-head CI, ready PR after gates, protected merge/post-merge CI, main matches origin and clean tree. | Return complete evidence/limitations/deviations checklist and `PHASE 7 COMPLETE` only if every required gate passes; otherwise genuine blocker record. Do not start Phase 8. |

Proposed forward migrations are an account-continuity/access migration and a payment-integrity migration, with actual new unique timestamps chosen at implementation. **None is created or applied by this plan.** Separate concerns for review; do not edit eight applied files or create speculative full-report schema. Consolidate only if atomic dependencies make it simpler without losing test coverage.

## 15. Definition of Done — all pending, none waived

- [ ] Free Snapshot generation/read/replay still works without registration; analytical/UI/evidence contracts remain frozen.
- [ ] Permanent verified Google and email accounts are supported; anonymous/direct Checkout is rejected on server and controlled SQL paths.
- [ ] New-identity guest upgrade preserves UUID where supported; existing-account conflict uses an authorised idempotent auditable claim without ready-row mutation.
- [ ] Original property/input/source/evidence/interpretation/metric/report hashes/dates are unchanged; zero regeneration/provider/AI/scoring during Auth, payment and reads.
- [ ] Foreign accounts, unrelated callbacks, expired proof, duplicate/different-target/multi-tab races cannot claim or see another user's data; consumed guest access is denied.
- [ ] Successful Auth returns directly to the intended purchase flow; cancellation/failure leaves unpaid Snapshot safe; no duplicate analysis.
- [ ] Correct permanent owner can create/reuse a one-off £29 GBP **Test Mode** Checkout; server resolves report→analysis and validates eligibility/product/Price/quantity.
- [ ] Retries/double clicks/multi-worker/tab/crash scenarios maintain one active intended attempt/session, with documented finite Stripe idempotency limitations and safe unresolved-state handling.
- [ ] Raw webhook signature, mode and full purchase binding are verified; duplicate/out-of-order/early-binding events are transactionally safe.
- [ ] Confirmation and durable account/analysis entitlement are atomic and unique; success redirect/query/client state/Stripe email grant nothing.
- [ ] Failure/cancel/expiration grant nothing; late cancel/failure cannot overwrite confirmed payment; refund/dispute states revoke/suspend/restore only under approved explicit rules.
- [ ] Original analyses remain `free_ready`; payment state/access remains separate; no dummy full report row or ready marker is created.
- [ ] Permanent user sign-out/session loss/new browser sign-in restores paginated original history and correct paid test entitlement; third-account isolation passes.
- [ ] Return polling is bounded/read-only; payment confirmed is distinct from report generated/PDF available; Account remains minimal.
- [ ] Real official Stripe successful and declined/cancelled/expired Checkout proofs pass locally and in configured protected Preview; webhook receives actual valid events and exactly one logical grant.
- [ ] Real hosted Google/email new/existing identity and claim/recovery proofs pass; actual email delivery/PKCE remains distinct from synthetic probes.
- [ ] Fresh real PostgreSQL/PostGIS and hosted development SQL/RLS/Auth/security suites pass, including trusted-write freeze and direct RPC/grant tests.
- [ ] Node 24/npm 11 locked install, complete lint/types/tests/build, actual public HTTP/SEO/404/demo-denial and responsive/keyboard/real 200% zoom gates pass.
- [ ] Secrets/capabilities/payment instrument/PII/raw payloads are absent from SiteFit client JS/HTML/requests and unsafe logs/docs/source; ingress bypass handling is explicitly approved and verified securely.
- [ ] Config missing/live/Production fail closed; only Local/Preview test mode works; Production settings/purchasing and deployment activation remain unchanged.
- [ ] No Phase 8 source, paid AI, financial engine, Full Report generation, PDF/report email, subscription, marketing integration or deferred generic/distributed hardening has started.
- [ ] Actual migration/version/check/Stripe-object and count evidence, unresolved limitations and deviations are recorded in Phase 7 status without secrets.
- [ ] Required exact-head CI/protected PR merge/post-merge CI pass; final main equals origin and working tree is clean; stop before Phase 8.

## 16. Risks, open decisions and readiness recommendation

| Topic | Treatment / decision timing |
| --- | --- |
| Immutable source owner versus current account | Approve narrow access-claim relation as the proposed mechanism; preserve freeze and original lineage. Existing-context owner checks must not be naively replaced globally. Later execution integration explicitly deferred. |
| Hosted Supabase identity-link/email-change behaviour | Verify actual flags/template and new/existing Google/email flows before claiming completion. Retain magic-link login; avoid custom Auth/passwords/admin merges. |
| Protected Preview webhook reachability | Real external ingress/redaction/owner approval gate; no automatic protection disablement or invented path exception. Local success does not satisfy Preview delivery. |
| Payment/DB network ambiguity | Unique attempt + stable Stripe key + explicit bounded reconciliation, not indefinite exactly-once claims or blanket retry with fresh keys. |
| Refund/dispute policy | Proposed conservative **test** defaults need plan approval; live partial-refund/access duration/terms need separate launch decision. No automatic real refund issuance. |
| Tax and price revisions | Exact £29 test total; live VAT/tax treatment and future price changes require owner approval and coherent central config/Stripe mapping. |
| Account/record retention | Minimal provider/contact data; preserve necessary claim/payment provenance; legal retention/deletion policy before launch, no invented indefinite raw payload retention. |
| Full Report promise | Test entitlement deliberately does not deliver anything yet. Live billing remains blocked until the actual pipeline, delivery, legal/support and launch gates pass under separate authority. |
| Commercial/provider cost | No real charges, paid AI, new data source or fixed recurring service. Stripe live processing/tax/mail-service costs are not approved here; check them at the later relevant gate. |

**Recommendation: ready for explicit approval of the bounded Phase 7 implementation plan**, subject to approval of the proposed account-claim mechanism and test reversal rules. It is not yet externally configured or verified. Independent implementation can proceed after approval while genuine credential/provider/ingress-dependent proof waits for the owner's secure actions. Missing Stripe/Google setup is not a blocker to this completed planning task, but cannot be waived from the implementation DoD.

Owner implementation approval is now recorded; follow Steps 7.0–7.9 and track actual evidence in phase-7-status.md. The plan itself does not prove code, migrations, configuration or integrations complete. Stop after Phase 7 and never start Phase 8 without separate explicit approval.
