# Commercial launch readiness — 25 October 2026

## Existing Live journey verified; no repeat purchase

The owner prohibits another real payment test. The existing transaction closes the Live journey gate; no further Live or Sandbox purchase is required to repeat it.

Read-only Production/Stripe observations at08:11UTC:

| Step | Reliable existing evidence |
|---|---|
| Real payment | `63af9bfe-eda8-4c8e-81e8-6c3a6d9b9d5f`: Live v2, GBP2900, succeeded, active access, no reversal. Independent Stripe GETs confirm complete/paid Session, succeeded Live Intent with2900 received, correct merchant, Price, single line and metadata. |
| Webhook | Real `checkout.session.completed`, paid at2026-10-20T18:12:36.099255Z. The [original receipt](first-paid-preparation.md) records signed HTTP processing; no webhook was replayed. |
| Confirmation | Matching purchaser, frozen approved policy, manual Zoho PDF channel, delivered2026-10-20T18:46:59.400821Z and retained receipt digest. Original evidence records received MIME/PDF byte comparison. |
| Ownership/generation | Exactly one matching fulfilment is Ready; Full report `6081463f-82e1-4bf9-ae12-7a746703edb7` Ready at2026-10-20T19:26:08.052114Z. Historical recovery stays recorded; this does not claim a new uninterrupted generation. |
| PDF | Two immutable full-PDF archives exist.24October authenticated Production download verified the existing141916-byte PDF signature/EOF after confirming the archive existed. No repeated download/render/write. |

Private sanitised readback is outside Git in `.codex/tmp/sitefit-commercial-launch-20261025/existing-live-journey.json`. No raw Stripe object, credential, Session reference or customer contact is exported here.

## Current capacity and unchanged limits

- Database378607283bytes:71392717bytes below the existing450000000-byte checkpoint.107 migrations before this release.
- Runner enabled, URL/secret configured, queue one historical Ready and no pending. Existing five-minute cron active,288 successful SQL executions in the previous24hours; SQL success alone is not a throughput benchmark.
- Shared receipt ledger: original10000000microUSD plus single audited13390000 adjustment; effective23390000, settled492003, active reservations0, available22897997.
- Separate commercial Full fence10000000microUSD, settled61822, active reservations0. Overlapping ceilings are not additive allowances.
- Address dispatches31/40. Original owner Full counter3/3; Snapshot count16 with no count cap. Preserve all historical counters, adjustments, receipts and donor restrictions.
- Contract email control enabled, email queue empty. Owner rehearsal expires2026-10-25T19:06:43.07852Z. Public cases must not inherit that private rehearsal deadline.
- Hosting resolved by the owner's25October confirmation. No further plan review, upgrade, trial or purchase is required.

## Prepared ordinary-customer admission

Forward migration20261025100000 and the application admit verified anonymous Snapshot sessions and confirmed ordinary purchasers into the existing shared envelope. Cases are unique per original owner/property/business; report ownership stays immutable. Existing guest-claim access mapping permits a verified permanent purchaser without rewriting the original anonymous analysis/proof owner. Auth verification, session revocation, RLS, rights holds, provider journals, tariff/policy checks and payment/report bindings remain mandatory.

The original owner's three-Full counter, expiry and same-owner donor transfer rules remain intact. Public customers use per-case/per-payment ledger reservations, the same shared monetary ceilings and unchanged provider/storage checkpoints. New public case execution permits last30days, consistent with the existing report access policy; no historical expiry or total allowance is extended. Public admission remains stoppable using its private default-off database flag; this migration activates only the known existing Production pool. No ordinary-customer allowance is created in Development.

Forward migration20261025090000 adds service-only read-only delivery admission. Before preparing a payment/consent and immediately before creating or returning unpaid Stripe Checkout, require the approved Live runner target, enabled execution and contract email controls, and configured runtime AI/runner/Zoho credentials. False, missing RPC or read failure denies Checkout. Existing atomic payment RPC still reserves money/storage before Session creation. This does not promise uninterrupted upstream availability or revoke previously issued funded Sessions.

## Security/reliability corrections

The release ports the five already implemented audit fixes from PR138: reverse environment isolation, optional-source timeout persistence, independent empty Competition coverage eligibility, population completeness wording and residential provenance validation. Development acceptance activation, its exhausted legacy Full budget and any new purchase are outside this port. PR138 itself stays separate. Known dependency/Next.js security corrections and response headers were already deployed through PR137; no malware/exploitation was confirmed. Google's disapproval remains a separate policy outcome.

## Validation and delivery status

The new synthetic SQL proof uses actual migrations and verifies two customers at one property, anonymous-to-permanent ownership continuity, foreign-report denial, idempotent reservations, unchanged owner Full count, shared commercial ceiling rejection, signed-payment/confirmation/fulfilment bindings and expiry isolation. It performs no external request or real payment. Actual database rebuild plus the new public journey passed before the final expiry assertion was added; final required suite and protected CI are pending.

Changes are prepared, not deployed. The previous verified Production remains `683c7f1847d0748e39d5005ca5d2cb1c25628d97`, deployment `dpl_6Ay4Y5riwAw3SwHKX5pyewyUGend`. Record final PR/CI, additive hosted migration readback, Production commit/deployment/time and one necessary ordinary Free Snapshot below before claiming public launch.

Google Ads account8557195993: both campaigns observed PAUSED and All-time cost£0.00 on25October. Existing appeal61102949 was submitted24October and recorded Inprogress. No duplicate appeal, campaign activation, budget, billing or advertising change.
