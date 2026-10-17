# Stripe Live readiness — 16 October 2026

Read-only owner-requested inspection; no payment, Checkout creation, Stripe configuration change, Production deployment or paid AI/provider execution. This is readiness evidence, not launch approval.

## Deployment and gates

Production alias resolves to Ready deployment `dpl_2Vq7yihG8hqb4rBGenZRzeJcMtyY`, source `4b53c93069bc3ddcca5339503daa3790bc3ca7e2` (the older PR50 release). The new restricted-key correction and subsequent Development work are not thereby deployed. Vercel commercial, execution, fulfilment, source collection and public indexing flags are zero; Test purchases are false. Verified Production database remains mode `test`, checkout/execution false, fulfilment disabled. No gate changed.

All four correctly named Production Stripe variables exist as Sensitive values: `STRIPE_SECRET_KEY`, `STRIPE_FULL_REPORT_PRICE_ID`, `STRIPE_ACCOUNT_ID`, `STRIPE_WEBHOOK_SECRET`. Vercel does not return these plaintext values, so their equality to the privately configured local values is **unverified**. The read-only Stripe checks below use that existing local restricted Live key, without printing it. No publishable key is consumed by the server-hosted Checkout integration.

## Minimum correction

Allow `rk_live_` alongside `sk_live_` in payment configuration and release preflight. Preserve default-denied release authority, mode separation, merchant binding and all provider object checks. Regression tests reject Test/public/malformed keys and demonstrate that accepting a key prefix cannot enable sales. No Test key behaviour changed.

## Observed Stripe results and blockers

| Resource | Actual read-only result | Required action before activation |
| --- | --- | --- |
| Price and expanded Product | Live, active, one-time GBP2900, per-unit; Product active/Live | Existing Product metadata `sitefit_product` does not equal `full_location_due_diligence_report`. Existing `verifiedPrice` correctly rejects it. Correct the approved Product configuration; do not weaken validation. |
| Checkout Sessions | Read succeeds | Runtime also needs **Write** to create hosted Sessions. GET cannot certify Write; check key permissions privately. No create request was made. |
| Payment Intents | Read succeeds | No additional write required by current code. |
| Own Account (`GET /v1/account`) | 403 `more_permissions_required` | Permit this read. Account-ID equality, charges enabled and payouts enabled remain unverified. No broad Connect write permission is requested. |
| Charges | 403 `more_permissions_required` | Read required for charge-to-intent fallback. |
| Refunds | 403 `more_permissions_required` | Read/list required by payment verification, including successful-payment reversal checks. No refund write required. |
| Disputes | 403 `more_permissions_required` | Read/list required by payment verification. |
| Webhook Endpoints | 403 `more_permissions_required` | Read is needed for this configuration audit, not the runtime signature handler. Owner Dashboard inspection can provide the same evidence without granting management access to the runtime key. |

Price/Product reads succeeded with the current key. No Product/Price write, payout, subscription or refund-create permission is needed for the implemented customer payment flow. Required permissions follow actual calls; a successful list GET is not proof of all parameter-specific operations or writes. Stripe [documents Read/Write separation and restricted keys](https://docs.stripe.com/keys/restricted-api-keys).

## Webhook contract, not yet verified remote configuration

Exact URL: `https://sitefit.co.uk/api/stripe/webhook`. Require **Your account**, **Snapshot**, API version **2026-08-26.dahlia**, enabled Live endpoint, and all eight events:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `charge.dispute.created`
- `charge.dispute.closed`

The retrieval SDK separately pins `2026-09-30.endive`; this does not change the required Dahlia event envelope. Thin or connected-account events are not supported. Current local signing secret has valid `whsec_` shape only; neither its equality to Vercel nor its binding to this remote endpoint is proved. No synthetic Live event was sent. Stripe's [webhook configuration guidance](https://docs.stripe.com/webhooks) distinguishes endpoint setup from signed delivery verification.

## Verification and next step

Local lint, strict types, full test suite (including database/security fixtures) and production build passed. Added configuration/preflight tests use synthetic keys and no service requests. Public HTTP and protected CI receipts are recorded in the delivery PR after actual completion. No claim of a successful Live transaction is made.

Owner next steps are limited to the missing read permissions, checking Checkout Sessions Write, correcting the existing Product marker, and confirming the endpoint's exact configuration/signing-secret assignment privately. Do not send secrets in chat. Further Production configuration/deployment, genuine payment and commercial activation require separate owner approval. Existing contract, source allowance, delivery and launch dependencies remain open; closed phases are not reopened.
