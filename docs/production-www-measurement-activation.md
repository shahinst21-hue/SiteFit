# Production www and consented measurement activation — 23 October 2026

The owner explicitly authorises resolving launch items 3 and 4: www TLS/canonical redirect and Production Google measurement. Advertising campaigns remain paused; public purchasing/execution, controlled owner limits, AI/provider budgets and credentials are not activated or changed by this scope.

## Domain

Added only www.sitefit.co.uk to the existing sitefit project as a 308 redirect to sitefit.co.uk; apex-variant auto-add was disabled. No purchase or DNS change. Vercel reports Valid Configuration. Actual system-verified HTTPS request returned 308 to https://sitefit.co.uk/privacy?www_verification=1, preserving path/query; HTTP first upgrades to HTTPS www. No certificate validation bypass.

## Measurement prerequisites and narrow change

Production preflight found the Google observation tables/functions absent and both existing migrations 20261022160000/20261022180000 unapplied. Required parent tables/functions exist. Database measured 375,428,787 bytes beneath the existing 450,000,000-byte checkpoint. Exact payments, immutable Ready reports and controlled-trial budget digests are retained privately for readback.

The old configuration disabled every measurement event whenever owner-proof controls were on, coupling consented visit collection to opening public execution. Remove only that coupling: explicit Google flag, exact Production origin, dated cutover and Basic Consent Mode remain mandatory. Public sales/owner/budget flags stay unchanged. The already-reviewed SQL separately excludes controlled-proof payments from real purchase conversions. Regression tests exercise that exclusion, test/live isolation, persistent deduplication and consent.

Apply the two exact existing additive migrations through authenticated Production tooling only after protected CI/merge. Preserve migration history and install each once atomically; create no Preview debug authorisation in Production. No rewrite of old payments/reports, no backfilled Google events. The cutover excludes historical tests. Only the two Production Google activation/cutover variables may change; other environment scopes/keys retain their recorded digest. Redeploy the protected main commit with required checks green.

## Verification and recovery

Pending actual receipts: full local/CI/public checks, Production migration transaction and readback, environment update, protected Production deployment, live anonymous consent/Google loader checks and withdrawal. Existing payment/PDF evidence remains separate; no new payment or report is required. No DebugView troubleshooting or change to GA4 filters.

Rollback: switch off the Production Google flag and restore the prior working application deployment if a critical regression occurs. Retain the additive observation schema, migration records and any dispatch audit rows; do not erase conversion history to make a retry possible.
