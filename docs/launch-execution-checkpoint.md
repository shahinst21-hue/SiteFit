# Launch execution checkpoint — 16 October 2026

Owner asks to complete the existing launch sequence in order, continuing independent no-spend work. Keep closed phases/copy/design closed. No new subscriptions, paid AI/source requests, Live payment, campaign or commercial Production activation follows from this preparation.

## New owner decisions implemented for the launch candidate

- £29 is the final customer total, with no additional Checkout fee; not VAT registered as previously declared.
- Owner confirms a sole-trader activity under the SiteFit trading name, not a registered company. No personal name/address is newly published or invented; adequate final seller/controller particulars remain unresolved under the existing privacy instruction.
- Online report access is30 days. Use immutable Ready time as the start, so processing delays do not consume customer access. Downloaded PDFs remain the customer's files; this is not a promise to revoke copies. No auto-deletion or historical expiry is introduced.
- Supabase Production is the primary location for reports, PDFs, contract/consent records and receipts. Private bucket `sitefit-private-documents`, server-mediated owned reads and deny-by-default browser RLS. No public/signed object URL is created by this implementation.
- Owner defers buying independent backup until actual sales/data value justify a decision. Same-project private Storage is primary storage, not an independent disaster-recovery copy. Do not describe deferred hosted/Auth/Vault/Storage recovery coverage as passed.

The new `sitefit-sale-v1-launch-draft` preserves these fields without rewriting the earlier draft or any accepted contract. It remains unapproved pending the remaining final particulars/classification/channel/text. The application's sale/release approvals remain false.

Forward `20261016140000_commercial_access_and_private_documents.sql` prepares the unapproved policy, a30-day owned Full Report read limit and defensive report/section RLS, and a private Storage bucket when the real Storage schema is present. Only contracts frozen with `reportAccessDays:30` are limited; historical reports are unchanged. Contracts/consents remain available under existing rights/ownership after report access expires. Access expiry is not erasure or a new retention period.

PDF routes retain the existing owner/entitlement/Ready checks before private archive access. New-contract PDFs are stored once without overwrite; concurrent upload reopens the winner. Read/auth/network errors are not treated as an empty archive. Existing historical PDF generation remains unchanged. The owner-admin CLI prepares the matching frozen contract in private Storage, never sends email or marks delivery. No support account is enabled.

## Verified Development correction

PR54 merge `d52afbb345722ff9f4f64c341e3d4c67699857d6` passed exact-head and post-merge CI. The forward pending-confirmation migration was subsequently applied only to verified `sitefit-dev` / `idlsjusbrmyucccostxt`, under450 MB, with the runner disabled. The dedicated rolled-back [queue verification](../supabase/verification/contract-confirmation-queue.sql) passed against hosted Development: unconfirmed stays queued with no lease; identical receipt is idempotent; confirmed claims once. No AI/source/payment-provider call or real email.

Before:377,796,275 bytes,30 Ready,27 Auth users, Ready digest `a58fd24de5b7dc735daea8e3ce06914e`, US$2.44 held. After the migration/rolled-back probes:377,861,811 bytes; same digest, users and holds; runner remains disabled. Existing awaiting-authorisation job was not reset.

Full commercial/Full-intelligence hosted fixtures were attempted and rejected by existing environment/budget prerequisites; they are NOT passes. Commercial fixture cannot switch a Development database containing Test payment history to Live (`commercial_database_not_isolated`). The Full fixture reaches the exhausted historical Phase12 budget. No guard or reservation was changed to make these fixtures pass. Use isolated fixtures for these paths and the budget-independent targeted hosted probe for the deployed queue correction.

## Next activation order

1. Finish and deliver this protected Development candidate, offline checks and CI. Apply/verify its second migration in Development after those checks. Production changes remain separate.
2. Resolve only the remaining final contract/classification/channel and adequate seller/controller disclosures. Owner's privacy instruction remains; no personal particulars are published or invented. The known trading name/email/no-VAT/total/access decisions need not be asked again.
3. Securely configure the existing isolated Production Stripe merchant, £29 one-off price and signed Live webhook; existing source credentials/rights/quotas and capped allowances. No key in chat. Readiness is not activation.
4. Separately approve a named protected Production release/configuration, including the private bucket and forward migrations. Preserve default-denied sales/execution until the bounded proof is approved. Do not merge main by implication.
5. Exact proof cost sheet: genuine£29 payment, actual account/card processor fee and refund treatment, bounded Full AI reserve US$0.30, plus separately bounded Free Snapshot/source/address needs for the chosen case. US$0.30 alone is not the complete journey cost. Do not invent available credits or Live fee terms; no exact all-in execution authority is requested before these are known.
6. One authorised payment → approved manual durable confirmation → closed-page background Ready → unchanged replay → eight tabs → archived full/tab PDF. On failure stop, preserve holds and diagnose offline; no paid retry.
7. Separately approve limited sales and campaign01 (channel, dates, spend, volume and stop thresholds), then review real usage/cost/delivery/customer evidence before campaign02/03. No automatic infrastructure purchase.

Unresolved legal particulars, real delivery/channel, permitted source/operating allowances and genuine Live proof are still launch gates. Backup deferral is an owner-accepted limitation, not a successful restore. No broad Phase15/copy/product review is reopened.

Owner confirms Stripe Live activation is not yet complete. Owner action: complete the existing account's [business verification](https://dashboard.stripe.com/account/onboarding), accurate sole-trader/KYC and settlement information privately. Check the separate public business-information settings because Stripe can show them on receipts/statements. Send only non-secret confirmation that payment acceptance and payouts are enabled. No Live key, price/webhook creation, activation or genuine payment is inferred from that confirmation; those remain the next scoped setup/proof steps. [Official setup guidance](https://docs.stripe.com/get-started/account/set-up).

## Local verification

Node24/npm11, npm run check: lint, types,356 tests including PostgreSQL/PostGIS/security and synthetic restore, and production build passed. Final ownership-metadata RLS correction passed the database rebuild again. Built HTTP/public checks and actual campaign consent/withdrawal/private-indexing checks passed. Archive tests cover stored-byte reuse, no overwrite, concurrent writer, auth/network failures, invalid path/PDF and default-denied owner-admin preparation. No UI layout changes; existing rendering/unchecked-consent fixtures pass. Hosted bucket/object API checks and protected delivery receipts are recorded separately after observation; no synthetic Storage shim is labelled a real API test.

Implementation follows Supabase's [private Storage/RLS model](https://supabase.com/docs/guides/storage/security/access-control) and [bucket creation guidance](https://supabase.com/docs/guides/storage/buckets/creating-buckets). Object access is server-only after existing paid ownership checks, rather than public URLs or permanent bearer links.
