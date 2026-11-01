# Three owner Full Report testing credits — 1 November 2026

## Authority

The current owner instruction authorises the minimal protected Production release, required forward schema changes and one idempotent three-credit grant to the existing verified `shahinst21@gmail.com` account. This supersedes the earlier no-Production/no-dashboard-change instruction only for this limited owner facility. Other customers, £29 Stripe pricing, existing entitlements, provider ceilings, historical reports and unrelated settings remain unchanged. Decision Edition preparation is permitted for these server-bound reservations; the general public replacement gate remains closed.

Production read-only identity preflight found exactly one permanent, email-confirmed Auth user, UUID `09d24746-3f49-4f77-9900-8ba428992dee`, with Google/email identities. Provisioning checks that exact UUID, unique email match and verified identity again. It fails rather than creating an account or granting another identity. No grant is executed on login, migration or deployment.

## Implementation

Two private RLS tables hold one immutable grant (fixed quantity 3, unique grant key and singleton) and exact report reservations. Browser roles and service-role direct DML are denied. There is no grant RPC. Operator-only provisioning uses `ON CONFLICT DO NOTHING` and verifies the existing grant, so rerunning never replenishes consumed credits.

The POST route accepts only a Free report ID and start/recover action, checks same origin, verified permanent Supabase identity and session, then sends the server-derived UUID to private RPCs. Browser emails, owners, quantities and grant actions are rejected. Account balance and controls appear only for the granted identity.

The existing fulfilment queue gains an exclusive payment/credit binding. Reservation locks the shared commercial control and owner's grant, checks exact owned frozen input, case, rights, rate, capacity and existing provider budgets, and inserts the credit reservation, normal queue job and trial-budget hold in one transaction. Unique case/Free/report bindings prevent duplicate editions. Stripe reservations count credit holds too; no ceiling increases. Provider holds remain conservative after failures even when the non-monetary credit returns.

Existing material, assessment, AI/checkpoint, calculation, frozen Decision Edition and private PDF boundaries are reused. Only SQL-confirmed running credit reservations enable Production Decision preparation and bounded durable map/routing intents. New credit reports require that edition. The account links to the original Full and its Decision Edition/PDF. Reopening, downloads and Ready replay do not reserve anything.

A Ready trigger verifies case/report/queue/source-receipt bindings and consumes the credit in the report's Ready transaction. Failed queue acknowledgement cannot spend another credit or lose the completed entitlement. Safe recovery retains the edition, reservation, proof token and accepted dispatches. Uncertain checkpoints cannot be blindly retried. Confirmed terminal validation failure releases the credit; timeout or unknown provider outcomes do not. Cancellation before any Full report/dispatch is operator-only. Released reservations cannot be resurrected.

No payments, sale contracts or Stripe events are fabricated. Complimentary consumption has a separate zero-revenue event; actual AI usage settles the existing trial ledger with a `complimentary:<reservation>` key. Purchase conversion/revenue queries continue to read real payments. Exhaustion prevents a fourth complimentary reservation and leaves ordinary £29 payment intact. Completed reports remain entitled independently of remaining credits.

## Verification and release

The PostgreSQL regression covers initial three, successful 2/1/0 balances, fourth-payment requirement, cancellation, invalid response, uncertain dispatch retention, safe recovery, replay, foreign ownership, historical reads, role grants and zero fabricated payment/revenue rows. Route tests reject cross-origin requests, forged identities/grants and anonymous/unverified/revoked sessions without external transport. Existing purchase/report/PDF suites remain mandatory.

Hosted rollback, concurrent reservations, required CI, browser inspection, release and actual Production balance receipts must be recorded after they run. The 3→2→1→0 sequence uses isolated fixtures so all three granted Production credits remain available to the owner.

Operator sequence: pass local/hosted/protected gates; capture Production artifact, function/report/payment/control fingerprints; apply the reviewed forward migrations; deploy and verify the reviewed main commit using normal Vercel controls; then run `supabase/operations/provision-owner-three-full-credits.sql`, repeat it to prove idempotence and verify the authenticated dashboard. If a mandatory gate fails, keep the prior Production artifact and do not claim activation.


## Verified development receipt

Node 24.12 / npm 11.6: `npm ci` and `npm run check` passed (lint, strict types, 555 tests, production build). Built-server public, marketing and measurement HTTP suites passed. The PostgreSQL integration covers the complete non-monetary lifecycle and unchanged paid regressions. A final targeted run also tests the exact provisioning operation against missing, mismatched, unverified and verified identities, including identical replay.

Hosted Development concurrency used isolated tables and namespace-rebased copies of the actual reservation/identity/budget functions: eight simultaneous requests for one report returned one reservation; eight simultaneous requests for other reports admitted exactly two more. Eight distinct PostgreSQL backends participated. Final fixture balance: three held, zero available; exactly three queue jobs and three provider holds, zero payments. No customer records, real provider calls, AI or Stripe transport were used. The shared commercial and existing trial ceilings were not increased. Production grant and release remain pending the protected gates.

## Production receipt and final settlement correction

Protected [PR162](https://github.com/shahinst21-hue/SiteFit/pull/162) merged as `b9a263ba4712d8ee2f5130c4c4a1ab4358f95ebf`; required PR and post-main CI passed. A Ready Production candidate was checked with deployment protection intact, then promoted as `dpl_3R5aDf3tQvE1FP8fvrkB2Sm3vGpW`. The four initial migrations passed a hosted rollback preflight and were then applied with migration records. No grant was embedded in them.

At 19:04 UTC on 1 November the exact verified owner received three credits. Repeating the actual provisioning operation returned the same balance: granted 3, remaining 3, reserved 0, consumed 0. Authenticated live account browser checks passed at 390/1280px with keyboard access and no overflow or page errors. Direct Authenticated table/RPC calls, anonymous use, CSRF, forged grant fields and a nonexistent report were denied; the real balance remained 3. Public, marketing and measurement live HTTP suites passed. Prior report/section/payment hashes, commercial/trial/runner controls, source releases, Vercel environment, project and domain settings are unchanged. No other grant exists. The previous Ready artifact is retained for rollback. No new Production report or Stripe payment was created to consume the owner's testing allowance.

Final path review found that the normal proof wrapper throws on a non-Ready validation result, so the worker records `execution_interrupted` even when its persisted checkpoint contains a confirmed invalid response. The forward `20261101191000` correction makes the existing settlement hook ask the existing strict terminal-failure validator after any intervention. Only persisted invalid checkpoints with fully received proof responses qualify; unknown intents/ambiguous outcomes still retain the credit. The regression uses the actual worker's conservative reason and checks automatic release. This changes no provider hold, report, grant or application runtime. Its protected SQL release receipt is tracked with the follow-up delivery PR.

The same review preserves the normal pipeline's deterministic unavailable group: `20261101191100` matches the credit Ready proof count to actual AI receipts rather than assuming three external calls. A skipped group must be context/premises, carry the exact deterministic prompt version and zero input/output/cost; all actual proof dispatches must still be received. Three accepted report checkpoints, owned immutable inputs, the frozen Decision Edition and every existing paid-branch guard remain mandatory. A successful two-AI-call fixture with one deterministic unavailable group consumes exactly one credit. No fake AI receipt or payment is introduced.

`20261101191200` makes funding exclusion bidirectional: credit admission already rejects pending/paid purchases; Stripe reservation now rejects an existing reserved/consumed credit for the same Free report after acquiring the shared commercial lock. A second tab cannot create a conflicting Checkout while the credited report is queued. The regression calls actual payment preparation and checks that its rejected transaction leaves neither a payment row nor a case payment binding. Other reports/accounts retain their paid flow.
