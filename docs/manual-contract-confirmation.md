# Existing Zoho mailbox — manual contract confirmation

Latest rehearsal and branded presentation implementation: [16 October follow-up](launch-progress-confirmation.md). Use `confirmationEmail({reference: verifiedPurchaseReference})` from `lib/legal/confirmation-email.ts` for HTML/plain wording in this same manual channel; it does not send or mark delivery. Do not regenerate or replace an existing archived attachment. The owner received/opened the original rehearsal and requested branding; corrected sample sent. No genuine purchase delivery has been recorded. Later approvals supersede the historical no-public-page/no-email statements below only within their explicit scope.

16 October 2026. Bounded launch preparation, not commercial activation. Owner confirms `info@sitefit.co.uk` uses Zoho Mail Free and can send/receive; authorises checking the manual process and a narrow correction if needed. No sender integration, subscription, public page, support allowlist or Production write. Phase15/16 and accepted copy stay closed.

## Findings and correction

The owner-authenticated `/purchase/confirmation?purchase=…` endpoint generates a PDF from stored consent, version and full policy texts, with private/no-store responses. Service-only `confirm_sitefit_sale_delivery` binds owner/payment, approved policy channel and SHA-256 receipt digest. Identical receipt replay is idempotent; changed receipt/channel replay is denied. Download is not delivery.

Previously a worker could claim a paid job before contract confirmation, then finish `awaiting_authorisation/configuration_unavailable`. Later delivery did not requeue it; support resume only accepts intervention with a bound report. A slow manual sender could strand a purchase.

Forward migration `20261016120000_confirmation_pending_queue.sql` leaves paid jobs queued without a lease until `sitefit_supply_permitted` is true. The worker still checks supply and each dispatch's entitlement/lease. Pending delivery does not block other eligible queued jobs. Expired running jobs and revoked payments retain intervention, never automatic retry. Bound Ready replay stays eligible without new supply. No historical awaiting/intervention job is reset. Scheduler may still invoke an idle worker while only unconfirmed jobs wait; scheduling is not activated or redesigned.

## Prepared procedure — only after activation prerequisites are approved

1. Verify the trusted payment, exact environment, owner, paid/active entitlement, frozen policy version and approved confirmation channel. Browser success is not payment confirmation; historical consent is not inferred.
2. Obtain that purchase's frozen contract PDF. The customer has an authenticated download. The owner-admin preparation CLI is `node --conditions=react-server --env-file=<approved-private-environment> scripts/payments/prepare-contract-confirmation.ts OWNER_UUID PURCHASE_UUID`. It requires approved sale policy and Production release authority, verifies paid/active ownership, and archives the frozen PDF in the private bucket; it prints only its object path and `delivered:false`. It is not run for real purchases during preparation. The existing Supabase owner-admin may download the attachment privately from Storage after the scoped operation is authorised; no customer impersonation/session sharing, staff key sharing or browser delivery-marking route. Internal support remains disabled.
3. Send the exact attachment through Zoho webmail to the verified purchaser. Use “SiteFit — your purchase confirmation” and the purchase reference; omit property details from the subject. Include support/cancellation instructions from the approved contract. A mutable website link is not a substitute for frozen terms. This repository does not send email.
4. Owner selects Supabase Production private Storage as the primary archive, without buying independent backup. Keep the PDF, original sent message/Message-ID, destination, send time, purchase/policy binding and delivery evidence there through scoped owner-admin operations. No browser upload/read policy is granted to this bucket; report/contract downloads go through existing authorised server routes. Sent-folder presence alone is not receipt. For the initial manual process an affirmative reply acknowledging receipt of the attachment is a conservative candidate; bounced/ambiguous/unconfirmed messages stay pending. A hash alone does not establish legally sufficient delivery.
5. An explicitly authorised operator verifies the evidence, hashes the exact archived receipt bundle (SHA-256), then invokes the existing service-only confirmation RPC with the same owner/payment and approved channel. Never hash arbitrary text to manufacture a receipt. Do not put email bodies, addresses, attachments or tokens into SQL logs, system events, Git or chat. Preserve the protected original behind the digest.
6. The next authorised worker claim uses the same job, without another purchase, consent or job. Confirmation does not enable the runner, grant an AI budget, override reversals or replay stopped dispatches. Ready/reopening/PDF use the existing immutable path.

## Still required before real use

- Final policy/classification and matching application/database version/channel; none is approved here.
- Real verification of the scoped owner-admin archive/export procedure, approved channel and retention criteria. Staff/internal support remains disabled; no exact support account ID is authorised.
- Production private bucket deployment, actual object/API security checks and a real delivery demonstration. No real customer file was exported, emailed or marked delivered.
- Separately authorised Production deployment/migration/configuration, bounded Live proof, source/AI budgets and other launch-register gates.

No SMTP availability is assumed or required for this manual candidate. Observed DNS: Zoho EU MX and indirect SPF resolving to `include:zohomail.eu`. DKIM/alignment/inbox delivery were not independently proven; owner-confirmed send/receive is recorded separately.

## Verification boundaries

Isolated PostgreSQL fixtures exercise Test and synthetic Live pending confirmation → repeated claim returns null without lease/report preparation → approved receipt → exclusive claim, plus an older waiting purchase not blocking an eligible job, foreign owner/wrong channel/changed and duplicate receipt, expired lease, revoked queued access and existing security/immutability. Synthetic approval/receipts never leave local rollback tests.

Local verification: Node24.12/npm11.6; npm ci (219 packages, zero reported vulnerabilities); npm run check exit0, lint/types,352 tests including rebuilt PostgreSQL/PostGIS and isolated synthetic restore, and production build passed. An expanded fixture initially combined a state-changing call and its post-state assertion in one SQL Boolean expression; splitting them into separate statements fixed that test's evaluation-order assumption. The application correction was unchanged. Protected CI/HTTP receipts are recorded on the delivery PR. These results are not Zoho delivery, hosted migration or Live payment proof. No UI changed, so no new visual acceptance is claimed or requested.
