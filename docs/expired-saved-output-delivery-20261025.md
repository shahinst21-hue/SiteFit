# Stored-output delivery after execution expiry

Production readback on 25 October at 23:42 UTC found the original KT2 case and its rehearsal trial had expired at 19:06 UTC. Public customer admission is separate, but the original owner's stored recovery still inherited that execution deadline. PR142 alone therefore cannot recover this specific stopped case after expiry.

This forward correction separates received-output delivery from new execution permission. Current verified owner/access mapping, case/trial enable state, tariff provenance, rights holds, received dispatches, frozen sources and all report finaliser validations remain mandatory. No deadline is extended, allowance funded, intent reclaimed or external request retried. The existing subject trigger admits only a bound recovered free v2 Draft and its unchanged Draft-to-Ready transition. Analyses, payments and other report mutations retain execution admission. Original operator recovery is unchanged.

The explicit recovery route relies on verified session and database ownership rather than new-dispatch authorisation. Normal generation preflights owned saved output before requesting new execution authority. Without eligible material, its existing execution gate still applies.

Regression: actual migration/trigger suite runs the recovery graph both for a public guest and the expired permanent rehearsal owner, including forged sources/receipts, invalid projection rollback, lost replies, current rights holds and denial of new execution after expiry. Route fixture forbids the execution-authorisation RPC on stored-only recovery.

A rollback-only transaction in Production installed all six candidate forward migrations and completed the real frozen checkpoint: Ready storage with **Insufficient evidence**, five retained AI receipts, 17 frozen sources, unchanged failed history, zero new provider/AI dispatches and zero new payments. Existing held usage settled from receipts within the rolled-back transaction; this is not new spending. Nothing was committed by that rehearsal.

Forward SQL: `20261025235000_expired_saved_output_delivery.sql`, SHA-256 `626b533be655d7d1bd7ba7bfdecf29a88599f8f16c71fd66afad1b5f5e991071` (12748 bytes). The previous five-file PR142 manifest remains unchanged. Installation, exact-head CI and deployed browser verification require separate actual receipts.
