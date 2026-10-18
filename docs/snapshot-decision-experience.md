# Snapshot decision experience — 18 October 2026

Owner authority: the 15-point feedback on the real 67B Snapshot. This is the
pre-purchase UI/UX review stage, not a new report, source acquisition or reopening
of accepted phases. Historical projections, source snapshots and AI budgets remain
unchanged. No new AI, provider, payment or public-generation authority is added.

## Delivered presentation

| Previous presentation | Implemented presentation | Evidence boundary |
|---|---|---|
| Empty score ring | Qualitative next-decision label and separate evidence sufficiency | Fixed mapping from stored meaning; original headline/reason remain visible |
| Large unavailable map | Compact Location Intelligence | Map only with stored layers, bounds and property point; entrance uncertainty remains |
| Raw statistics and repeated badges | Scoped observation, implication, limit and next check | Original observations, units, universes, dates, notices, alternatives and sources remain in disclosures |
| Equal four-card grid | Verification priority first, differentiated premises treatment | Constraints, customer context, competing offers, access; only supplied questions; no risk score |
| Static reading | Three stored-answer questions linked to their evidence | Exact saved reasons, qualifications and unknowns; no live chat |
| Generic café label | Optional page-memory planning lens | Changes one verification prompt, not assessment, capacity or preferred format |
| Feature list and paper illustration | Three decision outputs and interactive approved fictional examples | Existing sample text, clearly unrelated to this property |
| Buried purchase control | Brief, full-value and mobile controls | Same report-bound flow/gates; unavailability text disappears when legitimately available |

Black, white, approved neutrals and lime actions replace outcome-colour decoration.
Typography, 24px padding, 16/32px surfaces, Astra icons, native disclosures/radios,
44px controls, reduced-motion and short-height behaviour follow the brand.
Keyboard actions do not wait for content animation. No new routes, subscriptions,
libraries or analytics dashboard.

## Minimal measurement

Existing campaign consent and release authority remain mandatory. No tracker is
mounted while measurement is disabled. Accepted campaign consent is checked before
each observation and rechecked server-side with verified ownership. Withdrawal
prevents subsequent writes. No free-text questions, café preferences, addresses,
coordinates, raw referrers or new visitor identifier are collected.

Migration `20261018100000` adds an initially empty private `interactions` JSON
column to existing `campaign_attribution`, plus service-only admission and aggregate
read functions. At most 11 fixed first-occurrence keys per attributed analysis:
Snapshot view, four factor opens, three question opens and three CTA positions.
Refreshes/repeated clicks do not inflate counts; no event stream or replay queue.
Existing first-touch/freshness, rights holds, capacity and owner/Ready checks remain.
Existing campaign export/erasure includes the column; existing retention applies.
Checkout entry and payment success use trusted existing purchase/payment records.

Use the existing campaign result export for purchase/payment outcomes and this
read-only service query for interaction counts over the same Snapshot cohort:

```sql
select public.sitefit_snapshot_interaction_results(
  '2026-10-18T00:00:00Z'::timestamptz,
  '2026-10-19T00:00:00Z'::timestamptz
);
```

Choose a completed nonfuture window (maximum 93 days); example dates are not an
instruction to run a future query. Export has campaign/key/count only. Counts are
consent-selected analyses and best-effort UI observations, not unique customers,
causal attribution or payment proof. Keep operational exports private. Production
measurement remains disabled pending separate commercial/privacy activation.
No consent is retroactively imputed to the 67B case.

## Verification and release

Tests cover unchanged frozen wording, numerical universes/zero/missing data, all
four concepts, no empty score/map, rendered gated controls, original source notices,
fixed event admission, DB idempotency/ownership/private aggregates and report
immutability. Browser checks cover disclosures, evidence jumps, café lens, sample
switching and responsive reflow. Physical phone interaction and actual 200% browser
zoom are not certified by viewport emulation; they belong to ongoing owner review.

Exact CI, hosted migration/deployment receipts and real 67B post-release read-only
verification are recorded on the delivery PR. No real generation is needed to
review the new presentation of the existing Ready report.

Local verification: `npm run check` passed 388 tests, lint, strict types and build;
fresh PostgreSQL/PostGIS/security passed. Public HTTP checks passed; all six demo
states and the journey remained denied in a production build. Hosted Development
migration 84 applied after rollback rehearsal, with original data/ACLs/gates
unchanged; rollback-only synthetic owner, fixed-key, idempotency, first-touch and
aggregate-privacy tests passed and left zero campaign rows. Exact migration hash:
`ce32c3353da73bf88896c141f7546a1025e1ae91bcf3b47066f39fbd36228dad`.
