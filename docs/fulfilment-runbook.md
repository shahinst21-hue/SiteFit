# Fulfilment V1 operational runbook

Development/protected Preview only. Paid execution disabled; support deny-by-default. No operational AI budget exists. No main/Production action is authorised.

1. Payment pending: read the trusted purchase state. Use existing authenticated Stripe Test reconciliation/redelivery instructions; a browser success URL is not confirmation. Never create another Checkout session to repair an ambiguous payment.
2. Queued: inspect scheduler status and fixed target privately. Check capacity, exact Preview environment and SQL enable state. Do not create duplicate jobs or change ownership.
3. Running beyond five-minute lease: expect intervention. Inspect only safe checkpoints. An intent/ambiguous dispatch is an unknown paid outcome, never a resend permission.
4. Validation failure: retain accepted groups, all reservations and the Draft. Investigate only the safe field/rule using offline fixtures. No automatic repair, weaker validation or invented values.
5. Safe interrupted persistence: an approved support actor may resume only when the bound report contains no intent/ambiguous/invalid dispatch. The SQL function rechecks current entitlement and audits the action. Unknown executions remain blocked.
6. Ready/PDF failure: read stored content and retry export only. Never regenerate, rewrite evidence or overwrite an earlier edition. Report and PDF must retain the same digest.
7. Capacity/budget stop: preserve existing reports and unknown reservations. Report measured bytes/reserved amounts; do not purchase infrastructure, prune evidence or silently raise limits.
8. Reversal: preserve payment history and immutable report content; current entitlement controls reads/dispatch. Refunds and disputes use the existing trusted Test flow; support cannot override access.

Never paste raw requests, response bodies, keys, session cookies, Checkout URLs or Vault values into support records. Dashboard support reads only IDs, states, safe failure codes and timestamps. Support allowlist changes require separate approval of exact account IDs. Operational logs are diagnostic, not proof that a report is Ready.

Scheduler: Supabase pg_cron minute ticks, no network when disabled/idle; pending ticks are bounded to one per five minutes. Worker takes one job and has a 200-second invocation limit under a five-minute lease. Cron history for this job is retained seven days. Disable SQL control before rotating runner/protection secrets or changing target. Production remains refused by application policy.
