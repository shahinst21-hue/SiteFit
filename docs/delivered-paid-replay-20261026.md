# Delivered paid edition replay — 26 October 2026

An actual Production replay of the previously verified Live paid report found that the new recovery RPC attempted shared-ledger settlement even when its report, case and delivery job were already complete. That historical purchase predates the shared reservation ledger, so settlement correctly refused a missing reservation. Normal report/PDF reads remained available; the failed verification transaction rolled back.

The additive `20261026003000_ready_paid_replay.sql` returns that same edition only after all existing owner, payment, environment, entitlement, supply, checkpoint and received-case graph guards pass and both delivery job and case are already complete. It does not invent historical funding, change ledgers or skip settlement for an interrupted current case. Unknown outcomes and incomplete deliveries retain their existing intervention and settlement requirements.

The fresh actual SQL suite adds a legacy completed case with received checkpoints and **no shared ledger reservation**. Repeated recovery must return its immutable edition with no financial event or rewrite. Existing current-case exact settlement, unknown-outcome holds, foreign-owner, refund and mode tests remain active.

Production rollback rehearsal with the real previous Live payment passed twice: same immutable edition/content, payment count, dispatch count and budget; foreign Full reads and recovery both denied with SQLSTATE42501. Protected CI, merge and actual installation are separate receipts.

## Initial-launch operating check

Run `npx supabase db query --linked --project-ref vsfkkroxgntoumoqcfcy --workdir . --file scripts/operations/launch-health.sql --output json` from a credential-free checkout using the existing authenticated CLI. This is read-only and prints bounded alerts, capacity, recent stopped reports and scheduler state. It never claims/retries work or prints customer content, credentials or reusable purchase links.

For the initial low-volume launch, inspect this check and Vercel runtime logs before opening traffic and after customer activity. This is operator monitoring, not an installed push/email alert service. `snapshot_persistence_failure` emits finite reason/SQLSTATE codes; report/job state remains authoritative. A paid-delivery alert means inspect the original job and received/unknown checkpoints; never create another Checkout or resend ambiguous AI work. Use saved-output recovery only when its database guards permit it.

At an address/AI/storage capacity stop, preserve saved access and close new admission through the existing controls; do not reset counters or buy capacity. The current address fence remains40 requests. Headroom is requests, not customers, and concurrent requests can consume it. A closed entry gate at exhaustion is expected, not evidence that existing reports are lost.

Application rollback target retained before this release: `dpl_5BFQYjQwCBcpa6wr5L1MZkz8DLmj`. The old application was still serving owned report/PDF reads after the six additive migrations, demonstrating read compatibility. The new app is `dpl_6kMnW2uS9hnwrjJYXz3QjUyExSHa` / commit`4e61f24a307719388b58e7676c8fbcbcc8f18bb6`. Use the existing Vercel Instant Rollback/CLI workflow for an application regression; retain migration history, Ready reports and financial audit rows. Do not delete evidence or revert schema destructively. An actual rollback switch was not exercised in this release.

The expired rehearsal account also no longer enters the public address form and then fails at execution authorisation. Its entry page shows the existing saved-status path. Ordinary public admission and the separately active rehearsal override are unchanged. An actual server-page regression covers expired owner, ordinary customer, active rehearsal owner and exhausted public capacity. This preserves the original owner's spent/expired test authority; it does not silently treat another paid owner test as a public purchase.
