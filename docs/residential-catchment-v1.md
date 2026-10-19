# Residential Catchment Strength v1.0

Owner-approved 19 October 2026. Implemented in Development; not deployed.

Scope: coffee shops in the existing supported urban London evidence pipeline. This deterministic residential context metric does not replace the overall recommendation and is not observed demand, footfall, sales or success probability.

Cumulative walking-network estimates P5/P10/P15 become independent bands P5, P10-P5, P15-P10. Component scores are min(100,50*band/reference), using references 2500/5000/12000 and weights .50/.30/.20. Only the final weighted result is rounded. Display bands: 0–39 Limited, 40–59 Moderate, 60–79 Supportive, 80–100 Strong. The example 3500/9000/25000 returns 64.8333333333, displayed 65 Supportive.

One shared module handles Snapshot, Full Report and PDF. Only qualified ONS TS007A cumulative totals with walking-network parent lineage are eligible. Missing, ambiguous, expired, unsupported or non-monotonic evidence produces no score. Existing area population figures are not substituted. Source/release identifiers, reference period, retrieval dates, precision and origin are frozen with operands, components, result and model version.

New enriched Snapshot projections and Full Report preparation JSON store the metric through existing immutable persistence. No schema migration, provider request, AI dispatch or new dependency is introduced. Replays consume stored calculations. Historical Ready reports are untouched and do not acquire a retrospectively invented score. Non-coffee concepts retain their existing presentation.

The main card follows the approved reference with large score, gradient and three walking-population tiles; the grey methodology panel is omitted. Calculation and limitations remain in the evidence modal and expanded paid section/PDF. A synthetic, explicitly labelled local/Preview fixture is available at /dev/snapshot?state=catchment; never treated as a real property assessment.

Verification evidence is recorded in the delivery PR. Public sales, purchasing authority, execution budgets and RLS are unchanged.
