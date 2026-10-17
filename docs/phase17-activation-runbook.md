# Phase17 activation and rollback — prepared, not executed

16 October current checkpoint: [no-spend readiness](launch-no-spend-readiness.md). Owner defers all infrastructure upgrades until after campaign01; keep plans/settings unchanged. Production domain/Supabase/Google and14 stored releases are prepared, but Live Stripe, source credentials/allowances, approved sale/confirmation, backup/rights and genuine Live proof remain open. Older initial configuration inventory below is historical. Website copy/product scope and Phase15/16 stay closed. No new activation/spending permission is inferred.

This procedure records the approved implementation, not activation authority. Commercial controls remain default-denied. Keep Phase15/16 closed; resolve only their named launch dependencies.

## Release sequence

1. Freeze reviewed commit, exact-head CI, forward migrations, approved policy and release authority. Preserve £29 positioning, London coverage and existing report/dashboard/PDF.
2. Resolve launch-register approvals: adequate disclosures without invented personal particulars; final B2B/B2C policies, price, retention and supply treatment; actual durable confirmation channel/receipt; backup/data rights; exact Production origin/merchant; AI/source/operating limits. Hosting is owner-selected Hobby/Fluid; no upgrade/migration proposals. The documented non-commercial restriction is not resolved by that selection. Support stays disabled without exact account-ID approval.
3. Prepare the approved isolated Production database using the current service organisation, without purchase or switching Development to Live/copying Test customer data. Project creation/configuration needs the intended approved database and available free capacity; do not assume credentials or isolation. Rebuild migrations, load permitted versioned source releases under their licences, verify capacity, Auth/RLS/Storage/Vault/backup. Preserve Vercel Hobby/Fluid. Actual read-only account/project verification confirms Hobby and Fluid=true; runner maxDuration=300, parallel AI groups=45 seconds and Synthesis=120 seconds plus preparation/storage. This configuration is not a new operational proof. Retain existing pg_cron/pg_net scheduling; no new subscription.
4. Configure secrets privately and separately: Production Supabase, Live Stripe key/webhook secret, Live price/account, Auth callbacks, source/AI keys and runner secret. Never put them in chat/documents/PRs. Use an approved custom HTTPS origin; Preview/Local cannot become commercial through environment flags. Match the pinned webhook API version.
5. Match approved contract version in UI/application/database; verify actual durable delivery and trusted receipt before supply. Account/PDF download is not presumed delivery. Preserve statutory remedies and the additional 14-day consumer cancellation right; never backfill historic consent.
6. Deliver activation through protected workflow with an approved release manifest and private controls. Approve a commercial total AI budget separately from old development reservations. Separately fund/limit Free Snapshot and providers. Set Live mode only in the isolated database; configure Vault/target and enable scheduling only after runtime verification. Source collection, measurement and indexing each have separate guards.
7. Complete no-spend deployed checks. Obtain an exact bounded live-proof approval covering £29 transaction, processor fee/refund treatment, conservative AI preflight and any provider/confirmation costs. Use a permitted genuine transaction, not a fabricated payment. One report, maximum three calls, no retry. On failure stop, retain ambiguous holds and diagnose offline. Implementation approval is not this spending authority.
8. Verify signed Live confirmation, one job/hold/edition, contract receipt, browser-independent completion, Ready, unchanged replay digest, eight tabs and PDF exports. Reopen/PDF must make zero AI/source calls. Verify owner/reversal access and real campaign counts. Keep receipts; Test success does not prove Live. Enable indexing only after launch approval and actual public/private robots checks.
9. Execute campaign one, then two and optional three from Phase16 briefs only after channel/creative/audience/date/spend/stop approval. No advertising is currently authorised.

## Offline configuration preflight

Use the actual ignored Production environment file explicitly, never automatically load Development:

`node --env-file=.env.production.local scripts/check-release.ts`

Alternatively `npm run check:release` inspects only the current process environment. The command performs no network request or activation, prints only configuration booleans and existing fences, and exits nonzero while configuration/required approvals are incomplete. Candidate shape validation does not verify database isolation, secret ownership, Stripe merchant/price or actual delivery. Those remain the existing operational checks, not inferred passes. Keep all values in private secure settings, not chat or committed examples.

Historical inventory before D106/D108: SITE_URL, Supabase and runner settings and custom-domain connection were absent. They are now prepared, as recorded in the dated receipts; do not repeat those setup steps or copy Preview Test credentials. Stripe Live settings are still absent in the16 October read-only environment listing. Presence of OPENAI_API_KEY does not authorise execution. Never bind the shared Development database to Production.

## Stop and rollback

Pause Checkout with `SITEFIT_COMMERCIAL_ENABLED=0` and private `checkout_enabled=false`. Pause paid work with `SITEFIT_COMMERCIAL_EXECUTION=0`, `execution_enabled=false`, `fulfilment_control.enabled=false`; separately stop source collection/measurement if implicated. Do not clear intents, payment events, leases, historical editions or holds. Interrupted/ambiguous work needs intervention, never blind resend.

Retain approved read authority and webhook/account configuration while reconciliation is required. Sales pause must preserve report/PDF access and cancellation. Restore the last compatible reviewed application artifact, retaining forward database history; no destructive schema rollback or mode switch. Reconcile affected purchasers under approved support/refund procedures; real refunds need authority.

## Reproducible campaign evidence

With privately configured approved Production credentials:

`node --conditions=react-server scripts/marketing/export-campaign.ts FROM TO output.json live`

Use the existing results renderer/templates and briefs. Record actual channel traffic/spend, confirmed payments, retained sales/refunds, Ready/delivery and customer feedback. Missing traffic/spend remains Unknown. Do not mix Live/Test or invent historical attribution.

After 2–3 campaigns, evaluate willingness to pay £29, retained revenue, reliability, actual acquisition/processing costs and recurring objections. Small samples may be inconclusive. No invented profitability promise or conversion target; owner chooses further investment from real evidence.
