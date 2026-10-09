# Phase 9 implementation proposal: Premises History

Prepared 9 October 2026. **Awaiting owner approval. Phase 9 is not implemented or authorised for implementation by this document.** Research/documentation only was requested. Phase 8 is complete through protected PRs #24/#25. [Research and verified prices](phase-9-research.md), [Product Contract](product.md), [D78/D79](decisions.md) and [roadmap](roadmap.md) govern the proposal.

## Recommended scope and customer value

Build a small, reproducible **premises evidence timeline**: supported past businesses/changes where identifiable, dated planning/certificate events, explicit vacancy observations where a source actually says so, and the important unanswered premises questions. Its value is saving the buyer investigation time and identifying questions to resolve before signing, not pretending to know every tenancy.

Challenge the earlier broad title/lease/occupier-history approach: title ownership, company registration and nearby applications are poor substitutes for unit occupancy. Do not purchase those by default. Reuse Phase 8 and add at most one automatic official planning adapter. Allow a bounded operator-reviewed factual-source import for pilot cases; no general scraper, web-search agent or new administrative product.

Default new-provider operating fee: £0 if the official planning source is admitted. This is not a promise of complete history or free operation of the whole SiteFit stack. Existing provider access remains subject to its approved limits. PropertyData planning is a conditional trial fallback, not a reason to activate a subscription. Missing access must not cause automatic paid fallback.

London-only analysis remains. Supported concepts remain coffee shop, restaurant and salon. The Free Snapshot, price, purchase, scoring and AI prompts remain unchanged. Phase 9 creates a private validated section-ready data contract for later paid generation; **it does not create a Full Report or customer dashboard/PDF**. A development-only inspection/projection proof establishes integration without selling an unavailable deliverable.

## Source order and admission

1. Reuse the same analysis's permitted frozen identity, certificate, FSA, Overture and designation outcomes. These mostly supply context/dated observations, not retrospective occupancy. Do not query ready Free reports again or edit their source namespace.
2. Add GLA Planning London Datahub as the preferred bounded automatic source after current API/schema/rights admission. Use selected UPRN where returned; otherwise exact postal/unit matching with the frozen selected components. A point/radius discovers candidates only. Preserve authoritative council record links.
3. Extend the existing official EPC boundary for a separately versioned history search if useful: UPRN-only, allowed non-address fields, multiple certificate dates. Leave the existing single-certificate fallback and its historical reader intact.
4. Provide a trusted development/operator import of permitted structured facts from an exact-premises public register or business announcement. No arbitrary user URL fetch, article retention or public admin route. The importer goes through the same validation/Evidence/ownership boundary.
5. PropertyData planning may replace the GLA discovery operation during the already approved development trial if GLA is unavailable and remaining trial access is confirmed. Do not run both by default. Keep the primary decision/source link. If neither is admitted, record the gap; do not silently certify the automatic planning proof.

Council rates/empty-property files are optional, narrowly admitted pilot evidence, not another required adapter or bulk London load. Companies House, Land Registry, imagery and specialist vendors remain outside baseline implementation. The research lists when they may become worth reconsidering.

No result can say a source was checked unless a recorded actual query or reviewed record supports it. An empty complete query means no matched records in that source/query scope; a capped, failed or unsearched source is a different state.

Planning requests record included application types, date filters and spatial bounds. Do not apply a recent-only filter then describe the result as all available history. PropertyData supports `results=20`; its default type exclusions must be recorded or explicitly changed for the relevant use/decision search. Planning timestamps retain their publisher meaning. Neither provider's result ordering may be assumed to establish earliest/latest occupancy.

## Architecture and existing code boundaries

Reuse `lib/data/contracts.ts`, `registry.ts`, `policy.ts`, `validation.ts`, `collect.ts` and `snapshot-repository.ts`; reuse immutable collection keys, existing bounded process coordination and owner verification. Add source-specific history payloads/validators and narrowly registered IDs only when their source is admitted. Existing `premises.ts`, `planning.ts` and `epc.ts` are context adapters, not occupancy-history implementations.

Add a focused `lib/premises-history/` module for identity matching, event validation and deterministic timeline projection. Provider adapters remain in `lib/data/adapters/`; scripts are Node-only and never imported into the app. No second collection engine, global historical-property API or general workflow layer.

Use existing `data_snapshots` and `evidence_items` for immutable source outcomes/lineage. Initially keep the bounded derived timeline as a versioned normalised payload referencing source snapshots/Evidence. Do not duplicate every source fact into a second event store. The existing `premises_events` table has `estimated_start/end`, one evidence reference and a numeric confidence column; these are insufficient for richer date semantics. **Do not populate invented dates or confidence to fit it.** Leave it unused for V1 unless a demonstrated read requirement warrants a narrow forward migration. No mandatory new table.

A forward migration will extend the closed snapshot/source validation and narrow writer/read RPCs for the admitted history payload/collection purpose. It must bind analysis, frozen input, property, UPRN/OS release and parent checksums; application validation alone is insufficient. Preserve legacy readers and applied migrations.

The derived timeline is a local deterministic result, not a pretend external provider call: persist it through a narrow `freeze_premises_history` RPC on the existing snapshot boundary with a dedicated derived-result discriminator. Store its parent snapshot IDs/checksums and method/input digest; the database validates the parent namespace/ownership and freezes one result per history context. A mismatching second write is rejected; identical replay returns the existing result. Empty/failed source receipts remain available alongside successful parents. No arbitrary public JSON writer is introduced.

For a ready Free analysis, a distinct immutable `premises-history-v1` preparation namespace may append permitted deeper evidence without modifying the ready Free namespace/report. Current ready-parent guards must be explicitly extended to allow this narrow purpose, not disabled. Freeze a complete derived history result atomically with its source digest vector. Replays return it unchanged; resumptions may retrieve only previously unfinished source operations, never replace successful snapshots. A different/new check creates a new Analysis. No mutable canonical property's history is used as the authority for old reports.

Phase 9's entry point is an owner-verified internal preparation service and development proof script, with an ownership-checked private projection. There is no public unauthenticated paid enrichment endpoint. Later phases wire purchase-gated paid collection and Full Report finalisation; existing Stripe Test authority is unchanged. Keep the original frozen Free context and link deeper observations separately rather than regenerating it after payment.

## Proposed contracts

These are specifications, not runtime code. Implement strict closed schemas with versions and bounded text/array sizes; explicit nulls rather than convenient defaults.

| Contract | Required content |
| --- | --- |
| History context | Schema/method version; analysis/input/property IDs and input digest; selected UPRN or unresolved state; exact postal component/unit basis; frozen OS/release vector; analysis timestamp; collection purpose/key; source policies; requested scope and finite query bounds |
| Source search receipt | Provider/operation/adapter/schema versions; snapshot ID/checksum; query scope and identity method; fetched/published/as-of dates separately; earliest/latest covered dates if known; actual pages/records; complete/partial/failed/not searched; safe error; observed/estimated/unknown credits; licence policy/version/notices |
| History event | Stable event key; analysis/input/property binding; type; subject business name/category if permitted; property scope; identity status and match reason; original record/reference; supporting and opposing Evidence IDs; fact/estimate/user statement; separate event, publication, observation and retrieval dates; limitations; rights/retention reference |
| Event time | `exact_day`, `month`, `year`, `bounded_interval`, `undated`; nullable lower/upper bounds; date meaning (inspection, application, decision, reported opening/closure, observed presence/vacancy); stated versus derived; original precision. No day-one/day-last invention for an annual date presented as exact |
| Result | Schema/method/source vector/digest; bounded sorted events; conflicts; coverage gaps; as-of timestamp; availability; factual result/reason/remaining questions; references for optional detail; permanently stored outcome, not dynamically generated on read |

Event types: `business_presence_observed`, `business_change_reported`, `opening_reported`, `closure_reported`, `vacancy_reported`, `planning_application`, `planning_decision`, `certificate_lodged`. Provider record removal can be an internal observation-change finding, **not automatically a closure or vacancy event**. New types require schema/method review, not free text.

Property scope: `selected_unit`, `building`, `site`, `nearby`, `unresolved`. Match status: `exact_uprn`, `exact_unit_components`, `building_only`, `ambiguous`, `unmatched`. A UPRN match does not by itself prove selected trading-unit extent; retain both fields. Nearby/unmatched candidates are discarded from the premises timeline. Building/site records may appear in a separately labelled context lane, never as exact-unit events. Candidate disappearance is not a match resolution.

Availability uses existing source outcomes plus result gaps such as `no_matched_records`, `identity_unresolved`, `partial_search`, `source_unavailable`, `licence_blocked`, `not_searched`, `not_applicable`. FSA non-applicability for salon is different from no history. `complete` describes query pagination only, never complete occupancy history.

## Evidence and interpretation rules

- Exact unit matching requires non-conflicting secondary unit/floor/number/street/postcode components or authoritative unit linkage. Normalisation aliases must be reviewed; do not merge adjacent shops by business name or proximity.
- A first-party dated source can support “the business reports opening in [precision]”; an official inspection supports an inspection/registration observation. Neither implies uninterrupted occupation from then until now.
- A planning application is a proposal; a decision describes that decision, not implementation, compliance, current permission or suitability for this user's use. Do not turn an application description's alleged former tenant into a confirmed tenant without adequate support.
- Explicit vacancy at a dated inspection/register/public statement is a signal with its scope/date. Advertising to let can coexist with an occupant; missing register/POI records cannot prove vacancy or its duration.
- A comparison may state different names were observed on two dates at an admitted identical unit. Rename, ownership transfer, relocation and distinct operator replacement remain unknown unless corroborated. No turnover percentage, failure frequency, inferred exact transition date or closure reason.
- Preserve conflicts and source assertions. Do not vote away contradiction or assign a fabricated confidence percentage. Evidence strength is claim-specific and separate from the favourable/conditional result tone.
- Phase 9 uses deterministic validation/projection, not new AI calls, prompts or scoring. Later AI may interpret only admitted facts/Evidence and must preserve uncertainty. No runtime AI identity reconciliation, date filling, weights or transforms.
- A useful result can identify “a dated change-of-use proposal needs checking”; do not replace every output with a generic checklist. Unsupported occupancy history stays unknown, with a specific scope/gap rather than a reassuring clean-history conclusion.

## Licensing, retention and privacy

Before admission, record permission separately for raw bytes, normalised facts, derived events, references/timestamps, customer web display, eventual PDF, AI use if later contemplated, and continued historical display after cancellation. Preserve terms URL/review date/policy version and attribution. Raw responses are discarded after bounded normalisation by default; discovery candidate lists never become a retained general dataset.

EPC: retain only permitted non-address fields/UPRN and provenance under the existing policy; use independently licensed selected postal identity. No copied EPC address/postcode/photo or occupancy inference. FSA: existing OGL policy, attribution and private-address exclusions. Overture: pinned source-specific licences/notices and D77 limitations. Planning: licence the actual metadata, not automatically every portal document; omit applicants/agents/contacts/signatures. Reviewed web facts: no copied article/images or assumed snippet rights; unclear reuse remains blocked/reference-only and cannot supply a published assertion.

PropertyData's current-data cache and historical report rights are separate; no current-status answer from an expired snapshot. Confirm the controlling post-cancellation serving condition before a production report depends on continuing access. A proposed 30/60-day download window is not a licence substitute and does not authorise overwriting history. Source-required removal, if later necessary, follows an explicit approved retention policy and shows unavailable evidence without replacing the original result with fresh data.

Operator imports exclude owners' private details and sole-trader personal fields. No documents/files uploads UI, scraping authentication, source secrets in query logs, arbitrary redirects, credential forwarding or untrusted external HTML execution. Any automatic HTTP target is a fixed approved host with timeout/byte/page caps. Source text remains data; no external instructions enter application authority.

| Source representation | Raw | Normalised facts / derived events | References and timestamps / display |
| --- | --- | --- | --- |
| Existing FSA and Overture | Discard | Existing admitted public-field/source-specific policy; no additional contractual numeric expiry asserted | Retain permitted lineage/notices; historical as-of display, no new currentness promise |
| EPC non-address fields | Discard | OGL permitted subset; no contractual numeric expiry identified, subject to SiteFit's approved retention policy | Permitted reference/date/UPRN retained with attribution; address fields excluded |
| GLA/authority planning metadata | Discard | Admission-blocked until actual field licence and historical retention are recorded; no default duration assumed | Same field-specific gate; references alone do not authorise reproducing document content |
| PropertyData trial subset | Discard | Dated historical exception only if conditions met; current cache at most 60 days; no standing dataset | Dates/references retained under historical conditions; future post-cancellation customer display question must be resolved |
| Reviewed web/council/rates fact | No article/file retention | Only individually permitted factual subset; explicit source policy/duration, otherwise blocked | Record permitted original link and review date; Barnet one-month metadata requires clarification, not automatic permanent storage |

These contractual limits are not a customer deletion schedule. The existing historical-report policy and a separately approved data-protection retention schedule govern actual duration. For every new admitted source, set `allowed`, `maxDays` and conditions for each representation; `maxDays: null` means no identified contractual numeric expiry **only when allowed is true**, never unknown permission.

## Budgets and storage

Proposed limits to approve with this plan: official planning at most two pages/50 candidates; optional PD fallback at most 20 returned results/two credits and no automatic retry; EPC one discovery page capped at ten and at most three certificate detail requests; reviewed import at most ten selected facts. Retain truncation and uncertain order; a capped response cannot identify the latest/earliest certificate. Per-source eight-second timeout, overall existing 30-second collector deadline; max 1 MB transient response per source, max 100 KB combined retained history bundle and 30 admitted events. Validate real schemas within those bounds; do not silently trim required provenance. If a source cannot honour a credit/result bound, do not dispatch it until a safer request is available.

No new paid API is baseline-required. Existing trial credits may be used only within prior approval and actual remaining access; no renewal. PD's fully utilised two-credit allocation is £0.028 on the smallest tier, but £28/month is a fixed commitment: at ten reports that alone is £2.80/report. Optional future Brave discovery at two queries allocates US$0.01, subject to storage rights and owner account/spend approval; not implemented here. Labour cost and review incidence are measured separately. No AI verification budget is needed for Phase 9.

Phase 8 measured whole database: 374,060,723 bytes, 125,939,277 below the conservative 500 MB allowance; only 939,277 below the existing 375 MB activation checkpoint. No new bulk London history release or index-per-candidate. Use a small real proof set and existing indexed owned reads. Measure `pg_database_size`, relation/TOAST/index breakdown and lookup p50/p95 before/after; do not extrapolate admission from JSON size alone. Target additional proof storage ≤500 KB total, lookup p95 ≤1 second for a stored bounded timeline; these are proposed QA targets, not measured results. Respect the existing storage admission policy. If it prevents admission, stop that write and report actual numbers; do not delete immutable history, relax the ceiling or request/buy an upgrade automatically. Launch-volume capacity/retention remains a separate approved gate.

## Execution sequence

Each step updates `docs/phase-9-status.md` with implemented/verified/blocked distinctions, actual costs and deviations. Do not expand a source gap into a general infrastructure project.

| Step | Implementation scope | Required proof |
| --- | --- | --- |
| 9.0 Baseline/source admission | Record Phase 8 head, historical digests, storage; inspect current GLA schema/access/licence; confirm existing trial access only if fallback needed; freeze source policies | Read-only actual official request and field/right matrix; record unavailable source without false coverage. No purchase/account creation without permission |
| 9.1 Contracts and identity | Closed history/event/date/receipt/result schemas and exact-unit rules inside current boundaries | Independent adjacent-unit, whole-building, renamed-road, same-name-different-site, unknown UPRN and date-precision tests; null/zero distinctions |
| 9.2 Official planning | One admitted bounded GLA adapter, or permitted existing-trial PD substitute; council record references | Real London commercial matched application/decision and nearby rejected candidate; page cap/failure/schema drift; proposal never reported as implemented use |
| 9.3 Existing observations/EPC | Convert existing permitted observations; separately version bounded multi-certificate history if beneficial | Real dated non-domestic certificate and missing/multiple/ambiguous cases; restricted address fields absent; inspection/update dates not opening dates; salon FSA not applicable |
| 9.4 Reviewed history facts | Trusted structured operator import, ownership/source/right validation, no UI/general crawler | At least one real verifiable prior-business/change case with exact premises linkage; a source lacking a usable date remains undated; unsupported claims rejected |
| 9.5 Timeline/evidence | Deterministic sorting, dedup by provider record/event meaning, conflicting observations, gaps and result-first structured projection | Known source-backed events preserved, contradictory dates retained; record removals/name differences not fabricated closures; successes survive an unrelated source failure |
| 9.6 Immutable persistence/security | Narrow forward source/purpose/RPC guards, atomic derived freeze, existing owner reads; no mandatory event table | Fresh database and hosted rollback suites: cross-owner/input/UPRN/checksum rejection; ready Free graph unchanged; stored replay zero provider/AI/scoring calls; unfinished source resume preserves successes |
| 9.7 Bounded live London pilot | Six distinct premises: café, restaurant, salon, known past-business change, mixed/sub-unit ambiguity and genuine sparse/no-match case; cases may combine roles | Record exact source/event admissions and gaps, retrieval latency/credits, useful-history yield. At least two genuine dated property events and one verified business-history/change example; do not pass using fixtures/all-unknown outputs |
| 9.8 Integration/regression | Internal section-ready projection and controlled protected Preview read/security proof; preserve Phase 7/8 customer journey | Existing application/regression/build/public/database checks; owner/access/Test purchase continuity where touched; no new paid generation, calculations, UI redesign or claimed customer acceptance |
| 9.9 Protected delivery | Reconcile plan/status/rights/costs; exact-head CI, protected PR/merge, post-merge CI, main=origin and clean | Complete evidence-backed checklist and remaining pre-launch limits; no Phase 10 start merely because this passes |

Implementation mapping: contracts/matching/normalisers get Node unit fixtures using permitted minimal or labelled synthetic records; new HTTP adapters use contract/failure tests; migration/RPC changes extend existing fresh/hosted SQL suites. No secrets/live traffic in CI. Run lint/types while changing TypeScript, production build for runtime changes. At final regression use Node 24/npm 11 `npm ci`, `npm run check`, production-server `npm run check:public`, `npm run check:database` and relevant hosted ownership/immutability suites. Do not rerun unrelated geographic certification or every payment ceremony for a data-only change.

## QA, dependencies and risks

QA is a small independent source-versus-output review, not an exhaustive recall benchmark. Track useful event yield by concept, unit-match rejection, unresolved dates, current-only records, rights-blocked records and operator minutes. Primary precision requirement: **zero knowingly admitted wrong-unit events or unsupported opening/closure/vacancy claims**. A useful timeline need not be long. The six real cases establish capability, not London-wide completeness or sale acceptance.

Dependencies: source access/reuse proof, preserved Phase 8 identity and owned context, development Supabase capacity, existing protected CI/Preview. New provider failure must leave existing successes readable. Main risks are patchy history, unit ambiguity, rights/retention restrictions and operator cost. Mitigate with scoped claims/gaps, not bought completeness, confidence theatre or a large source sweep. Live GLA/source licensing can block only its dependent adapter; finish contracts, persistence, reuse and reviewed factual proof independently. If mandatory positive proofs cannot be obtained lawfully, report the unresolved gate for owner resolution rather than declare completion.

## Definition of Done

- [ ] Owner approves this revised scope; source/spend permissions recorded independently.
- [ ] At least one permitted planning-history source actually admitted and verified; exact-unit rejection and qualified building context proved.
- [ ] Existing-source reuse and real certificate/registration observation semantics verified without invented occupancy dates.
- [ ] Six real London cases, two dated property events and one exact-premises business-history/change proof documented; sparse/ambiguous cases remain honest.
- [ ] Every event has scoped identity, proper date precision/meaning, source/Evidence and rights metadata; contradictions and source outcomes retained.
- [ ] No absent record, company dissolution, expired EPC, to-let advertisement or provider removal is used as proof of business failure/continuous vacancy.
- [ ] Ready Free graph/digests unchanged; separate deeper namespace/result freeze and zero-call stored replay verified locally and hosted; new checks create new Analysis.
- [ ] Owner/RLS/privileged writer and cross-context binding checks pass; no raw/personal/restricted address/search candidate leakage in HTML/JS/network/logs where exposed.
- [ ] Actual storage/index footprint and stored lookup p50/p95 recorded within existing policy; provider credits/latency/review time and access limits documented.
- [ ] Internal section-ready projection integrates with existing data/Evidence boundary without creating a Full Report or changing Free/purchase/scoring/AI behaviour.
- [ ] Required targeted/final regression, hosted checks, protected Preview and exact-head/post-merge CI pass; any UI changes additionally receive keyboard/responsive/material 200% checks. Automated tests are not user acceptance.
- [ ] Protected merge, main=origin and clean tree; no unauthorised service/subscription/infrastructure/Production activation or later-phase work.

No DoD item is passed by this planning document. Missing-source rights/access and positive-history proofs cannot be silently waived. UX/UI remains not approved for launch; final visual refinement and AI Native Full Report Dashboard remain later approved work.

## Explicit exclusions and reconsideration triggers

Exclude a national or London-wide historical occupancy database, 33 portal scrapers, continuous polling, multiple Overture archives, routine land-title/lease purchases, private landlord enrichment, imagery/OCR, automated closure causes, tenancy dates from proxies, churn/failure scores, completeness promises, production scoring/prompt calibration, financial formulas, Full Report/PDF generation, visual redesign, live payments and subscriptions.

No durable request lifecycle, lease tokens, distributed job ownership, generic workflows, exactly-once provider claims, detailed billing ledgers, money reservations or distributed caches. Reconsider only after an observed delivery/concurrency/cost failure and a separately reviewed minimal remedy. Consider specialist data only after pilot evidence shows missing history materially reduces report usefulness/purchases, and a sample demonstrates exact-unit incremental value with durable report rights and a viable cost per report. Neither trigger has been established by this research.

## Owner decisions genuinely required

**Now:** approve the proposed narrow automated timeline plus reviewed-source pilot path, its finite limits and DoD. This is implementation approval only if the owner explicitly grants it; no commercial purchase is bundled.

**Only if encountered:** a provider requiring new account/credentials; a paid subscription/trial renewal; a rights clarification requiring owner/provider correspondence; a capacity admission conflict; or inability to meet a mandatory positive proof. Ask only for the dependent action, never secrets in chat, and continue independent approved work. Existing trial access is not subscription permission. No Supabase upgrade, specialist contract, search API account, new AI budget or title purchase is required to approve this proposal.

**Later pre-launch:** confirm customer report-retention/display rights, truthful marketing coverage, actual paid delivery and the separately approved direct Production Stripe gate. Phase 9 completion alone does not authorise sales, Production or Phase 10.
