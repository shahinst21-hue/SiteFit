# Free Snapshot UI refinement — 2026-10-06

Owner authority: the attached Kingston redesign prompt, with the owner's Persian clarification taking priority. Scope is the Free Snapshot presentation, reusable components and its normalised view/isolated fixture. Phase 7/8 and new providers remain unauthorised.

## Implementation

The page now follows property/context → initial assessment and overall-score slot → supportive signals/open questions → map/transport → four metric-led evidence cards → financial input preview → £29 Full Report outline. White surfaces, restrained result accents, compact borders and the existing wordmark/pricing remain. Property photography is nullable; no photograph, local authority, use, travel time or map point is inferred from a postal label.

Evidence quality supports Good, Moderate, Limited and Insufficient independently of result colour. Current stored `sufficient/limited/insufficient` maps to Good/Limited/Insufficient without upgrading evidence. Metric provenance, all original observations, opposing evidence, alternatives, comparisons, unknowns, source dates and licence notices remain in closed keyboard-accessible “Why this result?” disclosures.

Files created:

- `lib/snapshot/model.ts`: provider-independent typed view, stored-projection adapter, metric states, overall-score admission and runtime validation.
- `lib/snapshot/demo.ts`, `fixtures/free_snapshot/kingston_coffee_shop.json`: isolated demo and rendering scenarios.
- `components/snapshot-map.tsx`: bounded local SVG layers, legend toggles, diagram zoom and empty/loading states; no network integration or map SDK.
- `components/snapshot-finance-preview.tsx`: page-memory inputs and an honest financial outline; no calculations, persistence or payment.
- `app/snapshot.css`: scoped responsive presentation.
- `app/dev/snapshot/page.tsx`: development-only, noindex fixture route; 404 in every production build, including Preview.
- `app/snapshots/[id]/loading.tsx`: loading skeleton for the existing saved-report route.
- `tests/snapshot-view.test.ts`, `scripts/check-snapshot-ui.ts`: model integrity and real HTTP rendering-state checks.

Modified: `components/free-snapshot.tsx`, `app/globals.css`, `tests/analysis-projection.test.ts`, `.github/workflows/ci.yml` (production demo-denial regression), and the current product/architecture/decision/roadmap documentation. No dependency, database migration, report read/generation endpoint, Auth, provider, pricing or payment change.

## Normalised contract and future integration

`SnapshotView` schema version 1 is a presentation contract, distinct from unchanged persisted `FreeProjection` version 2. It includes property, business type, generated date, analysis status, overall assessment/score, supportive signals, open questions, map/layers, transport, four factors, financial preview and evidence summary. Metrics carry nullable value/unit/comparison/description/source type/source count/effective date plus explicit available/unknown/unavailable/loading/locked/not-applicable states. Observed zero is preserved.

The owner requests a later AI-produced overall assessment/weighting method across all decision factors. The UI now accepts its version, AI model/authorship, four factor values/weights and evidence references. It requires four distinct factors, finite 0–100 values, positive weights summing to 100, references, model identity for AI authorship and a numerically consistent rounded weighted result. This is admission validation, not a new scoring or AI execution engine. These structural checks cannot certify evidence adequacy: a later server implementation must validate complete required inputs, supporting references, geography, freshness, quality and methodology before storing/admitting a real score. AI must not manufacture missing inputs or a success probability. Original methods/weights/results must be frozen, never generated on reopening.

Current production projections have no authorised complete overall score. Their adapter displays **Not scored / Awaiting complete evidence**, not zero, an average of incomplete factors or the demo number. The fictional demo's 73 only demonstrates a populated slot; its method metadata does not claim an actual AI run. Later integration must extend the validated safe stored projection under an approved schema/version change and update this adapter; adding an API alone will not populate the view automatically. Current deterministic dimension engine is unchanged. No completed historical report is recalculated or rewritten.

Map geometry uses explicit longitude/latitude bounds and per-layer points/polygon rings for a local diagram. Demo streets and geometry are schematic. Production has no verified geometry or place-level journey payload and shows an intentional missing-map/transport panel. Real basemaps/routing, geographic accuracy, ring holes/multipolygons, evidence/licence admission and stored layer provenance require the later approved mapping boundary; the diagram is not a routing or GIS engine.

The financial preview accepts annual rent, average customer spend and trading days/week locally and shows the user's entered scenario with descriptions of break-even revenue, required daily transactions and cost sensitivity. It produces **no numeric financial outcome**. Inputs reset on refresh and do not enter URLs, storage, logs, requests or existing historical inputs. The Full Report action remains a disclosed non-paying outline. PDF artwork is a labelled illustrative layout, not a generated/downloadable report.

## Demo and production separation

Run `npm run dev`, then visit `/dev/snapshot`. The visible Development demo notice applies to every value, conclusion, score and geometry. Query `state=missing-metric|missing-section|unknown|loading|locked` exercises the same components. The fixture is dynamically loaded only after the development-only gate. Production never falls back to it; missing stored fields remain explicitly missing. `snapshotFromStored` imports no fixture and performs no external request, analysis, scoring or database write. The existing owner-verified route/RLS/free-tier projection remains the only customer report read boundary.

## Verification

Observed local validation: Node 24.12.0/npm 11.6.2; `npm ci` passed after stopping the previous server's native-module lock, no vulnerabilities. Final `npm run check` passed lint, strict types, **114 tests**, fresh PostGIS/security regressions, and production build, including the saved-route loading skeleton and the final outline interaction. Actual HTTP checks passed all six demo states. All six URLs separately returned 404 under the running production server with no fixture address in HTML. `check:public` passed 13 public pages/articles, 13 internal paths, metadata/JSON-LD/sitemap/robots/social/404 and four safe address-route boundaries. CI also checks the production demo denial. Privileged-value scanning passed 236 repository/browser-bundle files and four served public/Auth pages without exposing any configured secret; this is not a new live-provider/Preview proof.

Browser checks: 360/375/390/430/768/1440 widths without horizontal overflow; one/two/four factor columns as appropriate; native Enter opens evidence; diagram zoom/layers and local financial preview are keyboard controls; no recorded browser errors/warnings. At 390px input focus and 390×500 short height the mobile action becomes in-flow. Strength badges stay neutral and colour semantics remain result-only. Actual 200% browser zoom is not claimed for this redesign; the earlier owner's Phase 6 zoom verification belongs to the earlier layout. Reflow at 720px (1440/2) and the narrow-width/focus checks cover automated layout limits, not actual browser zoom.

Two real ready development reports were read privately and successfully mapped to the new view with no fixture/score/geometry/transport fallback, provider/AI dispatch or database mutation. A prior browser guest report returned the intended protected 404 after its session was unavailable; this was not counted as a successful authenticated browser proof. Auth/read code is unchanged.

Protected PR/CI and final branch delivery results are reported in the finishing response; Production remains disabled. No real AI expenditure or new provider fee was incurred for this UI refinement.
