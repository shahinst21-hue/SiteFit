# Unavailable catchment evidence persistence — 25 October 2026

Implementation candidate; not applied or deployed. This is a narrow Snapshot
reliability correction, without new sources, scoring, spending or public authority.

The owner-reported Kingston Coffee Shop check reached seven of eight confirmed
steps. Production readback found 17 frozen source results, four validated sections,
five received AI dispatches and a saved synthesis. Its failure was
`report_persistence_failed`, not address rejection or AI transport failure.

The five-minute Census tables explicitly stored `outcome=unavailable` and
`operands=null`. Evidence correctly withheld all four values, but cited nonexistent
`operands/censusEstimates/0` children. The actual SQL integrity trigger rejected
those references with `enriched_evidence_operand_path`. A rolled-back insertion of
the original checkpoint reproduced that precise failure.

New generation now cites the existing null `operands` field for an unavailable
Census table and the existing null `inventory` for an unavailable Places range.
Successful and partially qualified numerical operands retain their exact paths.
Nulls remain unavailable; no population, competitor count or score is invented.

Forward migration `20261025200000` additionally allows the old Census child path
only for explicitly unavailable, null-valued derived evidence matching the frozen
table's dataset, release and walking duration, with a stored null operand and an
unavailable table outcome. Existing source/checksum, owner/input, release, licence,
parent and available-value checks remain unchanged. The helper is private. Applied
migrations, failed checkpoints, reservations and Ready reports are not edited.
No recovery runs merely by installing the migration.

The existing operator-only, zero-dispatch saved-completion function remains the
recovery boundary. A real Production transaction temporarily installed the
correction, replayed the exact received checkpoint and obtained a version-2 Ready
report. It verified unchanged original report fingerprints and dispatch count,
then rolled back the report and schema changes. That proves deterministic
completion, not a persistent customer-visible recovery. Private source material,
candidate and rollback receipts stay in the original checkout's ignored `.vercel/`
directory; no customer data or credentials are committed.

Local automated and protected delivery results are recorded below when observed.
Production migration and persistent recovery require explicit owner approval;
fresh AI/source calls are unnecessary for this saved report. Rollback after a
real release must preserve any newly created immutable Ready report and history.

Verification: Node 24.12.0/npm 11.6.2 and `npm ci` passed (zero dependency audit
findings). `npm run check` passed lint, strict types, 496 tests including the fresh
PostgreSQL/PostGIS security rebuild, and production build. The additional actual
evidence-trigger regression independently reproduced the pre-fix rejection and
passed after the migration, including refusal of forged values, available nulls,
missing/wrong paths, checksums and releases. Public HTTP checks passed 16 public
pages/articles and 16 internal paths with metadata/security boundaries. The real
local checker was inspected at 390px and its keyboard skip link was verified.
No live address search, new analysis, payment or provider call was performed.
