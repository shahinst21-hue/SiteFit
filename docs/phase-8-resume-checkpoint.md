# Phase 8 pause checkpoint — 8 October 2026

Paused at the owner's request because the laptop battery is running low. Phase 8 is **in progress**, not complete. Do not start Phase 9 or 10. The implementation checkpoint is commit `268434aee5048f3278afbf9d6ca71322b78b0406` on `codex/phase-8-data`, pushed to origin; delivery remains draft PR #24. This document is a subsequent documentation-only save.

Read `phase8_plan.md`, `phase-8-status.md`, the product/architecture/database/decisions documents and this checkpoint before resuming. Preserve the approved scope and frozen candidate scoring/prompt boundaries. No database upgrade purchase or request; no PropertyData subscription. No Production changes.

## Verified state

- Latest lint, strict types, 223 unit tests and production build pass. Fresh database rebuild and hosted provenance proofs pass. Thirteen public HTTP checks pass against the fresh production server on port 3001.
- Native Income/BRES owned distributions, enriched Evidence, stored walking geometry/station routes and projection 3 are implemented. Historical projection 2 reading remains supported.
- Development migrations through `20261008210000_enriched_free_report_provenance.sql` are applied. Never edit applied migrations.
- Actual ready report `6f54a12d-215f-458a-b366-09e294c40ff0` has 35 Evidence items and five sections. Actual `generateSnapshot` replay with provider/AI keys absent returns the same report and digest without provider/AI dispatch. This used retained sources; it does not prove the entire fresh generation pipeline or Preview.
- Five live GPT 6.1 Sol calls used 6,034 input / 379 output tokens, estimated US$0.015858. The owner approved up to US$1 for Phase 8 verification; preserve this cumulative budget and do not repeat successful calls unnecessarily.
- Whole development PostgreSQL database: 370,128,563 bytes. Headroom under the internal 375 MB ceiling: 4,871,437 bytes; under conservative 500 MB Free allowance: 129,871,437 bytes. Preserve capacity margin.
- PropertyData cumulative conservative development bound is 108 credits. No subscription or renewal approved. Secrets remain in ignored local environment/settings only.
- CI for the latest implementation head still needs to be checked. Phase 8 has not passed its complete Definition of Done or protected merge gate.

## First implementation issue to address after resuming

The applied enriched Evidence database guard checks each declared `lineage.parentSnapshots` member but does not independently require that the declared list equals the source payload's required parent. Runtime construction requires the parent, but deleting the declared list should also be rejected by database admission. Fix with a **new forward migration**, not an edit to applied history. Require the exact parent snapshot ID/checksum for dependent payloads and an empty list for roots; add deletion/alteration tamper cases and run fresh and hosted rollback proofs. This is an outstanding integrity finding, not a completed check.

## Remaining approved work

1. Address the parent-lineage finding; recheck immutable historical fingerprints using the original fixed cohort, excluding subsequently added reports.
2. Complete bounded official non-domestic EPC fallback after the demonstrated PropertyData gap. Three known UPRNs return real certificates, but owned fallback integration and selected trading-unit/current-certificate QA remain incomplete. Never retain restricted address fields or infer unit identity/currentness from certificate existence.
3. Complete expanded London/category/border/barrier/ambiguous/mixed premises QA. Resolve Overture entity/commercial cohort admission explicitly; record counts are not unique competitors. Do not fabricate scores, cohorts or missing metrics.
4. Prove fresh Local generation through the new complete collector, partial-source failure preservation, ownership/RLS and replay. The existing ready proof reused retained outcomes.
5. Obtain explicit Preview-only secret transfer approval for Geoapify/PropertyData/EPC when the dependent Preview gate is ready. Local access approval does not imply Preview transfer. Keep Preview protected and Production unchanged.
6. Complete actual Preview generation, browser/auth/privacy/accessibility checks, regression/security/PostGIS/storage/historical checks and exact-head protected CI/review/merge. Verify post-merge main/origin equality and clean tree only when all required gates pass.

## Local proof artifacts and safe continuation

Ignored working artifacts are retained in `supabase/.temp/phase8-implementation`; do not delete them during the pause. They are local scratch, not committed fixtures. Inspect scripts before rerunning: some dispatch real providers or AI. Prefer the existing recorded results and replay branches.

Important artifacts:

- `enriched-owned-context.json`, `enriched-owned-seed.json`: frozen synthetic owned proof context.
- `owned-native-context-proof.json`, `verify-owned-native-context.mjs`: admitted native distributions and zero-dispatch replay.
- `enriched-packet-preflight.json`, `verify-enriched-packets.mjs`: validated Evidence IDs and real packet inputs.
- `enriched-live-ai-proof.json`, `enriched-live-ai-partial.json`, `verify-enriched-live-ai.mjs`: successful bounded live AI results. Do not use the old projection embedded here for persistence; the corrected projection is constructed below.
- `prepare-enriched-finalise.mjs`, `enriched-finalise-parameters.json`: corrected projection and preserved Evidence IDs; no new AI calls required.
- `verify-enriched-evidence-prospective.ps1`, `verify-enriched-finalise-prospective.ps1`: rollback-only hosted admission/tamper proofs.
- `enriched-ready-submission.json`, `enriched-ready-replay-proof.json`, `verify-enriched-ready-replay.mjs`: saved submission identity and actual immutable replay proof. Keep private proof parameters local.
- `epc-known-uprn-discovery.json`, `probe-epc-known-uprn.mjs`: three actual official discovery results, without retained raw address responses.
- `check-enriched-packet-binding.txt`, `enriched-report-database-classification.txt`, `enriched-projection-unit.txt`: latest validation evidence.
- `historical-digests.sql`, `historical-after-constraints.json`: original ready-cohort fingerprint baseline; exclude external report `4119b769-de1a-454a-b6bb-8aeccd5eb88e` and new report `6f54a12d-215f-458a-b366-09e294c40ff0` when comparing the original cohort.

Development management helper: `supabase/.temp/phase8-implementation/supabase-management.ps1`. It uses existing CLI credentials in process memory and redacts SQL errors. Do not print environment values, credentials, private submission parameters or raw provider bodies. Use PowerShell JSON parsing with `-DateKind String` where exact timestamp strings are required.

At resumption, first inspect Git status, current branch/head, remote and existing server processes. A production server was started on port 3001; an older localhost 3000 process may also exist. Do not assume servers survive laptop sleep/restart. No new live proof, paid operation, deployment or migration was required solely to save this checkpoint.

## Resumed checkpoint — 9 October 2026

The battery pause above is historical. Subsequent implementation is on codex/phase-8-data, draft PR #24, with applied forward migrations through 20261008280000. See the latest dated sections in phase-8-status.md for authoritative progress. Real bridge, prohibited road-tunnel detour, railway underpass and nine additional catchment geometry checks now pass. Source-footprint gaps over Thames water are explicitly qualified. Lint/types/233 tests/build pass. Original repaired CTA/auth/Test Checkout and real 200% functional acceptance are owner-confirmed; final visual UX/UI is not approved for launch.

Browser Network privacy remains open; controlled Local HTTP response checks add evidence but do not replace it. Do not mark that gate passed or merge/declare completion. No new AI calls, persisted proof graphs, paid subscription, infrastructure upgrade, Production change, Phase 9 or calibration work is authorised by this checkpoint. Latest pushed checkpoint before these additions is a98bc2aa9f073ab2c40ebc57f2a4f55df86bfeac; final new-head CI and deployment still require actual verification.
