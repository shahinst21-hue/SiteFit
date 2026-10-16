# Stage 1 — contractual readiness and synthetic Zoho delivery

16 October 2026. Development/Preview only. Production remains on `9259ef9dfde6463a868efe4cc5de0d45d185844f`, deployment `dpl_8niC6UYtWrC2LPBuKL3cwoaquKR1`. No deployment, policy activation, customer email, receipt marking, Checkout, worker, source/AI request or payment is authorised here.

## Reconciled version and decisions

`lib/legal/policy-text.ts` is the shared source for Terms, Privacy/retention, three checkbox labels and the future private snapshot. Version `sitefit-sale-v1-20261016-review`, with matching dated terms/privacy/retention versions. `salePolicy.approved` stays **false**. Digital-content classification reflects earlier explicit owner approval, not execution authority. No migration or historical record is changed.

Production/database still has the old unapproved `sitefit-sale-v1-launch-draft`. A later authorised release must insert a **new**, complete matching snapshot from `launchPolicySnapshot()`, verify its digest and bind the exact approved policy/channel. Do not approve or rewrite the old incomplete row. Version mismatch fails closed.

| Item | Approved decision |
|---|---|
| Seller/controller | Shahin Shahmir trading as SiteFit; sole trader, not a company |
| Geographical/correspondence address | Dower House, Manorgate Rd, Kingston upon Thames, KT2 7UA; accuracy and publication reconfirmed in this stage |
| Contact | info@sitefit.co.uk. No public phone supplied; owner declines adding one. Do not invent a number or claim an exemption if one is available. |
| Price | One-off £29 final total; not VAT registered; no extra Checkout fee/subscription/renewal |
| Scope/access | One London property/concept; eight sections/dashboard/PDF; 30 days from immutable Ready, downloaded copy may be kept |
| Cancellation | Consumer full contractual refund within14 days of formation, even after supply; no AI deduction; statutory rights/extensions/remedies retained |
| Consent/retention | Three separate unchecked controls, no marketing/waiver; purpose-based retention distinct from access expiry |

**Exact formation rule:** “The contract is formed when your payment for the selected report is successfully confirmed. Recording choices before payment is not contract formation.”

**Exact delivery commitment:** “We begin preparation without undue delay after successful payment and delivery of the required frozen contract confirmation. We supply the report as quickly as reliably possible, without a guaranteed instant or fixed-minute delivery time. Your statutory delivery rights and remedies remain unaffected.”

These restate the previously approved arrangement for review, not new silently chosen commitments. `acceptedAt` records pre-payment choices: PDF now says **Choices recorded**, not formation/payment date. Manual cancellation review must use the trusted successful-payment record, not shorten rights using the earlier choices timestamp. No automatic cutoff is added.

PDF renders all three full texts, versions and only actually stored consent wording. It never borrows today's labels for historical records. Existing archived PDFs retain their original bytes.

## Synthetic Zoho proof

Reproduce offline: `node --conditions=react-server scripts/payments/rehearse-contract-confirmation.ts`. Outputs are ignored under `supabase/.temp/stage1-contract-rehearsal/`; `wx` prevents replacing a prior sent attachment. Synthetic consent flags false; no account/payment/source IDs or customer content; no network/send/delivery call.

- Approved route: existing info@sitefit.co.uk → owner-designated Gmail. Reference `STAGE1-20261016-SYNTHETIC`, subject `SiteFit — Stage 1 contract delivery TEST — no purchase`.
- Sent16 October20:09:56 BST. Gmail original view reports arrival after3 seconds; this is not a report-delivery SLA.
- Actual received five-page PDF opened in Gmail; screenshot preserved privately. All five local rendered pages inspected, no clipping observed.
- Recipient original view: SPF, DKIM (`sitefit.co.uk`), DMARC **PASS** for this message, not a blanket future guarantee.
- Original attachment34,700 bytes, SHA-256 `1127706aa274775138bcfdb3d1e5570965b353b5a3c7b241adb770005a8c7011`.
- **Received-byte hash and full EML pending**: browser download redirected to an attachment domain blocked with `ERR_BLOCKED_BY_CLIENT`. No bypass. Owner asked to save `received.pdf` and `received.eml` with their normal browser into the private directory. Gmail's displayed original omits binary MIME content; it is not represented as the full original archive. A screenshot/filename/Sent status cannot prove byte equality.
- No genuine purchase, consent, Production object or confirmation record. A real transaction still needs its own actual delivery evidence.

## Storage, idempotency, queue and rights

Fresh read-only checks explicitly target `sitefit-prod` / `vsfkkroxgntoumoqcfcy`. Active credential read in process memory only, not replaced. Private bucket verified,10MiB limit, PDF/EML/JSON/ZIP allowlist; restrictive browser Storage policy, contract RLS/freeze, denied authenticated direct contract SELECT and denied browser delivery RPC verified. Inventory: zero contracts/approved policies/reports/payments/jobs/private objects. Commercial mode Test, Checkout/execution/runner off. Zero object writes or delivery RPCs. Private result: `supabase/.temp/stage1-storage-readonly.json`.

Fresh isolated PostgreSQL uses actual migrations plus `contract-confirmation-queue.sql`/`document-access.sql`: pending confirmation stays queued without lease/report creation; repeated claims; exclusive claim after receipt; unconfirmed older job does not block eligible work; identical receipt idempotency and changed/foreign/channel denial; access expiry, revocation and immutability. Archive fixtures verify original byte replay without render/upsert, concurrent writer and fail-closed auth/network failures. These are not a Production purchase/object round trip.

Genuine operation remains: verify paid active owner → archive frozen PDF privately → send exact attachment to verified purchase email → preserve original message, attachment/hash, payment/version/time binding privately → separately authorised service-only confirmation → same queued job may proceed only under its own budget/execution authority. Download/Sent alone is not delivery. Support stays default-denied.

Reviewed rights procedure in `phase15-recovery-rights-runbook.md`: proportionate identity check, owner-scoped private graph/export, documented holds/licences, tested authorised category action, other-owner/history checks and minimal audit. Cancellation email needs no compulsory reason/form; request≠refund. **Complete analysis-graph erasure execution and full hosted Auth/Vault/Storage recovery remain unproved**. No instant deletion, independent-backup or recovery SLA promised; no customer deletion, global trigger disablement or new backup purchase. Owner's backup exception remains accepted.

## Verification and Go / No Go

- Node24.12/npm11.6.2, `npm ci`:219 packages, zero reported vulnerabilities.
- Final `npm run check`: lint/types, **367/367 tests**, PostgreSQL/security/queue/recovery, production build pass. An initial test command overlapped dependency extraction and failed module loading. The initial full run also had one unexplained file-level station-mapping runner failure despite printed assertion passes; unchanged file passed alone and the entire subsequent run passed. No application test/validation weakened.
- Actual SSR compares each page paragraph/label/version to snapshot; PDF draw-output assertions preserve every paragraph and historical wording rules. Five-page actual export visually inspected.
- Local production `check:public`:13 public pages/articles,13 internal routes, metadata/404/address boundaries pass. `check:marketing`: disabled measurement/private indexing checks pass, zero generation/source/payment/AI requests. Actual mobile Terms390px no horizontal overflow; keyboard enters skip link. Not a whole-site/200% acceptance repeat.
- Protected exact-head CI belongs to the PR. Automatic Vercel deployment is disabled for this exact review branch in `vercel.json`, so unapproved legal text is not published even to a new Preview. Local built interface is verified; Production unchanged. Existing other branch settings are untouched. Do not merge/deploy this review text until the separately required approval.

**NO GO for commercial activation.** Remaining: received-byte comparison/full EML preservation; actual-account processor locations/transfer safeguards and final lawful-basis review; tested rights-operation gaps; separately approved matching database policy/channel/publication. Formation, price/refund/access/address/retention criteria need no repeated broad approval. Narrow owner decisions are final reconciled text/basis mapping and manual Zoho evidence/channel acceptance after proof, followed by separately scoped release/configuration permission. No spending follows from acceptance.

Hobby remains unchanged at owner direction; internal provider commercial-use restriction remains recorded, without another upgrade proposal or public hosting-risk banner. Phases15/16 stay closed.

Review references: [CCR2013 Schedule2/regulation16](https://www.legislation.gov.uk/uksi/2013/3134/pdfs/uksi_20133134_en.pdf), [ICO right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/). These do not certify account-specific compliance or unperformed checks.
