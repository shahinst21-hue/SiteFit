# Independent campaign readiness strategy

Audit date: 24 October 2026. Branch: `codex/independent-campaign-audit`. No merge, deployment, migration, Production data mutation, purchase or advertisement activation is part of this audit.

## Revision boundary

Local baseline `2933fbc0353c4b55a1f6e0919b12dc707dc7b3c2` has the same tracked tree as former main `2d6cdbb08290cb00aa35e6a8d1f681be7faad923`. All 164 baseline documentation files were read before audit additions. During the audit main/Production advanced to `683c7f1847d0748e39d5005ca5d2cb1c25628d97` through PR137, independently observed in GitHub and Vercel. Its changes are limited to CI dependency audit, response security headers, public smoke script and an Ads security document. None changes the scoring, collection, environment guard, payment or consent code reviewed here. Current SHA CI is green; local tests were not rerun against a checkout of that entire SHA. This distinction is intentional.

## Initial risk model and selected methods

| Risk | Impact / detectability | Method and acceptance |
| --- | --- | --- |
| A successful source response creates an incorrect score | High, customer cannot easily detect | Independent score monotonicity and threshold boundaries; recorded geometry/source review; no arbitrary threshold relaxation |
| Optional source stalls an entire analysis | High, obvious late to customer | Compare fast HTTP failure with ignored-signal deadline fixture and consuming generator branch |
| Ready save/recovery/budget triggers disagree | High, expensive work may fail after collection | SQL suite plus reference-binding tests; fresh uninterrupted execution remains a separate acceptance gate |
| Local/Preview silently uses Production | High, hard to notice until write | Effective configuration preflight; inverse runtime/database matrix; zero network mutation |
| Payment grants wrong entitlement or duplicates work | Critical if present | Verified-object, signature, ownership, out-of-order and repeated-notification tests with isolated SQL; no real charges |
| Empty competitor search produces unjustified favourable score | Medium/High consequence depending wording | Adversarial complete empty provider response, preserving approved formula and testing eligibility instead |
| Public promise differs from owner-only gates | High campaign waste | Read actual route/policy/trial code, live aggregate controls and landing copy together |
| Analytics counts visits as delivery or loses purchase | Medium | Inspect persistent claim, consent state machine and event trigger semantics; do not equate GA4 with financial ledger |
| Report is valid but not worth £29 | High commercial risk | Evidence/reference integrity, deterministic economics, missingness and provenance rubric; current paid output remains unverified |

Passing percentage is not a launch criterion. No GO while the public customer path is closed, serious delivery risk is unresolved, or current uninterrupted generation and paid delivery lack acceptance evidence.

## Execution and adaptation

The existing complete 491-test suite was executed independently, followed by targeted role-specific rechecks (overlap is not added to unique count). Three new acceptance probes were then written with desired safe behaviour; all fail and remain failing in `tests/qa/campaign-readiness.test.ts`. They are explicitly invoked outside the existing `tests/*.test.ts` glob, not marked todo or changed to accept unsafe behaviour. The third probe followed an actual browser contradiction and reproduced it with the real rendered fixture after an initial harness timeout. A public HTTP check failed at the owner-gated malformed address endpoint (403 versus generic expected400); this is recorded as an environment-aware smoke-test gap, not evidence of malware or payment compromise.

Metamorphic checks use seed2401024: 3,000 score assertions across1,000 inputs, plus64 decision boundary combinations. These are assertions/cases, not3,064 independent end-to-end tests. Provider failure and concurrency tests use fixtures; no load/chaos traffic was sent to Production.

## Fresh-run and spending preflight

New audit ceiling is aggregate £5, not a target. Incremental paid operations: zero; no new AI, Geoapify, Postio or Stripe transaction was initiated. Effective local configuration targets Production with a privileged key and no VERCEL_ENV marker. The inverse isolation guard accepts this combination. The audit therefore did not use it for a newly initiated analysis. Existing mobile-address Preview is a labelled synthetic journey on an older branch, not a verified current writable Development environment. Safe local UI server was launched with provider/database keys blank; CUA could not reach either localhost or127.0.0.1. No safeguard was bypassed.

Planned minimal fresh sample once safe isolation is established: two real supported London premises with distinct density/river or administrative-boundary geometry, and one salon taxonomy case only if remaining provider/AI capacity permits. Establish real address/category from public primary evidence before submission; record newly created execution, bounded intents, receipts, normal Ready, automatic settlement and rendered decision. Do not substitute historic replay for these runs.

## Deliberate exclusions

No Production fault injection, stress traffic, live charge, credential rotation, ad edits or new services. No repeated DebugView investigation. Real Safari/touch and fresh consent storage were not verified through desktop viewport claims. Full independent security penetration testing and provider completeness ground truth are not established by this audit. Missing tests are explicitly blocked/unverified, never passed.

See [results](test_results.md), [failure register](failure_analysis.md), [quality](report_quality_audit.md) and [roadmap](remediation_roadmap.md).
