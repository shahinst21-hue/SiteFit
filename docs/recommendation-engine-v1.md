# Score-bound recommendation policy — 22 October 2026

Owner authority: align Recommendation and Summary to the real Residential Catchment
and Competition Headroom results, apply the seven ordered policy rules, use AI for
explanation only, and reduce repeated paid-preview controls. This supersedes the
adviser-v1 permission to choose a stance independently. Neither scoring formula,
taxonomy, provider allowance, AI envelope, purchase restriction nor launch gate changes.

## Shared contract

`lib/analysis/recommendation.ts` exports `sitefit-recommendation-v1`. In priority order:

| Verified inputs | Decision |
| --- | --- |
| Confirmed incompatible permitted use | Do not proceed |
| Either essential score unavailable | Insufficient evidence |
| Both scores below 40 | Hold before shortlisting |
| Either score below 40 | Proceed with caution |
| Scores at least 40; premises conditions unresolved or conditional | Conditional shortlist |
| Both scores at least 60, favourable access and verified premises clearance | Promising candidate |
| Remaining cases | Worth further investigation |

Essential inputs here mean complete admitted walking-population and same-category
competition scores. An unresolved unit-use/layout question is explicitly retained;
it is not a positive clearance and does not erase the two low-score rules.
These are owner-approved policy categories, not an empirically calibrated success
forecast. No positive category authorises lease commitment.

Both score objects pass their existing recomputation/provenance validators first;
walking populations must agree. Incomplete/failed competition is unavailable, never
zero. Missing evidence cannot become a favourable risk/access result. The current
provider adapters do not establish authoritative current exact-unit legal clearance
or favourable usable journeys: new automatic Snapshot decisions keep premises
unresolved and access conditional/unresolved. The policy supports evidenced legal
blockers and clearance, but does not invent a source-specific legal classifier from
history, names or AI prose. The current acquisition path therefore cannot manufacture
a Promising candidate from high population/competition scores alone.

The Screenshot regression operands 1,377 / 4,629 / 10,556 residents and 5 / 7 / 11
similar businesses retain the original model scores **28 Limited / 39 Limited**.
Their decision is **Hold before shortlisting**. Limited Competition means limited
headroom relative to residents, never low competition.

## AI input and output boundary

Competition collection now completes before the existing single Snapshot synthesis
dispatch. `snapshot-advisor-v2` receives:

- The business concept and fixed policy version, decision title/status and two scores.
- The 5/10/15-minute cumulative population estimates, matched business counts and
  explicit collection state, when available; their modelled scope is retained.
- All validated section conclusions, supporting/opposing findings, alternative
  interpretations, unknowns, section IDs and their evidence references.
- Qualified source observations with evidence IDs, dataset, units, dates, geography
  scope and per-observation limitations.
- Explicit unresolved premises/access states and the lease-withholding boundary.

No exact property identity, coordinates, email, credentials, payment data or external
research tool is added to this packet. Source text remains untrusted input. AI writes
why, strongest counterargument, what could change the view and one practical action.
The response schema fixes the recommendation title and stance. Runtime validation
requires agreement and rejects numerical prose; authoritative scores stay in the UI.
With both score inputs present, the rationale must reference both source sections.
There is one reserved dispatch with the existing receipt/checkpoint path and no
automatic semantic retry. The $0.65 Snapshot / $1 Full ceilings remain unchanged.

The new decision is frozen into the Free projection. New Full preparations authorise
the original Free report first, copy its policy decision and bind it to the same
source scores. Existing Full synthesis receives that binding and walking evidence;
the first verdict line and overview conclusion must match. Rejected AI explanations
remain invalid checkpoints, never accepted fulfilment. Dashboard and PDF use the
same decision object; changing prose cannot change its category or operands.

## Historical integrity and presentation

No migration, historical rewrite or paid regeneration is performed. Historical
adviser-v1 editions remain readable. The operator-only legacy advisory-edition
mechanism remains its existing v1 contract; it is not used for new score-bound
customer generation. For Ready editions with saved score objects but no saved
policy decision, rendering labels a **current policy interpretation of saved scores**
in the evidence details and retains the original saved advice. No read schedules AI,
provider collection or report creation. Existing paid editions without a saved
policy decision retain their original verdict: their already archived PDFs are
immutable and keyed by the original content digest. Only new Full preparations
freeze the shared policy for both dashboard and PDF. No old paid edition is
silently reinterpreted or re-exported under a different decision. Editions without
either new score contract retain their historical presentation rather than
inventing scores.

Summary reads the same score/rating as the analytical cards. The recommendation
shows both scores, a reason and next action rather than an unrelated qualitative
slider. Premises Risk, Rent & lease and Actions use compact locked previews without
blur placeholders or duplicate buttons. Contextual unlock actions still open the
same report-bound purchase dialog; the principal paid CTA and mobile action remain.

## Verification

Deterministic and mocked-provider tests cover threshold boundaries, precedence,
unknown/failed sources, altered labels/scores, jsonb key reordering, old Ready input
immutability, a single v2 synthesis dispatch, Summary parity and actual PDF creation.
The regression fixture uses screenshot operands, not a new real API recording.
No additional provider, AI or Stripe request is authorised by these offline tests.
Protected CI, browser widths and release results are recorded separately on the PR.
