# Development reconciliation — approval candidate, 24 October 2026

Status: **owner approved and applied to Development; hosted read-back verified on 25 October 2026**. Target only the existing Development project `idlsjusbrmyucccostxt`. Production `vsfkkroxgntoumoqcfcy` is excluded. Existing audit findings remain preserved; this is their remediation record.

## Verified current state

- Current main/Production: `683c7f1847d0748e39d5005ca5d2cb1c25628d97`, Ready Vercel deployment `dpl_6Ay4Y5riwAw3SwHKX5pyewyUGend`; checked again through authenticated APIs.
- Development98 migrations versus Production107. The official CLI `db push --include-all --skip-vault --dry-run` against Development lists exactly the nine files below, no seed or roles. It did not apply SQL.
- Read-only object comparison: six tables and33 sitefit-named functions absent;12 existing function definitions differ;13 additional triggers in Production. Existing policies22/22. Function ACLs/security-definer flags, table RLS and trigger hashes were captured privately for comparison. Equal counts alone are not schema equivalence.
- Development has **zero controlled trials** and does not contain the historical Production trial UUID referenced by budget backfill. Commercial control remains test, checkout/execution flags false.
- Development `start_sitefit_full` has the previously authorised3040000-micro cumulative ceiling, whereas the historical base function used2440000. This deliberate Development difference must survive; it must not be overwritten with Production's definition.

## Exact migration scope (original applied files, unchanged)

| Version/file | Object changes and constraints | Data / environment considerations |
| --- | --- | --- |
| `20261021100000_competition_headroom.sql` | Creates competition_collections/pages; service-only RPCs, report/collection immutability guards; wraps provider admission and Full material read | No new budget/plan; retains75credit maximum and lower existing governor; renames implementation functions rather than deleting history |
| `20261021120000_audited_trial_budget_reconciliation.sql` | Creates controlled_trial_budget_events/commercial_reservation_events; append-only guards, reservation/receipt/release functions and Ready triggers; replaces corresponding ledger functions | Contains **Production-specific** adjustment/backfill DO blocks. They return without action if the historical Production trial is absent. Abort preflight if that trial exists; no adjustment or backfill is authorised in Development |
| `20261021130000_trial_ready_settlement_binding.sql` | Adds controlled-proof Ready-binding settlement trigger/function | No standalone historical report rewrite; receipt-valid settlement on future transitions |
| `20261021140000_trial_address_cap_40_reconciliation.sql` | Replaces owner-trial address reservation function, maintaining40request allowance | Does not create/enable a trial or change public Postio behaviour |
| `20261023210000_optional_source_failure_isolation.sql` | Replaces dispatch/settlement/completion/usage functions; distinguishes zero-money source uncertainty from ambiguous AI work | Retains intent history, provider caps and no redispatch; does not forgive ambiguous AI cost |
| `20261024090000_stored_source_snapshot_recovery.sql` | Creates snapshot_source_recoveries/dispatches, service/operator recovery functions and immutable guards | No recovery is executed by applying definitions; no Ready report rewrite |
| `20261024110000_catchment_extent_coverage.sql` | Adds fixed official BFE extent function, retained bng2 implementation, new measurement wrapper and owned extent read | Includes explicit BEGIN/COMMIT;414KB SQL mainly constant geometry, no paid source call |
| `20261024130000_native_census_coverage.sql` | Adds independent native partition helper; replaces measurement/extent read with version4 contract | Includes explicit BEGIN/COMMIT; allocation/formula unchanged,1mm strip is diagnostic only |
| `20261024150000_snapshot_policy_reference_storage.sql` | Replaces private saved-completion operator to remove decision metadata only from narrative | No new grant, execution or historical report update; existing evidence/receipt/ownership checks retained |

New tables: competition_collections, competition_pages, controlled_trial_budget_events, commercial_reservation_events, snapshot_source_recoveries, snapshot_source_recovery_dispatches. Each has RLS and no direct authenticated/public access. No existing table is dropped/truncated; no customer/report/payment data deletion is part of the files.

## Rehearsal and rollback limitations

`node scripts/qa/rehearse-development-schema.mjs` reconstructed the98-version baseline in disposable PostgreSQL/PostGIS (PGlite), reproduced the existing Development3040000 ceiling, created an ordinary synthetic user sentinel, then applied the nine original files. Competition/extent RPCs appeared; all six tables had RLS and denied authenticated direct SELECT; no Production budget adjustment was seeded; the sentinel and Development allowance remained unchanged. External calls0. This is a fixture rehearsal, not a hosted migration result or proof about all existing Development rows.

An initial rehearsal demonstrated that **one outer ROLLBACK does not undo the whole batch**, because two files explicitly commit. The final rehearsal applies files as authored in a disposable database and claims no batch rollback. Migration application is not reversible merely by deleting history rows. Before remote application preserve the actual pre-change schema definitions/ACLs/trigger inventory and migration metadata securely. Existing stored test reports/payments must be fingerprinted read-only before/after. If a file fails, stop at the exact committed boundary; inspect objects/history, never blindly replay or fabricate an applied version. Once new data uses these tables, do not drop them as rollback; restore compatible application behaviour or prepare a reviewed forward correction.

## Proposed remote procedure — requires owner approval

1. Re-read identity, history98, zero controlled trials, absent Production trial, no partial new objects, capacity and Development-specific allowance. Abort on drift.
2. Use isolated `.vercel/development-reconciliation` CLI workdir, copied original migrations and explicit `--project-ref idlsjusbrmyucccostxt`. Verify source file hashes against repository. Never use the Production-linked default workdir or expose database credentials.
3. Repeat official dry-run; exact nine-file list only, no seeds/roles. The reviewed read-only command is:

   `node node_modules/supabase/dist/supabase.js db push --project-ref idlsjusbrmyucccostxt --workdir .vercel/development-reconciliation --include-all --skip-vault --dry-run`

4. **Only after approval**, execute the same command without `--dry-run`. `--skip-vault` is mandatory so no Vault configuration is changed. Do not include seed/role options. Keep ordinary test generation idle during reconciliation.
5. Read back107 versions, exact intended objects, RLS/privileges/triggers, retained allowance, unchanged gates and before/after existing test record fingerprints. Check no Production trial/adjustment was introduced. Use existing migration tracking; no history repair or re-execution of the98 applied versions.
6. Verify actual data releases and provider/AI capacity before spending. Schema parity alone does not grant external dispatch. Competition page admission additionally requires a valid bound controlled-proof execution; an ordinary Preview request must not bypass that governor. Any necessary bounded Development acceptance configuration must remain restricted to Development/test identities and Stripe Sandbox, separately from Production activation.

Approval requested: **these nine reviewed Development migrations only**, with the guards and rollback limitations above. No Production migration/deployment, new allowance, public activation, live Stripe payment, Vault change or ad configuration is included. Fresh acceptance remains capped at the previously authorised aggregate£5, currently unspent by remediation.

## Hosted execution result — 25 October 2026

The owner explicitly approved only Development according to this plan. Immediately before application, read-only preflight confirmed98 migrations, zero trials and382662323 database bytes. All nine source/copy SHA256 values matched the manifest. A repeated official dry-run listed exactly the nine authorised migrations, no seeds or roles. The explicit Development command with `--skip-vault --yes` completed successfully; no migration file was changed.

Hosted read-back confirmed107 migrations. Fingerprints of all41 analyses and37 reports were identical before/after. The existing `start_sitefit_full` definition hash was unchanged, preserving its Development allowance. Both newly introduced budget-event tables contain zero records. All six new tables have RLS enabled and deny SELECT to anonymous and authenticated customers. Zero trials remain. Production was not targeted.

Private command logs/catalogue/fingerprints are retained under ignored `.vercel/remediation-*`. This verifies schema application and these specific invariants; it does not claim fresh report, payment or PDF acceptance.

The Development controlled-proof table is empty. The existing Competition page governor requires a bound active proof; Preview's current proof activation is Production-only. Fresh paid-provider acceptance must use a narrowly bounded Development execution authority, never bypass the governor or borrow Production authority. No fresh execution or external charge has been initiated.
