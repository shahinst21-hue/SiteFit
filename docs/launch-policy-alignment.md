# Launch continuation — database policy alignment

17 October2026. Owner authorises continuing the existing launch plan without repeating accepted decisions. No spending, new source/AI requests, real payment, commercial activation, subscription or Production deployment. Phase15/16 remain closed.

## Hosted staging completed — 17 October

Reviewed PR61 merged into gated Development at `a11aa493305bbd62a550bd81148a7d98b086f527`; exact-head and post-merge CI passed. Only `20261016220000_launch_policy_review.sql` was subsequently applied, first to Development `idlsjusbrmyucccostxt`, then exact-target-verified Production `vsfkkroxgntoumoqcfcy` / `sitefit-prod`. Each operation used one transaction and one dispatch, with lock/statement timeouts, capacity/gate guards and the existing migration-history recording procedure. No unrelated migration or retry ran.

Both hosted histories now contain78 migrations. The complete stored snapshot equals `launchPolicySnapshot()` with canonical digest `20866ca8a8d552cea3f3cdee0082dc5d2a34fa39cb9567488aae0934a74ebc77`. The row remains **approved:false**, `digital_content`, `manual_zoho_pdf`, £29 and30-day access from Ready. Staging is not legal publication, supply approval or application deployment: Production application remains9259; newer shared review text has not been deployed there.

Before/after checks passed for all historical policies and migration entries, report/contract/Auth-user/source-release/Storage-metadata fingerprints, existing RLS/private grants and disabled database commercial/runner controls. Development retains16 source releases; Production retains14. Database sizes after staging: Development378,295,987 bytes, Production365,442,739 bytes, both below450,000,000. These metadata checks do not claim a new sign-in, Storage binary restore or full disaster-recovery rehearsal.

Recovery: the insert and history record were atomic; transaction failure would roll both back. An application rollback can leave this inert unapproved row in place. Prior policy snapshots and protected-data fingerprints were captured privately before execution; no prior record was overwritten. Do not delete applied history or approve the row as a recovery shortcut. This narrowly scoped recovery evidence does not close the independently recorded hosted/Auth/Vault/Storage restore limitation.

Private ignored receipts: `supabase/.temp/policy-{Development,Production}-{preflight,postflight}.json`, `policy-{Development,Production}-applied.json`, and `policy-alignment-hosted-verification.json`. No credentials, customer data or raw private receipts are committed.

The subsequent read-only Vercel metadata recheck returned403. Its previously saved assignment result is historical evidence, **not** a fresh successful check. No credential, environment variable, deployment or gate was changed in response. Authenticated Vercel access is required before another deployment/environment verification; public HTTP availability cannot prove private environment values.

## Implementation

PR60 merged normally at `e02d043d5df0a21bb296af54db6afcfb015297d1`; both post-merge CIs succeeded. Protected Preview `dpl_AS9ihdK3fDZZqAC6PfzjRJW3wqjc` Ready on that SHA; actual Terms checked. Production remains9259. Synthetic received MIME/PDF hashes and private Storage round trip are complete, not pending owner decisions. [Receipt](stage1-contract-readiness.md).

Forward `20261016220000_launch_policy_review.sql` adds one complete `sitefit-sale-v1-20261016-review` row with **approved:false**, `digital_content` and proposed `manual_zoho_pdf` channel. Tested application/database candidates match exactly. No earlier policy, contract, report, source, grant, trigger, release control or historical consent is changed. It does not authorise supply.

The source is `launchPolicySnapshot()`. `node scripts/payments/check-sale-policy.ts` checks the entire migration against that source, including rejecting extra SQL; it prints version/digest/false approval with no network/writes. Canonical snapshot digest `20866ca8a8d552cea3f3cdee0082dc5d2a34fa39cb9567488aae0934a74ebc77`, distinct from the formatting-dependent export-file hash. Future text changes need a new version; never regenerate applied history.

## Actual verification

- `npm run check`: lint/types,369/369 tests, production build pass. Locked dependencies unchanged; existing successful `npm ci` reused.
- Actual isolated PostgreSQL rebuild compares inserted JSON with the application's full snapshot, verifies no approved policy and unchanged disabled commercial controls, and runs existing security/queue/idempotent receipt/access/Ready/recovery suites.
- Hosted **Development-only** rollback probe explicitly targets `idlsjusbrmyucccostxt`: insert candidate transactionally, verify complete fields/false approval, denied browser table/RPC and denied service policy UPDATE, then rollback. Historical report/contract fingerprints and policy count unchanged. Private receipt: `supabase/.temp/review-policy-development-proof.json`.
- Historical preparation result: hosted histories had not yet been applied at the PR61 preparation checkpoint. The17 October staging record above supersedes that status; it does not change the earlier test result.
- Zoho DPA account read rechecked after file handoff; it still requires sensitive-operation password re-verification. No password entered, agreement signed/requested or account fact invented. Published documents/access limitations remain recorded without another broad investigation or questionnaire.
- Existing offline proof budget produces US$0.8615 AI estimate/proposed US$0.90 allowance under its stated16 October tariff assumptions. Not spending authority or an all-in fee. Actual provider rights/quotas, billing profile and Stripe fees remain unverified. Historical reservations untouched.

## Remaining sequence

1. Resolve actual-account processor/DPA/transfer evidence and existing scoped rights-operation limitations; never label missing checks passed.
2. **Completed:** stage only the reviewed unapproved row following target/capacity/history preflight. Later final text/channel publication and commercial approval remain separate; no switch is bundled here. Restore authenticated Vercel metadata access before release verification.
3. Retain confirmation-pending queue and actual purchaser PDF/email receipt before supply. Synthetic delivery proof is not a real purchaser receipt. Runner, AI and public collection remain off.
4. Enumerate the selected case, exact source operations and separately bounded spending authority before one genuine£29 proof; no automatic retry.
5. After the real end-to-end proof, complete the already requested detailed all-page UI/UX pass, then separately authorised limited launch/campaigns. No redesign begins now.

Result: matching unapproved policy **hosted staging verified**, commercial activation **NO GO**. No repeated vote on seller/address/price/refund/access/retention/formation. Hobby/Fluid and Supabase plans unchanged; internal hosting contractual limitation is not provider commercial approval.
