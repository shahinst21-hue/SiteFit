# Phase 7 status — Test Mode payment and permanent account continuity

Started 2026-10-06. Owner approved [phase7_plan.md](phase7_plan.md) Steps 7.0–7.9, the narrow access-claim architecture and proposed test refund/reversal policy. **In progress; no completion gate is claimed.** Phase 8 remains unauthorised.

## Approved amendment

Checkout uses the verified permanent account email as server-side `customer_email` when available. Freeze that contact value in the durable attempt's immutable creation parameters for identical retries. It never authorises authentication, account ownership/claim, entitlement or report recovery. Supabase verified identity and immutable internal account/analysis/purchase bindings remain authoritative. Raw attempt parameters/contact values are private, excluded from browser responses, telemetry, safe errors and documentation.

## Step evidence

| Step | State | Evidence / remaining gates |
| --- | --- | --- |
| 7.0 | In progress | Approved plan PR #19 merged through exact-head successful protected CI; baseline main `ccec226a1b1ed3baf5d169c53557e7114b9e7be0`; implementation branch `codex/phase-7-payments`. Node 24.12.0/npm 11.6.2. Locked `npm ci` passed after stopping the prior dev server (0 audit vulnerabilities). Baseline `npm run check`: lint/types/114 tests/build passed. Hosted baseline: 0 payment rows, 13 ready free reports. |
| 7.1 | Implemented; broader adversarial gates pending | `20261006150000_guest_account_continuity.sql` applied to hosted development after fresh rebuild. Fresh and hosted rollback claim SQL passed: original lineage hashes unchanged, authorised target replay/history, third-owner isolation, consumed guest denial, private capabilities and idempotent claim audit. Generated hosted types; lint/types/build passed before resume route addition. |
| 7.2 | In progress | Bounded same-origin purchase gate, Google linking/existing sign-in, email change/existing sign-in, PKCE callback and private claim/resume routes implemented. Five targeted unit tests passed. Actual Google/email and complete adversarial/UX gates remain pending. |
| 7.3 | In progress | `20261006170000_test_payment_integrity.sql` applied to hosted development after fresh rebuild. Fresh and hosted rollback SQL passed and cover private frozen email/attempt parameters, permanent ownership, safe purchase projection, atomic receipts/access, duplicate and stale events, pending/failed/full refunds and unchanged historical rows. Generated hosted types. Broader concurrency/reversal/grant matrix still pending. |
| 7.4 | Implemented; wider real proof pending | Official `stripe@23.0.0`, pinned retrieval API `2026-09-30.endive`; card-only fixed GBP 2900 Checkout. Actual Local cancellation/retry reused the same Session; official decline granted nothing; subsequent official success on that Session confirmed through actual webhook. Expiration/concurrency/Preview remain pending. |
| 7.5 | Implemented; real delivery/adversarial proofs pending | Bounded raw signature endpoint, test/API/Connect checks, allowlisted events, provider re-reads and SQL revision CAS/atomic receipts. Official signature and reversal unit tests pass. Actual webhook and full ordering/concurrency matrix remain pending. |
| 7.6 | In progress | Ready Local/Preview Snapshot CTA, automatic Auth/claim resume with Strict intent cookie, private purchase return/status, bounded read-only polling and paginated minimal account test access. Production outline/finance preview retained. Real recovery and all UI/keyboard/zoom gates pending. |
| 7.7 | Pending | Real protected Preview Google/email/Stripe/ingress proofs. |
| 7.8 | Pending | Complete regression, hosted SQL/RLS/security, secret/privacy checks. |
| 7.9 | Pending | Final evidence, exact-head CI/protected merge/post-merge CI/clean matching main. |

## Current validation

Latest complete `npm run check` passed lint, strict types, 134 Node tests (20 additions, including fresh PostgreSQL/PostGIS) and production build. The subsequent expired-proof rotation and cancellation-copy edits await a final repeat. Expanded hosted rollback claim/payment suites and actual `npm run check:auth:hosted` passed. Inbox delivery/browser PKCE remain separate from that synthetic Auth probe. No paid AI, scoring or report regeneration was invoked; rollback rows are not retained.

## External gates

Stripe test Product/Price/secret and distinct Local/Preview webhook secrets; hosted development Supabase manual linking/Google provider/email-change capability; protected Preview webhook reachability/redaction; human inbox/Google/real 200% zoom proofs. Owner confirmed development Google/manual linking and Local callbacks configured. Actual public development Auth settings now verify Google enabled; email/anonymous enabled and email confirmation retained. Real new/existing Google and inbox proofs remain pending. Stripe test key already available; test Product/Price verified and Local origin/enable flag saved. Webhook signing secrets/Preview config still pending. Request owner action only when the corresponding actual proof is ready; continue independent approved work. No credential values are requested or printed.

## Definition of Done

All 23 required gates in [the approved checklist](phase7_plan.md#15-definition-of-done--all-pending-none-waived) remain pending. Record individual observed proofs here before marking any gate complete. No Full Report, financial calculation, PDF, Phase 8 data/provider/AI, live payment, Production purchase, subscription or deferred distributed infrastructure is authorised.

## Deviations

Owner-approved frozen Checkout-contact-email amendment retained. Concrete security review found broad service DML could bypass guarded writer RPCs; forward `20261006190000_phase7_narrow_writers.sql` revokes it and adds proof-bound cancellation. Fresh and hosted rollback security tests pass; hosted types regenerated. This is a narrow permission correction, no new architecture or waived gate. A ten-minute signed HttpOnly continuation receipt covers DB-write failure after a consumed PKCE code; it supplements fresh `getUser`, both guest proofs and SQL checks, never authenticates or grants ownership by itself. Its wrong-target/method/proof/key/expiry tests pass.




### Local Test Checkout observation

Actual hosted Checkout Sandbox accepted the official fictitious test card at GBP 2900. The initial CLI delivery was rejected (HTTP 400), and the return page did not grant access; finite polling stopped with an Account/refresh path. Investigation found the development event envelope uses stable 2026-08-26.dahlia while the SDK retrieval adapter pins 2026-09-30.endive. The envelope is now explicitly pinned to the observed dahlia version; all authoritative objects are re-read through the pinned adapter and mode, account, signature and purchase binding checks remain enforced. Controlled redelivery and subsequent real delivery remain pending. Synthetic verified-account sign-in used the actual confirmation form and Account history; this does not prove email inbox delivery or Google sign-in. Responsive login checks at 360/375/390/430/768/1440 and required-field/keyboard focus passed.


Actual stored Stripe Test Mode completion event replay returned HTTP 200 twice; hosted counts were one attempt, one succeeded payment, one active access and one semantic confirmation. Browser refresh showed **Test payment confirmed**, with Full Report generation explicitly unavailable. A full fictitious GBP 2900 refund then produced two actual official CLI deliveries, both HTTP 200. Hosted access became revoked/payment refunded. SHA-256 comparison across original analysis, property, inputs, data snapshots, evidence, competitors, premises events, economic models, reports, report sections and PDF rows was identical before/after refund; analysis remained free_ready and Full Report count remained zero. These observations do not replace remaining decline/cancel/expiry/Preview or Auth gates.

`20261006200000_payment_reversal_admission.sql` passed fresh rebuild and was applied to hosted development; expanded hosted rollback payment suite passed. It closes SQL CHECK null-version admission and enforces the approved lost-dispute re-purchase block. This is a concrete integrity correction, not a new architecture. Six injected webhook service tests passed; a test-double typing mismatch was corrected and full strict-type/final regression remains pending after those edits. Local confirmed-state screenshot is retained privately under ignored development evidence.

Latest complete npm run check passed lint, strict types, 134 Node tests and production build, including expanded fresh migration/reversal tests. Actual public HTTP/SEO/404 route check passed. Privately scanned six configured privileged secret values against 281 source/client files: zero findings. Browser request/HTML/runtime log checks remain distinct pending gates. Actual anonymous manual-address UI correctly rejected missing usable coordinates before provider/AI collection; a labelled synthetic ready Snapshot in that same real guest session was readable without signup, and its purchase CTA opened the permanent-account gate. Manual linking exposed the SDK contract that returns a direct Google provider authorisation URL; the server now admits only exact Google OAuth paths with this project's Supabase callback, with spoofed host/path/callback and sign-in-versus-linking tests. Real owner Google completion remains pending.

Owner completed actual Google sign-in. Direct linking returned the expected existing-account conflict without claiming ownership. Existing-account Google sign-in then completed actual PKCE, one authorised claim and automatic Test Checkout. Hosted reads confirm permanent target binding, original historical owner/report identity and `free_ready` unchanged, one claim audit and frozen verified contact. This observation does not claim a captured pre-claim full-graph hash or new-Google/inbox proof. Expanded fresh and hosted rollback claim suites separately passed lineage hashes, cancellation, expiry, rotated proof rejection and cross-method intent denial. Reopening an expired/cancelled continuation creates fresh proofs; current pending flows retain their bounded proof.

The real Google-owned Local Test Checkout was cancelled through Stripe's visible back link; return retained the Snapshot and no access. Retrying its Snapshot CTA reused the identical Session. Official fictitious decline card failed, actual CLI delivery returned HTTP 200, hosted payment stayed pending/access none. Retrying with the official success card on that same Session returned to **Test payment confirmed**; actual CLI deliveries returned HTTP 200. Hosted state is succeeded/active with the same report and historical owner, and no Full Report generation. A safe confirmation screenshot is retained privately. These are real Local proofs, not simulated webhook triggers; Preview and remaining Auth/recovery/expiry gates are still open.

### Latest regression and Local recovery evidence

After the expired-proof/cancel-copy edits, the complete check again passed lint, strict types, all 134 tests and production build. Running production server passed public HTTP/SEO/404/address boundaries and all six production Snapshot-demo denial checks. Actual Local HTTP checks passed 18 CSRF/raw signature/timestamp/body-boundary cases; signed unrelated events are safely ignored without generation. Actual hosted Auth regression passed separately with its scoped synthetic accounts removed. Account history showed the original claimed report and active test access; Account layouts at actual viewport widths 360/375/390/430/768/1440 had no horizontal overflow. Earlier immediate viewport reads that had not settled were not counted as evidence. Real 200% zoom and other required new surfaces remain pending.
