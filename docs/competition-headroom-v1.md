# Competition Headroom v1 — 21 October 2026

Owner-approved attached specification plus four mandatory safeguards. This is implementation evidence, not permission to expand spending, public sales or provider plans.

## Model and contracts

`competition_headroom_v1` computes Ne=N5+.50(N10-N5)+.25(N15-N10), Pe with the identical weights, Q=1000Ne/Pe, then Math.round(100/(1+Q)). No AI multipliers. Ratings are 0–39 Limited,40–59 Moderate,60–79 Supportive,80–100 Strong. Approved 3500/9000/25000 population examples: 1/4/9 gives Ne3.75,Pe10250,Q0.36585365853658536,73 Supportive; 5/13/24 gives Ne11.75,Q1.146341463414634,47 Moderate. Zero is eligible only with complete, spatially checked usable category evidence and positive population.

The previous card exposed bounded FSA native types; they were not same-category walking-catchment counts. New Snapshots carry an optional versioned Competition result. Newly prepared Full Reports copy that exact frozen result through the owned material RPC; shared validators recompute the score and accept explicit unavailability. Dashboard, Snapshot summary/card/evidence and PDF consume the same object. Existing Ready reports, contracts and source rows are untouched. Historical reports without this new evidence retain their original presentation.

## Geometry and collection

Reuse the exact source-bound residential population and walking pair; existing admission validates checksums, frozen input, origin, collection, geography release and parent lineage. PostGIS revalidates original contours and returns effective cumulative unions. Originals remain in their source snapshot; the correction is recorded separately. No simplification, buffer, radius, administrative fallback or new isoline request. Reject inline geometry exceeding 102400 UTF-8 bytes,10000 positions or100 rings. The current stored walking schema does not retain an independently valid isoline geometry ID, so oversized geometry is unavailable rather than assuming an ID can be reused.

Geoapify POST /v2/places queries only the largest union, limit500, stable category/polygon per offset, at most six pages. Every returned point is locally checked against the polygon, including boundary and holes; HTTP success alone is insufficient. A saturated/capped/repeated page, malformed point/identity, ignored category/spatial constraint or interrupted query cannot produce a score. Stable place IDs deduplicate; distinct IDs at one address remain distinct. At most40 nearest-band-first records are copied into report presentation; all admitted normalised page records remain in the private ledger. Counts are cumulative and do not use a truncated display list.

Categories: catering.cafe (specialist-only exclusions), catering.restaurant, service.beauty.hairdresser; beauty queries service.beauty but only explicit shop=beauty / supported beauty treatment tags qualify. Generic/name-only beauty is ambiguous. No LLM classification; no invented provider category names. Parent-only or empty beauty coverage cannot establish a score.

## Durable optional dispatch and cost boundary

A private collection/page ledger binds owner,analysis,input,walking/population source IDs,checksum,category and model. Each500-result page reserves25 estimated credits BEFORE transport. Holds remain for errors/unknown outcomes; total reservations cannot exceed75 credits per Snapshot. Actual account billing is not claimed. New pages also lock the existing controlled proof case and consume its LOWER remaining Geoapify provider allowance. The other reservation path counts these same pages, preventing a cross-path race. Existing two-call cap, AI envelopes and all public restrictions remain unchanged.

When both isoline and station-matrix calls execute, they consume both allowed Geoapify requests and Competition becomes budget_unavailable without a Places dispatch. If the matrix is ineligible/omitted, the remaining slot may authorise one complete Places page. A fresh read-only Production check (96 migrations) confirms the host cap is2; no existing saved case currently has two recorded Geoapify requests. No allowance change is made or required to demonstrate unavailable handling.

Only explicit429/5xx responses may retry once, after a fresh reservation and short bounded delay, within the caller deadline and lower remaining allowance. Ambiguous sends are never retried automatically. Valid settled pages/result replay from the ledger. Expired intent is unconfirmed, not zero. Optional uncertainty does not put the main proof into intervention; AI/provider holds elsewhere are not released. A finite unavailable result allows the report to finish. No customer GET dispatches collection; no worker waits forever on Competition.

## Verification state

Initial isolated deterministic API-shape fixtures and mathematical/PDF tests pass; these are explicitly synthetic, NOT claimed live API recordings. No existing Geoapify Places recording was present in this repository. No provider/AI/Stripe request has been made for this feature. A genuine permitted recording/live proof remains unperformed. No claim of meeting the recorded-API-fixture gate is made from synthetic contract fixtures alone. The current provider cap cannot be raised under this instruction.

Local full check:461 tests/lint/types/build passed; built-app public HTTP checks passed16 public and16 internal paths. The final SQL guards separately passed the full fresh PostgreSQL/PostGIS suite, and hosted Development DDL rehearsal rolled back with unchanged financial/report/source fingerprints. No hosted migration was applied. Final-head CI status is recorded on the PR; browser and genuine API-recording gates remain open. Synthetic PDF was rendered and text checked:47/100 Moderate and cumulative5/13/24. Browser permission to localhost3048 was explicitly denied; no alternate browser/screenshot automation is used to bypass it. Real browser desktop/tablet/mobile acceptance remains unverified. No Production completion is claimed from fixtures.

References reviewed21 October: https://apidocs.geoapify.com/docs/places/ (POST limits, taxonomy,500-result pagination and1credit/20places); https://www.geoapify.com/terms-and-conditions/ . Applicable account rights/credits remain subject to the existing controls.
