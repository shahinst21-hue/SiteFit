# Checkout cancellation and recovery — 19 October 2026

Root cause: the return page read only stored pending status and rendered Full generation progress before verified payment. Cancel query parameters changed only the heading. Failed-card open Sessions and delayed expiry webhooks could leave the customer without an actionable retry.

Return and status reads now perform bounded, owner-scoped Stripe reconciliation: account, mode, amount, currency, price, session/intent metadata and reversals are verified using the same observation helper as signed webhooks. Open unpaid Sessions are retryable without marking them failed; processing/contradictory/unavailable states remain uncertain. Direct paid/expired facts use explicitly labelled `obs_` audit rows and the existing atomic revision-fenced reducer. No webhook envelope is fabricated. Server verification has a 12-second deadline; the browser stops unpaid verification after three checks or 30 seconds. No generation UI or contract download appears before verified payment. Confirmation delivery remains a separate fulfilment gate.

`POST /purchase/retry` checks same-origin, permanent identity, ownership, existing trial authority and current Stripe state, then reuses the existing checkout handler and stored valid consent. A policy mismatch returns to the Snapshot purchase disclosure. Open Sessions reuse the same binding/key; verified expiry uses the existing successor ledger and original Full envelope. Failed-but-open attempts retain their historical status and may reuse their already-bound, unfulfilled envelope only; the provider must still verify open/unpaid before redirect. No historical reset, new entitlement or automatic charge is introduced.

Additive migration 20261019180000 only extends the private audit ID/type contract and the narrowly scoped failed-open reuse path. Existing RLS/grants, immutable records, expiry successor rules, budgets and owner-only restrictions remain. Application rollback is compatible; do not remove observation rows or reverse historical attempts. Synthetic route /dev/purchase is Development/Preview only.

Validation and deployment receipts are recorded privately; actual charge and purchased-report proof remain owner actions. No real payment or provider AI/source execution is used in verification.


Stale cancellation URLs follow the existing owner-scoped latest-purchase projection for the same Snapshot, so a newer successful attempt wins over an older cancelled one. Historical confirmation downloads remain pinned to the explicitly requested paid attempt. Already-verified paid fulfilment polls do not repeatedly call Stripe. The explicit retry request also has a 30-second browser deadline; an ambiguous response leads to checking saved status, never an automatic new charge.
