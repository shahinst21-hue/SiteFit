# Phase 8 plan — London evidence enrichment

**Status: proposed, awaiting explicit owner approval. Planning completed 7 October 2026. No Phase 8 implementation or commercial subscription is authorised by this document.** Phases 6 and 7 remain complete and frozen. Development verification will use Local and protected Preview; Production, live payments, Full Report generation, financial execution, PDF generation, Phase 9 and Phase 10 remain outside this phase.

## 1. Recommendation and decision to approve

Build on the existing Evidence, metric, comparison, weighting, interpretation and immutable Snapshot engine. Use official London bulk data for reusable statistics, Overture for the primary business inventory, one walking-routing provider and one conditional property-enrichment provider. Do not buy repeated Census queries or add separate services for every property attribute.

Recommended core: existing Postio, ONS/Nomis, existing TfL and FSA; internal OS Open UPRN, Census, income, BRES, Overture, NUMBAT and selected Planning Data releases; Geoapify Free for walking polygons and a small station matrix. PropertyData is the proposed single address-to-UPRN resolver and commercial enrichment adapter, **conditional on explicit trial/subscription approval and successful commercial-unit proofs**. It is not an existing SiteFit integration. Its monthly subscription is a real exception to the owner's preference for no recurring costs before revenue; approval of this implementation plan alone must not trigger a purchase.

The original source matrix is broadly sensible. Simplify it by using one property adapter, bulk official statistics, one routing service and existing transport/food adapters. Defer parallel EPC, Historic England and Environment Agency APIs until a verified field gap warrants them. A small official bulk fallback can be preferable to another runtime API.

Expected benefit: a stronger assessment of reachable residential context, local employment and income context, observed business mix, walkable access and specific premises constraints. This does **not** guarantee four complete dimension scores. Missing differentiation, trading-hours fit, permitted use and lease/physical suitability remain material. Never turn incomplete components into a complete overall score to populate the UI.

The user discussed a 30/60-day download period on 7 October. Record this as a **delivery-policy option**, not approval to delete purchased reports. Retain the accepted historical-report architecture. A future expiring download link may be renewable from the same stored report/PDF without provider, score or AI execution. Any actual report-retention change needs a separate explicit product decision, customer disclosure before purchase and pre-launch review. No Terms, deletion task or PDF flow changes are included here.

## 2. Actual repository baseline

Reviewed the documentation under `docs/`, including [product](product.md), [roadmap](roadmap.md), [architecture](architecture.md), [database](database.md), [sources](data-sources.md), [decisions](decisions.md), [Phase 5](phase-5-status.md), [Phase 6](phase-6-status.md), [Snapshot UI](free-snapshot-ui-status.md), [Phase 7 plan](phase7_plan.md) and [Phase 7 completion](phase-7-status.md). Historical planning paragraphs do not override implementation or completion evidence.

Baseline main: `55b2435fc45bc128ab9d8647230f66137b36850c`, following protected Phase 7 implementation PR #20 and completion PR #21. `Development-01.txt` was not present in the repository or the searched Desktop, Downloads and attachment directories. Its contents have not been assumed or cited; reconcile it if supplied before implementation, without blocking this evidence-based plan.

| Existing capability | Inspected implementation | Consequence for Phase 8 |
| --- | --- | --- |
| Owned property selection | Postio selection, canonical internal property UUID; provider address ID is not UPRN; coordinates may be postcode centroid | Resolve a selected property before freezing a **new** precise input; do not retrofit historical contexts |
| Provider framework | `lib/data/contracts.ts`: closed three-source union; payloads population, StopPoints, food establishments; observations currently official-only | Extend bounded, versioned contracts for commercial/community evidence, statistics, POIs and geometry; keep old readers |
| Evidence | `lib/analysis/evidence.ts`: strict v1 identity, parent lineage, observations, provenance, quality and licence checks | Extend geography/structured representations only where needed; do not bypass runtime validation |
| Scoring | `lib/analysis/scoring.ts`: four dimensions, business-specific hypothesis weights, complete-required-component gates | Reuse composition and suppression; no second score engine, AI-assigned ad hoc weights or neutral defaults |
| Comparison | Pinned same-authority OA population-density cohort; midrank percentile, at least 30 peers and 90% eligible coverage | A walk-catchment target cannot be ranked against whole OAs; new comparable scopes need their own frozen cohort definition |
| Interpretation | Bounded reviewed assertions and evidence-linked section/synthesis validation, stored once | Add admissible propositions for new metrics; do not introduce unrestricted AI research or free-form fact invention |
| Snapshot view | `lib/snapshot/model.ts`: v1 pure projection, real overall score unavailable, map/transport/property slots | Data wiring only; existing polygon arrays cannot safely express arbitrary holes/MultiPolygons without a versioned geometry representation |
| Persistence | Private versioned ONS geography/statistics, owned frozen inputs, unique source outcomes, immutable ready reports/sections | Add narrow forward migrations and dataset manifests; no edits to applied migrations, ready objects or payment state |
| Verified sources | ONS TS001 usual residents, TfL StopPoints, food-conditional FSA | Stops are not service quality; FSA is not a complete competitor inventory; Census is not current daytime population |
| Phase 7 | Permanent account continuity, claimed original Snapshot replay, Stripe Test entitlement and protected delivery verified | Preserve guest/account history and entitlement bindings; enrichment does not authorise purchase or Full Report generation |

Existing source collection has independent outcomes, bounded retries/pages/bytes and process-local safeguards. Existing interpretation has a bounded 110-second generation envelope and at most eight AI calls. Larger indexed queries and context transfers have documented finite limits; benchmark before adjusting them. No workflow platform, leases, distributed ownership/cache, billing ledger, monetary reservation or exactly-once claims are required.

## 3. Provider decision rule

For each data point: first use an adequate existing source; then a free official bulk release if useful across reports; then an approved PropertyData field if it gives sufficiently precise commercial data with lower implementation effort; then one justified external API. Derive only what the input actually supports. Otherwise defer or retain explicit missingness.

Evaluate incremental decision value, coverage, position/scope, reference date, historical-storage compatibility, calls and actual amortised cost. An endpoint's existence or a provider's general coverage claim is not proof that it works for the selected commercial unit. Do not operate two parallel suppliers indefinitely merely to avoid making a source decision.

## 4. Provider keep/replace/defer matrix

Classification is this plan's recommendation, not a record of implementation or purchase.

| Proposed provider/use | Decision | Reason and approval/proof condition |
| --- | --- | --- |
| Postio address capture | KEEP | Existing verified selection; keep temporary candidates transient and selected property canonical |
| PropertyData resolver/enrichment | KEEP, conditional | One proposed adapter; identity, optional property facts and commercial rent. Trial/card/recurring charge require separate owner approval |
| OS Open UPRN | KEEP as internal bulk | Exact UPRN coordinate check; **not** a text address resolver or commercial classification source |
| ONS/Nomis Census | KEEP as internal bulk | Extend existing releases; no demographic API calls per report |
| ONS small-area income | KEEP as internal bulk | Precisely labelled modelled MSOA household-income context, with confidence intervals |
| BRES via Nomis | KEEP as internal bulk | Workplace employee-job context, not resident workforce or footfall |
| Overture Places | KEEP as primary, qualified | Real five-area probe supports further use, but shows stale/category/anchor gaps. Counts require QA/deduplication; no completeness claim |
| FSA | KEEP existing conditional source | Official food registration corroboration; no universal competition or quality score |
| Geoapify | KEEP Free, subject live proof | Persistable walking geometry; one adapter also supplies bounded station walking times |
| TfL API | KEEP existing source | Stop identity/modes/location; only add narrow official fields with concrete analytical use |
| TfL PTAL | KEEP supporting historical layer; current scoring DEFER | Public downloadable 2015 grid is not a 2026 observation; newer verified official vintage is needed for current rank |
| TfL NUMBAT | KEEP internal bulk | Actual public 2025 output files verified; modelled rail activity by day type/time interval |
| Planning Data GOV.UK | KEEP selected internal bulk layers | Constraint polygons and source coverage metadata justify spatial joins; avoid a runtime call per designation |
| Historic England separate API | DEFER | Prefer adequate heritage layers through Planning Data; use official bulk fallback only for a demonstrated location/coverage gap |
| Environment Agency separate API | CONSOLIDATE INTO PROPERTYDATA for rivers/sea, conditional; surface water DEFER pending gap proof | Precise point query can avoid another API if approved PD data is adequate; do not imply it covers surface water. Official bulk fallback is justified if PD is unavailable or insufficient |
| GOV.UK EPC separate API | CONSOLIDATE INTO PROPERTYDATA if non-domestic unit proof passes; otherwise REPLACE that field with official non-domestic bulk | Public PD descriptions do not establish non-domestic completeness. One source per field, not unconditional duplicate integrations |
| Google Places | DEFER | Reviews/hours can help later; general content storage restrictions conflict with durable evidence unless a permitted representation is established |
| Foursquare paid API | DEFER | Do not purchase richer attributes without measured coverage/value gain and retention review |
| Foursquare Open Source direct bulk | DEFER | Already contributes to Overture; examine missing coverage first, not another default inventory |
| Measured footfall vendor | DEFER | No present evidence that recurring paid measurement is essential for first-version value |
| OS Places / retired Match and Cleanse | REJECT as current default replacement | Additional onboarding, costs/rights and no demonstrated advantage; Match and Cleanse was withdrawn |
| Self-hosted Valhalla/ORS | REJECT for current scale | Operational cost/complexity without demonstrated need |
| ORR station-usage bulk | DEFER, justified fallback candidate | If NUMBAT omits a material National Rail station such as Kingston, a small official annual bulk layer can close that specific gap; not an automatic additional runtime API |

Evidence for alternatives: [OS Open UPRN](https://docs.os.uk/os-downloads/products/addresses-and-names-portfolio/os-open-uprn/os-open-uprn-overview) supplies identifiers and coordinates without addresses; [OS Places plans](https://osdatahub.os.uk/support/plans?lang=en) involve different access/transaction terms, and [Match and Cleanse retirement](https://docs.os.uk/os-apis/accessing-os-apis/os-match-and-cleanse-api/end-of-life-information) prevents recommending the old service.

## 5. PropertyData endpoint audit

Audit date: 7 October 2026. API and website subscriptions differ. Public endpoint documentation was inspected; **no authenticated PropertyData response was obtained**, no credentials requested and no account created. D = defer, F = fallback, C = conditional Phase 8 call. Expected usage is per new analysis/data collection, never per reopening. "Not disclosed" means endpoint-specific vintage/update cadence was not established; website-wide near-real-time marketing does not fill that gap.

All credit numbers below are documented list charges, not a guaranteed cash transaction price. Public [API index](https://propertydata.co.uk/api) and [credit/error reference](https://propertydata.co.uk/api/markdown) establish endpoint availability and charging. Successful/no-data responses may consume credits; distinguish endpoint-specific no-match pricing from generic errors. Use server-side header authentication from the [authentication documentation](https://propertydata.co.uk/api/documentation), never keys in browser/query logs.

| Endpoint / group | Output and cost | Source / freshness / precision | Planned calls and consolidation decision |
| --- | --- | --- | --- |
| [address-match-uprn](https://propertydata.co.uk/api/documentation/address-match-uprn) | Up to ten candidate UPRNs, address, coordinates and classification; 10 credits, documented no-match discount requires live confirmation | Address/UPRN supplier data; per-record vintage not disclosed; ranked address points, not guaranteed unit match | C: 1. Primary resolver; no automatic second resolver. Reject ambiguous candidates |
| [uprn](https://propertydata.co.uk/api/documentation/uprn) | Address point, description/use-class, optional area/EPC/transactions/registered leases; 10 | Mixed source property record; optional fields; address-level match; individual source dates needed | C: 0–1 **only if** additional useful facts absent from match. Consolidates type/area/EPC when adequate, not automatically for coordinates already returned |
| [uprns](https://propertydata.co.uk/api/documentation/uprns) | Postcode UPRN candidates and classification; 1 per ten results | Address register; not disclosed vintage; exact postcode mode available, multiple units | F: one bounded candidate lookup instead of match, not both by default. Persist selected record only |
| [uprn-title](https://propertydata.co.uk/api/documentation/uprn-title) | Title lookup; 1 | Land Registry linkage; not disclosed freshness; title may cover multiple properties | D: 0; Phase 9 exact title lineage, not mandatory identity lookup |
| [title](https://propertydata.co.uk/api/documentation/title) | Title extent, interest/ownership, attached UPRNs and registered leases; 1 | Land Registry; missing leasehold links possible; title extent is not selected trading unit | D: 0. Registered lease term is not actual proposed rent/break clauses; avoid personal owner collection |
| [title-use-class](https://propertydata.co.uk/api/documentation/title-use-class) | Predicted use class; 1 | Inferred classification, not planning consent; date not disclosed | D: 0. Cannot clear permitted-use component; no separate classifier now |
| [rents-commercial](https://propertydata.co.uk/api/documentation/rents-commercial) | Area commercial quoting-rent benchmark; 1 | Modelled VOA/MHCLG-based benchmark; adaptive radius/type/sample; preserve returned date/radius | C: 1 after approval. Preferred rent supplier; no paid parallel rent source |
| [valuation-commercial-rent](https://propertydata.co.uk/api/documentation/valuation-commercial-rent) | Property rental estimate; 1 | Modelled; postcode/type/area assumptions; exact response precision/vintage unproven | D: 0 now. Phase 10 may use as alternative to area benchmark, not duplicate truth or user's lease |
| [valuation-commercial-sale](https://propertydata.co.uk/api/documentation/valuation-commercial-sale) | Commercial sale estimate; 1 | Modelled property/area context; not achieved transaction | D: 0; retail tenant decision does not require purchase valuation |
| [floor-areas](https://propertydata.co.uk/api/documentation/floor-areas) | Known areas at postcode; 1 | EPC-derived coverage/measurement basis needs exact-unit proof; per-certificate date | F: 0–1 only if /uprn lacks adequate fact. Do not substitute whole building/residential flat for shop or NIA for GIA |
| [energy-efficiency](https://propertydata.co.uk/api/documentation/energy-efficiency) | Postcode EPC ratings; 1 | Certificate-based; coverage labelled commercial but ND detail not proven; match selected unit/certificate | F: 0–1 if /uprn inadequate. If ND proof fails, use official ND bulk, not a domestic rating |
| [flood-risk](https://propertydata.co.uk/api/documentation/flood-risk) | Rivers/sea risk; 1 | EA-backed; coordinates query at point, postcode query at centroid; source vintage must be retained | C: 0–1. Prefer exact-point PD if approved; official bulk alternative. Surface-water risk remains separate |
| [conservation-area](https://propertydata.co.uk/api/documentation/conservation-area) | Conservation designation; 1 | England partial; location/postcode result; no established full London coverage | F: 0–1 only when precise/source-covered and official layer insufficient. Prefer internal polygons for reusable attribution |
| [listed-buildings](https://propertydata.co.uk/api/documentation/listed-buildings) | Nearby listed buildings; 1 | Historic England-derived local records; query radius/location, not selected-property listing proof | F: 0–1 only for a gap; proximity is not listed status. Avoid duplicate official heritage API |
| [green-belt](https://propertydata.co.uk/api/documentation/green-belt), [aonb](https://propertydata.co.uk/api/documentation/aonb), [national-park](https://propertydata.co.uk/api/documentation/national-park) | Designations; generally 1 each | Area constraints; coverage/date/point semantics require proof | D/F: 0 default. Selected relevant official polygons avoid buying every constraint |
| [planning-applications](https://propertydata.co.uk/api/documentation/planning-applications) | Nearest filtered applications; 1 per ten results | Local authority application aggregation; matching/title scope/freshness varies | D: 0. Phase 9 timeline must match property, not nearby applications masquerading as its history |
| [buildings](https://propertydata.co.uk/api/documentation/buildings) | Building fabric/use/height/age; **70** | Building-level mixed data; not unit interior or physical condition inspection | D: 0; high charge and uncertain incremental value for current report |
| [freeholds](https://propertydata.co.uk/api/documentation/freeholds), [titles-by-company](https://propertydata.co.uk/api/documentation/titles-by-company) | Nearby titles/company portfolio; respectively 1 per ten / 1 per fifty results | Ownership data; title-area rather than selected tenancy; endpoint-specific freshness not established | D: 0; not needed for Phase 8, minimise personal/irrelevant records |
| [ptal](https://propertydata.co.uk/api/documentation/ptal) | London PTAL; 1 | TfL-derived postcode accessibility; exact input vintage not established | F: 0 default. Do not pay repeatedly for old official grid or label unknown vintage current |
| [population](https://propertydata.co.uk/api/documentation/population), [demographics](https://propertydata.co.uk/api/documentation/demographics) | Census context; generally 1 each | Official statistics aggregated to provider area, not SiteFit walking polygon | D: 0. Replace planned aggregator statistics with own pinned Census releases |
| [household-income](https://propertydata.co.uk/api/documentation/household-income) | Local household-income context; 1 | ONS modelled small-area figures; provider vintage/aggregation need inspection | D: 0. Own MSOA release preserves intervals/geography; not a separate paid purchasing-power measure |
| [area-type](https://propertydata.co.uk/api/documentation/area-type), [property-types](https://propertydata.co.uk/api/documentation/property-types), [tenure-types](https://propertydata.co.uk/api/documentation/tenure-types) | Area classifications/housing mix; generally 1 each | ONS/Census residential context; area rather than commercial-unit type | D: 0. Official internal data; cannot identify selected commercial premises |
| [restaurants](https://propertydata.co.uk/api/documentation/restaurants) | Local food context; 1 | Coverage/category/time basis unproven for complete competition | D: 0. Existing FSA plus Overture avoid redundant limited inventory |
| [crime](https://propertydata.co.uk/api/documentation/crime) | Area crime; 1 | Police-derived geography/disclosure context, not premises-specific safety | D: 0. Not a universal premises-risk score; add only for demonstrated decision value |
| [council-tax](https://propertydata.co.uk/api/documentation/council-tax) | Domestic bands/rates; 1 | Council-tax data, not commercial rateable value or business-rates liability | REJECT for commercial rates. Dedicated adequate commercial rates output was not established |
| [listing-address](https://propertydata.co.uk/api/documentation/listing-address) | Beta Rightmove **sale** URL resolution; 10 | Partial sale coverage, no lettings, no photos right | D: 0. Does not replace Postio commercial address selection |
| [land-registry-documents](https://propertydata.co.uk/api/documentation/land-registry-documents), [site-plan-documents](https://propertydata.co.uk/api/documentation/site-plan-documents) | Purchased title/site documents; credits plus document fees | Official documents/maps with additional rights; download expiry differs from report history | D: 0; explicit purchase and Phase 9/PDF scope, no surprise charges |
| [rebuild-cost](https://propertydata.co.uk/api/documentation/rebuild-cost), [build-cost](https://propertydata.co.uk/api/documentation/build-cost) | Construction/insurance estimates; generally 1, options can add cost | Modelled assumptions; not actual fit-out quote | D: 0. Not sales/rent feasibility; later demand-led decision |
| Residential prices/rents/yields/demand, valuations and developer calculators | Separate residential investment measures; list credit rules vary | Residential listings/investment data | REJECT for commercial customer demand. No additional endpoints called |
| [george](https://propertydata.co.uk/api/documentation/george) | Provider AI research, 10 credits per documented request | Provider inference, not new authoritative fact | REJECT for Phase 8; duplicates SiteFit AI/claim engine |
| [account/credits](https://propertydata.co.uk/api/documentation/account/credits) | Remaining usage, 0 | Provider account operational data | C: bounded development/preflight check, not report content or client exposure |

Endpoint families with zero planned usage are audited to prevent accidental scope/cost expansion. Variable document or portfolio charges are deliberately not approximated as a one-credit purchase. Recheck chosen endpoint schemas/credits immediately before its controlled proof.

The [property field reference](https://propertydata.co.uk/data-fields) describes internal area as EPC-backed and commonly residential. It does not establish commercial shop NIA, full non-domestic coverage, current permitted use or a business-rates bill. No dedicated business-rates endpoint was established in this audit. Lease records can support later registered-term evidence, not repair obligations, incentives, actual rent or contractual suitability.

### Commercial rent semantics

[PropertyData's commercial-rent methodology](https://propertydata.co.uk/commercial-rents) describes a model using VOA rateable values and MHCLG floor-area inputs, adjusted for conditions; it is not a feed of completed commercial leases. Store source/model vintage, type, geography/radius, sample, dispersion, area basis and currency/unit. Proposed label: **"Modelled headline quoting rent benchmark (£/sqft/year)"**. Preserve NIA/GIA distinction and incentives exclusion. Suppress if incompatible type, too few observations, absent area basis or unexplained spatial expansion. Future Economics may use it as a labelled scenario comparison; never populate the user's actual lease rent or calculate break-even in Phase 8.

## 6. Property identity and point precision

Keep internal UUID and Postio provider identity. UDPRN, UPRN, title ID and business POI ID are different namespaces. Resolve only the selected address using the approved PropertyData adapter. Compare full postcode, building/number, street and secondary unit; retain candidate-selection reason and ambiguity. Do not drop unit distinctions merely to improve match rate. A ranked first/nearest candidate is not verified identity.

If one unit match is defensible, preserve UPRN as a string, provider point, source date/precision and classification. Cross-check that exact UPRN against OS Open UPRN where available. OS supplies location, not address text or active commercial status; its lifecycle includes historical/non-current entities. Treat the point as an address/building point, not a surveyed entrance/rooftop. Disagreement is a conflict requiring suppression or explicit uncertain resolution, not silent averaging.

Unresolved or ambiguous: retain selected postal property and existing history; record `unresolved`/`ambiguous`, do not attach another unit's facts. Centroid may support explicitly approximate area context; it cannot support precise walking catchments or property constraints. Do not snap to the closest UPRN, fabricate coordinates, substitute a map fixture or automatically buy OS Places. Independent dataset work continues; the precise-property proof gate remains pending.

Resolution must precede the new frozen analytical input. Store a new immutable input/context version and resolution observation; never mutate Phase 6/7 input, selected report, scores or account/purchase bindings. A later check is a new Analysis. No regeneration on ownership change or reopening.

## 7. Data architecture and storage

Use the existing adapters/registry/collector/repository, private source-data schema and narrow authorised RPCs. Bulk import tools remain in `scripts/`, never imported into application runtime. Dataset ingestion is an explicit development operator action; not a request-time download and not a new distributed pipeline.

Dataset manifest: provider/dataset ID, publisher release/reference date, internal immutable release ID, schema/normaliser/taxonomy versions, source URL, artifact checksum, geography vintage/CRS, area of coverage, QA results, licence/version/notices and permitted retention. Prepare draft -> validate -> ready atomically. Ready dataset rows and referenced geometries remain immutable; ingest corrections as a new release. Pin a release **vector** in each new input, not an unversioned "latest" lookup.

Store report-used observations, normalised facts, metric operands, comparisons and source outcomes once. The source snapshot is not a licence to warehouse every raw API response. Reports/sections/AI outputs remain immutable and replayable; permitted historical operands must be sufficient to reproduce stored metrics without refetching. Disallowed raw bytes are discarded, with only permitted representations and provenance retained.

| Source | Request/storage choice | Raw / normalised / derived / references and retention |
| --- | --- | --- |
| Postio | Existing selection, transient candidates | Keep selected canonical property only under existing policy; do not start address-dataset warehousing or change existing retention |
| OS Open UPRN | London bulk exact-identifier lookup | Versioned permitted release/coordinates, licence and references; no text address assumed |
| Census and geography | Extend internal bulk | Archive permitted source artifacts/checksums and normalised rows; retain historical operands/derived metrics, source/effective/retrieval dates |
| ONS income | Internal MSOA release | Estimates **and confidence bounds**, correct universe/units, raw permitted release and lineage; no permanent record-level personal income |
| BRES | Internal selected annual release | Count/industry/employment-status/geography/suppression/rounding retained; raw permitted published artifact, not employer-level microdata |
| Overture | Internal London extract plus boundary coverage | Release/taxonomy/IDs/source metadata and QA; permitted attributes/derived counts with per-source notices. No photos/reviews scraped or stored |
| FSA | Existing bounded food calls | Existing permitted normalised registration records, observation timestamps and source outcomes; scope/page limitations retained |
| TfL StopPoints | Existing live bounded calls | Normalised identity/mode/point plus retrieval metadata; private immutable observations, bounded process cache |
| TfL PTAL/NUMBAT | Versioned internal bulk | Permitted historical grids/station-series, exact day type/time/universe/vintage and source attribution; no unlabelled latest overwrite |
| Geoapify | Per precise new analysis | Persist permitted returned geometry/matrix results and request settings, provider response metadata, routing vintage if supplied; source/OSM attribution. Keys and debug headers discarded |
| Planning Data | Selected internal polygon releases | Dataset-specific coverage, geometry, publisher IDs, dates, provenance and licence; no personal application/owner harvesting |
| PropertyData | Approved per-property calls | Current lookup cache at most 60 days; historical per-analysis response subset/normalised facts, derivatives, refs and retrieval date retained only as historical. Exclude photos/personal owners; no standing searchable bulk copy |
| Official ND EPC / EA / heritage fallback | Only activated after defined gap | Per-dataset permitted bulk/normalised material and attribution; exact property/feature match, certificate/source dates, gaps. Verify chosen dataset terms before ingest |

Lightweight rights conclusion: official open data and Overture are compatible in principle with commercial analysis and historical releases, subject to their actual dataset licences/notices. [Overture attribution](https://docs.overturemaps.org/attribution/) is source-specific: do not label all Places ODbL or assume one blanket licence. Geoapify allows isoline storage according to its [Isolines documentation](https://apidocs.geoapify.com/docs/isolines); [terms](https://www.geoapify.com/terms-and-conditions/) require OSM attribution and Geoapify attribution on Free. Keep the latter visible with routing/map-derived output; detailed production review is pre-launch.

[PropertyData licensing](https://propertydata.co.uk/api/documentation/licensing) and [terms](https://propertydata.co.uk/terms) distinguish 60-day **current** caching from dated historical observations/reports/derivatives. This avoids deleting or refreshing ready reports. No listing-photo rights are supplied; omit photos. Subscription termination/current serving and archival access need a focused pre-launch confirmation against actual applicable terms. This is not an instruction to negotiate a custom redistribution agreement or delay independent development for a full legal project.

Google's [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) restrict content storage with exceptions such as place IDs and impose attribution/map conditions. It is therefore not the default permanent Evidence store. [Foursquare OS access/licensing](https://docs.foursquare.com/data-products/docs/access-fsq-os-places) is distinct from paid enrichment; neither requires adding an API merely for optional ratings. Reviews, rating counts, business-status flags and opening hours can improve later comparisons, but reviews are not commercial success and no adequate incremental-value proof exists here.

## 8. Customer Base data model

The user wants to learn whether the location has a plausible customer base for the chosen business. Provide a result, a short reason, independent evidence strength, the key remaining unknown and optional evidence detail. Do not make the customer perform the analysis.

| Metric / universe | Approach and source | Derivation / scope | Score use and limits |
| --- | --- | --- | --- |
| Usual residents / density | Existing SiteFit source + internal Census TS001 | Observed Census counts; whole OA density remains unchanged; new walking estimates separately labelled | Existing OA percentile valid only for that scope; new catchment rank requires compatible cohorts |
| Age profile | Internal bulk Census TS007A, verify downloadable variable/geography version | Ratios with resident denominator; preserve disclosure control, vintage and band definitions | Context, not automatic "affluent/young = better" or user-segment fit |
| Household composition | Internal bulk [TS003](https://www.ons.gov.uk/datasets/TS003/editions/2021/versions/4) | Household denominators, families/single households; no summing households as persons | Context for repeat visits; business implication must be reviewed |
| Car/van availability | Internal bulk [TS045](https://www.ons.gov.uk/datasets/TS045/editions/2021/versions/4) | Household availability, not drivers/parking demand | Supports dependence on walk/transit; does not prove parking adequacy |
| Resident economic activity | Internal bulk [TS066](https://www.ons.gov.uk/datasets/TS066/editions/2021/versions/6) | Census resident status; 2021 pandemic context | Distinct from workplace jobs; no current commuter flow implied |
| Workplace employee jobs | Internal bulk BRES | Selected all-industry employee count, not employees + employment + FT + PT summed | Workplace-context component conditional on valid comparison/precision; not daytime population |
| Modelled household income | Internal bulk ONS small-area estimates | Mean equivalised disposable household income after housing costs at MSOA, FYE 2023, interval retained | Context/benchmark, not spending, disposable cash per customer or exact catchment income |
| Reachable residents | Derived internally from pinned polygons + Census | Sum count × intersection fraction; method and material border uncertainty retained | **Estimated**, not people precisely living inside the polygon; sensitivity gate below |
| Reachable workplace jobs | Derived internally only where allocation justified | Whole intersecting LSOA totals/context; area-weighted exploratory estimate separately labelled | No exact within-walk job count from uniformly spreading workplaces; suppress scoring if geography too coarse |
| Relevant demographic fit | Derived/deferred | Reviewed business implications only; no target-market preferences invented from category alone | Partial until sufficient business concept/evidence exists; never force complete customer-fit score |
| Transport contribution | Existing TfL + internal NUMBAT supporting context | Reachable stations and relevant activity windows, only when observed/modelled series exists | Not customers; do not count same accessibility/activity effect again in multiple score components |

Residential estimates: `estimatedCount = Σ count_i × area(intersection_i)/area_i` using compatible geometry in a metric CRS, not square degrees. Uniform within-area distribution is an explicit assumption. Preserve fully included count, intersecting-area upper envelope and partially allocated amount as sensitivity diagnostics, **not a statistical confidence interval**. If more than 10% of estimated population comes from materially ambiguous boundary allocation, treat precision as limited and withhold the proposed reachable-residential subscore; still display qualified context. Revisit this conservative hypothesis only with actual QA, not to make scores appear. Census age/household ratios require correct denominators and independent rounding; perturbed tables need not reconcile exactly.

[BRES](https://www.nomisweb.co.uk/datasets/newbres6pub) latest publicly listed reference year is 2024. It records jobs at workplaces and distinguishes employees/employment/full/part-time. Import the exact published geography vintage, disclosure flags and rounding; a planning metadata probe did not establish the downloadable geography mapping. Do not silently join 2011 and 2021 LSOAs. Use the official concordance only with a declared conversion method, or retain the source geography. Survey counts are not exact persons present, commuting inflow, office occupancy or pedestrian footfall.

The [ONS small-area income technical report](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/methodologies/incomeestimatesforsmallareasinenglandandwalestechnicalreportfinancialyearending2023) supports a modelled MSOA measure with uncertainty. Compare the same income definition/year against London MSOAs, exclude target and retain intervals. Do not area-weight MSOA means into precise catchment income; use the containing/overlapping MSOAs with their geographic qualification. Do not subtract independently modelled before/after-housing figures to invent local housing costs. No assertion of current customer spending or sales follows from income rank.

## 9. Competition and complementary business model

Primary source: versioned Overture inventory. Use current `taxonomy.primary`/hierarchy and `basic_category`; do not build the retired `categories.primary` contract. Map taxonomy to reviewed business-family sets in a versioned manifest. Coffee competitors include cafes and relevant mixed-format sellers, with primary versus substitute distinction; restaurants require relevant cuisine/format unknowns; hair/beauty remains the approved shared salon category with subtypes retained.

Normalised place: internal immutable observation ID, GERS ID/release, name, point and positional limitations, taxonomy/mapping version, source list, confidence, available source update dates, available status/brand flags and matching/dedup decisions. Confidence estimates place existence; it is not market strength, completeness or review quality. Missing date/status remains unknown, not presumed trading.

Complementary families: office/coworking, gyms, hotels, grocery, retail anchors and selected civic/education destinations. Distinct metrics: observed counts within each walk polygon, family mix and identified anchors; never office POI count -> number of workers, hotel count -> guests, or anchor count -> footfall. Office labels can be service-company registrations rather than occupied buildings. Use BRES for employment context. Use TfL for transport inventory, not a loose station POI name.

Deduplication: same source ID is one record; near name/brand/category/address matches are candidate duplicates. Review colocated shops, concessions, salons and multiple businesses within one building before merging. Retain record-to-entity mapping/decision version and sources. Match FSA to Overture where confident, expose corroborating IDs; never add FSA and Overture counts. A missing FSA match is not a closed business or licence violation.

Direct competition counts are descriptive. More competitors can mean both demand and pressure; fewer can mean opportunity or weak market. No automatic inverted count percentile. Cluster context, complementary trade and differentiation stay distinct. Chain labels must be source-backed or a labelled reviewed name-based heuristic, with unknown allowed. No invented major-chain share, quality, revenue, customer loyalty or competitor strength.

## 10. Actual Overture planning QA

A public, account-free DuckDB query read the pinned Places release `2026-09-23.1` using the [official access method](https://docs.overturemaps.org/getting-data/duckdb/). Successful extract retrieved **7 October 2026, 09:34:50 UTC**; 22,475 records across five rectangles. The initial multi-rectangle query was stopped after excessive runtime; a single outer bounding box with local rectangle filtering completed in 185.07 seconds. This is operator research, not application latency or an implemented ingestion service.

Compact evidence, exact bounds, inspected fields, selected GERS IDs and method limitations are retained in [phase8-poi-qa.json](phase8-poi-qa.json). Full temporary extract was not turned into an application fixture. Name/taxonomy/point-box/confidence were inspected; source lists, address arrays and actual point WKB were not extracted in this faster probe. Therefore exact-unit/address provenance, geometric error and trading freshness remain implementation QA requirements.

Raw category counts below are **presence checks before deduplication**, not customer competitor counts or measured category recall. Grocery includes broader food stores; office category mapping is incomplete. Rectangle sizes differ; never compare these totals as ranks.

| Area / setting | All records | Coffee/cafes | Restaurants | Hair/beauty/nails* | Office/coworking* | Gyms | Hotels | Food stores | Department/shopping anchors* | Station categories* |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Soho / dense central commercial | 15,151 | 323 | 1,461 | 285 | 318 | 74 | 122 | 135 | 18 | 10 |
| Brixton / local high street and residential edges | 1,778 | 41 | 185 | 71 | 18 | 10 | 9 | 44 | 4 | 4 |
| Kingston / outer-London town centre | 2,255 | 67 | 144 | 92 | 29 | 21 | 9 | 41 | 4 | 1 |
| Stratford / retail, offices and housing | 1,861 | 36 | 146 | 46 | 23 | 16 | 19 | 35 | 8 | 15 |
| Walthamstow / high street and village/residential mix | 1,430 | 48 | 106 | 45 | 19 | 7 | 6 | 46 | 0 | 3 |

`*` Primary-taxonomy string/family filters described in the QA artifact; salon counts include primary categories containing `barber`. Null basic category exists in 1,486 records across this sample. A simplistic exact-name/rounded-coordinate probe found 20 extra same-cell records; it does not detect all duplicates or prove those 20 should all be merged.

| Obvious-business comparison | Observed result | Implication |
| --- | --- | --- |
| [Monmouth Coffee, 27 Monmouth Street](https://www.monmouthcoffee.co.uk/our-shops) | Coffee-shop record present near expected street | Positive coffee coverage example; not a completeness estimate |
| Flat White, Soho | Cafe record present; official site could not be retrieved in this session | Useful candidate; independent current trading/address verification not claimed passed |
| Federation Coffee, Brixton | Coffee-shop record present; official website timed out | Candidate coverage, current status not independently established |
| [Headmasters](https://www.headmasters.com/) Kingston | Two hair-salon records at different points; current brand lists Kingston | Unit-level duplicate/relocation ambiguity still requires investigation |
| [The Gym Group Kingston](https://www.thegymgroup.com/find-a-gym/south-london-gyms/kingston/) | Gym record near Eden Street present | Positive complementary-category check |
| [WeWork Medius House](https://www.wework.com/buildings/medius-house--london) | Named record present but classified as business-management service; another nearby WeWork coworking record | Office-family mapping and duplicate candidate QA required |
| [Eat17 Walthamstow store](https://www.eat17.co.uk/walthamstow-store/) | Eat 17 restaurant and nearby SPAR record present | Multi-use grocery/restaurant needs classification and entity care |
| [Waitrose Stratford](https://www.waitrose.com/find-a-store/stratford-london) | Grocery-store record present | Useful grocery anchor; not all supermarkets use a supermarket category |
| [Hyatt Regency Stratford, 10A Chestnut Plaza](https://www.hyatt.com/hyatt-regency/en-US/lhrrs-hyatt-regency-london-stratford/faqs) | No current-name Hyatt Regency record in rectangle; Holiday Inn London–Stratford City and nearby Hyatt House exist | Stale-brand/alias candidate and missing current-name coverage; do not assert automatic match or count old and new as separate confirmed hotels |
| [John Lewis Kingston, Wood Street](https://www.johnlewis.com/our-shops/kingston) | No department-store John Lewis record found; concessions/opticians/car park/canteen exist | Important anchor gap; concessions must not imply complete anchor coverage |
| [Kingston railway station](https://www.southwesternrailway.com/travelling-with-us/at-the-station/kingston) | Named bus-stop record, no exact station-name rail record found | Places is unsuitable as authoritative station layer; existing TfL transport source takes priority |

Conclusion: **adequate candidate primary inventory for observed competitor/complementary evidence, insufficient evidence for exhaustive counts, current trading assertions or complete anchor-based market scoring**. These gaps justify taxonomy/entity/freshness work, not automatic Google/Foursquare purchase. Implementation must extend to at least 30 independently listed current businesses, at least six per area and multiple categories, investigate the known misses, and inspect coordinates/sources/status. Proposed admission target: at least 85% correctly located/mapped known businesses overall, no core competitor category/area below 75%, all important misses disclosed, and no severe systematic positional/category defect. These are engineering acceptance hypotheses, not empirical market-coverage percentages. Failure blocks affected metric/scoring admission; seek the minimum source-specific enrichment proposal only after identifying why and whether FSA or direct FSQ open data closes the actual gap.

## 11. Walking catchments and PostGIS

Recommend Geoapify Free development. [Isoline API](https://apidocs.geoapify.com/docs/isolines) supplies actual polygons; compare 300/600/900-second pedestrian contours. A multi-range call is preferable if supported/validated, not three sequential calls. Record pedestrian profile, origin/snap point, ranges, settings, retrieved date, response geometry, provider/version data and network vintage if exposed; otherwise network vintage is explicitly unknown. Real live London routing quality is not proven by documentation and is a Step 8.4 gate.

Geoapify Free currently offers 3,000 credits/day, five requests/second and up-to-15-minute contours; storage/attribution and geometry fit are better established for this use than assuming unspecified alternative rights. [Pricing](https://www.geoapify.com/pricing/) and [pricing details](https://www.geoapify.com/pricing-details/) must be rechecked before activation. Openrouteservice is a credible alternative, not clearly superior from this audit: its current plans page redirects to the HeiGIT account portal; earlier documented quotas should not be treated as verified current commercial terms. Reconsider only if Geoapify proof fails quality/rights/quota needs. Do not implement dual routing or self-hosting.

Geometry gates: lon/lat order, finite/bounded London coordinates, CRS, Polygon/MultiPolygon and holes, closed rings, validity, bounded vertices/bytes, non-empty coverage, provider-snap displacement, origin inclusion where appropriate and approximately nested reachability with explicit anomaly tolerance. Reject implausible area, crossing/non-walkable shortcuts, excessive snap displacement or invalid geometry. Preserve original hash; deterministic repair may be used only if it does not materially change geometry, recorded with version/reason. Never silently drop holes or buffer a circle as a successful isochrone.

Use EPSG:4326 for storage/interchange and EPSG:27700 or validated geography distances for metric operations. Spatial indexes and bounding-box prefilters precede exact intersects. `ST_Covers` for boundary points; deterministic assignment on touching statistical areas, no double counts. Aggregate each cumulative 5/10/15-minute catchment separately; do not sum them. If rings are presented, difference consecutive polygons. Preserve disconnected islands and barriers.

London-only V1: check selected property against the approved London boundary. An inside-London property whose polygon crosses outside must expose retained-data coverage and omitted portion; do not clip away Surrey/Essex silently or inflate completeness. UK-wide address acceptance remains unchanged; unsupported analysis remains explicit. Extend bulk geography only by a justified bounded edge buffer with retained coverage metadata, not a UK-wide product expansion.

## 12. Accessibility and activity signals

| Input | Operation and truthful output | Score role |
| --- | --- | --- |
| TfL StopPoints | Existing API normalised locations/modes; group child platforms/stops into station/access entities carefully | Network proximity/context; stop count is not service frequency |
| Station walking matrix | Geoapify one origin to at most eight reviewed access-point targets | Modelled walking minutes/distances; use actual entrance where available, mark uncertain point otherwise; not straight-line distance divided by speed |
| PTAL | Official 100m grid/access index, pinned vintage | Supporting accessibility measure; do not call 2015/future scenario current, or turn ordinal 0–6 into linear score |
| NUMBAT | Internal station entries/exits by typical day type and 15-minute interval | Modelled station activity context; boarders/alighters/interchanges distinct, not pedestrian footfall or customers |
| Hours / useful journeys / travel fit | Narrow existing official information only if valid and relevant | Partial: station proximity/PTAL do not establish the user's trading-hours fit, useful customer journeys or frequency |

Planning proof: TfL's public bucket lists 2025 MON/TWT/FRI/SAT/SUN files, last modified 10 August 2026. Downloaded [NBT25TWT_Outputs.xlsx](https://crowding.data.tfl.gov.uk/NUMBAT/NUMBAT%202025/NBT25TWT_Outputs.xlsx) and verified sheets `_Cover`, Link_Loads, Link_Frequencies, Line_Boarders, Station_Flows, Station_Entries, Station_Exits, Station_Boarders and Station_Alighters. This proves artifact availability/sheet structure, **not** successful normalisation or a particular station value. Pin downloaded hash and read cover/methodology before admission. Reference year 2025 is different from publication/retrieval year 2026.

[TfL open-data guidance](https://tfl.gov.uk/info-for/open-data-users/our-open-data?intcmp=3671) and [NUMBAT introduction](https://crowding.data.tfl.gov.uk/NUMBAT/Intro_to_NUMBAT.pdf) explain the modelling and day types. TWT represents a typical Tuesday–Thursday, not three additive independent observations. The [public PTAL download](https://data.london.gov.uk/dataset/public-transport-accessibility-levels-24rz6) is 2015; future scenario years are not measured current conditions. PropertyData PTAL does not solve missing vintage merely by being paid.

NUMBAT does not establish universal National Rail coverage. If Kingston-type coverage remains missing, expose unavailable rail activity; optionally propose official [ORR 2024/25 station-usage bulk](https://dataportal.orr.gov.uk/statistics/usage/estimates-of-station-usage/?level=1), dated annual modelled entries/exits. Never mix annual ORR and typical-day NUMBAT into a single unlabelled count or divide annual estimates into invented measured daily footfall.

**Footfall Signals remain separate supporting evidence, not a fifth scored dimension.** Residential estimates, workplace jobs, station activity, identified anchors and business density can support a qualitative activity conclusion with independent limitations. Do not sum them into people/day, invent conversion rates or double count them as multiple score boosts. In report language prefer "Activity signals" with explicit "not measured pedestrian footfall" explanation. Paid pedestrian counters, mobility data, popularity scores and customer journeys are deferred until their incremental decision value is established.

## 13. Premises boundary

Phase 8: defensible UPRN/address point, sourced classification (distinct from legal use), exact-match certificate/area where available, specific spatial constraints and qualified commercial rent benchmark. [Planning Data](https://www.planning.data.gov.uk/docs) offers datasets with different completeness and provenance; choose only meaningful London layers such as conservation/heritage/flood constraints with documented coverage. No returned feature is not proof of no constraint. Match point/building/outline/nearby feature separately, preserving relationship and positional uncertainty.

PropertyData flood at resolved coordinates may consolidate rivers/sea evidence. If unavailable, one official bulk extract is preferable to several live EA calls. Surface water is a separate hazard and is not covered by the PD endpoint. Historic England direct data is a fallback for known heritage coverage gaps, not another default heritage API. Avoid broad "low premises risk" while planning, physical condition, permitted use or lease details remain unknown.

PropertyData EPC/floor-area proof must include London non-domestic shop/restaurant/salon units and a mixed-use building. If inadequate, the official [GOV.UK energy data service](https://get-energy-performance-data.communities.gov.uk/) offers domestic, non-domestic and display-certificate data; the former Open Data Communities entry redirects there. Account access is an eventual gate, not requested now. Prefer a bounded non-domestic London bulk release over a second permanent runtime API if it resolves the verified gap. Keep certificate date/status, superseded/expired record handling and exact-unit match. Never use residential flat EPC to label the shop below.

Business rates: rateable value is not annual liability. No adequate PD field was verified; defer a specific rateable-value source until required and approved, and actual multipliers/reliefs/user rates costs to Phase 10. Phase 9 adds property-matched planning/use/occupier/title/lease **history** and timelines; nearby applications, sale records or registered leases are not inserted as Phase 8 historical conclusions. Phase 10 adds user financial inputs and deterministic scenarios, including rent sensitivity; no calculations here.

## 14. Metric registry, normalisation and score readiness

Add versioned metric definitions to the existing registry, not a generic expression/workflow engine. Every definition has units/universe, effective date, scope, evidence parents, missingness rules, derivation, aggregation and direction policy, comparison eligibility and scoring/component role. Preserve current metric versions for old reports.

Proposed IDs are descriptive planning names, not committed implementation contracts:

| Metric family | Normalisation/comparator | Proposed component admission |
| --- | --- | --- |
| `residents.walk5/10/15.estimated`, `residents.density` | Same radius/profile/geography vintage and allocation method; preserve existing whole-OA density comparator | Residential subscore can be admitted after spatial/comparator QA; otherwise descriptive estimate |
| `age.share`, `households.mix`, `households.no-car`, `residents.economic-activity` | Correct ratios; context only until reviewed business relevance; no blanket monotonic preference | Customer-fit supporting evidence, not a complete invented fit component |
| `workplace.employee-jobs`, `workplace.jobs-density` | Same annual BRES status/universe/geography; disclosure/suppression checked | Workplace context, potentially subscore at defensible native geography; precise reachable workplace subscore may remain withheld |
| `income.equivalised-disposable-ahc.mean` and bounds | Same FYE/definition London MSOAs, target excluded, interval/scale limits retained | Local income context; any direction-to-business subscore requires reviewed policy, not "richer always better" |
| `poi.direct-observed`, `poi.substitute-observed`, `poi.complementary-by-family`, `poi.anchors` | Same release/taxonomy/entity method/catchment; no automatic higher/lower-is-better | Direct/cluster/complementary evidence; competition score withheld until direction and coverage defensible |
| `transport.walking-time`, `transport.mode-choice` | Same routing profile and access-point definition; no count of platforms as independent lines | Walking-reach/proximity support; reviewed subscore possible, other access components remain partial |
| `transport.ptal.historical`, `station.entries/exits.typical-day` | PTAL ordinal/context; NUMBAT same year/day/time/mode and no incompatible annual cohort | Supporting signal, not a complete service-hours/useful-journeys score |
| `premises.classification`, `premises.epc`, `premises.floor-area`, `premises.constraint` | Matched property facts and presence/unknown states; no numeric score for "no record" | Specific premises evidence, no full legal/physical/lease clearance |
| `rent.commercial-modelled-quoting` | Type/area basis/radius/sample/range; no generic rent rank detached from business economics | Descriptive benchmark for future Phase 10; no financial execution |

Keep existing midrank normalisation `(less + equal/2) / n × 100`: unique target-excluded membership, at least 30 peers, at least 90% eligible coverage, nonconstant distribution, finite values and versioned operands. A percentile is relative position, not suitability. Apply directional transformation only with a separately reviewed metric policy; density, income and competition have trade-offs and saturation. Do not replace initial weight hypotheses with uncalibrated provider scores or AI calculations.

| Dimension and user question | Phase 8 contribution | Remaining required components / responsible numeric output |
| --- | --- | --- |
| Customer Base: plausible local customers? | Better residential subscore; employment/income context; reachable estimates and demographic reasons | Business-specific fit and time-specific transport remain partial; composite null unless **every** existing required component passes. Supportable metric percentiles may appear with scope |
| Market Position: how crowded/complementary is this market? | Observed competitor/anchor mix, category/dedup/provenance, qualified cluster evidence | Differentiation and inventory completeness remain partial; no full score merely from POI counts |
| Customer Access: can relevant customers reach it? | Real walk geometry, station walking time, modes and dated activity context | Service-hours, useful journeys and trading/customer travel fit remain partial; no complete access score solely from PTAL/proximity |
| Premises: does this unit have material constraints? | Identity, exact-match facts, constraints, rent benchmark | Permitted use, physical suitability, lease/rates/history remain incomplete; full score normally awaits later data/user checks, possibly beyond Phase 9 |

The current required-component weights remain the `business-hypothesis-v1` manifest: coffee Customer Base 25/30/15/20/10, restaurant 25/20/25/20/10, salon 40/10/20/25/5; Market Position coffee 35/20/25/20, restaurant 30/25/25/20, salon 40/15/15/30; Access coffee 30/30/25/15, restaurant 25/25/25/25, salon 35/15/20/30; Premises coffee 40/25/20/15, restaurant 40/30/20/10, salon 40/20/20/20. Ordered component IDs are the existing manifest, not new weights. Internal legacy names `daytime-workplace`/`purchasing-power` do not authorise misleading display names; label the actual employment/income measure and version any changed meaning.

No complete overall score is introduced by Phase 8. D71 permits a future evidence-complete score slot/AI-backed method, but implementing that method is a separate scope decision; incomplete four-dimension inputs cannot support it. No silent weight renormalisation, missing-as-zero, neutral placeholders, invented confidence, new probability or borrowed PropertyData investment score.

## 15. Comparison cohorts

Keep existing OA comparison exactly for historical whole-OA metrics. For new metrics, persist cohort definition, target scope, member IDs/values, inclusion/exclusion reasons, coverage denominator, native geography, reference period, release vector, taxonomy/routing/metric/method versions and effective date.

V1 practical sequence: native OA density and native MSOA income/BRES geography comparisons first. Catchment business/resident comparisons require a small reviewed fixed London anchor set with at least 30 eligible matched scopes, same pedestrian profile/range and dataset versions. Generate anchor polygons once through the approved routing allowance; store immutable permitted geometry. Separate town-centre/local-high-street/dense-central context where a published or reviewed reproducible classifier exists. No hand-picked flattering cohort, repeated paid provider sweep or context invented by AI.

If stratification yields too few peers, use an explicitly broader comparable London cohort only when defensible; otherwise suppress percentile. At least 90% dataset/geographic eligibility is **not** 90% real-world POI completeness. A biased inventory or unproven geographical allocation cannot pass by labelling every imported row eligible. Cohort admission depends on independent QA. Do not invent confidence intervals for Overture counts or aggregate ratios with incompatible Census universes.

## 16. Evidence and contract additions

Use one contract extension pathway with backward-compatible readers. New source IDs/payload unions and source classes must be explicit; errors/bytes/pages/timeouts still validated. Evidence v1's precision field lacks native OA/LSOA/MSOA/catchment representation, so introduce a narrowly versioned geography distinction: **positional precision** versus **statistical/support geography**, plus native-geography vintage and method. Do not mark MSOA income "rooftop" because a property point selected it.

Every new observation/derived metric preserves provider/dataset/source ID, source class (official/commercial/community), direct/modelled/derived kind, retrieval and effective dates, effective date unknown when absent, coverage/partial/page cap, freshness rule/version, geographic scope/position/allocation, licence/version/retention/attribution, limitations, allowed raw/normalised/derived representation, source hash and Evidence IDs. Routing polygons and bulk operand references need validated immutable structured storage; Evidence parent lineage binds them without turning one Evidence scalar into arbitrary opaque JSON.

Keep 512-Evidence/32-parent/256-observation existing bounds unless a measured legitimate case needs a documented narrow change. Hundreds of POIs should use one immutable inventory observation plus bounded selected-record references/aggregate lineage, not thousands of individually model-authored facts or truncated provenance. Store reproducibility operands privately; free/customer projection remains bounded and entitlement-safe.

SnapshotView geometry may require a v2 validated GeoJSON Polygon/MultiPolygon slot preserving holes and metadata. Keep v1 historical projection; this is a data compatibility change, not redesign. New factual propositions, source-type display and limitations enter existing result-first interpretation; colour continues to mean result direction, evidence quality remains independent. Closed claim validation, no account/exact address/coordinates in AI packets, owner-approved model and bounded existing calls remain binding. No new live AI spending is authorised by planning.

## 17. Freshness, caching and failure behaviour

Proposed freshness rules to validate during implementation: Census is dated structural context, not current population; income/BRES/NUMBAT are reference-period observations, stale for claims about today unless qualified. Overture release age <=90 days for current inventory context is an initial engineering ceiling, **not proof each place is current**. A newer release with old per-record evidence can still be limited. PropertyData current cache <=60 days legally, with tighter fact-specific freshness where needed; historical reports do not refresh. Routing development cache <=30 days for new analyses, while stored historical geometry remains replayed. Official constraints expose publisher update date/coverage; no universal refreshed timestamp.

Cache keys include versioned provider operation, input point/property identity, profile/range, release/method and permitted scope. Existing finite process-local cache is sufficient; static bulk datasets are indexed local reads. Do not use ready historical observations as an indefinite shared current cache. Retention maintenance must delete only expired temporary permitted cache, never historical report Evidence/operands. No distributed cache or generic scheduled pipeline.

Distinct outcomes: present observation, covered empty result, missing attribute, partial inventory, unavailable timeout/quota, unsupported geography, not applicable category, ambiguous identity and invalid response. Empty counts are zero only if the query scope was successfully covered; unknown coverage is not absence. Preserve successful source results when another fails. No fallback fixture, automatic purchase, unbounded retry or provider-error text/credentials in client.

Identity unresolved blocks exact-point operations but not useful qualified native-area context. Routing failure leaves catchment metrics unavailable; radius metrics may be separately labelled and cannot impersonate walking metrics. Income/BRES/release failure leaves corresponding evidence unavailable while POI/transport succeeds. Source-schema drift quarantines the new release/result; ready historical releases remain readable. AI validation failure cannot rewrite successful stored source results or report history.

## 18. Calls, costs and performance

Planning figures are a provider-data budget for a future Full Report's collection, not permission to build it. Exclude Stripe fees, VAT, FX, hosting, storage/ingestion and AI from data-provider totals; they must be budgeted separately before launch. Existing Postio cost remains incremental selection/lookup usage under the actual owner plan; no new account or unverified price assumption.

| New collection operation | Typical HTTP calls | Conservative credits / cash treatment |
| --- | ---: | --- |
| PD selected address -> UPRN | 1 | 10; no second resolver by default |
| PD optional /uprn facts | 0–1 | 10 only if materially useful and approved |
| PD quoting rent + precise rivers/sea | 0–2 | 1 each; conditional subscription |
| PD area/EPC fallback | 0–2 | 1 each, avoid if /uprn covers field or official ND bulk chosen |
| Geoapify 5/10/15 contours | 1 multi-range or up to 3 | Budget **6** credits (1+2+3), verify live account meter rather than assuming max range costs only 3 |
| Geoapify 1×8 station walking matrix | 0–1 | Up to 8 base credits, no avoidance/long-distance extras in this small London proof |
| Existing TfL/FSA | Up to 2 attempts each; FSA existing bounded pages | Free access under existing registered configuration; not static-statistic calls |
| Census/income/BRES/Overture/NUMBAT/constraints | 0 external calls per report | Local indexed queries; actual DB/storage/operator cost still exists |

PropertyData normal enriched envelope: 10 match + 10 facts + 1 rent + 1 flood = **22 credits**; worst planned field fallback adds two = **24**. Match-plus-basic benchmark envelope can be 12 credits. Paid APIs are not called on every anonymous keystroke: perform identity only after deliberate selected-property analysis action; measure free-flow usage as well as purchases. Never assume all costs are paid by buyers or convert Free Snapshot into signup/payment-required flow. Explicit rate/call caps and existing safeguards suffice; do not add monetary reservations or ledgers.

[API monthly list pricing](https://propertydata.co.uk/api/pricing): 2,000 credits £28, 5,000 £48, 15,000 £96, 30,000 £144, 50,000 £192, 100,000 £288; 500-credit development trial. Rate limits begin at 12 requests/30 seconds, increasing by tier. This is **not usage-based cash billing**. At 24 credits/new analysis, 100 analyses/month consume 2,400 -> £48/100 = £0.48 each; 1,000 consume 24,000 -> £144/1,000 = £0.144. Ten analyses on the smallest subscription cost £2.80 each, not £0.336. With anonymous usage, substitute total collected analyses for paid reports and allocate `monthly bill / purchased reports` for unit economics. Taxes/allowances/plan changes must be confirmed before approval. No annual commitment recommended.

Geoapify planned envelope <=14 credits/new analysis, <=28 for a full bounded retry: Free 3,000/day allows at most 214 nominal or 107 double-attempt analyses/day **before** other calls, cohort preparation, map tiles or headroom. At current [pricing](https://www.geoapify.com/pricing/), first paid tier $59/month/10,000 credits per day: $0.059/report at 1,000 paid reports/month, $0.0118 at 5,000, if all usage fits. It is a recurring allocation, not a per-report tariff. Keep Free while adequate, request approval for any paid tier. Matrix formula is documented in the [Route Matrix pricing](https://apidocs.geoapify.com/docs/route-matrix); rendering tiles is not silently included.

Expected development provider spend can stay zero for independent public bulk work and Geoapify Free; precise PropertyData resolution/enrichment remains conditional. Under the illustrated paid monthly allocations, data spend is small relative to £29 when conversion/volume are adequate, but gross margin cannot be promised before actual anonymous conversion, AI and processing costs. Record observed calls/credits and latency in existing retrieval metadata; no detailed financial billing subsystem.

Execution dependency: resolve property -> freeze point/context -> obtain catchment; then independent indexed statistical/POI/constraint queries and bounded external facts/transport calls in parallel where safe. Per external operation target timeout 8 seconds, maximum two attempts within a 30-second collection deadline; cap aggregate PD calls to the approved endpoint envelope, honour 429 within remaining deadline, stop on quota/no-data/nonretryable schema error. Existing 110-second generation bound remains unless actual measurement justifies a narrow adjustment. Target internal indexed aggregate queries <=2 seconds each, total collection p95 <=30 seconds, end-to-end existing generation <=110 seconds; these are targets to measure, not current results. Avoid sequential title/application/valuation chains.

## 19. Testing and real London QA

Required tests are behaviour/security/analytical proofs, not implementation mirrors. Fixtures must be permitted, redacted and labelled; mock-only proof never substitutes for required live provider/data gates.

- Contracts: old and new source/Evidence/projection schema readers, unknown fields/types, invalid dates/units, source-class mismatch, capped response and lineage cycles/cross-analysis parents.
- Spatial: swapped coordinates/CRS, invalid/empty/oversized polygons, holes/MultiPolygons, islands, barriers/river crossings, snapped origin, exact boundary point, BNG metre areas, no double-counted OA/POI/station, cumulative versus ring totals, London border coverage.
- Statistics: Census universes/ratios/perturbation, suppressed/rounded BRES not zero, native vintage mismatch, income intervals and means not addable, area-allocation sensitivity, no jobs -> daytime/footfall invention.
- POI: taxonomy version drift, coffee cafe substitutes, salon subtypes, stale names, separate colocated businesses, duplicates, FSA corroboration without addition, null confidence/date/status, malformed source licence, known anchor misses.
- Property: exact-unit/ambiguous/postcode-only no-match, UPRN string precision, OS coordinate conflict, multi-use building, domestic versus non-domestic EPC, incompatible area basis, classification versus permission, absent constraint record versus clearance.
- Score/comparison: >=30 target-excluded peers/90% coverage, constant cohort suppression, ties, incompatible scope/year, direction unreviewed, required component absence, no redistributed weights, complete explanations/evidence IDs, no overall fake score.
- Failure: one provider/DB query fails without erasing successes, 429/quota, aborted response, timeout/retry cap, schema drift, poisoned cache, wrong-version cache key, no refresh on stored replay.
- History/security: immutability UPDATE/DELETE/TRUNCATE/ready guards; new release/new analysis does not change old; account upgrade/authorised claim/purchase/recovery digest unchanged; RLS guest/user isolation and no public source-data or privileged RPC access.
- AI boundary: existing approved model, address/account exclusion, unsupported numerical/source claims rejected, new propositions with valid IDs, stored replay makes zero provider/AI/scoring calls. Any live interpretation rerun needs its actual bounded budget approval; no new model/provider silently enabled.

London live proof matrix: Soho/central commercial; Brixton/local market; Kingston/outer retail and National Rail; Stratford/mixed transport/retail; Walthamstow/village and residential. Three business categories across all areas. Add a Thames/barrier case, mixed-use commercial unit, ambiguous multi-unit address, London edge, out-of-London selected property and known heritage/flood positive plus documented negative/unknown scope. Use public/commercial addresses, no owner account/private data in fixtures.

Record expected facts from authoritative business/source records before inspecting results where possible; missing/stale/mislocated/misclassified matches separately, not one flattering success ratio. For routing inspect bridges/parks/rail barriers and nested geometry; source dates and retained retrieval/model information. For each chosen PD field prove exact-unit semantics, dates/omissions and credit usage. No absent field gate is silently passed by a marketing coverage claim. NUMBAT/PTAL reference dates and station mappings, dataset totals/checksums and at least one independent PostGIS aggregate must be verified on hosted development, not only synthetic SQL.

Regression at implementation completion: Node 24/npm 11 `npm ci`, `npm run check`, production-server `npm run check:public`, fresh `npm run check:database`, relevant hosted security/rollback suites, actual protected Preview deployment/browser proof, mobile widths/keyboard and blocking 200% zoom accessibility, client/HTML/network/runtime secret scan and protected exact-head CI. Preserve Phase 7 real Auth/payment/history gates where changed code could affect them; no fresh payment ceremony for an unrelated bulk importer. No Production deployment or protection bypass.

## 20. Eventual owner actions — not requests now

| When the approved step is ready | Possible action | Boundary |
| --- | --- | --- |
| Step 8.1 identity proof | Explicit PropertyData development trial/plan approval and private API key | Trial needs card/plan selection; confirm cancellation/renewal and fixed monthly cost before owner action. Never sign up/purchase automatically |
| Step 8.4 walking proof | Geoapify Free account/key, privately Local and Preview if needed | Free only; no paid plan or public client key by default |
| Step 8.6 field gap | GOV.UK energy-data account if non-domestic bulk is chosen | Only after failed PD field proof or justified free-source decision; no parallel accounts speculatively |
| Relevant external proof | Existing TfL key and development DB/Preview configuration | Reuse authorised settings; do not ask for secrets in chat or enable Production |
| Step 8.8 interpretation proof | Confirm bounded existing-model verification spend if needed | Earlier phase budget is not assumed unlimited new approval |
| Pre-launch separately authorised | Focused rights/attribution review, scale plan, customer retention/delivery disclosure, direct Production Live Stripe gate | Not Phase 8 completion substitutes or automatic launch authorisation |

If an account/credential/access decision is pending, finish independent official release/import/contract/test work. Record dependent gate and precise owner action only when actually required. No subscription, account, legal negotiation or commercial purchase is requested by this planning task.

## 21. Implementation sequence, Step 8.0–8.9

Every step requires an explicit approved Phase 8 start, defined scope, applicable tests/lint/types/build, `docs/phase-8-status.md` evidence and actual deviations. A failed admission gate blocks that source/metric, not independent work. Proposed optional branches cannot be implemented by silently expanding scope; seek approval if changing the selected provider, recurring cost or analytical contract.

| Step | Defined scope | Required proof / exit gate |
| --- | --- | --- |
| **8.0 Baseline and contracts** | Freeze Phase 6/7 historical fixtures/digests; create status record; map metric/source/release/rights manifests; narrow versioned contract additions and forward migrations, no provider calls | Old historical readers/replay, migration fresh rebuild, RLS/immutability, strict validation tests; no UI/product redesign |
| **8.1 Property resolution** | One proposed PD resolver, selected candidate only, exact UPRN join against OS bulk, new frozen precise context; bounded no-match/ambiguity behaviour | Actual commercial/mixed-unit/residential-negative/no-match proof only after approved access; no centroid precise analysis; no history rewrite. Optional /uprn justified by new useful fields |
| **8.2 Official Customer Base releases** | Extend Census variables, native geography lookups, income intervals and BRES annual data; staged London releases and native-scope metrics | Published artifact/schema/geography/ref date/checksum, total/denominator QA, source licences, real indexed and hosted joins, suppression/rounding and missing states |
| **8.3 Overture inventory** | London extraction, current taxonomy, entity/category mapping and food corroboration; retain release/source notices | Expand actual planning QA to 30+ known businesses, all areas/categories, investigate identified gaps; no automatic paid enrichment; source/category/position/freshness admission report |
| **8.4 Real walking geometry** | Geoapify polygons and at most eight-target walking matrix; typed geometry/PostGIS; catchment estimates/counts | Approved Free live proof, source bytes/credits/geometry/routing quality, barriers/border/holes/nesting tests, source attribution, stored geometry replay |
| **8.5 Transport and activity** | Existing stop mappings, NUMBAT 2025 normalisation, qualified PTAL supporting data; separate activity signals | Actual workbook/date/day-type/station QA, no entry/boarder/annual mixing, no pedestrian footfall. ORR is a proposed gap branch, not automatically implemented |
| **8.6 Premises facts and benchmark** | Approved PD exact-match facts/rent/point flood plus selected internal constraints; choose one source per field | Non-domestic/property-unit/vintage/area/rent semantics proof; official fallback activated only for demonstrated gap; explicit unavailable/not applicable; no timeline/finance |
| **8.7 Metrics, cohorts and readiness** | Existing registry/normalisation/composition; frozen native and admitted catchment cohorts, evidence bindings/quality | Reproduce operands; >=30/90%, correct scopes/direction, all required gates unchanged; quantitative metrics where justified, withheld complete dimensions documented |
| **8.8 Existing interpretation and projection** | Reviewed new claims, versioned data projection/geometry wiring into existing slots, customer result/reason/optional detail, no design/pricing changes | Runtime AI/claim validation, precise labels, approved-model bounded live proof if needed, no unsupported overall score, replay/history/account regression and secret boundaries |
| **8.9 Full verification and protected delivery** | Complete London/hosted/Preview/security/regression evidence; docs/source/database/architecture/decisions/roadmap updates accurately labelled | Required checks/CI exact-head pass; PR review/protected merge only; post-merge CI, main=origin and clean tree. No completion with substantive required dependent proof pending; no Phase 9/10 |

Do not interpret this sequence as approval to regenerate every old Free Snapshot or to generate a purchased Full Report. New owned development analyses demonstrate enrichment through existing framework/projection. Existing purchased/test-entitled report identity stays historical and unchanged. Later Full Report lifecycle and access are governed by their separately approved phases.

## 22. Phase 8 Definition of Done

All boxes are future gates, not claims that planning has implemented them.

- [ ] Explicit implementation approval recorded; no unapproved commercial service/purchase.
- [ ] Actual baseline/digests and Phase 6/7 frozen behaviour retained; missing planning input reconciled if it affects scope.
- [ ] Narrow versioned source/Evidence/geometry/projection contracts validate new inputs and retain old replay; migration history untouched.
- [ ] Selected-property resolution proven on real London commercial/mixed units, with confident UPRN/point or explicit failure; no precise centroid substitution.
- [ ] Census, income, workplace and geography releases pinned/validated; exact universes/vintages/rounding/intervals retained.
- [ ] Overture extraction/source notices/category/entity/freshness QA passes defined admission or affected metric remains explicitly blocked with an approved resolution; no misleading complete competition claim.
- [ ] Real 5/10/15-minute geometry/matrix proof passes London routing/PostGIS/coverage/rights/cost gates.
- [ ] TfL/NUMBAT vintage/day/time/station mappings proven; PTAL historical/current distinction and uncovered National Rail explicit.
- [ ] Selected premises facts/constraints/rent semantics proven; required chosen-field fallback resolved without silently dropping a gate.
- [ ] All metrics retain immutable Evidence/operands/source release, quality/freshness, precision, rights and explicit missing/unavailable/not-applicable states.
- [ ] Normalisation/cohorts/business weights/composition reuse existing engine; required missing components suppress scores; no invented overall/footfall/customer journeys.
- [ ] Validated interpretation/projection gives conclusions with reasons and optional detail; model, schema/prompt/method versions frozen; user copy/pricing/design unchanged except necessary truthful data labels/attribution.
- [ ] One provider failure preserves other successful observations; bounded calls/retries/bytes/pages/cache and measured latency/credits documented.
- [ ] Dataset changes and new checks create new history; reopening, claim, login and entitlement recovery make zero enrichment/AI/scoring calls and preserve stored digests.
- [ ] Hosted DB RLS/permissions/immutability/PostGIS security, public/private source boundary and actual client/HTML/network/log secret checks pass.
- [ ] Complete relevant regression/build/public HTTP/hosted/Preview/mobile/keyboard/material zoom gates evidenced; no fake passed deployment/test.
- [ ] Detailed rights/launch-scale/retention-policy tasks are explicitly pre-launch; no immediate legal project or unsupported storage representation.
- [ ] No Full Report generator, financial calculations, PDF, subscriptions, live payment, Production change, Phase 9/10 or deferred distributed hardening introduced.
- [ ] Status and architecture/source/database/decision/roadmap documentation match actual implementation, deviations and unproven fields.
- [ ] Protected required exact-head CI/review/merge and post-merge CI pass; final main matches origin and tree clean.

Scope approval may explicitly defer a chosen source before implementation. During implementation, removing a required field/proof is an owner-approved plan change, not an unnoticed completed checkbox. A useful partial analytical result is acceptable; a missing required integration proof is not a complete phase.

## 23. Risks, assumptions, unproven areas and exclusions

**Known planning findings:** no PD integration exists; recurring cost is conditional; commercial EPC/area and current use cannot be assumed; current rent benchmark is modelled; OS Open UPRN cannot resolve free text; old PTAL is not current; NUMBAT 2025 artifact exists; Overture has real identified category/anchor/name gaps; new source/geometry schema needs bounded extensions; all required complete scores are not supplied merely by more APIs.

**Still unproven:** live PD response quality/credits and selected commercial units; current per-field update dates; BRES downloadable geography/mapping (planning metadata URL returned HTML, not valid dataset metadata); Census age-table artifact variant; Geoapify live London routing/snap/billing/limits; exact Overture source/address/point/trading quality; chosen Planning Data borough/layer completeness; commercial EPC matching; current PTAL release availability; hosted performance/storage volume and first-report conversion/cost. Documentation validation and public research are not authenticated end-to-end proofs.

**Assumptions to test:** London-only dataset coverage is adequate with explicit edge handling; initial analytical weights and 10% allocation/POI admission thresholds are conservative engineering hypotheses; small operator-managed imports/indexes fit development capacity; one property/routing adapter suffices. If false, record the concrete trigger and propose the smallest repair, not a pre-emptive distributed platform.

**Explicitly deferred:** Phase 9 occupier/title/planning/lease history timelines; Phase 10 costs/rent/transactions/break-even/customer-per-day/margin/sensitivity calculations; later Full Report generation, final AI narrative, financial execution and PDF; photography/street imagery; paid reviews/popularity/hours as default, measured footfall/mobility, scraping, inferred sales/success probability, landlord personal enrichment, UK-wide analysis, Production Live webhook/payment/report launch, subscriptions and cosmetic refinement. No generic workflow/jobs/leases/ledger/reservations/distributed-cache or exactly-once provider guarantee.

Final recommendation: approve bounded data enrichment with official bulk first, qualified Overture, real walking geometry and one explicitly conditional property adapter. Authorise no recurring purchase automatically. Produce stronger business conclusions and honest uncertainty through the existing engine; complete quantitative dimensions only when their actual required evidence is present. Preserve historical reports and separate future download policy from source caching. Implementation awaits the owner's explicit approval.
