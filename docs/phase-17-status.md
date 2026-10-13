# Phase17 — Commercial implementation; activation outstanding

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

Locked npm installation passed with zero reported vulnerabilities. Final complete check passed 343 tests, lint/types and build (`phase17-final-check.log`), including merchant-account, reservation binding, fourth-dispatch rejection, exclusive/expired leases, payment/reversal/consent/private grants, historical replay/PDF and isolated restore regressions. The earlier new fixture's combined volatile claim/state expression was split into sequential assertions so PostgreSQL checks the state after the claim. No recovery rule was weakened.

Actual built HTTP on port3017 passed 13 public pages/articles and 13 private paths, metadata/JSON-LD/sitemap/robots/404/address guards, plus campaign same-origin/consent/withdrawal/default-disabled checks. No generation/payment/source/AI invoked. Protected exact-head CI and Preview delivery remain pending until recorded.

Hosted Development: pre-write 376,952,499 bytes; four forward migrations 20261013140000/141000/142000/143000 applied and recorded, then 377,083,571 bytes. Ready digest remains `a58fd24de5b7dc735daea8e3ce06914e`; held micros remain 2,440,000. Commercial mode is Test, checkout/execution false. No source/AI/payment call or historical rewrite. This is hosted schema/default verification, not a Live purchase/runner proof.

New SQL is exercised in isolated PostgreSQL using synthetic data and rollback, without paid/network calls. This is not a genuine Stripe Live proof. Hosted application/capacity/history checks must be recorded separately. No historical report rewritten, trigger disabled or unknown reservation released. Internal support stays default-denied.

## Completion boundary

Implementation preparation can be delivered through protected Development/Preview with activation disabled. Phase17 remains **OPEN** until launch dependencies, a genuine authorised operational purchase → confirmed supply → Ready → immutable replay → dashboard → PDF, and the first 2–3 campaigns are completed. Offline fixtures, prior D102 success and a production build do not satisfy that proof.

See [launch register](launch-gate-register.md) and [activation runbook](phase17-activation-runbook.md). No later phase starts.
