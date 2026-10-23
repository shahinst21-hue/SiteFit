# 67B FSA collection blocker — bounded offline correction

## Recorded failure and evidence limit

The separately authorised Production attempt for 67B Broadway Market stopped before
AI. Fifteen of sixteen initial source snapshots were stored; the runtime diagnostic
was `snapshot_collection_missing` with `fsa-establishments / invalid_response`.
The case is disabled in `intervention`, with four received source dispatches
(PropertyData1, TfL1, FSA2), zero AI dispatches/reservations and no Ready report.
Neither the older67 case nor this67B case may be reset or automatically retried.

The ledger retains response digests, not FSA response bodies. Raw FSA bodies are
discarded under the existing source policy. A byte-for-byte replay of those two
responses is therefore unavailable; a digest cannot reconstruct their contents.
The regression fixture is explicitly **synthetic valid FHRS data**, not represented
as captured Production businesses, ratings or an independently verified live payload.

## Demonstrated root cause and fix

The FSA adapter emitted normalisation version `fsa-register-with-hygiene-v2`, while
its registered source definition still expected `1`. The collector deliberately
checks exact registered identity before append, so **even a valid normalised FSA
response was rejected** with `invalid_response`, leaving its snapshot missing.
This deterministic incompatibility reproduces the recorded boundary failure; it
does not establish that every unavailable original response field was valid.

The application correction changes only the FSA registry version to the already
implemented hygiene-aware format and removes the adapter's duplicate override.
`initialResult` now obtains the version from the registered definition for every
outcome. The collector's strict identity check is unchanged. There is no schema
or migration change, no change to request/pagination/retry/cost caps, no source
admission relaxation and no rewrite of historical envelopes or reports.

The regression runs actual transport, FSA normalisation and collection through
the persistence boundary using mocked pages. Before the fix it records
`snapshot=null / invalid_response`; after it persists the bounded partial result
for café/restaurant and reuses it with no further request. It also checks private
field removal, dated hygiene distinct from customer reputation, incomplete coverage,
legacy v1 decoding, zero-call salon exclusion, and rejection of an unregistered
version. Existing proof/concurrency/privacy/transport tests remain required.

## Reuse and completion boundary

A read-only export of the actual frozen67B context and15 stored envelopes was
validated offline with **all network disabled**. All15 original collection request
hashes matched the corrected collector, which returned their original IDs and
metadata with zero retrievals, writes or telemetry. The FSA-only version change
does not invalidate those other source identities. Insufficient precision and
unsupported outcomes remain explicit; do not borrow67's property point or facts.

This proves data reuse, **not execution permission**. Current one-time authority
rejects continuation of the intervened case, and its nonce/input/source lineage
cannot be rebound to a new case by ordinary provisioning. This PR does not add
that recovery capability or change any authority state. Completing67B while
preserving the failed execution requires a separately reviewed, explicitly approved
bounded continuation authority referencing the original owned frozen input and15
source IDs. It must retain prior dispatches/holds and refuse any repeated call for
those stored sources. FSA's missing envelope requires separately admitted new
acquisition (or genuinely existing equivalent qualified evidence); its old response
digests are not send authority or usable source facts. The conditional EPC outcome
and AI/Ready stages were never reached and remain unproven.

## Release action and private evidence

Local verification passed:30 focused collection/transport/proof tests,
`npm run check` (lint, types,382 tests and production build), final fresh
PostgreSQL/PostGIS rebuild including actual v1/v2 FSA persistence and historical
row equality, public HTTP/metadata/privacy and campaign consent/indexing checks.
Remote exact-head CI, protected merge and post-merge CI are recorded on the PR;
none of these checks claims a new live67B Ready result.

After protected merge and exact-head/post-merge CI: request approval to build/deploy
the exact corrected commit to Production, retaining the existing homepage,
configuration, migration82 and all disabled authorities/gates. **No migration or
environment change is required for this FSA correction.** Keep the current Ready
deployment as rollback. Deployment alone must not restart either failed case.

Ignored private evidence: `fsa-contract-before.log`, `fsa-contract-focused.log`,
`fsa-contract-check.log`, `fsa-contract-database.log`,
`fsa-67b-frozen-exact-private.json`, `fsa-67b-frozen-reuse-result.json`, plus the
original `successor-67b` runtime/source/dispatch receipts. No raw provider body,
credential, owner identifier or private capture is committed.
