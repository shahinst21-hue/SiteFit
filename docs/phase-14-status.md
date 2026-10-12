# Phase 14 status

12 October 2026 — implemented work in progress, not a completion certificate. Authority D100; [execution plan](phase14_plan.md), [D99 proof result](phase-12-d100-proof.md).

Actual infrastructure: Vercel Hobby, Fluid Compute true; Supabase Free/ACTIVE_HEALTHY. Before writes 375,830,195 bytes; after proof and initial fulfilment migration 376,034,995 bytes. No infrastructure purchase. PostgreSQL extensions pg_cron/pg_net installed in development; named scheduler runs only the fixed dispatcher. Control disabled and support account allowlist empty. Paid execution remains hard-disabled in the worker endpoint.

Implemented: transactional future Test-purchase admission, unique queue, atomic claim/fencing, interruption/validation withholding, current entitlement checks before dispatch, safe support recovery, private audit metadata, bounded owner admission, durable customer progress and machine-only endpoint. Protected scheduling/network verification and final exact-head delivery remain pending.

Fresh PostgreSQL and hosted rollback checks verify duplicate job/claim denial, no Draft-to-Ready publication, foreign-owner progress denial, default support denial, wrong fencing token rejection and invalid-output recovery denial. All hosted fixture changes roll back. No customer report/evidence/input graph is changed.

The latest D100 paid proof failed the numeric-reference gate. Phase 12 Ready/replay/PDF is explicitly OPEN. Phase 14 Development/Preview does not authorise customer paid release, main merge, Production or Phase 15.

## Verified Development/Preview milestone

- `npm ci` on Node 24.12.0/npm 11; full check passes 328 tests, strict types, lint, fresh PostgreSQL/PostGIS/security and production build. Added expiration-after-freeze recovery and worker-exception tests; no supplementary geographic/editorial work.
- Actual hosted rollback checks and private scheduling verified: pg_cron 1.6.4, pg_net 0.20.4, Vault 0.3.1. One scheduled protected HTTP request returned 200 without timeout; job moved to awaiting_authorisation with zero AI/source calls. SQL dispatch disabled after the proof; no support IDs granted.
- Wrong/missing runner secret 404; caller spending override 400. Existing protection retained; no new bypass token. Actual deployment logs contain zero matches for runner/protection secrets.
- Actual signed-in Local Account and purchase-return display the saved queue state; closing/reopening the browser tab preserves it. Mobile 390px has no horizontal overflow or Ready link for an unready report. Keyboard mobile menu Enter/Escape and public shell smoke pass. No new real-200% acceptance claim; accepted Phase 13 milestone remains closed.
- Actual `check:public`: 13 public pages/articles, metadata, internal paths and address boundaries. Anonymous support/runner return 404. No new sign-in, Checkout or AI was triggered by these checks.
- Database after scheduler proof: 376,362,675 bytes, margin 73,637,325 beneath 450 MB; nine effective capacity guards, zero old guards. Historical Ready/rent/question fingerprints unchanged; all US$2.14 reservations held.
- Implementation commit `2129ddfb6b0ac6e0469ea4e80ab483a79c9b3965`: exact-head CI 38266913441 and 38266799062 success; protected Preview deployment `dpl_9LReRJ4dzaigH3sZUrDhNJjnBD9a` READY. Final Account/recovery changes and delivery receipt require their own exact-head CI before merge.

Preview: https://sitefit-git-codex-phase-14-reliability-shahinst21-hues-projects.vercel.app . PR #43 targets gated Phase 12 development, never main. Ready generation/customer release remain blocked by Phase 12. New operating spend, support account grants, main merge, Production and Phase 15 remain separately unauthorised.
