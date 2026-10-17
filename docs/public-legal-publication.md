# Public legal publication boundary — 17 October 2026

Owner-authorised narrow Development correction after the conditional Production release preflight stopped. No phase reopened, product redesign, provider call, payment, database change or deployment authorised by this correction.

## Smallest safe change

Read-only Production inspection confirmed the personal seller address is currently visible on `/terms`, `/privacy` and `/contact` at9259ef9. It is also included in the newer private review wording and the former client purchase disclosure. Hiding one paragraph would not prevent client dependency-graph exposure.

Public identity remains **Shahin Shahmir, trading as SiteFit**, with the existing support/privacy email. `legal/publication.ts` contains only public-safe identity and two explicit false approvals: legal publication and seller disclosures. No environment override can grant approval. Terms/Privacy withhold full review wording while these approvals are false, showing a non-commercial availability notice/contact; Privacy retains the existing factual account/essential-cookie explanation and rights-request channel. Contact no longer renders the address.

Purchase disclosure is now server-gated. The existing consent form is preserved as a client component receiving wording only after explicit publication/disclosure and sale-policy approval. Unapproved pages receive no draft contract or address props. Public-safe version identifiers are separated from the private snapshot module, preventing PurchaseButton's sale-policy import from pulling private policy/address values into the client graph. `requireApprovedSale()` also checks publication/disclosure authority; the existing sale policy remains approved:false.

No address value, stored snapshot, private contractual wording, PDF source, historical consent, receipt, policy version or migration history was changed. The complete private review snapshot retains canonical digest `20866ca8a8d552cea3f3cdee0082dc5d2a34fa39cb9567488aae0934a74ebc77`; the existing exact SQL/source comparison and frozen PDF tests remain mandatory. Old stored contract PDFs continue to use their original frozen wording.

## Verification and delivery

Local `npm run check` passed lint/types,375 tests and build. Actual server-rendered Terms/Privacy/Contact and withheld purchase disclosure tests retain the seller name, reject address/unpublished wording and preserve the future form's exact supplied labels/initially unchecked controls. Private PDF and exact historical snapshot/migration tests pass. `check:public` now checks all public HTML and built client JavaScript/source maps for personal-address exposure and unpublished formation/delivery wording. Actual local HTTP, metadata/404/private indexing/campaign and blocked Snapshot checks passed with zero generation.

Deliver this correction through a CI-only PR using the existing `codex/stage1-contract-readiness` branch, already excluded from Vercel automatic deployments. Its old head is an ancestor of the current Development base; use a normal fast-forward push, never a force push. No project/environment/deployment setting is changed. Do not merge into an auto-deploying branch or deploy until separately authorised. Exact corrected commit/CI and fresh full Production preflight receipts belong to the PR/private delivery record.

The full release comparison remains9259ef9 → corrected target, including the already staged unapproved policy and still-pending controlled-proof migration20261017120000. Production remains on78 migrations and its existing deployment until separate permission. No additional migration is introduced by this correction. The proof migration hash remains `5bc41068e6f8c2b90d4be1c9040591038e2beaea928c9049a8f39bc34452663a`; aggregateUS$0.95 includes Full'sUS$0.30 sub-limit, with all execution/publication/sale flags disabled.

## Remaining commercial blocker

This is a non-commercial publication boundary, not approval/certification of a final privacy notice, seller disclosures or sales terms. Removing a personal address does not fulfil mandatory geographical seller-disclosure requirements for future sales. A separately authorised lawful public disclosure and final approved publication must precede commercial Checkout; no address is invented and private contractual records are not redacted. Existing processor/account/source/tariff/spending/controlled-case gates remain. Production will continue to display the current address until a separately approved corrected release is actually deployed; no removal from the live site is claimed here.

Private evidence under ignored supabase/.temp includes `public-legal-existing-exposure.json`, `public-legal-check.log`, the corrected-target Production preflight and delivery receipts. Do not commit customer records, addresses from account responses, keys or private preflight files.
