# 67B controlled Snapshot continuation

The owner authorised recovery of the failed 67B Broadway Market Independent Café
Snapshot, protected delivery and Production deployment, retrieval of only missing
FSA evidence, and AI within US$0.65 total for this case. No public execution,
payments, Full Report or campaigns are authorised.

## Implementation

Migration `20261017160000` appends private continuation authority and dispatch
tables. It seeds no authority. The original failed proof, reservations and
dispatches remain unchanged. A disabled, operator-created continuation binds the
same verified owner, canonical property, nonce, analysis, immutable input and exact
15 source row digests. The normal collector reuses those rows; missingness and
postcode-centroid precision are preserved.

Atomic parent-row locking serialises claims and reservations. Only missing FSA
requests (at most two) and five named AI stages are admitted. Unique case/request
and case/AI-stage constraints prevent repeated payment, including after process
failure or changed requests. All continuation reservations plus prior case holds
must remain within 650,000 microdollars. Reservations are conservative admission
limits, not a guarantee of the provider invoice. Unknown outcomes stop for manual
reconciliation; reservations are never released automatically.

Received AI output and usage are private checkpoints, allowing deterministic
processing to continue without resending a received request. Raw FSA bodies,
provider headers and credentials are not checkpointed. Interrupted continuations
cannot be reset or re-enabled. A later explicitly issued continuation cannot
redispatch an already reserved AI stage or proceed past an ambiguous dispatch.
Ready requires the genuine same-analysis/input immutable free report and settled
dispatches. The failed parent proof remains intervention history.

All table access is denied to browser roles and direct service-role DML; only
scoped service RPCs admit execution. Existing rights holds and capacity checks
remain enforced. No route, provider, public generation gate or environment change
is introduced.

## Verification record

Offline integration used the exact 15 captured source rows with all fetches
mocked: 15 reused, two mocked FSA requests, zero other provider requests, four
mocked AI calls, and a mocked Ready result. This is not live Ready evidence.
Fresh PostgreSQL tests cover frozen bindings, ownership, disabled authority,
duplicate claims/dispatches, no raw FSA checkpoint, receipt replay, cumulative
budget, unknown responses, immutable history and grants.

Hosted Development recovery rehearsal restored prior function definitions,
permissions, migration history and data fingerprints. Migration 83 applied with
all previous data and failed proof fingerprints unchanged, no authority seeded,
and all commercial/runner gates off. Exact SQL SHA-256:
`11855ecda2eaa104011173485fa68ca61c6610284f9ac667f6520380c754acf1`.

The hosted multi-connection rehearsal used private namespace copies of the actual
installed functions: eight concurrent claims admitted one; eight duplicate
dispatches admitted one; concurrent 200,000-microdollar reservations admitted only
two after an existing 100,000 hold. A new connection could not reclaim execution,
and ambiguous settlement denied further dispatch. No public proof rows or external
calls were created; the isolated schema was removed. Local `npm run check` passed
384 tests, lint, types and production build; fresh PostgreSQL reconstruction passed.

Protected CI, merge, Production migration/deployment and actual execution results
must be recorded on the delivery PR. Until those actual checks complete, a real
Production Ready result remains outstanding. Private captures and receipts remain
ignored under `supabase/.temp`; no personal identifiers or credentials belong here.
