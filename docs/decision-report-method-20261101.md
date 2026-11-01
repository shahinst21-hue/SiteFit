# Decision report edition — 1 November 2026

## Owner authority and boundaries

The owner's “Build a Decision Grade Full Report and Reusable Premium Report System” instruction authorises this upgrade, bounded research up to £10 and conditional break-even inside the paid report/PDF. It supersedes D82's report/economics separation **for this paid decision edition only**. Free Snapshot, price, purchases, account access and the separate existing Economics capability are unchanged. Production deployment and migrations require a subsequent explicit approval. No subscription, advertising, payment, production write or new data platform is introduced.

The 43-page report generated 20 October 2026 for China Garden, 132 Manor Way, Ruislip, HA4 8HR was read in full. Its matching Ready projection was retrieved read-only from the exact Production project; its original content digest validated. The original PDF, projection, sources, generation history and export renderer remain unchanged. New code provides a separate **decision edition**, linked from the original owned dashboard. No café availability, vacancy or tenancy transfer is asserted.

## Implementation and reproducibility

`lib/decision-report/model.ts` compiles the same saved `Dashboard` used by the original product into a deterministic `DecisionReport`. Both the web document and print renderer consume it. The new owned routes are `/reports/[id]/decision` and `/reports/[id]/decision/pdf`. `readDecisionReport` delegates to the existing verified permanent-session, session-availability, paid ownership/RLS and representation-rights read. Draft/structured Preview and public Sample inputs are refused. No source, AI or payment runs on read.

The original eight-section customer projection remains immutable. The compilation records original digest, method version, research digest and decision-content digest. Route/navigation identity is excluded from that content digest. A reviewed research pack may bind to exactly one original digest and business category; address similarity never admits it. The Ruislip pack is an append-only source-controlled server asset, not a public endpoint or browser-imported directory. The licensed basemap is hash-verified and passed only through the owned view. Customer documents show numbered references, not UUIDs, adapters, content hashes or engineering errors.

The private PDF archive path includes the new decision digest **and** PDF renderer version; uploads retain `upsert:false`. It cannot replace an original V1 artifact. The published method/research versions must not later be edited in place: add a successor module/pack/version and retain the earlier implementation for reproducible exports. This simple versioned code/asset approach adds no database schema. The existing report access/retention/rights rules still apply.

Other properties use their saved findings and original recommendation; the Ruislip competitor research, map and conclusions never transfer. Other categories do not receive coffee economics. Where no category-appropriate inputs or reviewed source pack exists, the report names the gap. This implements a reusable presentation/compiler, not an automatic substitute for the analyst work of verifying every future property's competitors. No general competitor-research service is introduced.

Local operator export accepts validated saved projections, validates a supplied Free spatial digest against the Full's frozen binding and creates a **new** file with exclusive-create semantics:

`node --conditions=react-server scripts/reports/export-decision.ts <private-input.json> <new-output.pdf>`

Input shape: `{ "fullProjection": <saved Full>, "freeProjection": <matching saved Free, optional> }`. Keep real inputs/output in ignored local directories. This CLI does not obtain customer data or grant account/entitlement access; the application routes remain the customer access mechanism.

## Decision method

`decision-method-2026-11-01` is a transparent conditional due-diligence judgement, not a new numeric score, statistical classifier or success prediction. The reviewed Ruislip edition is **Conditional opportunity** because actual occupancy costs, lawful proposed use, workable measured layout and a demonstrated customer occasion are unresolved. Positive resident/access context does not clear these gates. No arbitrary population or competitor threshold determines the conclusion. Unreviewed cases preserve their original saved verdict instead of receiving the Ruislip classification.

Each major finding has an observed/estimated basis, commercial implication, specific decision action, confidence/limitation and admitted reference IDs. Competition counts do not stand in for current offer quality; absent fields are not weaknesses of a business. Density, proximity, station presence, area income and employee jobs do not become observed demand. No comparison-property ranking or validated local population benchmark is invented.

Residential figures reuse Census 2021 allocation to saved 5/10/15-minute polygons: approximately 1,400 / 5,200 / 11,600 residents, overlapping cumulative estimates. The exact operands remain in the original source projection. One-person households and car availability are reported for their ten-minute household universes, without adding hierarchical categories or inferring spending. The approximately 1,000 employee jobs and £50,000 household income retain their native wider geography and period; neither is a frontage estimate.

## Competitor and access research

Keyless FSA retrieval on 1 November used all three pages of the bounded one-mile query (258 returned entries) to discover candidates, not to assert a complete market. Six distinct selected nearby premises were checked by source identity/address. China Garden is excluded. FSA hygiene scores are not copied into customer-review fields. Reuse of Google/aggregated customer ratings and review text was not admitted; no rating is invented.

| Reviewed business | Treatment | What the research establishes |
| --- | --- | --- |
| Star Coffee, 21 Victoria Road | Coffee candidate | FSA name/category/inspection and point; no independently verified current primary menu/trading proof |
| Costa Verde, 33 Victoria Road | Café alternative | Distinct FSA café entry; not the Costa chain; current menu/quality unknown |
| Costa, 66 Victoria Road | Direct coffee offer | [Official branch and offer](https://www.costa.co.uk/stores/ruislip-manor); readable page did not establish current shop hours |
| Victoria Café, 65 Victoria Road | Café alternative | FSA entry and [historic council seating application](https://www.hillingdon.gov.uk/media/12566/Victoria-Cafe--Restaurant---Ruislip---Pavement-licence-renewal/pdf/rtVictoria_Cafe___Restaurant_-_Ruislip_-_Pavement_licence_renewal.pdf); application is not a current licence grant |
| Wenzel's, 31 Victoria Road | Bakery alternative | [Official branch directory/menu](https://www.wenzels.co.uk/menu/), including chain flat-white £2.75 and breakfast-meal-deal £3.95; branch till price/bundle details remain unverified |
| J J Moons, 12 Victoria Road | Pub alternative | FSA pub entry; current coffee/breakfast offer not verified, not counted as a specialist coffee shop |

The existing Geoapify walking-matrix adapter made one seven-target dispatch to these six FSA points plus the TfL Ruislip Manor station register point. Unrounded retained results are in the reviewed pack: Star 186 m/165 s; Costa Verde 277 m/241 s; Costa 389 m/333 s; Victoria 426 m/368 s; Wenzel's 258 m/225 s; pub 304 m/258 s; station 198 m/169 s. Display minutes round to whole approximate minutes. These are **routed network estimates**, never straight-line distances labelled as walking, timed walks, or entrance-to-entrance claims. The matrix retains snapped points in the ignored acquisition record. Point accuracy, station entrance and route vintage remain limitations.

The frozen 1000×640 Geoapify static map has genuine street context, a fixed 512-pixel-tile Web Mercator camera and the existing saved contours overlaid by the shared camera calculation. An additional provider-rendered two-control-circle image verified the static renderer’s 512-pixel convention. The station control measured (556.3865, 415.9202) pixels; the shared projection agrees within one raster pixel. The initially used 256-pixel convention was rejected and corrected before release. Display coordinates round to 0.001 pixel to avoid browser/server trig hydration discrepancies. Map numbers match the comparison table. It is not used to infer frontage visibility or crossing convenience. OSM, OpenMapTiles and Geoapify attribution appears beside the map and in the image. No live map retrieval occurs when opening/exporting this edition. Three unsuccessful public OSM retrievals are not evidence and are not represented as successful acquisition.

The strongest non-obvious discovery combines [China Garden's own advertised evening service](https://chinagarden-ruislip.com/china-garden/contact), nearby coffee alternatives and [government use-class guidance](https://www.gov.uk/government/publications/healthy-weight-environments-using-the-planning-system/addendum-hot-food-takeaways-use-in-the-new-use-class-order). Existing evening food use supplies neither morning demand evidence nor exact-unit daytime café clearance. This does **not** assert that a planning application is necessarily required: lawful use, conditions and any applicable permitted development route must be checked for the actual proposal.

## Economics and research basis

Core arithmetic reuses the existing exact-rational `lib/economics/calculate.ts`, never AI arithmetic. [ACCA cost-volume-profit analysis](https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f5/technical-articles/CVP-analysis.html) supplies the established contribution method and its constant-mix/relevant-range limits. [HMRC catering VAT](https://www.gov.uk/guidance/catering-takeaway-food-and-vat-notice-7091), [2026–27 employer rules](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027), [small business rates relief](https://www.gov.uk/business-rates-relief/small-business-rate-relief) and [Sage's drinks/food margin discussion](https://www.sage.com/en-gb/blog/how-much-profit-coffee-shops-annually/) inform the assumptions. All were checked on 1 November. Guidance is not a verified selected-property input or statistically validated local benchmark.

`coffee-planning-assumptions-2026-11-01` defines deliberately broad operating cases, not confidence intervals or likelihoods:

| Annual GBP unless stated | Higher cost / lower basket | Working | Lower cost / stronger basket |
| --- | ---: | ---: | ---: |
| Rent | 30,000 | 24,000 | 18,000 |
| Staff, incl. employer/cover provision | 70,000 | 56,000 | 42,000 |
| Other fixed costs | 28,000 | 23,000 | 18,000 |
| Owner allowance | 30,000 | 28,000 | 26,000 |
| Basket incl. VAT | 5 | 6 | 7 |
| Stock gross margin on net sales | 65% | 70% | 75% |
| Open days/year | 300 | 312 | 312 |
| Required transactions/open day | **200** | **124** | **79** |
| Excluding owner allowance | 163 | 97 | 59 |

All values are illustrative assumptions, separately labelled from source observations and customer input. There are **no supplied actual economic inputs**. The rent stress range sits around the saved local restaurant cohort's £27,565 average annual modelled quote; no selected-unit valuation or claim of like-for-like comparability follows. Its £28/sq ft/year NIA, 20-property cohort, missing vintage/radius units/dispersion and format mismatch remain explicit. No NIA/GIA multiplication is performed.

All cases assume VAT registration, a fully 20%-standard-rated basket, net recoverable cost basis, 1.5% card fees on gross receipts, no delivery commission and stock/packaging/waste included in gross margin. This is deliberately not an unregistered-sales model at a turnover level where VAT is consequential. Actual mix, tax status and recovery can differ. Fixed staffing is a short-run rota assumption, not labour as a second percentage of sales. Do not double-count stock, card fees, owner pay or delivery commission. Employer NI/paid leave/pension must fit the real rota; this report does not calculate payroll entitlement or relief.

Working other costs are rates £4,000; service charge £2,000; utilities £8,000; insurance/maintenance/cleaning/accountancy/software/marketing £9,000. Other cases change this aggregate to £28,000/£18,000, not claimed observations of individual bills. Rates relief is not assumed: the unit's current RV/bill and occupier eligibility are missing. The staff envelope can be tested against roughly 70 paid employee hours/week at £13.50 for 52 weeks (£49,140 before employer/cover costs), with the remaining envelope and owner time subject to a real rota. This illustrates why the figure is a planning allowance, not exact payroll or verified opening capacity.

Internal formulas: net basket = gross basket / 1.2; contribution = net basket × stock gross margin − gross basket × card fee; annual fixed = rent + staff + other fixed + owner allowance; required daily transactions = ceiling(annual fixed / contribution / open days). The existing engine computes the general VAT-mix form with exact rational operands. Never round contribution before dividing. Nonpositive contribution has no finite break-even; missing/incompatible inputs remain unavailable. Customer documents show useful inputs/results, not the formula or intermediate code.

One-factor sensitivities keep other working assumptions fixed. Rent £18k/£30k → 118/129 transactions; baskets £5/£7 → 148/106; stock margin 65%/75% → 133/115; staff £42k/£70k → 110/137. A £3.50 drinks-only basket at the same 70% stock margin requires **212**, versus **124** at £6. Food attachment and margin must both be tested; the model does not assume demand exists at either volume. Transactions are purchases, not unique people. The implied flow/conversion is not measured and no conversion rate is manufactured.

The model excludes tax, depreciation, interest/finance, fit-out/capex, deposits and working capital. Initial investment was not supplied. It is owner-inclusive **operating break-even**, not investment payback, free cash flow or a sales forecast.

## Quality and costs

The five questions are answered through a conditional judgement; six differentiated alternatives with routed proximity and explicit verification limits; three costed break-even cases plus sensitivities; actual street/property-use distinctions and original local rent context; and the evening-use/daytime-demand/permission discovery. Actual shop prices/hours (except qualified chain menu), customer review data, measured routes/visibility/flow, present availability, exact-use permission, measured layout and actual bills remain unverified. No strong non-obvious positive commercial gap is claimed.

Additional acquisition: three free FSA pages, one free TfL record, one Geoapify seven-target matrix, one final Geoapify static map and one additional diagnostic map for geographic camera calibration. No new subscription/top-up, PropertyData/Postio/OpenAI request, Stripe operation or payment was made. Expected Geoapify use is seven matrix credits plus approximately eight static-map credits for the final image and diagnostic image (23-credit conservative combined upper bound); actual provider-observed credit debits/invoice are unavailable. Additional cash purchases initiated: **£0**; do not present an unverified provider invoice as zero. Within the already configured Free allowance this is zero marginal service charge; [current free-plan/pricing/attribution terms](https://www.geoapify.com/pricing/) were reviewed. The £10 ceiling was not increased.

Normal generation still has existing Snapshot US$0.65 / Full US$1 conservative AI reservation ceilings, not measured billed costs. This deterministic edition adds **zero AI calls** and cached reopening/export adds zero source calls. Per-report provider subscription allocation and any analyst labour are not measured by this one proof. At £29, commercial rollout should use stored packs/datasets and bounded justified collection, not silently promise this one-off manual research for every property at zero labour cost. No new recurring cost is enabled.

Verification and protected delivery receipts are recorded in `decision-report-delivery-20261101.md`. Production remains an explicit release proposal, not a deployment performed by this work.
