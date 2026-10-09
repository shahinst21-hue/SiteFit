# Phase 10 status

Implementation in progress under D82. Not complete.

- 10.0: owner amendments recorded; completed Phase 9.5 merged into branch without altering completed report data. Baseline storage, fingerprints and available credits pending actual verification.
- 10.1–10.9: pending.
- Provider review: both existing endpoint contracts inspected; valuation requires GIA for retail/restaurants while benchmark methodology can use NIA. No basis conversion or invented selected-unit area.
- Live Phase 10 provider requests executed: zero; approved cumulative ceiling six credits. No purchases/subscriptions.
- UI unchanged and not approved for launch. No Financial Engine form/calculations in report interfaces. No Phase 11+ work.

## Verified checkpoint

- 10.1–10.3: closed decimal/provenance/units contracts, exact rational contribution/break-even/customer qualification/profit/owner/calendar capabilities implemented. Independent three-concept arithmetic, mixed VAT £12 basket → £11 net, missing/zero/negative cases pass.
- 10.4–10.5: both existing PropertyData rent contracts supported; preserved margin, qualified benchmark and incompatible-area fallback; source-first illustrative prepopulation, validated edit/AI-proposal boundary and four bounded stress calculations implemented. No paid AI call or final UI.
- 10.6: forward migration applied in development; fresh and hosted ownership/entitlement/source/parent/property/replay/mutation/refund rollback suite passes.
- 10.7–10.8: actual kernel/scenario output frozen/replayed through hosted synthetic paid Test rollback fixture; no real charge or customer-data modification. Independent rental-only preparation reuses owned source checksum/context; stored-only Phase 9.5 references retained without financial assumption. Full service/Preview/security final regression still in progress.
- Three concept/four stress calculation latency: coffee 10.29 ms, restaurant 4.36 ms, salon 3.36 ms; result size about 48 KB each. Hosted stored read: 100 samples, p95 0.517 ms (database execution, not internet SLA).
- Database baseline 374,265,523 bytes; after migration and rollback proofs 374,396,595 bytes, +131,072 bytes; economic table/TOAST 114,688 bytes, indexes 65,536 bytes. Still below 375 MB checkpoint; no upgrade.
- All 28 ready report fingerprints unchanged.
- Live provider spend: one credit of six, account balance 281 → 280 after valuation proof. Existing rents-commercial result reused without request. Valuation protocol proof uses synthetic office area only; selected units without compatible area remain benchmark-only. No purchases/subscriptions.
- npm ci initially hit running Next native-library lock; stopped only root local production server and retry passed, audit zero vulnerabilities. Final regression/protected CI/merge pending.

Remaining delivery gates: final check/public HTTP, changed-source/client-artifact secret scan, protected Preview boundary, exact-head required CI, protected merge and post-main CI. No new customer UI or 200% acceptance is claimed. The Financial Engine remains an internal capability; final separate interactive UI and Full Report generation/PDF are later work. No final launch approval is implied.

## Final implementation validation before protected delivery

Node 24/npm 11 npm ci passed (zero audit vulnerabilities). Final npm run check passes lint, strict types, all 257 tests and production build. Fresh database suite includes Phase 10 rollback security; hosted counterpart and actual-kernel storage/replay proof pass. Production-server public HTTP passes 13 pages/articles, 13 internal paths, SEO/404 and safe address-route boundaries. Eight configured private values have zero matches in 23 changed files and 20 client artifacts. No new customer control, financial route, provider activation or Production purchase is introduced. Main protection remains strict with required Lint, types, tests and build and enforced administrators. PR #28 remains the protected delivery gate.

### Definition of Done

- [x] Owner amendments, separate-engine scope and six-credit permission recorded (D82).
- [x] Steps 10.0–10.8 implemented and verified within revised backend scope.
- [x] Deterministic coffee/restaurant/salon contribution, break-even, trade/customer qualification, surplus and stress calculations meet independent examples.
- [x] Missing/zero/loss, VAT/cost/owner basis, provenance and illustrative prepopulation remain explicit.
- [x] Both existing rental endpoints evaluated/supported; actual valuation shape verified; compatible GIA required, benchmark-only fallback without a form. Historical unadmitted benchmarks unchanged.
- [x] Separate rental-report contract contains no financial calculations; Phase 9.5 references reused without upgrading rights or evidence.
- [x] Private immutable context/run/parent/source lineage, replay, ownership/entitlement/refund gates pass fresh and hosted.
- [x] Actual storage/lookup/kernel measurements and unchanged 28 historical reports verified.
- [x] Required regression/build/public/secret gates pass; no new UI/user acceptance is claimed.
- [ ] Step 10.9 exact-head required CI, protected Preview boundary, merge and post-main CI verified.
- [x] No purchase/subscription/new provider, final Financial Engine UI, Full Report/PDF generation, scoring/prompt calibration, Production activation or Phase 11+ work.

### Limitations and proportional implementation choices

Operating costs, margin, spend and trade are explicit product illustrations unless replaced by sourced/qualified/user assumptions. They are not London business measurements or predictions. Fixed-cost capture is aggregated into rent, fully loaded staff and explicitly inclusive other costs; final separate interactive UI is deferred as instructed. Natural-language/AI adjustments enter a validated edit contract; no new paid AI execution or Phase 12 interpretation is enabled. The live valuation proof is an office-area protocol example; it is not selected-premises evidence. No compatible GIA is manufactured from EPC or NIA benchmarks. Selected properties can receive qualified local rental context while property valuation remains unavailable. Report generation/PDF consumption occurs in later separately approved phases. PropertyData trial is temporary; renewal and continuing launch licensing remain separate owner decisions. No browser redesign/launch acceptance or new real Stripe ceremony is claimed. These choices implement the owner amendments, not silent DoD weakening.
