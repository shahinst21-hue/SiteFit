# Controlled one-case proof safety — 17 October 2026

## Superseding 67B successor correction — Development only

The owner authorises the limited Development correction for a **new**, separately
approved 67B Broadway Market case. The existing 67 case must remain disabled in
intervention, with its original identity, token, holds and dispatch history retained.
Two already-authorised Postio calls verified the distinct 67B postal identity; no
repeat lookup or AI execution is required for this correction.

Forward migration `20261017150000_controlled_proof_successor.sql` replaces the
boolean primary key with an ID primary key, retaining the existing unique ID/FK
constraint, and enforces **one current authority slot** through a partial unique
index. It does not retire, create or enable any case. Only a disabled terminal
(`intervention`/`complete`) case with no outstanding `intent` can leave the slot;
that transaction may change only its slot marker. Every other historical value and
dispatch remains untouched. Retired rows reject updates, deletion, truncation and
reactivation. A deferred constraint requires a current slot whenever history exists,
so retirement and replacement must commit atomically. There is no browser/service
case-creation or retirement grant.

All affected authority, subject, payment, contract, reservation and queue readers
select the current slot; dispatch/settlement/completion target the exact locked case
and reject retired authority. Missing-slot races fail closed, never fall through to
ordinary execution. Existing owner/property/nonce/policy checks, RLS, tariff,
Snapshot US$0.65 / Full US$1 / aggregate US$1.65 admission limits, retained holds,
request caps and no-retry rules remain. Full, Checkout and public activation remain
separately disabled. This supersedes the historical single-row limitation below,
not any earlier unknown-cost reservation or intervention record.

Verified in `sitefit-dev` only: migration82/hash
`18189222e0a799c112bb5674992b63b81474a1de4e4f3ec75cac94487817fb36`;
transactional recovery, unchanged protected fingerprints/RLS/ACLs, actual public
rollback fixtures and installed-function multi-connection tests passed. Eight
concurrent replacement attempts admitted one successor; eight claims admitted one;
eight duplicate dispatches admitted one. Concurrent admission retained exactly
US$0.65 for the new synthetic case, while the predecessor's US$0.017 hold and full
historical values remained unchanged. Restart and ambiguous redispatch were denied.
The isolated harness was removed; no public case/dispatch was committed.

Local `npm run check` passed lint/types/379 tests/build; the final fresh PostgreSQL/
PostGIS rebuild, including successor and historical Full-flow fixtures, passed.
Hosted Live-mode fixture execution was correctly refused by Development's existing
`commercial_database_not_isolated` protection; it was not bypassed. The hosted
actual-public tests use rollback-only free-proof/rights/successor fixtures. Full
payment/confirmation/queue behaviour with a retained predecessor is verified by
the local PostgreSQL fixture, not claimed as a hosted Live transaction.

Private receipts: `successor-development-recovery.json`,
`successor-development-receipt.json`, `successor-development-hosted-tests.json`,
`successor-hosted-concurrency.json` and before/after fingerprint captures under
ignored `supabase/.temp/`. Final Development bytes379,696,819;16 source releases
retained. No Production write/deployment, AI/provider call, payment, policy approval
or execution activation occurred. Production migration, exact-case provisioning,
environment case-ID switch and any release require the next explicit approval;
the existing real Snapshot spending permission does not authorise public generation.

## Current free-only authorisation

### First real attempt: stopped, not Ready

Production release `f74c8587d96c670dafc411d818db32f5e016fbd6` / `dpl_4g9qKyvYdd56SkJcMyyFttzZ3cFE` is Ready; migration81 applied with recovery and unchanged prior data/RLS/ACL checks. The one authorised attempt stopped in collection: nine source snapshots persisted; the ledger records PropertyData4, Geoapify1, FSA2 and TfL2 received dispatches, in addition to the two prior Postio calls. No AI request/reservation, payment or Ready report exists. Authority is disabled in `intervention`; it must not be reset or redispatched automatically.

Authenticated PostgreSQL and API gateway log inspection found no corresponding PostgreSQL exception at the original failure time. The later `column result does not exist` error belongs to the operator's diagnostic query and is not the generation cause. Gateway logs include ownership RPC responses after the intervention timestamp. The initial application exception was discarded by generic error handling, so its exact retrospective cause remains unconfirmed. A new frozen-data, network-disabled replay validates the stored-release BRES jobs envelope successfully; this does not reproduce the whole original request or prove all external responses were valid.

The bounded correction adds only safe collection phase/error codes and missing-source diagnostics, preserving original thrown errors and making no retry. Upstream messages, addresses, headers and raw responses are excluded; logger failure cannot affect execution. Owned context reads adopt the existing eight-second snapshot read/write allowance instead of two seconds, within caller cancellation and the unchanged overall generation deadline. A delayed valid-response fixture reproduces rejection under a two-second caller deadline and success under the bounded read allowance; cancellation still stops before the next request. This corrects a demonstrated deadline incompatibility but **does not establish it as the confirmed cause of the original live failure**. No evidence admission, schema, AI validation, source/call budget, sale approval or Ready requirement is relaxed. No further paid proof is authorised by these offline corrections.

The owner approved one real Production Free Snapshot for 67 Broadway Market, London E8 4PH, independent café (`coffee-shop`): maximum US$0.65 AI, no automatic AI retry, approved existing source credits only, no new purchase/top-up. This does not authorise £29, Full Report, public generation or campaigns. Provider permission/credit/billing status is owner-attested, not independently dashboard-verified.

Two bounded Postio requests captured the real canonical postal identity with usable postcode-centroid coordinates; the recorded occupier name is identity evidence, not proof of current trading. Private request intents and response digests are retained; no repeated lookup is needed.

The candidate forward migration `20261017140000` removes the sale-policy **approval** dependency only from the free proof's claim/dispatch. The exact frozen policy identity/digest, verified owner/property/nonce/concept, expiry, processing holds, durable intents and budget guards remain. Full claim/dispatch still require an approved sale policy. The additional service-only reader returns the issued context only for the verified owner; no row or approval is seeded by migration. Old migration bytes and stored policies are untouched.

Application authority is separate for this free-only proof. Public source/commercial flags and Full authority remain false. The existing check page may load the exact issued case only after server identity verification; wrong/anonymous accounts cannot start it, and changing its property/concept is disabled. Database admission remains authoritative. Actual hosted migration, protected delivery, case provisioning, Production activation and live Ready/replay evidence remain pending until recorded; local tests are not live success.

Status: implemented and hosted Development verified; migration79 applied only to `sitefit-dev`. No Production migration/release, activation or paid request performed. [Development verification and protected-delivery receipt](controlled-proof-development-verification.md). This work does not reopen closed phases. The owner-selected US$0.95 is a cost-control basis, not authorisation to spend.

## Execution authority

Migration `20261017120000_controlled_proof_and_rights.sql` adds four private RLS tables and scoped SQL functions/triggers. It seeds no case or approval. Existing migration history is unchanged. Apply this migration before deploying its application changes: missing authority RPCs fail closed.

A database operator must separately provision the single exact confirmed non-anonymous purchaser, provider-verified canonical property, concept, submission nonce, expiry, approved frozen sale-policy snapshot/digest and verified tariff profile. A singleton prevents a second case. The application approval constant is false; configuration alone cannot enable execution. Later activation requires a separately reviewed application approval, exact environment case ID and enabled database authority. Address capture is blocked during the Production proof; property provisioning is a separate prior operation.

Database authority is checked before Snapshot submission. SQL guards fence analysis, payment and report graphs. Checkout preparation checks the same owned Free report and frozen policy; only one payment may bind. Full execution requires its existing owned leased fulfilment job, payment entitlement and supply conditions. Ready Snapshot reopening returns the stored report. Queue filtering does not lease unrelated or restricted jobs.

## Crash, retry and cost semantics

Before each external call, a locked SQL transaction commits its request identity, durable intent and admission reservation. Identity excludes credentials and normalises query order. A duplicate cannot send again, even after restart. Responses must be completely read and their digest acknowledged before receipt. Timeout, non-2xx, body failure or lost settlement acknowledgement leaves a blocking intent/intervention; no reservation is released. Manual reconciliation may investigate, but cannot reset/reissue the case through these functions. A crash after provider success but before report persistence is intentionally not automatically recoverable by paid redispatch.

Proof-only Snapshot semantic repair is disabled: at most four section requests and one synthesis request. Full retains its existing three-request maximum. Normal Snapshot repair behaviour outside the proof is preserved. Existing TfL/FSA transport retry loops remain outside the proof; within it, a second identical HTTP request is denied before fetch. PropertyData, Geoapify and EPC transports have no additional retry introduced. Distinct pagination/request operations remain possible, with aggregate host caps: PropertyData4, Geoapify2, TfL4, FSA2, EPC2. Postio is excluded from proof execution. Full permits no source retrieval. No SDK retry path is added to AI execution.

Atomic aggregate AI admission ceiling: **950,000 microdollars (US$0.95)**, max5 Snapshot and3 Full calls, max30,000 encoded AI request bytes, bounded output, verified default tariff and retained reservations. Existing Full-stage ceiling remains **US$0.30**, independently enforced; this change does not enlarge it. No tools, search, background responses, premium tier or redirects are permitted.

Snapshot admission preserves US$0.30 inside the aggregate for Full, so Snapshot intents cannot exceed US$0.65. The existing commercial US$0.30 reservation is the same Full envelope, not another allowance: effective combined reservation is Snapshot intents + max(Full intents, the commercial Full envelope). A locked trigger independently rejects an unrelated or excessive commercial reservation. Full intents still accumulate in the same proof counter, with their own US$0.30 ceiling. Development/test verification and question routes are denied unconditionally in Production; rent-search execution is also Production-disabled. Those paths must stay closed for this proof.

`node --conditions=react-server scripts/payments/check-live-proof-budget.ts` is offline. At the documented base tariff, conservative estimate is Snapshot US$0.4775 + Full US$0.2975 = US$0.775, leaving US$0.175 aggregate headroom. Full headroom is only US$0.0025. A 10% premium or20% tax sensitivity would exceed the Full-stage limit even if it fits the aggregate ceiling. Actual tariff, tax, credits and billing exposure must therefore be verified before activation. Byte/framing admission assumptions are not a guaranteed provider invoice cap. Stripe fees, source tariffs/credits, currency conversion and account-level automatic billing are separate and unverified; host request caps are not monetary provider caps. Historical unknown reservations are unchanged.

Reconciliation with the earlier US$0.8615: the earlier Snapshot allowance included eight possible calls (168,000 conservative input tokens and14,400 output tokens), estimated at US$0.564. The proof now allows five calls (155,000 input allowance and9,000 output), estimated at US$0.4775. The reduction is US$0.0325 input + US$0.054 output = US$0.0865. Full remains US$0.2975. This is a change in bounded request assumptions after removing repair calls, not a tariff reduction or a measured provider bill.

## Selective data rights: operator procedure

Use a privileged database operator session, never browser/service RPC credentials. Verify requester identity and lawful retention/exceptions externally; record a case UUID. Read `select public.sitefit_rights_plan('<owner UUID>');` privately. Review the plan and its digest. Invoke `apply_sitefit_rights_action(owner,case,'restrict',digest)` with the exact reviewed digest; fetch a fresh plan before each subsequent action. Stale plans fail. Actions are limited to `restrict`, `release`, `anonymise_profile` (display name only), and `delete_campaign` (only attribution joined to this owner). Anonymisation/deletion require an existing restriction. Every action is audited with actor/case/count/plan digest. Repeated eligible deletion is harmless; it cannot touch another owner.

Restriction blocks new analysis/payment/report/campaign processing, queue claims/binds, checkout preparation and provider dispatch checks; self-service profile updates cannot repopulate a held profile. It does not claim to cancel an external call already in flight or retroactively revoke a delivered email. Historical reports, payment records, receipts and legally retained evidence are preserved. This is selective eligible-data handling, **not complete account erasure or full anonymisation**. Auth identity, mailbox copies, Storage objects, backups and retained contractual graphs require separate lawful review/manual procedures; no general trigger bypass or graph deletion is supplied. No real-user deletion was tested or performed.

## Verification and release dependencies

Rollback-only PostgreSQL/PostGIS fixtures exercise denied roles/owners/properties/approvals, monotonic reservations, duplicate dispatch, expired/reused authority, restrictions, stale plans, selective changes, immutable report fingerprints, Snapshot replay and Full interruption. Mocked HTTP tests exercise concurrent dispatch, restart, credential rotation, timeout, response interruption, lost acknowledgement, request limits and proof-only no-repair behaviour. Existing lifecycle/security/contract/PDF fixtures remain required. These do not prove hosted concurrent transactions, provider billing or a live payment.

Before Production: protected PR/CI; explicit migration and deployment authority; targeted backup/preflight; hosted RLS/concurrency checks; actual purchaser/property/policy/tariff provisioning and separate bounded spend/activation approval. Checkout, AI, sources, runner, indexing and campaigns stay disabled. Existing processor/contractual hosting and other launch-register exceptions remain visible. Production stays on the current release until separately authorised.

Local verification: `npm run check` passed lint, strict types,375 tests and production build. After final SQL immutability/expiry checks, `npm run check:database` passed the full migration rebuild and rollback fixtures; focused generation/proof tests passed7/7. Local HTTP public/SEO checks, campaign/privacy checks and six blocked Production Snapshot demo states passed on loopback3022. All data/provider responses in execution tests were synthetic. Exact-head remote CI is a separate required delivery check, reported on the PR.


## Superseding configuration, not execution authority — 17 October 2026

Owner now approves SnapshotUS$0.65, FullUS$1.00, combinedUS$1.65 for the single case. Earlier amounts above describe the historical79 implementation. Forward20261017130000 changes only new-case limits and scoped commercial/admission functions, never historical holds. The commercial Full reservation is the Full dispatch envelope, not additional allowance. Ordinary commercial/Phase12 development reservations remain unchanged. Default request count/size, no-retry/intervention rules and false activation constant remain. Base planning estimate is stillUS$0.775, withUS$0.875 aggregate / US$0.7025 Full / US$0.1725 Snapshot headroom; larger admission is not a changed tariff, actual invoice cap or spending authorisation. [Verified changes and delivery boundary](public-legal-publication.md).
