# Phase 14 — reliability and restricted support

Approved 12 October 2026 under D100, Development/protected Preview only. Phase 13's accepted Preview milestone stays closed. Main, Production and Phase 15 are excluded. Phase 12's new V1 Ready/replay is a separate release blocker, not a requirement waived by Phase 14 development.

## Execution and acceptance

14.0: inspect actual plans, execution limits and capacity. Actual Vercel Hobby has Fluid Compute enabled; Supabase organisation is Free. Fluid Hobby permits 300 seconds; the existing bounded generator/worker requests 200 seconds. Vercel Hobby Cron is daily, unsuitable for timely recovery. Supabase exposes pg_cron/pg_net/Vault without another subscription. Provider references: [function limits](https://vercel.com/docs/functions/limitations), [Cron intervals](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Supabase scheduler](https://supabase.com/docs/guides/cron). Commercial Production eligibility of the Hobby plan must be checked before launch; Preview verification does not approve commercial hosting.

14.1: one durable fulfilment record per confirmed Test purchase, exact frozen Free/Full input binding, service-only admission and atomic claims. Future payment confirmation queues work transactionally; an admission failure is logged without discarding payment confirmation. Existing payments are not bulk-backfilled.

14.2: one worker per claim, five-minute fencing lease, no provider retry and no legacy semantic repair. Recheck current entitlement/binding/lease before every inference. Expired work becomes intervention; it never gains permission to resend an unknown dispatch. Safe explicit support resume admits only a bound execution with no intent, ambiguous or invalid dispatch. Accepted checkpoints and Ready replay reuse the existing engine.

14.3: paid execution remains disabled in the HTTP worker; no operating allowance has been approved. Existing Phase 12 reservation/capacity guards stay authoritative. Reserve before external calls; unknown reservations never reset. Owner admission permits at most five new jobs per ten minutes, enforced under a database lock. New storage uses the 450,000,000-byte checkpoint. One job per worker invocation; scheduled network ticks are at least five minutes apart, only when work exists. No-work ticks perform no network request. Cron run history for this job is bounded to seven days; immutable reports/payment/evidence history is never pruned.

14.4: extend existing purchase-return/status and Account access, not dashboard design. Payment confirmation and preparation are distinct; visible progress uses persisted states/stages, bounded polling stops on page hiding, and reopening reads saved state. Only Ready yields a Full Report link. Existing reports/dashboard/PDF retain their frozen contracts. No email service is introduced.

14.5: minimal metadata-only internal support, default denied in SQL until exact verified account IDs are separately approved. No raw AI/payment payloads, keys, addresses or unrestricted source bodies. Inspections/resumes are audited. No entitlement edits, report editing, automatic refunds, budget resets or ambiguous retries.

14.6: proportionate offline execution/failure/concurrency fixtures, actual fresh PostgreSQL/RLS and hosted rollback checks, redaction, HTTP/keyboard/responsive smoke, production build, exact-head CI and protected development PR. Never label a fixture a paid live-generation proof. Paid customer release remains blocked by Phase 12 and later launch gates.

## Runner boundaries

The new machine-only POST endpoint accepts no work identifiers, callback URLs, policy or spending switches. It requires an exact secret and Development/Preview configuration. PostgreSQL scheduler target is an exact branch Preview URL. Vault holds runner/protection secrets; they never enter source, URL queries, logs, browser bundles or support output. SQL control defaults disabled. Production is refused even if environment flags are supplied. No new subscription or platform has been added.

Acceptance requires actual duplicate admission/claim denial, interrupted/invalid dispatch withholding, current ownership/entitlement, immutable historical digests, default support denial, scheduling and worker response verification, and passing protected delivery. Failure of any required check remains recorded, not assumed passed.

12 October launch dependency: verified [Vercel Hobby terms](https://vercel.com/docs/plans/hobby) restrict use to non-commercial personal projects. Commercial launch eligibility is not established by free execution capacity. No upgrade, trial or purchase is authorised or activated; owner must resolve this before public sales.
