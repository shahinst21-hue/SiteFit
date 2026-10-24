# Optional source isolation and stored Snapshot recovery — 24 October 2026

Implementation candidate, not yet deployed. The owner reports retrying TW1 1RD recently; Production readback confirms that the existing owner/property guard returned the failed 22 October analysis rather than issuing another execution. The stored local attempt counter is 4, but the authoritative provider journal has zero AI intents and the failed report has zero usage receipts. This distinction is required for recovery; a local attempt counter is not billed AI activity.

## Failure isolation

The historical proof governor treated any ambiguous external dispatch as a case-wide intervention, including zero-AI-cost source retrievals. The earlier completed-HTTP-error correction did not handle unknown transport/body outcomes. The forward migration distinguishes the existing five allowlisted source hosts, Snapshot stage and zero AI reservation from AI execution. Source ambiguity remains in the immutable journal, counts against existing provider caps and cannot authorise the same request again. Adapter/collector handling persists unavailable evidence. Pending/unknown AI and unknown non-allowlisted operations remain blocking. Report completion and receipt settlement accept explicitly unavailable sources while retaining the existing ownership, tariff, processing, budget and payment checks.

## Existing failed check

Two private RLS tables provide one source-recovery identity per existing case and unique request/section dispatch slots. An owner-authorised retry can claim only an active controlled trial case with no old AI intents/receipts, all 17 frozen source snapshots, an unchanged failed-report fingerprint, and its existing unused US$0.65 reservation. No case, analysis, entitlement, payment or extra budget allocation is created. The original failed report and provider journal remain unchanged. A new version-2 report uses the same frozen analysis/input/evidence and normal Ready binding/receipt settlement.

Only the required section calls (insufficient-evidence sections are deterministic) and one synthesis are eligible: at most five AI calls, no repair retry, inside the original US$0.65 envelope. The recovery imports no collector. Optional Competition remains explicitly unavailable when it was not collected; no new Places search is made. Unknown/in-flight AI forbids redispatch; received responses can be replayed after the finite lease expires. Concurrent claims and duplicate request/slot keys are denied by case-row locks and unique constraints.

The normal verified-owner generation route detects an eligible saved failure before returning the old pause response. Recovery is not initiated by reading a report, deploying, applying a migration or polling Account. Public commercial gates and all budget ceilings remain unchanged.

## Verification

Actual Production definitions of the four affected proof/usage functions and the identity guard were read before preparing the additive migrations. No applied migration file changes. Isolated PostgreSQL rebuild tests cover source failure isolation, retained ambiguity, same-request denial, pending/ambiguous AI, owner/token boundaries, budget exhaustion, claim/slot deduplication, immutable failure records, received-checkpoint replay and Ready-binding settlement/replay. A mocked end-to-end engine test produces a report with explicit unavailable source/Competition evidence and zero source-provider requests; it is not a live AI or provider verification. Protected CI, hosted migration/deployment and actual owner retry results are recorded separately when performed.
