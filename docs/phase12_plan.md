# Phase 12: AI interpretation and report intelligence — approved implementation

## Authoritative owner amendments — 10 October 2026

Owner approves implementation Steps 12.0–12.9 with three amendments. **Report quality outweighs test counts:** the nominal three calls must supply specific analytical content for all eight pages (Appendix remains deterministic). Reject generic statements that merely say population is suitable or further checks are needed; real QA must demonstrate evidence-specific comparisons, business implications, material trade-offs and decision-changing actions. Call count is a bounded baseline, not permission to publish inadequate content; if it cannot produce acceptable content, document the actual failure and seek a scoped resolution rather than silently widening spending or weakening admission.

**Persistent interruption safety:** browser closure and server interruption must not lose report identity, pinned inputs, stages, dispatch reservations, accepted outputs or receipts. Persist intent before every provider dispatch, and accepted output before advancing. An interrupted/ambiguous dispatch is never automatically reissued by reopen, duplicate start, resume, restart or deployment. Safe manual reconciliation remains possible; never claim exactly-once external execution. Resume only demonstrably never-dispatched stages under the original binding and remaining allowance.

**US$1 aggregate live Phase 12 verification ceiling**, replacing the proposed US$2. All real AI tests, including failed/ambiguous calls and Q&A, share this phase budget. Reserve the conservative maximum before dispatch and retain unknown charges. Prior phase budgets do not add allowance. Three reports at a $0.30 reserve plus one $0.04 question fit only if actual configured/request bounds justify it. If essential valid verification cannot fit, stop only that paid dependency and obtain explicit approval before additional spending. No additional providers/purchases/Production/Phase 13 authorised. See D86 and [actual status](phase-12-status.md).

Prepared 10 October 2026. **Implementation authorised under D86; aggregate live verification ceiling US$1.** Phases 8–11 are complete. D78/D79/D80, D82 and D83 remain authoritative. D84 changes the internal capacity checkpoint only; D85 records the dashboard/product clarification. No source coverage, scoring calibration, payment policy or Production activation is proposed here.

Read with [reuse audit](phase-12-design-audit.md), [reference-based Phase 13 handoff](phase-13-design-handoff.md), [capacity policy](infrastructure.md#current-capacity-policy--10-october-2026), [Product Contract](product.md) and [Phase 11 completion](phase-11-status.md). All eight supplied reference pages are received, reviewed and owner-confirmed complete. Their numbers, claims, tab wording and example data are not product evidence.

## 1. Outcome and scope

Produce a private, immutable, structured intelligence edition for an owned analysis, suitable for the later £29 dashboard and PDF. Answer: what supports this business concept at this location, what materially challenges it, what remains unknown, and what action would change the decision? Lead with a useful conditional judgement, not a data dump or a generic checklist. A result can support pursuing the unit while explicitly withholding permission or lease readiness.

Support coffee shops, restaurants and the existing shared hair/beauty salon profile. Use already stored Phase 8 evidence, Phase 9 history, admitted Phase 9.5 web evidence, Phase 10 rental outcomes and Phase 11 assessments. Keep rental evidence in the main report independently of the separate Financial Engine. **No economic calculations, assumptions form, financial scenarios or Financial Engine outputs in this report or its PDF.**

Phase 12 includes backend generation, validation, progress/recovery contracts, owned stored reads and bounded report-grounded question answering. Phase 13 implements tabs, maps, charts, evidence interactions, questions UI and current-tab/full-report PDF exports. Intelligence readiness does not mean the customer deliverable is launched. No new purchase, delivery email or live entitlement path is enabled in Phase 12.

The only numerical index inherited here is **Resident & Workplace Context Index**, with exactly the admitted Phase 11 value, component values, publication state, method/config and scoped caveat. It measures dated residential/workplace density context, not demand, commercial success, competition, profitability or overall suitability. No AI weights, new transforms, qualitative score bands, overall location score, probability or arbitrary evidence percentage.

## 2. Reuse and the actual integration gaps

Reuse server-only Responses transport, `store:false`, exact `gpt-6.1-sol`, low reasoning, strict schema/refusal handling, bounded packets, safe errors and token receipts. Preserve Free Snapshot prompt versions, schemas and historical readers. The implemented Free path makes four section calls and a dependent synthesis; it is not the external 27-prompt design executed as 27 calls.

Reuse owned assessment/history/rental readers, SQL-verified source references, canonical digests, claim admission and deterministic decision/readiness. Phase 11's AI packet is an assessment handoff, not the complete report: history references need their validated event meaning, and multiple rental outcomes need their separate facts and conflicts. Expand a **new private packet projection** from the original permitted immutable evidence, not from missing fields or current provider data. Do not modify frozen assessment bundles.

Actual persistence gap: `reports`/`report_sections` exist, but the Phase 6 child trigger rejects all section inserts once an analysis has a ready Free report. There is no `ai_interpretations` table. Reusing the Free upsert/freeze path for a Full Report would fail or endanger history. Step 12.2 must introduce narrow forward-only Full edition guards/writers while preserving the existing ready Free graph. No historical migration edits.

## 3. Source and evidence contract

### 3.1 Private preparation manifest

`FullPreparationV1` contains schema version, analysis/input/property binding, original business/subtype, input/context digest, assessment ID/content digest/method/config, exact source snapshot IDs/checksums/release IDs, history/rental/discovery bundle digests, admission time/policy, missing/rights dispositions and packet-set digest. Identity is resolved server side; no account email, owner/claim capability, payment parameters, exact address, postcode, UPRN or precise coordinates enter AI packets. Property header/map identity stays in the authorised deterministic projection.

Read existing supplements only. A missing supplement stays missing; this phase does not silently dispatch PropertyData, EPC, search or enrichment on a report read. Any future refresh uses a separately authorised new analysis, not a retry against changed data. Legacy checksum-deficient inputs rejected by Phase 11 retain their original Snapshot; do not repair them by regeneration or promise that they can produce a new validated edition.

### 3.2 Admitted fact catalog

Each `FactV1` has stable fact/evidence IDs; source snapshot and checksum; kind (`observed`, `official-statistic`, `modelled`, `user-supplied`, `availability`); typed value/unit or bounded source fact; relevant date/date meaning and retrieval time; property/unit/building/point/native-area/walking-area scope; spatial precision; source coverage/freshness; licence/retention/display disposition; limitations; admitted uses and prohibited stronger claims. An unavailable item carries its explicit reason; zero is never substituted for null.

Only admitted compact facts enter model packets. No raw API responses, entire web pages, instructions embedded in evidence, geometry coordinates or full address text. Stable report-local IDs preserve internal lineage without exposing private identifiers. Dates and commercial names are permitted only when already licensed and scope-validated. Source URLs are resolved from a server-validated allowlist, not generated by AI.

| Existing evidence | Main report use | Forbidden upgrade |
| --- | --- | --- |
| Census catchment and native profiles | Dated estimated resident/profile context; correct method and geography | Actual customers, sales or observed walk-in demand |
| BRES/native comparison | Dated employee-job density and separate context index | Daytime population, individuals or demand |
| Income | Native-area dated estimate and scope | Premises-specific spending power or sales prediction |
| Overture/FSA | Qualified discovered business inventory with coverage/duplicate limits | Unique competitor totals, pressure percentile, saturation, strength or closure trends without admission |
| Geoapify/TfL/NUMBAT | Stored modelled walking routes, stops and named station-period context | Entrance verification, step-free/service guarantees or frontage footfall |
| PropertyData/EPC/history | Supported facts and dated events with exact-unit/building scope | Current permitted use, tenancy intervals, vacancy causes or safety clearance |
| Phase 9.5 | Already admitted compact source-specific rent/history evidence | Fresh implicit browsing or uncertain rights becoming permanent permission |
| `rents-commercial` | Qualified local advertised-rent benchmark and source basis | Actual selected-unit rent |
| `valuation-commercial-rent` | Supported property estimate and reported error with compatible area | Asking/contracted rent, invented confidence or GIA/NIA interchange |

### 3.3 Conflicts and rights

Preserve conflicting facts as distinct scoped records. Compare identity/unit, date meaning, geography, denominator, area basis, rent kind and source credibility before declaring contradiction. A later retrieval is not automatically better evidence. Actual asking rent, contracted rent (only if evidenced), estimated property rent and local benchmarks remain different types. Selection of a relevant finding needs a stored rule/reason, with contrary evidence retained.

Admission verifies reuse, derived representation, attribution and retention at preparation. Expired/unlicensed material is withheld; reuse existing permitted provenance/derived facts only where allowed. No new provider/licensing assumption. Store no disallowed address/photo/raw page. Freeze only content that can be retained under its recorded policy. If a legal expiry affects later availability, deny/restrict the affected resource under a separate access/retention action; do not silently rewrite or regenerate the historical report. No 30/60-day deletion policy is assumed approved. Provider terms and a customer download policy are separate decisions.

## 4. Generation architecture: two parallel groups, then synthesis

1. Authorise permanent account/current claim access and active server-confirmed Test entitlement; locate an existing ready Full edition first and return it without generation. Check entitlement again before publication and every read.
2. Resolve the frozen assessment/evidence/supplement manifest; validate scope, checksums and rights. Build a compact deterministic ledger of metrics, permitted claims/inference rules, opposition, material unknowns and actions. Geometry, source tables and charts stay outside AI.
3. Run **Group A: customers, market and access** and **Group B: premises, history and rental context** concurrently. Use `Promise.allSettled` or equivalent so a failed group cannot erase a successful checkpoint.
4. Deterministically validate each group. A domain with unavailable evidence produces an explicit deterministic unknown block without an unnecessary model call. Invalid AI output is not displayed as a plausible partial report.
5. Run **one dependent synthesis** using only accepted group claims plus the mandatory Phase 11 opposition/readiness ledger. Generate Overview and ranked Actions. Appendix, figures, chart series, source directory and methodology are assembled deterministically.
6. Validate cross-section consistency and freeze the complete edition atomically. No partial customer publication. A qualified report may contain honest unavailable sections; validation/provider failure instead leaves a recoverable non-ready edition.

Nominal **3 calls**, fewer when a group is entirely unsupported. **Maximum 4 dispatches over the edition's lifetime**, including **one shared semantic-repair allowance**, not one repair per section/request/retry. Reserve ordinal and conservative cost before dispatch in the edition checkpoint; persist success/usage immediately. No automatic retries for timeout, transport, rate limit or ambiguous execution; no fallback model, web search, judge swarm, embeddings or new provider.

Proposed new prompt versions: `full-context-v1`, `full-premises-rent-v1`, `full-decision-v1`; Q&A `report-answer-v1`. Keep legacy `section-analyst-v3` and validated-synthesis receipts unchanged. Freeze exact instructions/schema digests, actual model/version returned, configuration and packet digests. An alias does not promise rerun reproducibility; historical reproducibility means replaying the stored validated edition with its original receipts.

### 4.1 Useful AI analysis without unverifiable prose

AI selects, ranks and reconciles **reviewed evidence-linked claim and implication atoms**; it does not author numerical facts. Extend the existing proposition approach only for currently supported report facts and conditional business implications. Every factual or inferential sentence is represented by admitted fact/claim IDs and an approved composition/rule, with scope/limitation IDs. Deterministic rendering supplies numbers, units, dates and required caveats. Business-specific implications must state their condition, not predict customers or profit.

Permit connective/editorial wording only through bounded reviewed variants; unsupported arbitrary prose is rejected. This is a deliberate reliability boundary, not a claim that citation IDs prove free-form text. Quality review must confirm that the composition produces specific useful analysis, rather than repetitive templates. If useful meaning cannot be expressed within these contracts, revise that bounded contract during implementation and document it; do not silently relax entailment or add an unbudgeted AI critic.

Mandatory hard checks: closed JSON schema/lengths, valid same-edition IDs, exact claim role, admitted rule and prerequisites, numeric/date equality, scope compatibility, material opposition and unknown preservation, no legal clearance from history, no unsupported score/probability, no economics leakage and no source instruction execution. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) supplies schema constraints, not factual validation. A model refusal/incomplete response fails safely.

## 5. Structured report and dashboard contracts

`FullReportV1`: report/analysis/input version binding; generated/analysis timestamps; business identity; manifest and assessment digests; source/release/method/config versions; group/synthesis receipts; section order; index with publication reason; independent premises/readiness; supporting/opposing claim IDs; material unknowns; ranked actions; source/evidence directory; content digest. No HTML, executable Markdown, frontend code or private chain-of-thought.

`SectionV1`: stable key, availability (`assessed`, `partial`, `unavailable`, `not-applicable`), result-first conclusion, analytical direction, **separate** evidence strength/basis, up to five primary reasons, material limitations/conflicts, optional detailed reasoning, typed metric/table/chart references, map layer references and source-linked actions. Avoid a mandatory question on every card. Colour communicates result direction; evidence quality is a separate textual badge.

Ordered sections: `overview`, `customer-context`, `competition`, `access`, `premises`, `rental-context`, `actions`, `appendix`. Exact schema/storage keys are new, versioned and validated; old legacy keys are not a 24-tab mandate. Dashboard nav labels are presentation, not source semantics. Proposed Rent & Lease Context replaces the finance-bearing reference tab; owner review covers the final label. Do not add a business-case-assessed box that implies the Financial Engine has run.

Typed charts carry title, unit, category universe/denominator, mutually exclusive categories where necessary, period, geography, source/method and missingness. Publish comparisons only for compatible operands/cohorts; no illustrative chart becomes a measured one. Map DTOs reference the frozen spatial supplement and admitted markers/precision/attribution. Supported native income scope stays distinct from walking population. Unsupported cards get meaningful unavailable states, not fabricated zeroes or decorative data.

PDF handoff: each section contains its own claim/source subset, property/business/date/version, qualifications and ordered export blocks. Full export combines all sections and one final Appendix. UI/PDF use the same content digest. Licensed map/photo assets require an explicit Phase 13 export policy; missing assets do not license screenshots or generated property photography. No financial scenarios in report exports.

## 6. Storage, ownership and historical replay

Use existing `reports` for one new `tier=full` edition, with a distinct version after the ready Free edition; existing `report_sections` for final structured sections; `reports.provenance` for bounded in-progress checkpoints and final receipts/manifest. Do not add a generic jobs, leases, billing, request lifecycle or cache platform. Progress exists because the owner requires leaving-page completion/recovery.

Forward migration responsibilities:

- Uniqueness for the full edition binding (analysis/input/assessment content/method/prompt/schema configuration). Atomically allocate version and return identical existing work on concurrent start.
- Narrow service-only start/checkpoint/finalise/owned-read operations; browser roles have no direct reports/source reads or writes. Validate current claim access and payment binding; deny refund/revoked access.
- Preserve every existing ready input, source, evidence item and Free section/report. Permit new Full section writes only for its recognised non-ready Full edition. Do not broadly exempt all children of a paid analysis from freeze guards.
- Ready Full report/sections reject update/delete/direct write/re-parenting and truncate. Finalise checks exact section set, digests, receipts, source/assessment binding and entitlement in one transaction. Failure rolls back publication.
- Checkpoint revisions and per-group dispatch ordinals use compare-and-set; only the successful claimant schedules execution. Late/duplicate completions cannot overwrite accepted checkpoints or ready content. No exactly-once external execution claim.

Owned ready reads return the stored safe projection and terminate before constructing collectors, comparison engines or AI clients. No refresh on GET, status polling, Q&A or PDF export. A new business check creates a new analysis, not a replacement edition of the earlier history. Pipeline retries are the same edition/pinned inputs, not a chance to refresh datasets.

Store compact catalog/receipts/validated selections, referencing existing SQL-verified originals. Avoid duplicating raw envelopes, full geometries or repeated claim prose in provenance and sections. Target additional report storage **80–200 KB including estimated index/TOAST overhead**, provisional until actual measurement; cap structured report payload at 128 KB and bounded checkpoint content at 64 KB, with mandatory findings never truncated. Measure actual database and relation sizes before/after representative writes; roll back synthetic QA where possible.

Implementation bound clarification: the frozen preparation is capped at 128,000 serialized bytes to include existing validated Census table operands alongside the admitted catalog. Store column dictionaries once; no geometry/raw API bodies in the preparation. Checkpoint/final projection bounds and AI request/cost ceilings remain unchanged. Preparation and final output both preserve source lineage; no report read reruns the operand projection.

At 374,855,347 bytes, the 400,000,000 checkpoint leaves **25,144,653 bytes**. A rough 80–200 KB/edition projection permits around **125–314 editions** if nothing else grows; this is not a capacity guarantee. Native source growth and PostgreSQL overhead consume that margin too. Recheck before hosted writes, reserve known migration/QA growth, and stop the dependent write if the essential measured footprint would exceed the checkpoint. No upgrade, pruning historical reports or automatic expiry is authorised.

## 7. Actual stages, background completion and recovery

Proposed private endpoints after approval: POST start by existing Free report ID, GET owned status, GET owned immutable intelligence edition, POST explicit safe resume. A start checks origin/CSRF/session/account/entitlement and returns an opaque report edition ID; no address or secrets in URLs. GETs never start work. Response headers are private/no-store/noindex/no-referrer; status returns only allowlisted stage/error/availability, not raw prompts or payment payloads.

Persist actual stages: `checking-evidence` → `analysing-context` / `analysing-premises` → `synthesising` → `validating` → `saving` → `ready`; failures expose a truthful safe code and whether explicit resumption is possible. Show completed stages, not a fake percentage/timer. Phase 13 implements the professional loading panel, accessible status announcements, return-to-account and revisit links. PDF preparation is a separate later export stage, never a claim that AI is still analysing.

Use built-in Next.js `after()` on the authorised POST so disconnecting the browser does not itself cancel server work. No dependency package required. It is constrained by the function duration, **not a durable worker**. [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after) and [Vercel lifecycle limits](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) document that boundary. Existing Free route `maxDuration=120` does not prove a new Full route budget or actual deployed plan/Fluid configuration.

Propose per-group timeout 45s, synthesis 30s, one repair at most 45s; overall 150s bounded service deadline with publication reserve. Verify effective protected Preview duration supports this before committing to the completion promise. If shorter, constrain execution to persisted explicit stages and prove safe continuation; do not buy a plan or silently introduce a queue. Crash/timeout leaves accepted groups intact. An ambiguous dispatched call is not automatically repeated: retain its reserved budget and safe interrupted state; operator reconciliation is permitted, automatic paid replay is not. If all dispatches are terminal and budget remains, an explicit authorised resume can process only a never-dispatched stage, using the original manifest.

Normal leave/reopen completes within the verified lifecycle; abnormal process loss requires truthful recovery, not an always-completes guarantee. Persist finished outputs before starting synthesis. Reopening ready content never regenerates. Failed synthesis cannot erase Group A/B. Ready publication rechecks entitlement, and revocation denies access without editing history.

OpenAI background mode is not the baseline. Its current [documentation](https://developers.openai.com/api/docs/guides/background) permits `store:false` but describes temporary response storage for polling. Adopting it would need separate privacy/lifecycle evaluation; no false assertion that `store:false` means zero provider retention.

## 8. Bounded report-grounded questions

Prepare a separate `ReportAnswerV1` contract/backend: authorised immutable report/version, question intent, direct answer, claim/evidence references, material qualification, unavailable reason and next relevant section. Default first-release questions such as main risk, strongest support and before-signing checks can use the stored synthesis deterministically without any new AI call.

For arbitrary questions, retrieve a small claim subset deterministically from the stored edition, then at most one GPT 6.1 Sol call with the same anchored-claim output boundary. No implicit browsing, recalculation, fresh source collection, economics scenario, new score, write to report or access to another user's data. Unsupported/out-of-scope questions get a useful bounded answer. Q&A text is ephemeral, not a mutable historical section. No conversation archive infrastructure.

Proposed limits: 500 characters/question, packet ≤8 KB, instructions/schema ≤6 KB, output cap 1,000 tokens, 25s timeout, no repair/retry; request size/origin/auth plus persistent per-report maximum **five model answers** recorded as a small private counter in edition access metadata, separate from immutable content. Deterministic answers do not consume it. Reserve before dispatch; never reuse the report's generation allowance. An unapproved budget disables model Q&A, not stored questions/answers or report access. Later customer-facing scope/cost approval is required before enabling paid model answers; Phase 12 QA can validate this path under a specifically approved development allowance.

Concrete counter storage: reuse private `system_events` for an allowlisted `full-report-question-dispatched` receipt with report/analysis binding, ordinal and reserved cost/version only. A service-only RPC locks the report row for reservation, counts prior receipts, inserts at most five and denies concurrent excess. Row locking does not update ready content. Store no question text, answer transcript, raw provider result or account/token payload; no conversation or billing ledger. Validate immutability/private grants on these new receipts. Browser receives only the safe remaining allowance. This avoids inventing an unimplemented access-metadata table or modifying ready provenance.

## 9. Cost, latency and performance

Official [GPT 6.1 Sol model pricing](https://developers.openai.com/api/docs/models/gpt-6.1-sol), checked 10 October 2026: standard short-context input **US$2/million**, output **US$10/million**. Estimate without cache discounts; no batch/priority/new model. Reasoning tokens count within billed output. Formula: `inputTokens × 0.000002 + outputTokens × 0.000010`. Source retrieval, hosting, storage, tax and future PDF costs are excluded.

| Generation case | Total input tokens | Billed output incl. reasoning | Estimated AI cost |
| --- | ---: | ---: | ---: |
| Typical compact three-call report, planning assumption | 8,000–16,000 | 3,000–6,000 | $0.046–$0.092 |
| More detailed three-call report, planning assumption | 20,000 | 8,000 | $0.120 |
| Conservative configured envelope, including one repair | ≤80,000 | ≤11,000 | ≤$0.270; reserve $0.30 |
| One bounded model Q&A answer | ≤14,000 | ≤1,000 | ≤$0.038; reserve $0.04 |

For the envelope, each dispatch permits ≤12 KB UTF-8 packet plus ≤4 KB instructions and ≤4 KB schema; conservatively budget one input token per serialized byte (including wrappers within the limit), no four-bytes/token guarantee. Group output caps 3,000 each; synthesis 2,000; shared repair at most 3,000. Total lifetime cap 11,000 output tokens; four dispatches ×20,000 bounded serialized input bytes gives 80,000 input ceiling. Validate encoded request size before dispatch and include every supplied text/schema field; reject excess without truncating material claims. Price/version and reservation are private configuration, not a currency spending guarantee. Actual provider usage and aborted/unknown calls must be reported separately from estimates.

Existing Free proof observed **24.7–30.8s** and **$0.0097–$0.0135** across three final Preview samples ([record](phase-6-status.md)); that short selected-vocabulary output is not a Full Report benchmark. Phase 12 warm-data generation planning estimate **30–90s**, roughly `max(Group A, Group B) + synthesis + validation/persistence`, with bounded failure deadline 150s. Unknown cold/network/provider tails; no production p95 promise. Report reopening requires zero AI/provider calls and should be dominated by owned DB read/validation.

Optimisations: reuse exact stored evidence/assessment, two parallel groups, deterministic Appendix/maps/chart data, small relevant packets, stable prompt prefixes (no assumed cache savings), checkpoint each accepted group, avoid secondary judges and duplicate summary prose. Do not run collection or comparison again merely to generate wording. Native comparison optimisations already exist; no new distributed cache. Measure each stage, total tokens/latency and storage; three reports are a bounded QA sample, not statistical SLA calibration.

## 10. Execution steps and required verification

Implementation is authorised. Maintain `docs/phase-12-status.md`, record each step's actual results/deviations and proceed in this order. Use Node 24/npm 11 and `npm ci`; run focused tests, lint/types for relevant changes; full build/regression at integration/final delivery, not repeatedly for unchanged work.

| Step | Defined scope | Evidence required to close |
| --- | --- | --- |
| **12.0** | Confirm approval/budget, freeze versioned design and approved reference handoff; capacity/config read | Current bytes, exact main baseline and phase boundaries; no new provider/spend silently inferred |
| **12.1** | Private manifest, scoped fact/claim catalog and compact A/B packets from existing readers | One real stored packet per coffee/restaurant/salon, source/digest/rights/date/unit validation; legacy missing checksum rejection; no exact identity/account in AI |
| **12.2** | Narrow forward Full edition/checkpoint/finalise/read migration and runtime contracts | Fresh rebuild + hosted rollback: owner/claim/payment isolation, race/replay, ready guards, section insertion with ready Free parent, unchanged legacy graph, measured storage |
| **12.3** | Versioned A/B prompts/selection compositions and provider receipts | Mock schema/refusal/timeout/injection/bounds/dispatch-cap tests; all facts/rules/mandatory gaps accepted only within catalog; legacy Free tests unchanged |
| **12.4** | Dependent synthesis, deterministic reconciliation, safe section/chart/map/Appendix DTO | Strong opposition cannot vanish; high context cannot clear premises; incompatible rents and scopes preserved; numbers and readiness unchanged; finance excluded |
| **12.5** | Atomic orchestration, actual progress, bounded background work and explicit recovery | Controlled Local/Preview POST, leave-page completion, duplicate start, failed group/synthesis, interrupted dispatch/no blind retry; real effective function budget verified |
| **12.6** | Stored-only owned replay and scoped PDF/dashboard exports contract | Disable/trap every provider/AI/comparison/calculator; unchanged stored digest on reopen; revocation denies; new analysis cannot overwrite previous report; per-tab evidence self-contained |
| **12.7** | Report-grounded question service plus deterministic suggested answers | Answered, unknown, out-of-scope, injection and wrong-owner cases; no unsupported fact/calculation, bounded counter/no retries, report digest unchanged; no final questions UI |
| **12.8** | Proportionate real intelligence QA/security/capacity | Three existing-evidence reports, one per concept; one bounded real Q&A if budget approved; fixed failure/contradiction cases mocked. Independent manual claim/value/scope/material-risk review, actual receipts/latency, browser/HTTP response and artifact privacy; no raw private captures |
| **12.9** | Final regression and protected delivery | `npm run check`, fresh DB/security + hosted changed SQL proof, running build/public HTTP, applicable protected Preview private API checks, exact-head required CI, protected PR merge/post-main CI, local main=origin and clean tree; complete status/limits |

Live generation/Q&A verification budget: **up to US$1 total**, owner-approved under D86 (three reports reserved at $0.30 + one $0.04 answer; the $0.06 remaining reserve is not permission for additional requests). Nominal nine generation calls plus one Q&A, maximum thirteen including shared repairs. No new source API calls. If access/budget remains pending, finish mocks/contracts/security independently; do not mark live quality/latency verified. Do not substitute synthetic evidence for a real-source packet. Test entitlement remains authoritative for development; Production disabled.

Manual QA is about decision value and factual scope: opening answers whether to pursue and why; each prominent sentence maps to permitted evidence/rule; strongest contrary evidence visible; unknown permissions not refusals; no fabricated customer counts/closure reasons; actions specific and decision-changing; source dates and rental kinds correct. Have the owner review the three representative outputs as content acceptance; automated pass is not customer acceptance or UI launch approval.

## 11. Definition of Done

- [ ] Steps 12.0–12.9 evidenced within approved scope; actual deviations recorded, not hidden relaxations.
- [ ] Three real-source business packets, scoped admitted facts and useful result-first intelligence pass deterministic and manual quality review.
- [ ] Existing context index/components/publication state and independent premises/readiness remain unchanged; unsupported figures withheld.
- [ ] Rental context independently includes available benchmark/compatible valuation/error and admitted web evidence; conflicts, GIA/NIA and missingness preserved.
- [ ] Bounded two-group/dependent-synthesis execution; failures preserve successes; lifetime call/cost reservations and actual receipts verified.
- [ ] Owned immutable Full edition uses new narrow guards; legacy ready graph fingerprints unchanged; read-time external/calculator/AI count zero.
- [ ] Actual background leave-page completion and truthful interruption/recovery verified on the configured protected Preview; no durable execution claim unsupported by evidence.
- [ ] Grounded question contract/service verified, with approved live allowance or an explicitly owner-approved deterministic-only first-release resolution; no report mutation or hidden recurring AI spend.
- [ ] Dashboard and per-tab/full-report PDF contracts complete against all eight references; no Phase 13 UI/PDF implemented.
- [ ] Security/RLS, secret/private-payload, ownership/refund, changed SQL and full regression gates pass; measured database stays within 400,000,000 bytes.
- [ ] Exact-head CI, protected merge, post-main CI and clean matching main evidenced.
- [ ] Limitations/cost/sample latency documented; no new provider, purchase, Production/live payment, Financial Engine embedding or later phase.

## 12. Approval questions, risks and explicit exclusions

Phase 12 implementation is approved under D86. Preserve the three-call architecture, narrowly persisted execution checkpoint, constrained useful prose, question-answer boundary and proposed Rent & Lease Context label. Owner confirmation that references are complete is already received; no repeated reference request is necessary. The aggregate US$1 live development budget is approved; additional spending requires explicit prior approval. Production hosting commercial-use suitability, direct Live Stripe launch gate and final retention/customer terms remain pre-launch decisions, not permission to upgrade now.

Risks: evidence gaps and rights limit richness; small remaining capacity; anchored prose may need bounded variants to avoid repetition; existing historical inputs may lack required checksums; provider outages/ambiguous dispatch may require safe manual recovery; deployment duration is unverified until Step 12.5; model alias behavior and pricing can change; no exact-unit photos/visibility data or admitted overall score. None is cured by invented UI figures or newer-wins source selection.

Exclusions: new data providers or paid retrieval, renewed scoring/prompt calibration programmes, autonomous browsing/agents, 24/27 independent calls, AI arithmetic, demand forecasts or success probabilities, financial forms/calculations/scenarios in reports, chatbot memory/vector DB, fine-tuning, judge pipelines, generic queues/leases/workflow engine/distributed caching, billing ledgers, subscriptions, Full Report frontend/PDF/email delivery, production activation and visual redesign implementation. Add hardening only when an actual documented blocker warrants a scoped owner decision under D78/D79.

## Planning validation record

10 October 2026: read existing documentation/code and external prompt package; inspected all eight attached UI references; owner confirmed completeness and clarified images are design-only. Read-only hosted SQL measured **374,855,347 bytes**. Official model/lifecycle sources reviewed; no paid calls, hosted writes, migration, source change or service configuration. The planning PR contains documentation only; its approval is separate from implementation authority. Existing historical 375 MB records/applied SQL remain unchanged; a future approved forward change is required if an old ingestion gate itself must be raised.
