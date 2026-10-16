# Stage 1 — contractual readiness and synthetic Zoho delivery

Owner continuation after PR60: proceed with all independent Stage1 work and protected development delivery without repeated approval questions. This supersedes the earlier review-only merge pause below; it does not waive missing evidence, authorise spending, commercial execution or a Production deployment with unresolved processor/legal facts. An offline received-file verifier is now prepared: `node scripts/payments/verify-confirmation-rehearsal.ts`. It requires the exact original/received PDF bytes and complete received MIME attachment, rejects the original-view placeholder and wrong message bindings, writes a private hash receipt and never calls the delivery RPC. The subsequently owner-saved complete EML closes the real received-byte proof, as recorded below; no browser-download bypass was used.

16 October 2026. Development/Preview only. Production remains on `9259ef9dfde6463a868efe4cc5de0d45d185844f`, deployment `dpl_8niC6UYtWrC2LPBuKL3cwoaquKR1`. No Production deployment, policy activation, genuine customer email, receipt marking, Checkout, worker, source/AI request or payment is authorised here. Later owner continuation covers protected development delivery and preserving the synthetic proof in the existing private archive.

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
- **Received-byte proof PASSED after owner handoff**: the owner saved the complete56,810-byte received EML locally. Its actual MIME attachment was extracted, not copied from the sent file, and compared byte-for-byte by SHA-256. Received PDF34,700 bytes, hash `1127706aa274775138bcfdb3d1e5570965b353b5a3c7b241adb770005a8c7011`, matching the original. Complete EML SHA-256 `1399c2943d2e149214f99804f6d7277c0b89b61cabc613a5ced5a0d4c33163bb`. The offline verifier passed. Browser download had been blocked; the owner download resolved it without bypass. Gmail's displayed original alone was not used as a full archive.
- Under the owner continuation, synthetic sent PDF, received EML and verification JSON were preserved in the existing Production private bucket under the exact rehearsal prefix. All three read-back hashes match and public URLs are denied; no upsert or policy/access change. Total91,898 bytes. No genuine purchase, consent or confirmation record; a real transaction still needs its own actual delivery evidence.

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

**NO GO for commercial activation.** Synthetic channel/received-byte/full-archive proof is closed. Remaining: actual-account processor locations/transfer safeguards and final lawful-basis review; tested rights-operation gaps; separately approved matching database policy/channel/publication. Formation, price/refund/access/address/retention criteria need no repeated broad approval. Narrow owner decisions are final reconciled text/basis mapping and manual Zoho evidence/channel acceptance after proof, followed by separately scoped release/configuration permission. No spending follows from acceptance.

Hobby remains unchanged at owner direction; internal provider commercial-use restriction remains recorded, without another upgrade proposal or public hosting-risk banner. Phases15/16 stay closed.

Review references: [CCR2013 Schedule2/regulation16](https://www.legislation.gov.uk/uksi/2013/3134/pdfs/uksi_20133134_en.pdf), [ICO right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/). These do not certify account-specific compliance or unperformed checks.

## Independent continuation after owner instruction

The owner instructs continuing all possible work without further confirmation requests. Previous specific formation/refund/access/retention decisions remain accepted; no additional contractual commitments are selected. Protected Development delivery may proceed after checks. Main, Production settings, sale approvals, execution/spending and real customer records remain untouched. This does not certify gaps or reopen Phase15.

- Exact full new-policy release candidate prepared privately at `supabase/.temp/stage1-contract-rehearsal/policy-release-candidate.json`,10,274 bytes, file SHA-256 `b19d7df6b0600cac2e988a7f06bff78d208e1f5d6632b3396c1e38be28d90101`. It contains the matching versions, all full texts/labels, seller/price/access criteria and proposed `manual_zoho_pdf` channel, with **approved:false**. This is an export, not a database insert/migration or activation. Keep the reviewed bytes when preparing a later release; derive any database content digest using the existing canonical convention, not this JSON-file formatting hash.
- The offline received-file verifier requires exact PDF hash identity, expected sender/recipient/reference and actual complete MIME attachment content. A screenshot, wrong message or placeholder original cannot pass. It writes a private receipt once and never calls a delivery RPC. Real verification subsequently passed using the owner-saved EML and its extracted attachment, without resend. Synthetic archive round trip also passed; no genuine delivery RPC.
- Retention/rights operating sequence stays owner-scoped and manual, with no invented erasure capability or deleted records. Existing local access/expiry/immutable/archive/queue fixtures remain mandatory. The accepted independent-backup exception is unchanged.

### Processor/transfer review limits

| Provider | Established evidence | Remaining account-specific evidence |
|---|---|---|
| Supabase | Production project pinned to London/eu-west-2; private/RLS boundary read verified. [Published DPA](https://supabase.com/legal/customer-resources/data-processing-addendum) includes its agreement and regional-processing/subprocessor framework. | Confirm actual applicable account agreement/subprocessors and any relevant onward transfers; London storage alone is not all-processing UK-only proof. |
| Vercel | Existing Hobby/Fluid account retained; [published DPA](https://vercel.com/legal/dpa) includes UK transfer provisions. | Actual applicable account coverage, processing/log regions and subprocessor review are not proved solely by this document. Hosting contractual restriction remains internal. |
| OpenAI | Application sends bounded evidence, `store:false`, not payment/account tokens; no new request made. [Published DPA](https://openai.com/policies/data-processing-addendum/) includes a UK addendum mechanism. | Actual organisation DPA applicability/data controls/transfer arrangements remain unverified. `store:false` is not a zero-provider-retention guarantee. |
| Zoho | EU mailbox route; actual rehearsal receipt and SPF/DKIM/DMARC pass. [Official account procedure](https://help.zoho.com/portal/en/kb/accounts/manage-your-zoho-account/articles/privacy) explains account DPA handling. | Direct account Privacy/DPA read redirects to sensitive-operation password re-verification. No password entered, DPA signed/requested, external legal email sent or claim of signed coverage made. Mailbox receipt does not prove this account DPA. |
| Stripe and address/evidence sources | Existing product/payment and internal provider admission boundaries preserved; public/provider evidence is not automatically customer account data. | Account-specific controller/processor roles and any personal-data transfers depend on actual service/contract. Existing readiness documents do not constitute full processor certification. No provider/API request made for this review. |

The lawful-basis mapping is documented in the review text; acknowledgement is not blanket privacy consent. Public standard documents narrow the review but cannot establish missing account facts or authorise signing agreements. No further broad owner questionnaire or new subscription is introduced. These specific evidence/access limitations remain visible until genuinely resolved.


Final continuation verification: `npm run check` passes lint/types,368/368 tests and production build. Exact-head CI must be rechecked after this receipt update. Synthetic Storage round trip preserved three new rehearsal objects only; the earlier zero-object inventory above is the accurate pre-archive state. Private result: `supabase/.temp/stage1-contract-rehearsal/private-archive-receipt.json`. No genuine customer record/policy/delivery mutation, main merge, Production deployment, paid request or execution gate activation.
