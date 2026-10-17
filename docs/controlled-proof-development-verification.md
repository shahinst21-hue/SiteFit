# Controlled proof — hosted Development verification, 17 October 2026

Scope: owner-authorised PR63 integration and Development-only synthetic verification. Production is unchanged; no payment, provider retrieval, paid AI, subscription, environment activation or public campaign occurred. Concurrent homepage design edits are excluded. Closed phases remain closed.

## Migration and recovery receipt

- Verified target: `sitefit-dev`, `idlsjusbrmyucccostxt`, London/eu-west-2, healthy. Production `vsfkkroxgntoumoqcfcy` was not a write target.
- All78 dependencies matched local migration history; no applied migration was edited. The pending migration was strengthened before application to preserve Full's US$0.30 envelope inside the aggregate and guard the separate commercial-reservation entry point.
- Applied only `20261017120000_controlled_proof_and_rights.sql`, transactional, no automatic retry. Applied SQL SHA-256: `5bc41068e6f8c2b90d4be1c9040591038e2beaea928c9049a8f39bc34452663a`. Hosted stored migration statements match that hash. History now79.
- No drop/reset/source reimport, existing-row rewrite, immutable-trigger disable or RLS weakening. Four new private RLS tables start empty. Original functions are retained behind revoked legacy entry points; rights/authority wrappers preserve the ordinary no-case flow. Existing table RLS/ACLs are unchanged; the additional profile policy is restrictive.
- Private preflight preserved three affected function definitions/owners/ACLs, profile policies, history and19 protected fingerprints. The actual hosted rehearsal applied migration and synthetic rights/authority assertions under a savepoint, rolled back, and verified exact function/ACL/schema restoration and unchanged fingerprints before final application.
- Fingerprints for Auth, profiles, properties, analyses/inputs, source snapshots, evidence, sections/reports, payments/contracts, jobs, reservations/events, policies, Storage metadata and controls remain equal after verification. All16 Development source releases are retained; this count is not Production's14 releases.
- Database bytes:378,304,179 before;378,623,667 immediately after migration;379,524,787 after hosted verification/teardown. Final margin70,475,213 beneath the existing450,000,000 checkpoint. This includes schema/test catalog growth, not a measured per-report footprint.

Recovery boundary: DDL/history insertion is atomic, with bounded locks/statements. Ambiguous apply responses require read-only history/hash reconciliation, never blind reapply. The savepoint rehearsal proves targeted transactional recovery, not an independent hosted backup or a full Auth/Storage disaster restore. After successful application, keep new schema/private evidence and gates disabled if a defect appears; revert the application to its prior reviewed artifact and use an explicitly reviewed forward repair. Do not delete proof intents, relax immutable triggers or remove real rights holds to recover execution.

## Hosted tests and their limits

Actual public functions/RLS were tested in rollback-only transactions using synthetic identities, property, report and campaign rows: disabled/wrong-owner/wrong-property/expired authority, wrong token, duplicate intent, monotonic holds, ambiguous stop, stale rights-plan rejection, profile restriction, selective display-name removal and owner-only campaign deletion. Another owner and historical report fingerprints remained unchanged. No real-person deletion occurred.

True multi-connection tests used three disposable private schemas containing copies of the **installed** function definitions, namespace rebased only, and synthetic tables/policies. This avoided committing a non-removable synthetic singleton in the real authority table or changing Development's Test payment mode. A separate lock witness observed contention from two different PostgreSQL backend PIDs. These tests exercise installed locking/budget logic, not a public Checkout or real provider.

| Test | Observed result |
|---|---|
| Eight parallel Snapshot claims | One accepted; seven rejected |
| Eight identical parallel intents | One accepted, one durable intent |
| Eight additional Snapshot budget attempts | Four accepted; five total intents, US$0.65 held; no overrun |
| New connection after simulated sender loss | Reclaim denied; committed intents/holds retained |
| Ambiguous outcome | Intervention; five intents/US$0.65 retained; further dispatch denied |
| Eight parallel Full attempts after US$0.65 Snapshot | Three accepted; Full US$0.30, aggregate US$0.95 |
| Separate commercial reservation | Wrong payment rejected; commercial US$0.30 is the Full envelope, not extra spending authority |
| Actual TypeScript section engine + hosted journal + mocked invalid AI response | One mocked request, no semantic repair; committed intent observed before response;32,260 microdollars retained; restart denied after intervention |

No OpenAI/source endpoint was called: the engine test forbids unmocked Node fetch and supplies only a synthetic provider response. Database management calls were the only network activity in these tests. The three private schemas were removed after provenance/synthetic-row checks. Public proof cases/intents/holds/audit rows are all zero, all approvals remain unseeded, and commercial/runner controls remain disabled.

Local PostgreSQL/PostGIS fixtures cover the complete synthetic payment/contract/confirmation queue/Full binding flow and the existing lifecycle suite. Development's real payment-mode isolation was preserved; no hosted Live-mode transition or real end-to-end paid proof is claimed. Existing no-retry transport/response interruption/settlement-loss tests remain required by exact-head CI.

## Budget and release handover

US$0.95 is aggregate, with US$0.30 reserved as its Full sub-limit; Snapshot admission maxUS$0.65. Effective accounting counts the Full commercial envelope and its dispatch journal once, using their maximum, never as two allowances. Locked authority/call limits and unique intent identities survive concurrent requests and new connections. Historical development reservations are unchanged. [Reconciliation of US$0.8615 to US$0.775](controlled-proof-safety.md) and the offline script expose the changed call assumptions; neither figure guarantees an invoice. Actual tariff/tax/source fees/automatic-billing exposure, processor evidence, exact case approval and separate spend authority remain open.

Protected delivery: PR63 to `codex/phase-12-intelligence`; exact-head CI and normal protected merge are required, followed by post-merge CI. The PR/CI record provides final immutable commit identities; no direct main push or protection bypass is permitted.

Recommendation: after protected integration and green post-merge CI, prepare the **same hash** for a separately authorised Production migration followed by a non-commercial application release. Fresh Production preflight must verify its exact project,78 dependencies,14 source releases, recovery evidence, capacity and disabled gates; do not substitute Development counts or receipts. Keep case authorisation unseeded/application activation false and all Checkout/AI/source/runner/indexing/campaign gates off. Production migration/deployment is not authorised by this Development verification. The real £29 proof remains a later separate approval.

Private evidence in ignored `supabase/.temp/`: `proof-development-target.json`, `proof-development-preflight.json`, `proof-development-recovery.json`, `proof-development-migration-receipt.json`, `proof-development-postflight.json`, `proof-hosted-public-verification.json`, `proof-hosted-concurrency.json`, `proof-hosted-lock-witness.json`, `proof-hosted-engine.json`, `proof-hosted-final-receipt.json`, plus the corresponding private reproduction scripts. Do not commit customer dumps, account replies or credentials.
