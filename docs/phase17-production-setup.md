# Phase17 — authorised Production infrastructure setup

14 October D108 verification supersedes initial DNS/Google findings below: correct A records, owner-authorised non-commercial Production build, real HTTPS and Google/PKCE pass. Source-only reuse and current checks are in [DNS/Auth/London receipts](phase17-dns-auth-london.md); original setup receipts below remain historical, not current activation instructions. Sales/AI/collection remain disabled.

Owner confirms `sitefit.co.uk`, `sitefit-prod`, project `vsfkkroxgntoumoqcfcy`, existing Hobby/Fluid and no purchase/Live/AI/campaign authority. This is database/configuration setup, not a main merge, application promotion or commercial launch. Phase15/16 stay closed.

## Target, isolation and migrations

Management API identity verified before every SQL submission: exact ref/name, ACTIVE_HEALTHY, eu-west-2 (London), PostgreSQL17.11. Organisation API confirms Free. Initial database 10,802,867 bytes, zero public application tables/users. No CLI project link or `.env.local` changed.

Applied all 75 existing approved migration files in order, recording original SQL in `supabase_migrations.schema_migrations`. Outer transaction markers were normalised only in submitted execution so DDL/history commit atomically; committed migration files were not edited. No development records, transactions, snapshots, source releases or historical reports copied. Separate publishable and secret Production keys retrieved privately, never published/committed or substituted with Development keys.

All 27 public application tables have RLS. Internal source/control/payment/sale/support boundaries retain existing grants and checked RPCs. PostgREST exposes public only, max_rows1000, search path public/extensions. PostGIS, Vault, pg_cron and pg_net are present; no cron job created, scheduler/execution/checkout remain false. The matching runner secret is staged encrypted in Vault; anon/authenticated cannot read decrypted secrets. No runner target/job or commercial budget approved/activated. Support allowlist empty. Read-only [setup SQL](../supabase/verification/production-setup.sql) is specifically for this empty, unactivated target; do not run the Development-only Auth probe against Production.

## Authentication and Vercel staging

Production Auth SITE_URL is https://sitefit.co.uk. Exact allowlist: /auth/confirm, /auth/callback, /purchase/callback on that origin, no wildcard/Preview/localhost. Guest sign-in and email confirmation are configured. Google remains disabled: existing Development Google credentials were not available for safe automatic reuse. No OAuth secret invented or copied as a placeholder. Custom SMTP absent; actual inbox delivery is not verified.

Thirteen Vercel values are staged in Production scope only: site origin, Production Supabase URL/publishable/secret keys, generated runner secret and disabled Test/verification/fulfilment/commercial/source/measurement/indexing flags. Sensitive keys remain Vercel Secrets. Exact raw stdin was used to avoid PowerShell pipe newlines; regular values were read back and compared successfully. Secret values were not revealed in readback. No Preview/Development setting changed, no deployment promoted. Existing AI/EPC credentials do not authorise a call.

App public Auth and privileged RPC client now both deny a Production Supabase URL outside the owner-confirmed ref. Development/Preview behaviour unchanged; deterministic isolation regression added.

Vercel accepted sitefit.co.uk and verified ownership, but DNS is misconfigured. Current A records 3.33.130.190 and 15.197.148.33. Vercel's current preferred IPv4 targets are 216.198.79.1 and 64.29.17.1; fallback recommendation 76.76.21.21. No registrar/DNS record changed. Preserve all MX/mail TXT records when updating apex routing. Hobby/Fluid and documented contractual restriction remain unchanged.

## Actual verification

Hosted rollback suites passed: ownership, account claims, purchase history, payment guards, full intelligence and commercial release. Synthetic rows and approval/control changes rolled back; no payment/provider/AI request or real sale. Initial fixture rollback-tail guard was adjusted for the ownership file's read-only PASS line after rollback, without changing that fixture.

Actual Production SDK/API check passed connectivity, verified one-time token identities, A/B profile isolation, foreign update denial, anonymous private boundary, guest session and signout. Synthetic Auth users created without email and deleted; baseline returned to zero. The initial probe incorrectly forced magiclink type for a newly created signup token; using the provider's allowed signup/magiclink type fixed the probe. This is not a Google, delivered email or browser PKCE proof.

Full check passed 347 tests, lint, types and build. Actual built HTTP passed 13 public pages/articles and13 internal paths, metadata/robots/404/address boundaries, campaign consent/withdrawal/disabled checks and six blocked Production Snapshot fixture states. Read-only initial setup SQL passed at23,746,227 bytes, below450,000,000; this is a measured PostgreSQL footprint, not a provider-billing metric. Production remains empty of users/reports/payments/source releases, with no paid holds. Development Ready digest a58fd24de5b7dc735daea8e3ce06914e, 27 Auth users and US$2.44 held micros unchanged. Scan of both environments'9 privileged values across654 repo/client-bundle files found zero matches. Protected delivery receipts are recorded on the setup PR after observation. No new subscription, main merge, Live payment, commercial execution or campaign activation.

## Remaining concrete steps

1. In existing DNS manager, replace apex parking A records with Vercel's recommended routing; preserve email records. Verify DNS/TLS after propagation. No purchase required.
2. Configure Google in Production Supabase using the existing approved Google OAuth client privately; Google Console must include `https://vsfkkroxgntoumoqcfcy.supabase.co/auth/v1/callback`. Do not remove the Development callback. Verify actual Google login after domain/deployment readiness. Use an existing SMTP service if email sign-in is required; enter credentials only in secure provider settings.
3. Production source release tables are empty. London datasets/adapters need separately verified loading/reuse of existing approved licensed evidence before new report generation. No source request/import was performed in this database-setup task.
4. Prepare the exact Live merchant/£29 price/webhook and approved contract/durable delivery, budgets and release controls. Obtain explicit application/main/Production activation and one bounded real payment-to-Ready/replay/PDF proof authority. Existing settings are preparation, not this permission.
