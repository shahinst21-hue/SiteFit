# Postcode catchment and map recovery — 19 October 2026

The affected Ready Snapshot 80505e46-f2d2-4bcc-9800-35e0910edd0d retained a verified Postio postcode centre but no exact OS building match. All walking/native catchment sources were therefore stored as unsupported/insufficient_precision, leaving residentialCatchment null. This was data collection eligibility, not a delayed loading component.

New collections may use a provider-verified Postio postcode centre for contextual walking geometry and dependent ONS/Overture operands. Building identity, UPRN, premises/planning checks and station entrance routing retain their stricter requirements. Origin precision is preserved in source metadata, score, maps, Full Report and PDF. Existing v1.0 scoring and budgets are unchanged. Forward SQL guards reproduce topology and native operands with exact frozen-origin/release/parent binding. Historical Ready reports/source records are not edited or refreshed on replay; absent historical walking data cannot be reconstructed from an output-area count.

Map diagnosis confirmed the Production display flag and one valid Geoapify tile response. The UI removed all street tiles after any single image error, while a transient server failure was cached for an hour. Successful tiles now remain visible, failed responses coalesce for ten seconds, and a customer may explicitly reload the street map up to twice after the cooldown. No automatic external retry or source refresh is added.

Validation and release are recorded in the protected PR, hosted rollback receipts and deployment receipt. No payment is initiated.
