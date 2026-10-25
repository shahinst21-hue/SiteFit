# PR138 Development acceptance — budget resolution

25 October 2026. **Read-only investigation completed; the owner explicitly approved the separate Development allocation, within the aggregate GBP5 ceiling. Implementation is in progress; no hosted allocation has been funded or activated.** Production is excluded. No fresh provider execution or Sandbox purchase was initiated.

## Verified baseline

- PR138 head at investigation start: `ee0aa1ff924c60d915f296cc8b7a212928cb3b11`; both GitHub lint/types/tests/build runs succeeded and Vercel succeeded.
- Ready Preview: `https://sitefit-cmx4dufgz-shahinst21-hues-projects.vercel.app`. Branch alias remains `https://sitefit-git-codex-post-audit-re-9362e8-shahinst21-hues-projects.vercel.app`.
- Development target `idlsjusbrmyucccostxt`:107 migrations. No Production mutation or deployment.
- Acceptance code is default-off. The branch has staged expiring flags, but its only bound proof is **disabled**, issued and reserved0. It therefore has no execution authority. Vercel requires email verification to edit/reveal the existing flag; no such protection was bypassed and no flag change was saved during this investigation.

## All3040000 legacy microUSD accounted for

| Reservation class | Count / scope | Nominal reserved USD | Recorded receipt estimate USD |
| --- | --- | ---: | ---: |
| Draft Full reports |5 distinct reports,15 checkpoint entries |1.500000 |0.324020 |
| Ready Full base executions |3 distinct reports,9 checkpoint entries |0.900000 |0.139038 |
| Additional consultant review attempts |3 attempts attached to one of those Ready reports |0.600000 |Unknown |
| Report question |1 reservation and received settlement |0.040000 |0.002826 |
| **Total** | |**3.040000** |**0.465884 known estimates, plus unknown review usage** |

The six Ready-report reservation events are not six completed report executions: one Ready report has its original300000 reservation plus three200000 review reservations. Deduplicating report IDs before summing the current report checkpoint avoids counting its receipts four times.

The review outcomes independently record `ambiguous`, `timeout`, `usageKnown=false`,200000 each. **All600000 must remain held.** No conclusion of zero expenditure is supportable for those attempts.

The five drafts have9 accepted and6 invalid checkpoint entries, with receipts for all15; one entry is deterministic `model=none`, zero-token work. Across the deduplicated Full checkpoints and question there are23 nonzero model receipts,70542 input tokens and32480 output tokens. Their stored estimates use2microUSD/input token and10/output token. At the separately documented conservative proof rate2.5/10, the aggregate is501155microUSD instead of465884. These are application receipt-derived calculations, **not independently verified provider invoice settlements**; prior review usage, tax and account billing are not inferred from them.

The drafts have no currently bound queued/running/awaiting-authorisation fulfilments. Their `running` checkpoint labels are stale processing state, not evidence that all reservations were unused. No draft was marked Ready, erased or replayed.

Potential unused nominal capacity is at most1938845microUSD if the conservative known-receipt calculation is accepted while retaining the full600000 unknown hold. This is **not safely released capacity**: the legacy ledger has no installed receipt-based release consumer, the historic review record does not prove an invoice cap, and the applicable tariff/billing basis is not independently settled here. Available admission remains0.

## Why the existing reconciliation cannot release this ledger

`settle_sitefit_trial_budget` requires an existing trial reservation and exact trial/proof/Ready-report binding. Commercial settlement requires a verified payment and matching commercial reservation. These legacy reports have **zero trial bindings and zero commercial reservation bindings**. Falsifying such bindings, reclassifying historical reservations, inserting negative reservations, deleting events or setting drafts Ready to qualify would corrupt history or weaken controls.

`start_sitefit_full` still counts the immutable `phase12-report-reserved` and `phase12-question-reserved` events against its3040000 ceiling. Neither a new arbitrary event nor a retry changes that calculation. No existing authorised safe release restores admission. All legacy events and the3040000 ceiling remain untouched.

## Separate allocation explicitly approved

**Approval key:** `development-acceptance-pr138-v1` (unique; replay returns the same grant or rejects differing parameters).

- Project: Development `idlsjusbrmyucccostxt` only; Preview branch `codex/post-audit-remediation` only. No Production migration, grant, flag or deployment.
- Maximum AI envelope: **USD3.30**, exactly two cases, each SnapshotUSD0.65 plus FullUSD1.00. The Full envelope is included in, not additional to, each case'sUSD1.65.
- The previously authorised **GBP5 aggregate incremental ceiling remains controlling**, including providers, applicable tax and currency conversion. The unallocated remainder is a buffer, not extra AI authority. Before activation, verify the tariff/account profile and conservative GBP conversion plus source-credit cost. Do not activate if the total cannot be bounded withinGBP5. No upgrade, purchased credits, new subscription or automatic top-up is authorised.
- Bind the two executions to the ordinary synthetic customer and explicit canonical properties: Prurock Coffee,23–25 Leather Lane,EC1N7TE / coffee-shop (`57332cbf-34aa-4be6-af9c-d5bb3293a9a3`); Bluetit,7 Stoke Newington Road,N168BH / hair-salon (`aa1e758c-06a5-4a12-997b-c682098ddf02`). Fix the customer UUID and each property UUID, category, nonce and proof UUID in the activation manifest before funding. No wildcard customer or postcode authority; once funded, identities cannot be substituted or multiplied.
- Expire within24hours of activation; stop admitting new work at expiry or explicit disablement. Keep completed/ambiguous financial history. Expiry never implies that an in-flight or uncertain cost is released.
- Keep existing75-credit Competition maximum and any lower provider governor, AI call/byte limits, immutable request identities, same-origin checks, RLS, permanent verified customer identity, Sandbox-only prices/payments and entitlement checks. No live charge or public access.

### Required implementation boundary after approval, before activation

Use an additive private grant/case/event ledger, provisioned through the existing explicit Development migration process. Proposed objects: `development_acceptance_allocations`, `development_acceptance_cases`, `development_acceptance_budget_events`; RLS, no anonymous/authenticated direct access, operator-only funding and service-only bound admission. Funding and all accounting events are append-only.

Proposed private entry points: operator-only `approve_sitefit_development_acceptance`, service-only `reserve_sitefit_development_acceptance`, receipt-bound `settle_sitefit_development_acceptance_ready` invoked on the actual Ready transition, and `start_sitefit_development_acceptance_full`. The application may select this new start path only under the expiring exact-Development Preview gate and an active manifest-bound allocation. No generic client-facing grant, balance-edit or settlement endpoint is introduced.

Lock the allocation row in every reservation transaction. Enforce exactly two manifest-bound cases, stage caps, expiry and aggregate3300000microUSD. Unique grant key and `(grant,case,stage,event kind)` constraints prevent repeated allocation, reservation or settlement. Existing controlled-proof/provider admission remains mandatory. A new narrowly bound acceptance Full-start RPC must consume this separate allocation; it must not skip, modify or pretend to satisfy the independent legacy3040000 constraint. Ordinary Development execution continues to use the unchanged legacy path.

On successful Ready binding, automatically validate immutable receipt sequence/digests, model/token fields, exact report/case/owner/stage and verified Sandbox payment for Full. Append actual-cost settlement and unused-envelope release atomically and once. Reuse applicable receipt validation from the existing reconciliation code, without manufacturing a trial or commercial binding. Missing/invalid/ambiguous receipts retain their reservation and enter intervention; they never receive an invented settlement. Retries/concurrent Ready notifications are idempotent. Historical report content remains immutable.

Prospective settlement must price validated tokens against the allocation's frozen, verified tariff/billing profile; it must not blindly treat the legacy Full receipt's2/10 `estimatedMicros` as an invoice or as the2.5/10 conservative proof tariff. Preserve the original receipt estimate separately. Count overlapping Full/proof envelopes once, not as additional spending authority.

Account for expired, unstarted acceptance cases without enabling an expired proof or falsely completing a report. Any required narrow lifecycle amendment must preserve history guards and be limited to grant-bound, disabled, unstarted cases with zero dispatches. Do not disable triggers or use a writer override to bypass validation. Rehearse the actual schema and guard behaviour before hosted application.

Verify SQL concurrency, insufficient capacity, expiry, repeated allocation, repeated Ready settlement, wrong owner/property/nonce, live-payment rejection, invalid receipt retention, crash-after-intent and unaffected legacy admission. The owner approved implementation and Development application explicitly on25 October2026. This authorisation does not claim that a migration, grant, activation or future SQL test has already succeeded. No Production deployment or migration is authorised.

### Automatic delivery prerequisite

The Development fulfilment control remains disabled and points to an old Preview, with two historical pending jobs. No old job was claimed. After allocation approval and implementation, configure only the acceptance Preview runner and existing protected scheduler, retaining its runner authentication and Vercel protection. Prove the queue selects only the bound acceptance purchase. Do not globally activate old work.

A demonstrated application wiring defect was independently corrected in PR138: the Preview runner could be enabled while `paidExecutionApproved` was still computed only from Production commercial/owner authority. The new bounded Development execution approval is also required, and the worker still validates lease, payment, supply consent, exact proof binding and budget before every dispatch. No Production authority is widened. Automated verification is reported separately; this does not prove external automatic delivery.

## Acceptance status

No new provider analyses, Sandbox purchases or fresh PDFs have been executed; incremental AI/provider spend isGBP0. Existing ordinary-customer sign-in and synthetic responsive verification remain valid evidence for their limited scopes. **NO GO** for campaign readiness until the approved allocation, automatic settlement and the requested two fresh ordinary-customer purchase/delivery/PDF journeys are actually verified. No manual report completion will count as acceptance.

## Approved implementation follow-up

Two new additive migration files define the private allocation/case/event ledger and a separately funded Full-start path. No grant or automatic funding is seeded. The original `start_sitefit_full` function is not replaced: hosted read-only preflight confirmed MD5 `79438d3c4e60a8e15542c589fcff1d91`, its3040000 ceiling and3040000 historical reservations. Development still has107 applied migrations; the proof remains disabled/issued/reserved0 and the runner disabled at preflight.

The Preview gate additionally requires a valid allocation UUID. Claim and reservation execute atomically; denied claims roll back new reservations. Dispatches from manifest-bound cases require an unexpired, non-disabled allocation and the matching stage reservation, alongside the existing provider governor. Sandbox Test v1 payment authority is limited to those cases; Live v2 is rejected for them. Other payment paths retain the actual installed guard, including later checkout-successor amendments. An initial offline test caught an obsolete full-function copy; it was replaced with a narrowly asserted condition amendment before any hosted application.

Ready settlement reads immutable report receipts, validates owner/property/nonce/stage and Sandbox payment, and uses the frozen allocation tariff with conservative upward rounding. Snapshot settlement runs when the case binds its Ready report. Full settlement and case completion run in the actual report Ready transaction; a crash before the worker callback cannot leave its reservation outstanding. The callback is idempotent. Missing/invalid receipts cannot obtain a settlement; expiry/disablement does not erase liabilities. The ledger retains both the actual cost and the unused-envelope release as separate append-only events.

Offline synthetic SQL tests cover private grants, duplicate funding and parameter conflicts, foreign owners, unpaid Full rejection, atomic failed claims, repeated reservations, immutable history, valid Sandbox admission, automatic Snapshot/Full Ready settlement, fractional-token-cost rounding, callback replay and unchanged legacy Full function. These do not prove a real provider invoice, independent multi-connection concurrency, external Stripe payment, hosted migration or automatic external delivery. Those remaining verifications must be recorded separately.

Vercel currently requires interactive email verification before editing existing Preview configuration. The existing account session independently denied another owner's Ready Full Report with the ordinary404 page. Its PDF navigation was blocked by the browser client, so that navigation is not claimed as a server-side PDF denial test.
