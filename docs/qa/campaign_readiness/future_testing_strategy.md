# Future testing strategy — based on the independent audit

## Before the first paid-traffic experiment

1. Close the normal-path gate with a fresh isolated request on the actual release under assessment: ordinary finalisation, Ready binding, validated receipts, automatic settlement and rendered output. Record fresh versus cache hits individually. An operator-recovered Ready report is a separate recovery test.
2. Add a deterministic generator-to-real-SQL integration test using recorded sanitised source/provider output and validated AI output. Assert customer projection, narrative reference constraints, case binding and ledger balance together. This directly addresses the class of defect that passed helper-level tests.
3. Inject an optional-source timeout while independent sources succeed. Assert explicit unavailable persistence and qualified report completion where safe; separately assert caller cancellation and failed database writes remain fail-closed. Keep ambiguous financial intent immutable.
4. Simulate two application workers and two database sessions reserving/finalising the same request. Assert one accepted dispatch, one report identity, one settlement/release pair and no negative available capacity. Sequential PGlite tests are valuable but cannot prove true concurrent lock behaviour.

## After each deployment

- Nonspending HTTP smoke: homepage, checker, login entry, sample report, owned report and PDF access with valid/invalid ownership. Verify consent UI before/after decision without forcing advertising events.
- Run scoring, evidence-reference, projection, storage-contract and payment-state regression suites plus schema rebuild/security checks in isolated CI.
- Check deployed SHA and migration identity; do not infer Production from a Preview URL or green build.
- Verify a saved report read cannot dispatch providers, AI or mutate Ready history. Compare source/version provenance and dashboard/PDF scores.
- Use an inexpensive fresh isolated canary when a release changes orchestration, provider contracts, evidence schemas or persistence. Do not generate a paid live canary on every content deployment.

## Weekly during a bounded launch

Sample a small diversity set: dense central commercial cluster, suburban high street, London boundary, food category and ambiguous beauty category. Reuse frozen fixtures for most checks; execute a fresh canary only within an explicit provider/AI envelope. Maintain real provider response fixtures with acquisition date, contract version and sanitised identifiers.

Review every failed or stalled execution by phase, not just HTTP status. Separate no dispatch, accepted unknown, received invalid, failed persistence, failed interpretation, failed finalisation and failed delivery. Measure time to Ready and time to an honest terminal state; distinguish normal completion from operator recovery.

## Early warning indicators

- Any `source_persistence_incomplete`, `report_persistence_failed` or unclassified continuation failure.
- Accepted AI receipt without a durable final report/checkpoint; Ready case with nonzero unused hold after settlement opportunity.
- Rising unavailable Demand/Competition ratio, grouped by precise reason and adapter version, not postcode-only fixes.
- Successful payment without entitled report/PDF within the declared service expectation; failed payment with any active entitlement.
- Repeated request identities producing multiple accepted intents, purchases, reports or conversion claims.
- Missing/invalid evidence links, contradictory Summary versus detailed score, or PDF versus dashboard mismatch.
- Budget available capacity approaching a new reservation's conservative maximum; never lower the reserve to conceal exhaustion.

Alert thresholds should start as low-volume operational review: a single delivery/security/accounting invariant violation merits review. Statistical failure-rate thresholds require actual denominators; do not invent an SLA from the current small sample.

## Recovery drills

Monthly, in isolation: lose response after provider acceptance; restart before finalisation; fail after report Ready but before case binding; replay webhook; refresh report; withdraw consent. Require no blind resend, preserved audit history, unmodified Ready editions and repeatable settlement. Capture audit event counts before/after. Operator recovery should be measurable and exceptional, with a documented bounded runbook.

## Report quality sampling

Review one actual delivered report across factual support, geographic scope, category classification, estimates versus observations, actionability and financial arithmetic. Trace each material numerical claim to frozen evidence. Include reports with genuine gaps; ensure unavailable evidence is honest without implying that a purchase automatically fills the gap. Review AI text separately from deterministic scores and policy decision.

## Keep the programme small

No broad load test against Production, paid infrastructure, architectural rewrite or repeated GA4 troubleshooting is required by these findings. Prioritise cross-component acceptance and the optional-deadline failure boundary over increasing raw unit-test count. Preserve existing immutable history, safe cost controls, scoring model and commercial gates until their separately authorised activation.

## Environment preflight gate

Before every state-altering isolated test, derive the actual Supabase project from the loaded URL without printing credentials. Refuse the Production project regardless of absent or nonproduction `VERCEL_ENV`. The audit reproduced a four-case matrix where the current guard accepts Production from local/Preview/development while source collection is considered enabled. Add negative tests for this inverse isolation direction and missing environment markers. A public/browser authentication boundary is not a substitute for protecting a privileged local test process.
