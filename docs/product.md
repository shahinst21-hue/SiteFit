# SiteFit Product Contract

Status: Accepted product direction, recorded 2026-10-03. Phase 2 implements the public website, frontend-only journey and Blog/SEO foundation. Live analysis and all later services remain unimplemented. Scope is unchanged.

## Problem, customer and use moment

People considering leasing commercial premises need to understand a location's strengths, weaknesses and gaps in available evidence before committing. The initial customer is someone assessing a property for a Coffee Shop, Restaurant, or Hair Salon or Beauty Salon. SiteFit helps reduce uncertainty before signing a commercial lease; it does not predict business success.

## Geography and initial verticals

The MVP is UK only and London first. Launch supports three business categories: Coffee Shop; Restaurant; Hair Salon or Beauty Salon (one combined category). Expansion beyond London or these categories needs explicit approval.

The authorised Phase 2 interface presents Hair Salon and Beauty Salon as separate user choices with stable identifiers, mapping both to the single approved salon category. This refines the entry UX and does not expand the business-category model.

## User journey and products

The planned journey is: enter a commercial property address, select a business type, optionally supply economics, receive a Free Snapshot, pay for a Full Report, and receive an evidence backed Single Location Due Diligence Report.

Optional economics include rent, business rates, average customer spend, gross margin, staffing costs and operating hours. Units, periods and missing inputs must be explicit; absence is not zero.

### Free Snapshot

A free initial view of the location and available evidence, with visible limitations and unknowns. Its exact section allocation, depth and free-to-paid boundary remain proposals to approve before Phase 6; no entitlement or content rules are invented in Phase 0.

### Full Report

A paid, evidence backed assessment of one location for the chosen business type. Initial pricing assumption: £29 per Full Report. Price must later be configurable and never hardcoded into application business logic. Tax treatment, refund policy and entitlement duration are unresolved business inputs for the relevant later phases.

## Full Report structure

1. Location Snapshot
2. Customer Catchment
3. Demand Signals
4. Competition
5. Complementary Businesses
6. Accessibility
7. Mobility Signals
8. Premises History
9. Local Business Signals
10. Economics
11. Scenario Analysis
12. Evidence Supporting the Location
13. Evidence Against the Location
14. Unknowns
15. Things to Check in Person
16. Questions for the Landlord or Agent

Sections must show unavailable evidence explicitly. Listing a section does not promise that a source will provide its data for every property.

## Positioning

Primary: “Check a commercial location before you commit.”

Alternative customer-facing concept: “Found a shop? Check the location before you sign.”

SiteFit is a decision support product. Unsupported success probabilities, including “87 percent chance of success”, are prohibited.

## Evidence philosophy

Distinguish facts, official data, commercial data, modelled estimates, AI inference, user supplied information, and unknown information. These are not mutually exclusive: a factual observation can come from an official or commercial source. Record provenance separately from claim type rather than forcing one ambiguous label.

Every important report claim must eventually be traceable to evidence, its date, geographic relevance, limitations and derivation. Missing information stays Unknown or Insufficient Evidence. Distinguish no evidence found from verified absence. Evidence may support or oppose a location; uncertainty must remain visible. Source reliability does not imply a property's business viability.

## AI responsibilities and prohibited behaviour

AI may synthesise supplied evidence, explain deterministic results, articulate uncertainty and propose questions or in-person checks. It acts as an analyst rather than a data source. Inferences must be labelled and linked to their supporting evidence.

AI must never invent missing observations, source references, property history or financial inputs. It must not calculate core financial metrics, replace deterministic calculations, hide uncertainty or predict success probabilities. Changing the AI provider must not change application-level product rules.

## MVP scope and boundaries

Web based, single location analysis, pay per report, London first, and a small set of business types. Prefer public data and low cost APIs where practical and permitted. The approved future providers and architecture are described in [architecture.md](architecture.md); candidates are assessed in [data-sources.md](data-sources.md).

Explicitly out of scope: mobile application; enterprise dashboard; complex GIS; proprietary footfall data; professional subscriptions; franchise tools; portfolio tools; monitoring; national historical property database; predictive success models; complex enterprise functionality. Avoid fragile property-website scraping in the MVP. No enterprise platform before market validation.

## Success criteria

The future MVP lets a London user follow the complete journey and receive a usable single-location report. Important claims have inspectable evidence, unknowns remain visible, financial outputs are deterministic and reproducible, and the report provides practical next checks without success predictions. Payment and delivery must work reliably under the later acceptance tests. Quantitative adoption, conversion, cost and satisfaction targets are not approved yet; establish them before beta launch rather than inventing thresholds now.

## Phase 0 benchmark scenarios

| Fixture | Business type | London property address | Intended later review |
| --- | --- | --- | --- |
| Benchmark A | Coffee Shop | HUMAN INPUT REQUIRED | Review catchment, competition, complementary businesses and economics with evidence and unknowns. |
| Benchmark B | Restaurant | HUMAN INPUT REQUIRED | Review demand signals, competition, accessibility and premises evidence without assuming permission or suitability. |
| Benchmark C | Hair Salon or Beauty Salon | HUMAN INPUT REQUIRED | Review local context, competitors, accessibility and user economics without assuming demand. |

These are conceptual fixtures, not executable tests. No actual address, observation, financial value or expected property outcome has been invented. The user will supply three real London properties later. Record supplied economics and dates separately, then review evidence coverage and expected outputs before using them as regression benchmarks. Their absence does not prevent completion of the Phase 0 documentation foundation.
