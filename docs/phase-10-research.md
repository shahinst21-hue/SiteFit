# Phase 10 focused source research

Checked 9 October 2026. Planning/public read-only research only; no authenticated provider calls, activation, subscriptions, paid credits or product integration. [Implementation proposal](phase10_plan.md) defines the engine. D78/D79/D80 govern the recommendation. Examples prove source capability, not certified SiteFit admission or London-wide completeness.

## Economic sources and verified cost

Existing PropertyData [commercial rent](https://propertydata.co.uk/api/documentation/rents-commercial) supplies a qualified quoting-rent benchmark. Phase 8 already captured its missing vintage, dispersion, radius units and format comparability. It supplies no agreed lease, actual rates bill or shop turnover. Reuse those outcomes; no better paid source is needed for user-assumed economics.

[API pricing](https://propertydata.co.uk/api/pricing) currently lists £28/month for 2,000 credits and a maximum 500-credit trial. One commercial-rent call uses one credit. £0.014/credit is the fully utilised plan cost; at ten reports/month, the minimum subscription alone costs £2.80/report. No permanently free or pay-as-you-go-only operating access was verified. Trial expiry/renewal requires owner action; no subscription has been approved here.

[Licensing](https://propertydata.co.uk/api/documentation/licensing) permits enhanced customer reports, distinguishes 60-day current caching from dated historical records/derivatives and sets access-ending conditions. Keep permitted dated per-analysis material, discard raw bodies/photos and avoid a standing searchable copy. Ongoing historical customer access after cancellation remains the existing pre-launch interpretation question; do not delete or refresh ready reports to evade it.

| Official reference | Model consequence |
| --- | --- |
| [VAT rates](https://www.gov.uk/vat-rates) | Standard rate 20%; preserve selected rule date and sales/cost VAT basis. |
| [Registration thresholds](https://www.gov.uk/how-vat-works/vat-thresholds) | Ordinary current threshold £90,000 taxable turnover; review warning, not automatic registration or recursive model switch. |
| [Catering/takeaway rules](https://www.gov.uk/guidance/catering-takeaway-food-and-vat-notice-7091) | Sales mix matters; do not assume every coffee/restaurant receipt has identical treatment. |
| [Employer rules 2026–27](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027), [minimum wage](https://www.gov.uk/national-minimum-wage-rates) | A fully loaded staff-cost assumption is necessary. A flat loading percentage is not an exact payroll calculation; no payroll engine proposed. |
| [Business rates](https://www.gov.uk/introduction-to-business-rates) | Rateable value differs from actual bill after relief; use user-reported bill/estimate, no domestic substitution. |

Official guidance is a dated reference, not a new API integration or certification of user assumptions. No existing source establishes address-level turnover, margin or conversion. ONS, NUMBAT and inventories cannot turn into forecast sales. Calculation-only examples are explicitly synthetic.

## Free historical business names: findings

**Useful permanently free sources exist for qualified historical name observations; no comprehensive reliable exact-unit previous-occupier API was verified.** Two sources returned actual London evidence in this bounded research. Neither is a trial, neither is added to Phase 10 baseline, and neither establishes full tenancy history.

| Option | London coverage, historical evidence and matching | Access, rights and practical effort | Recommendation |
| --- | --- | --- | --- |
| OpenStreetMap element history / old_name | Actual Soho records contain prior names, edit dates and some full address components. Missing unit/postcode, multiple UPRNs and name corrections complicate matching. Edit dates are not opening/closure dates. | Anonymous history GET verified, no trial/account. [ODbL](https://www.openstreetmap.org/copyright) permits commercial reuse with attribution and applicable database obligations; [produced-work guidance](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline) matters. Small reviewed lookup low effort; full-history ingestion high effort. [Public API policy](https://operations.osmfoundation.org/policies/api/) limits use, no production SLA. | Occasional mapped-name evidence; not confirmed occupancy. |
| Camden rates open dataset | Actual historic company-name, unit-address and charge-period rows, including 2010. One borough; many REDACTED names. Ratepayer may differ from occupier/trading style; charge periods are not tenancy intervals. | Anonymous JSON verified, no trial. Actual metadata licence **UK_OGLV3.0**, attribution London Borough of Camden; quarterly publication. Low effort for a reviewed exact row, more for automated matching. Property-reference string is not automatically OS UPRN. | Useful official supporting corporate-name evidence where exact floor/part matches. |
| Existing FSA/FHRS | London food register live/daily; not a verified complete previous-occupier archive. Inspection dates are not opening dates. SiteFit's current adapter strips addresses and cannot establish exact historic unit. | [Free/no-registration service](https://ratings.food.gov.uk/open-data), [OGL policy](https://www.food.gov.uk/our-data). Existing integration low effort. | Reuse dated saved observations, not reconstruct pre-collection history. |
| Existing Overture | Frozen names/points/releases; D77 duplicates, omissions and operating-status issues remain. Changed listings do not prove closures. | Existing approved subset/licence notices; no new access cost. Exact unit unreliable. | Preserve existing qualified observations, no retrospective archive importer. |
| Companies House | Company names/filings/registered offices, including London. Registered office can be accountant/service address and differs from trading venue; sole traders excluded. | [Public API](https://developer.company-information.service.gov.uk/overview) and [GET/key guidance](https://developer.company-information.service.gov.uk/api-testing) reviewed; no key created/live authenticated proof. Verify selected-field terms before integration; public access alone is not reuse admission. | Not an occupier-history substitute. |
| Wayback | Earlier venue pages where a known URL was archived; no London address-indexed history service demonstrated. Capture date is not occupancy date. | [Availability/CDX APIs](https://archive.org/help/wayback_api.php) documented, not temporary trial. Archived publishers retain content rights; commercial copying permission not verified. | Human reference discovery only, no crawl/HTML/image republication. |
| Other borough rates / council planning | Patchy address/company/property-event evidence; differing redactions/schema. Applicants are not necessarily occupiers. | Dataset-specific terms needed; no new borough integration/FOI request. | No 33-council scraper; existing Phase 9 planning remains sufficient baseline. |
| Google/specialist databases/PropertyData trials | Free website viewing and trials do not establish a permanently free commercial occupancy API. | No new activation, authenticated request or paid service. | Exclude from free-source solution. |

## Actual public London proofs

One small Soho map discovery GET and three element-history GETs; Camden metadata plus two two-row sample queries. Responses processed in memory; selected non-personal facts inspected, no raw corpus, mapper identities or product dataset retained. Deliberately selected positives are not coverage/accuracy measurements.

| Public record | Returned evidence | Important limit |
| --- | --- | --- |
| [OSM way 273720747 history](https://api.openstreetmap.org/api/0.6/way/273720747/history) | Version 2, 12 March 2017: **Soho Frames Print Company**, old_name **Cafe Soho**, 13 Ingestre Place W1F 0JG. Version 3, 31 March 2018: **Eyes On Soho**. | Mapped building/address; later multiple UPRNs, no verified selected shop-unit boundary. Dates are edits, Cafe Soho's trading interval unknown. |
| [Way 350073264 history](https://api.openstreetmap.org/api/0.6/way/350073264/history) | 30 May 2015 old_name **Chew**, 58 Dean Street. 7 March 2018 **Smack Lobster Roll**; W1D 6AL added later. | Earlier postcode absent; old_name is a contributor assertion, not independently certified tenant history. |
| [Way 480077837 history](https://api.openstreetmap.org/api/0.6/way/480077837/history) | 12 March 2017 **Mail Boxes Etc**, old_name **Jigami**, 15 Ingestre Place; later name removed. | Missing postcode/unit; removal is not closure/vacancy proof. |
| [Camden dataset](https://opendata.camden.gov.uk/Business-Economy/Camden-Non-Domestic-Rates-Charges-and-Reliefs/xcqw-xady), [metadata](https://opendata.camden.gov.uk/api/views/xcqw-xady.json), [JSON](https://opendata.camden.gov.uk/resource/xcqw-xady.json) | **DATACASH LTD**, 2ND FLR DESCARTES HOUSE, 8 GATE STREET WC2H 3HP, charge period 1 April–30 June 2010; **ARCHANT REGIONAL LIMITED**, PT GND FLRS, 100A AVENUE ROAD NW3 5HF, 1 April 2010–31 March 2011. | Corporate name linked to charge unit/period, not proof of public trading throughout. First two unfiltered samples were REDACTED. Floor/part conflicts must reject. |

## Simplest incorporation, separately approved later

Do not reopen Phase 9 or make this a Phase 10 gate. A later small enrichment extension could add a few **manually reviewed** observations to a new history version/new analysis: `map_name_recorded` or `ratepayer_recorded`, not tenant-start/end events. Prefer an official exact Camden charge-unit row when applicable; OSM only with complete matching components and independent context. Business-owned dated pages can corroborate a trading name but do not license copying articles/images.

Retain permitted name, source/element/version/record ID, source timestamp **meaning**, retrieval date, selected-property match basis, evidence path, licence/attribution and limitations. Keep OSM-derived material separable and assess derivative-database obligations; attribution alone is insufficient licensing review. Unknown/mismatched/redacted records remain unknown. No multi-borough importer, full-history archive, web research agent, screenshots, closure reasons or old-report backfill.

This research identifies genuinely free useful evidence, **not** a verified production-ready universal service. Recommendation: retain these limited options for separate approval, proceed with deterministic economics after plan approval, and do not purchase a history database or delay Phase 10.
