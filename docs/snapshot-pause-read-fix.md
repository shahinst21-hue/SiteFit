# Saved Snapshot pause read — 19 October 2026

The initial progress preflight incorrectly selected `controlled_proof` directly.
Production correctly denies SELECT to `service_role` on that table, so the
preflight failed closed before returning the four saved sections (75%).

Migration `20261019120000` adds one service-only, read-only definer RPC. It verifies
active trial/owner authority, joins the exact property, concept and original nonce,
and returns only the bounded progress/error summary for an interrupted case.
Direct table grants remain denied. No report, dispatch, reservation or authority
is changed. The application uses this RPC rather than direct table reads.
Rollback is application rollback plus dropping the new unused function; there is
no data migration to reverse. Actual failed-case recovery remains separate.
