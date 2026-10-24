# Failure analysis — independent audit, 24 October 2026

این ثبت، خطای بازتولیدشده را از سابقهٔ حادثه و خلأ تأیید تفکیک می‌کند. بررسی محلی روی `2933fbc0353c4b55a1f6e0919b12dc707dc7b3c2` انجام شد؛ هیچ تغییر Production یا فراخوانی پولی از این بخش انجام نشد.

## REL-01 — Optional-source batch deadline can still stop the whole Snapshot

**Severity: High. Status: confirmed component behaviour + deterministic orchestration consequence; current Production frequency unknown.**

- Trigger: an optional adapter outlives the collector's batch deadline, or its final persistence cannot complete before that deadline. This differs from a quick HTTP 503 returned while the deadline is still live.
- Reproduce: run `node --conditions=react-server --test tests/data-collect.test.ts`. The existing ignored-signal test uses a 20 ms isolated deadline; it observes `timeout`, no source row, no late persistence, and no external requests. Contrast with the fast failed-source test, where all three outcomes, including explicit unavailable, are persisted.
- Expected product behaviour: a nonessential unavailable source should leave a durable, qualified unavailable outcome while independent evidence continues; unknown dispatch cost must remain held safely.
- Actual: `lib/data/collect.ts:105` throws when the batch is aborted, before append. Line 113 returns `snapshot:null`. `lib/analysis/generate-enriched.ts:47` requires exactly 16 source rows, so one such outcome causes `source_persistence_incomplete`; EPC is separately mandatory at line 51. No normal Snapshot is persisted Ready by that path.
- Competing hypotheses: ordinary provider error versus deadline/persistence error. The two existing tests distinguish them: fast error produces an unavailable snapshot; deadline produces no snapshot. This is an orchestration boundary issue, not evidence that an external API is generally broken.
- Components: collector, enriched generation, durable dispatch journal, controlled-trial failure handling, recovery admission.
- Customer impact: a slow optional source can still terminate the entire check; the user may need authorised recovery. The saved-source recovery currently requires all 17 snapshots and therefore is not a generic repair for missing-row deadline failures.
- Financial impact: previously accepted source/AI work may remain reserved until evidence-based reconciliation. This is intentionally conservative; automatically freeing ambiguous spend would be unsafe. Lost customer acquisition cost is unquantified.
- Minimal remediation proposal (not implemented/deployed): distinguish provider work deadline from a short independent, bounded outcome-persistence deadline. Persist a safe unavailable envelope only when identity and accounting are known; keep ambiguous external intents blocked. Continue generation with explicit gaps for optional sources. Keep fail-closed behaviour for ownership, source identity and persistence integrity failures.
- Required regression: real `generateEnrichedSnapshot` orchestration with one optional adapter held beyond deadline, durable unavailable append, valid independent evidence, no extra dispatch, successful final SQL persistence and receipt settlement. Also test global caller cancellation separately; it must not be converted to fictional successful completion.

**Scope limitation:** the audit did not inject a timeout into Production, and did not run a complete mocked generator to SQL test for this specific fault. The component outcome was executed, and the consuming fatal branch was inspected directly. This does not establish how often this affects current users.

## REL-02 — Current full normal-path completion is not established by the recovered W6 report

**Severity: High acceptance gap, not a newly proven runtime defect.**

Historical evidence says W6 reached final persistence, failed, then completed through an operator-only saved-output recovery after the final correction. That proves useful recovery, not an uninterrupted new request through the final deployed application.

`tests/report-section.test.ts` passes and verifies that `decision` references are excluded from narrative sections without changing claim references. It does not invoke the generator, source persistence, actual `finalise_sitefit_free`, case binding or automatic budget settlement. `tests/analysis-generation.test.ts` exercises failed prerequisite reads, not successful end-to-end generation. A final corrected fresh execution is needed before claiming full recovery of the normal customer path. The root audit's fresh isolated execution result must determine this acceptance item; historical Ready replay cannot close it.

Minimal gate: one new request on the release under assessment, verified newly created analysis, provider and AI receipts, ordinary Ready persistence, automatic case binding and unused-reservation release, then customer report rendering. No operator completion may be counted as passing that normal-path gate.

## REL-03 — Distributed collector coalescing is intentionally weaker outside controlled dispatch admission

**Severity: Medium conditional exposure. Status: confirmed isolated behaviour; no claim of Production overbilling.**

`tests/data-collect.test.ts` executes independent collectors with distinct process coordinators: two retrieves occur, while the repository preserves a single winner. Same-process coalescing sends once. The durable controlled-proof provider journal independently prevents a repeated accepted dispatch; its concurrency tests pass. Therefore the collector alone is not a distributed exactly-once guarantee. This distinction matters if a later public execution path bypasses controlled dispatch admission.

Reproduce: existing test `independent instances may retrieve twice but return the first stored winner`. Expected invariant for paid provider execution is one authorised durable intent, not merely one stored snapshot. Preserve the present durable controls; before broader activation, exercise two independent application workers against the same request and real database locks, with a simulated counting provider. Do not infer duplicate billing from this component fixture.

## Verified reliability protections

- REL-T01: 24/24 targeted tests pass: controlled-proof, controlled-trial, snapshot-continuation, analysis-generation, report-section, generation-progress, development-launch-budget.
- REL-T02: 20/20 targeted tests pass: data-collect, fsa-collection-regression, collection-diagnostics, analysis-sections.
- Both runs are deterministic local/synthetic tests, zero external spend; 44 test executions total across these disjoint files.
- Unknown dispatch outcomes retain intent/cost and block automatic resend. Received continuation responses replay without an additional AI dispatch. Failed frozen-input reads stop before collection.
- Progress requires saved Ready for 100%; terminal failure does not display fabricated Ready.
- Automatic Ready settlement is implemented by `20261021130000_trial_ready_settlement_binding.sql`: receipt reconciliation is invoked after the controlled case acquires its Ready report binding, correcting the earlier timing mismatch. `supabase/tests/controlled-trial.sql` includes receipt cardinality, exactly one settlement/release pair, replay, and insufficient-capacity assertions. These SQL scenarios are synthetic and sequential; their execution result belongs to the root database-suite record, not the 44 tests above.
- No multi-session PostgreSQL concurrency experiment was performed in this reliability sub-audit. Row locking and uniqueness are code evidence, not measured concurrent database behaviour.

## Historical defects: do not reclassify as currently reproduced

BFC/BFE coverage confusion, legacy evidence identifier validation, native polygon residual and policy collection IDs inside narrative references are documented incidents. Current code contains targeted fixes and regression coverage; the fresh-run and geo audit establish their present applicability. No source or SQL was changed by this failure-register work.

## REL-04 — Nonproduction runtime accepts the Production database while relaxing source activation

**Severity: High operational isolation defect. Status: reproduced pure configuration behaviour; no Production write performed.**

- Trigger: a local/Preview/development process loads privileged credentials for the Production Supabase URL while `VERCEL_ENV` is absent or nonproduction.
- Expected: paid or state-altering isolated tests must refuse the Production target before network activity unless operating through an explicit Production-authorised workflow. A missing runtime marker must not make accidental Production testing easier.
- Actual: `productionSupabaseTarget` returns true for every nonproduction runtime, including the Production URL. `sourceCollectionAllowed` simultaneously returns true for every nonproduction runtime. A deterministic matrix called both actual functions: absent/preview/development each returned `productionDatabaseAccepted:true, sourceCollectionAllowed:true`; Production returned `true,false` for the closed default source authority.
- Root cause: `lib/supabase/config.ts:4` enforces only Production → approved Production database, not the inverse. `lib/release/policy.ts` relaxes source gating solely by runtime environment. Existing `tests/production-isolation.test.ts` validates the first direction and a legitimate Development Preview, leaving the dangerous mixed combination unasserted.
- Scope: this proves configuration acceptance, not successful bypass of database RLS, trial admission, commercial gates or spending limits. Those controls may still reject a particular operation. No such operation was attempted against Production in this audit.
- Customer/financial impact: a developer may mistakenly conduct a destructive or paid isolated test on Production resources, particularly when service credentials are loaded locally. The audit paused fresh execution when the parent preflight observed this mixed local configuration.
- Minimal proposal: fail closed on Production database targets in nonproduction execution paths, or require a narrowly named, explicit read-only diagnostic exception that cannot authorise generation. Preserve legitimate Development Preview and reviewed protected Production deployment. Do not deploy this change as part of the audit.
- Regression: four runtime markers × Production/Development targets × publishable/privileged clients, asserting zero network calls on mixed writable configurations. Test missing environment marker explicitly. Add an operation-level preflight to all fresh testing tools, not just UI routing.

REL-T03 is one deterministic four-case configuration matrix, zero network calls. Its four observations are not four end-to-end security tests and are separate from the 44 Node test executions above.

## UI-07 — Complete population evidence described as partially available

**Severity: Medium. Confirmed live saved-report presentation defect.**

Open W6 saved Snapshot `3baedb1f-7013-4a3c-9ca1-e8c63913f4c5` and Competition → Explore the evidence. It shows a ready score33, effective residents7972.278 and three population operands, while the provenance text says `Residential population evidence: partially available`. `components/competition-headroom.tsx:16` decides completeness from `populationSnapshotIds.length===3`. The repository at `lib/competition/repository.ts:32` intentionally stores one population snapshot ID containing all three walking bands. Source cardinality is not band completeness. This is not proof the numerical score is wrong; the customer explanation contradicts the actual evidence representation.

Minimal proposal: derive the label from verified operand/coverage availability, not number of snapshot IDs. Add rendering regression with one valid population snapshot covering all three bands; retain unavailable/partial labels for genuinely incomplete evidence. No correction was made in the audit. Screenshot: `evidence/competition-evidence.png`.

## REL-05 — Current Preview code is ahead of its Development database

**Severity: High operational/acceptance blocker. Confirmed live read-only schema mismatch.**

After owner completed Vercel's verification, the Preview-scoped public `SUPABASE_URL` visibly identified the separate Development project. No secret was revealed or copied. Read-only CLI introspection against that exact Development project at19:35:37UTC found98 migrations versus107 in Production/repository. Missing versions: `20261021100000`, `20261021120000`, `20261021130000`, `20261021140000`, `20261023210000`, `20261024090000`, `20261024110000`, `20261024130000`, `20261024150000`.

`public.claim_sitefit_competition(uuid,uuid,uuid,uuid,uuid)` and `public.competition_collections` are absent; `public.read_sitefit_report_extent(uuid,uuid)` and `public.snapshot_source_recoveries` are absent. Catchment measurement exists but the latest corrective migrations are unapplied. The available current-code Preview is `https://sitefit-git-codex-ads-security-c8d218-shahinst21-hues-projects.vercel.app/`; its login opens through existing browser protection, while an unauthenticated shell request receives302. Protection was not bypassed.

Expected: the isolated environment can execute the current version's required contracts and cost controls before paid test dispatch. Actual: it cannot exercise current Competition or latest coverage/recovery behaviour. No fresh report was started, so no cost was incurred creating a predictable incomplete output. This is not evidence Production lacks these migrations: its107-version parity was independently verified.

Minimal remediation requires a separately authorised Development schema reconciliation and bounded cost-control preflight, then current Preview deployment/schema version pairing. Do not blindly replay all nine files: review Production-only assumptions, release gates, operator ownership, data requirements and credentials. This audit applies no migrations or settings changes. No additional Production budget is required to fix this mismatch. Evidence: `evidence/development-preflight.json` (sanitised).

## Revision drift and public HTTP check

The audit observed Production advance from2d6cdbb to683c7f1 (PR137) without audit deployment activity. Comparison shows only headers, smoke script, CI dependency audit and a document changed. REL/GEO/presentation findings are in unchanged code. Current mandatory CI is green. The generic public smoke script nevertheless fails on live owner-gated address input: unauthenticated `{}` receives403, not its local expected400. Classify this as a Medium validation/tooling gap: script assertions need explicit authorised environment semantics; do not weaken the owner gate to satisfy the script. No malicious behaviour was inferred from403.
