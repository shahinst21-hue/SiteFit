# Phase17 — Commercial implementation; activation outstanding

14 October D107/D108: DNS and real HTTPS/Google authentication pass after the owner-authorised **non-commercial** fresh Production build of protected PR50 merge `4b53c93`. Existing Development owner session/history remain accessible; Production has two confirmed Google accounts and zero reports/payments. All14 existing permitted London releases are Ready at365,278,899 bytes with exact matching source metadata and read-only security/capacity/SDK checks. [Actual receipts](phase17-dns-auth-london.md). Sales, AI, new source collection, scheduler, indexing/measurement/campaigns stay off; no main merge, paid request, purchase or commercial activation. Phase17 commercial launch remains open.

Owner authorised implementation on 13 October 2026. Baseline: gated development `d7e5a2bf4e177f3ae026f98f5a40784164b343bb`, after accepted Phase16 PR46. Phase15 remains Owner-Accepted / Closed with Exceptions; Phase16 remains accepted. No main merge, Production activation, purchases, advertising, paid AI/source requests or real payment/refund is authorised by implementation approval.

## Implemented preparation

- Immutable draft release authority and exact custom Production-origin checks. Environment switches alone cannot activate Checkout, execution, source collection, indexing or optional measurement.
- Live v2 Stripe bindings preserve £29/GBP, verified merchant account, mode-specific keys, price/product/session/intent, versioned consent, signed event API version and atomic reversals. Test v1 and history remain separate. Sales pause retains existing-owner reads, cancellation requests and trusted webhook reconciliation.
- Forward database controls default to Test/disabled. A database with v1/v2 payments cannot change modes. Production requires an isolated database, not flipping Development or copying Test customer/payments.
- Before Checkout, an atomic commercial hold reserves US$0.30 and 2 MB per attempt against an explicitly approved total and 450,000,000-byte checkpoint. Duplicate preparation reuses the hold; exhausted capacity/budget rejects before Checkout. Unpaid/unknown holds remain conservative. Development's US$2.44 reservations are unchanged.
- Commercial report start binds one reserved edition to an exclusive current paid/supply-authorised lease. Maximum three dispatches; durable intents, no paid retry and intervention after expiry/ambiguity. Frozen V1 generation, Ready and PDFs remain unchanged. Non-Ready Production reports expose no dashboard or rental-only customer publication.
- Existing database scheduler can target only the approved Production origin in Live mode. Runner requests 300 seconds; existing lease/tick spacing is five minutes. Neither scheduler nor execution is enabled. Actual selected hosting duration, pg_net behaviour and scheduler operation require operational verification.
- Explicit Live aggregate export uses authoritative v2 receipts, Ready and reversal outcomes. Test labels stay unchanged. Existing opt-in attribution and campaign briefs are reused; no analytics dashboard or new collector.

The US$0.30 hold is the existing request-policy allowance, not billed usage or spending approval. Paid-proof preflight and current model tariff require confirmation before dispatch. Free Snapshot/address/provider traffic needs its own commercial allowance; a Full Report hold does not fund it.

## Verification and delivery

Locked npm installation passed with zero reported vulnerabilities. Final complete check passed 344 tests, lint/types and build (`phase17-delivery-check.log`), including actual Live/Test purchase rendering, merchant-account, reservation binding, fourth-dispatch rejection, exclusive/expired leases, payment/reversal/consent/private grants, historical replay/PDF and isolated restore regressions. The earlier new fixture's combined volatile claim/state expression was split into sequential assertions so PostgreSQL checks the state after the claim. No recovery rule was weakened.

Purchase recovery, account history and confirmation UI now use the trusted payment mode, rather than assuming Test. Sales-paused accounts retain payment progress; a Live purchaser is not redirected into another Checkout by the legacy Test-only projection selector. The actual rendered Live status contains the Ready report link and contract download with no Test claims; separate Test fixtures retain their label. A final button-only wording change was checked by the actual checkout-render suite. No dashboard redesign.

Actual built HTTP on port3017 passed 13 public pages/articles and 13 private paths, metadata/JSON-LD/sitemap/robots/404/address guards, plus campaign same-origin/consent/withdrawal/default-disabled checks. No generation/payment/source/AI invoked.

Local browser verified desktop pricing, £29 positioning, mobile390px no horizontal overflow, keyboard menu Enter/Escape with focus restored. Protected Phase17 Preview pricing rendered with the existing legal/product wording; no checkout/generation invoked or new Auth callback approved. This is not a new owned Preview Live purchase proof or hardware/200% acceptance. Phase13 acceptance is not reopened.

Private-value scan checked 10 configured privileged values against 647 repository/client-bundle files: zero matches. Exact implementation head `7d85b5b3210f416bd80a8ca1ed6fdeaf59f4466f` passed both GitHub CI runs 38438884041 / 38439119678. Vercel Git deployment succeeded; actual protected branch Preview is https://sitefit-git-codex-phase-17-launch-shahinst21-hues-projects.vercel.app. PR47 targets only `codex/phase-12-intelligence`. Final documentation-head CI/protected merge is tracked on the PR; no main/Production deployment.

Hosted Development: pre-write 376,952,499 bytes; four forward migrations 20261013140000/141000/142000/143000 applied and recorded, then 377,083,571 bytes. Ready digest remains `a58fd24de5b7dc735daea8e3ce06914e`; held micros remain 2,440,000. Commercial mode is Test, checkout/execution false. No source/AI/payment call or historical rewrite. This is hosted schema/default verification, not a Live purchase/runner proof.

New SQL is exercised in isolated PostgreSQL using synthetic data and rollback, without paid/network calls. This is not a genuine Stripe Live proof. Hosted application/capacity/history checks must be recorded separately. No historical report rewritten, trigger disabled or unknown reservation released. Internal support stays default-denied.

## Owner continuation: existing Hobby selected

D105 preserves existing Hobby/Fluid with no upgrade, migration or subscription. Hosting comparisons do not block independent development. Its contractual non-commercial restriction remains explicit; no commercial permission is claimed. Read-only actual Vercel account/project API confirms Hobby and Fluid=true; built runner duration is 300 seconds. The concurrent Context/Premises provider limits are 45 seconds, followed by up to 120 seconds for Synthesis, plus preparation/storage. No new paid duration/generation proof was performed.

Production configuration was inventoried without displaying/decrypting secret values: SITE_URL, SUPABASE_URL/PUBLISHABLE_KEY/SECRET_KEY, Stripe key/webhook/price/merchant and runner secret are absent from Production. OPENAI_API_KEY exists but execution authority is false. Only the default sitefit-three.vercel.app domain is attached; an approved custom origin/DNS still needs connection. No existing key was copied or rotated and no Production setting activated.

Implemented the small offline `check:release` command and candidate configuration tests. It rejects missing/Local/Preview/Test configurations, keeps configuration shape separate from activation approval, outputs no private values and makes zero service requests. It does not claim database isolation, actual merchant/price or delivery validation. `.env.example` now includes disabled commercial flags/account placeholder and accurate environment boundaries; no credentials, provider or dependencies added.

Latest hosted read-only state: 377,083,571 bytes; Test mode, commercial activation false, scheduler false, support accounts zero; Ready digest `a58fd24de5b7dc735daea8e3ce06914e`, held micros 2,440,000, unchanged. Remaining concrete activation steps are in the existing runbook: custom origin/DNS; isolated approved Production database/settings; exact Live account/price/webhook; final policy and durable confirmation; approved commercial/source budgets and scheduler controls; one separately cost-approved genuine Live → Ready/replay/PDF proof; campaign activation. No broad Phase15 review or hosting selection is requested.

Continuation verification: locked npm ci reported zero vulnerabilities; full check passed 346 tests, lint, types and production build. The template test initially caught nonempty disabled flag examples; values were restored to blank defaults without weakening the test. Built HTTP passed 13 public pages/articles, 13 private routes, metadata/robots/404/address boundaries, campaign consent/withdrawal/default-denial and six Production-disabled Snapshot fixture states. `check:supabase` verified the existing Data API schema response with no application records read/written. `check:release` on the unconfigured process correctly returned exit1, not a claimed successful release. Private-value scan: 10 privileged values against 651 repository/client-bundle files, zero matches. No runtime report logic, migration, dependency, account permission, hosted environment value or Fluid setting was changed. Protected continuation PR/CI receipts are recorded on delivery.

## Authorised isolated Production setup — D106

Owner's new project/ref and domain replace the missing-target dependency. [Actual setup receipts](phase17-production-setup.md): Free/London/PostgreSQL17.11; all75 existing migrations applied; public RLS and six rollback suites passed; actual Production token/profile/guest/signout checks passed and synthetic identities cleaned. Production-only Vercel configuration and exact Auth callback allowlist staged. No application/main promotion, paid execution or campaign activation. DNS, Google/SMTP, licensed source loading and remaining release/Live-proof gates stay explicit. Development/history/reservations preserved.

## Completion boundary

Implementation preparation can be delivered through protected Development/Preview with activation disabled. Phase17 remains **OPEN** until launch dependencies, a genuine authorised operational purchase → confirmed supply → Ready → immutable replay → dashboard → PDF, and the first 2–3 campaigns are completed. Offline fixtures, prior D102 success and a production build do not satisfy that proof.

See [launch register](launch-gate-register.md) and [activation runbook](phase17-activation-runbook.md). No later phase starts.
