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

## Deployed ordinary-customer admission

Forward migration20261025100000 and the application admit verified anonymous Snapshot sessions and confirmed ordinary purchasers into the existing shared envelope. Cases are unique per original owner/property/business; report ownership stays immutable. Existing guest-claim access mapping permits a verified permanent purchaser without rewriting the original anonymous analysis/proof owner. Auth verification, session revocation, RLS, rights holds, provider journals, tariff/policy checks and payment/report bindings remain mandatory.

The original owner's three-Full counter, expiry and same-owner donor transfer rules remain intact. Public customers use per-case/per-payment ledger reservations, the same shared monetary ceilings and unchanged provider/storage checkpoints. New public case execution permits last30days, consistent with the existing report access policy; no historical expiry or total allowance is extended. Public admission remains stoppable using its private default-off database flag; this migration activates only the known existing Production pool. No ordinary-customer allowance is created in Development.

Forward migration20261025090000 adds service-only read-only delivery admission. Before preparing a payment/consent and immediately before creating or returning unpaid Stripe Checkout, require the approved Live runner target, enabled execution and contract email controls, and configured runtime AI/runner/Zoho credentials. False, missing RPC or read failure denies Checkout. Existing atomic payment RPC still reserves money/storage before Session creation. This does not promise uninterrupted upstream availability or revoke previously issued funded Sessions.

## Security/reliability corrections

The release ports the five already implemented audit fixes from PR138: reverse environment isolation, optional-source timeout persistence, independent empty Competition coverage eligibility, population completeness wording and residential provenance validation. Development acceptance activation, its exhausted legacy Full budget and any new purchase are outside this port. PR138 itself stays separate. Known dependency/Next.js security corrections and response headers were already deployed through PR137; no malware/exploitation was confirmed. Google's disapproval remains a separate policy outcome.

## Validation and delivery status

The actual migration rebuild and public customer SQL journey passed, including ownership continuity, two customers at one property, foreign-report denial, unchanged owner Full count, monetary ceiling rejection and paid fulfilment binding. Final local npm run check passed lint, strict types,495 tests and build. Built-server check:public passed16 public pages/articles,16 internal paths,15 same-origin scripts, security headers, metadata, privacy and four safe address-route boundaries. Protected PR139 passed both exact-head CI runs40193752332/40193816864, merged at daca1d6d406a846f1256c5fa207cf097ee3dba4b; post-main CI40194219022 passed. Protected Preview loaded successfully without provider dispatch.

Production deployment dpl_5BFQYjQwCBcpa6wr5L1MZkz8DLmj runs that exact main commit, created25October12:46:06UTC, displayed build duration1m4s, independently observed Ready with sitefit.co.uk assigned. Automatic Production deployment remains disabled. Only the two additive migrations were applied first, bringing107 versions to109. Before/after fingerprints confirm every existing analysis/report/payment/proof/ledger row and previous controls unchanged; only the intended public admission flag was added/activated. No environment, plan, tariff, billing, count or monetary ceiling change.

Independent live HTTP at17:20:56UTC confirmed an unauthenticated location wizard with no owner restriction and nosniff/DENY/CSP intact. The authenticated read-only deployed-runtime probe returned deliveryReady:true, provider configuration present, correct Production project and Stripe account/Price ready, with paidDispatches:0. Restricted Stripe management permission cannot enumerate webhook endpoints; the already verified real signed webhook evidence remains authoritative. No webhook or payment was replayed.

One necessary NEW ordinary anonymous customer Snapshot completed: report37e95615-c1fe-4b32-8628-4249cc7295e7, created17:27:02.496022UTC, Free/Ready with matching immutable anonymous owner, nine received dispatches and no payment. Its own session read the private report successfully. Without a session, Next.js streams an HTTP200 Not Found response carrying its explicit404 boundary and no private Snapshot markup; actual SQL read returns null. The first status-only404 assertion was corrected without repeating generation. An earlier network connection failed before any anonymous user, analysis or dispatch existed; that zero-effect attempt was independently checked before starting the single actual generation.

The case reserved650000microUSD, receipt-settled27235 (US$0.027235 AI usage) and released622765; its reservation is fully settled. No new Live payment exists. Final observed shared availability22220762microUSD includes a retained separate650000 reservation; it was not reclaimed. Commercial ceiling10000000, settled61822, active0 remain unchanged. Address use34/40 leaves six new dispatches, with existing cache replay available. Limits stop new admission when exhausted; no extra allowance was added.

A final read-only capacity guard in20261025173500 also denies Checkout if the known fulfilment cron is absent/inactive or pending reserved storage exceeds the existing450MB checkpoint. Actual Production scheduler was observed active with its exact approved tick command. The targeted two-test SQL/provider admission regression passes disabled/missing scheduling, reserved-storage exhaustion, wrong target, disabled execution and service-only grants. See the associated PR for protected delivery and final hosted readback; no new application runtime or repeated customer generation is required for this SQL-only guard.

Google Ads account8557195993: refreshed25October, both campaigns PAUSED, All-time cost£0.00. Existing appeal61102949 (24October, Compromised site, Made changes, two campaigns) is now Review complete / Failed. Previous61023919/61023829 remain Not reviewed / Unable to review. Ads remain disapproved; technical verification is not Google policy approval. No duplicate appeal, support message, activation, budget or billing change.
