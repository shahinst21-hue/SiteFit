# Snapshot launch reliability review — 25 October 2026

Historical review. The completed remediation and superseding installed-release decision are in [Production verification, 26 October](production-verification-20261026.md).

The subsequent owner-authorised remediation is recorded in
[public report recovery](public-report-recovery-20261025.md), including actual
multi-connection Development proofs. The findings below retain the earlier
PR140 checkpoint; they do not claim those later changes are installed in Production.

**Broad public-launch sign-off: withheld.** The owner requests prevention of
recurring failed checks, not a new paid test, budget increase or activation.
PR140 contains the narrow correction and additional release gates. No Production
mutation or new source/AI/payment request was performed by this review.

## Actual release and operating state

This review was refreshed against main `0e9b4de` (PR139 and PR141), rather than the
older `683c7f1` audit baseline. The [commercial delivery record](commercial-launch-readiness-20261025.md)
records the separately authorised public admission, existing verified Live
purchase and one new ordinary anonymous Snapshot. The payment need not be
repeated. A recovered report does not establish uninterrupted normal generation.

Independent read-only Production observation at **17:54:54 UTC** found:

| Observation | Result / consequence |
|---|---|
| Applied schema | 110 versions; the missing-Census-operand correction is absent |
| Public pool | Customer admission and execution enabled |
| Postio dispatch journal | 34 of the unchanged 40-dispatch allowance used; no intent/ambiguous row |
| AI shared ledger | 22,220,762 microUSD available; 650,000 held; no hold reset |
| Database | 379,918,003 bytes against the existing 450,000,000-byte checkpoint |
| Analyses created in previous 24h | One failed Free v1 and one Ready Free v1; this small set is not a reliability rate |

**Six remaining uncached provider dispatches are not six customers.** Searching
and resolving an address can require separate dispatches; cached replay is
different. That owner-trial limit is now shared by ordinary public admission. It
must be resolved explicitly before broad traffic. This review neither raises it
nor purchases credits. Sufficient database space or AI budget does not remove
this independent address-admission limit.

## Defects addressed and regression boundaries

| Failure boundary | Observed verification |
|---|---|
| Missing five-minute Census operands | Real enriched engine reaches the actual SQL finaliser and evidence trigger with four withheld null values, five stored sections and Ready v1 |
| All source outcomes unavailable, salon | Normal engine stores an honest insufficient-evidence report, with no invented Demand/Competition score |
| Final save fails after AI is received | Failed checkpoint retains synthesis; engine-only replay completes with no additional mocked AI call |
| Caller cancels | No AI, final save or Ready report |
| SQL diagnostic leaks / opaque failure | Only finite reason/state codes are logged; raw SQL details, addresses and report text are excluded |
| Migration version reused on another PR | Local and CI identity preflight compares main history and migration files on all open PRs before deployment |
| Optional-provider deadline / late response | Existing collector regression persists unavailable once and refuses late replacement; caller cancellation remains authoritative |
| Unknown external cost / duplicate attempt | Existing durable proof/provider and SQL tests retain intent/holds and deny blind redispatch |

The cross-component fixture executes the actual generator, actual normal SQL
finaliser and actual evidence-integrity trigger in isolated PostgreSQL. Acquisition,
AI output, other application database transport and platform tables are synthetic;
it is not a hosted Auth/payment or multi-worker test. Full migration/RLS/ledger
verification remains a separate fresh-database suite. Engine checkpoint replay
does not reset an intervention case or grant an automatic customer retry.

PR140 originally reused `20261025120000`, already applied to Development for
PR138's separate acceptance allocation. That was a mistake in the new unapplied
correction. It is renamed to **20261025200000**; the applied acceptance migration
is unchanged. The new regression reproduces both within-branch and cross-PR
collisions, rejects edits/deletion/renaming of main's migration history, and
verifies exact Git blob identities. An authenticated read-only run checked main
and all four open PRs successfully after the correction. CI fails closed if its
inventory is unavailable or incomplete. Applied hosted history still requires an
environment-specific manifest/dry-run; GitHub alone is not proof of schema parity.

## Remaining gates before broad traffic

1. Deliver PR140 through exact-head CI, protected main integration and an approved
   Production migration/release; verify the actual installed version and function,
   then complete the saved Kingston case from its received checkpoint with zero
   new provider/AI calls. It remains paused until that real operation occurs.
2. Resolve the existing shared Postio allowance as an explicit owner decision,
   with a bounded provider-cost policy and an observed exhaustion response. Do not
   silently substitute unlimited public execution for the old trial cap.
3. Close the public saved-output recovery gap. The existing zero-dispatch
   `complete_saved_trial_free` operator requires the private trial owner and its
   confirmed owner email. It rejects an ordinary public customer's interrupted
   case before checkpoint validation. The actual public-customer SQL fixture
   reproduces `saved_completion_authority_denied` with a synthetic guest and
   rolls the probe back. The engine replay test is therefore not a customer
   recovery claim. A reviewed, tightly bound public recovery design is required;
   do not remove ownership/receipt checks or make the operator public.
4. Preserve the existing payment/receipt/delivery evidence. Test any changed
   worker paths synthetically; do not repeat a prohibited real purchase to make
   the checklist appear fresh.
5. Record two independent worker/database-session contention and interruption
   results against the current public-admission schema before scaling. Sequential
   embedded SQL and the older bounded proof concurrency results do not establish
   that full current public path.
6. Keep semantic failures visible by stage: provider unavailable, source not
   persisted, invalid AI output, SQL rejection, Ready-binding/settlement failure,
   delivery failure. An HTTP200 streaming response, successful cron SQL, green
   build or report recovered by an operator cannot substitute for Ready delivery.

Google Ads review remains a separate external decision. This reliability review
does not activate ads, change public gates or certify that failures can never
occur. Local/CI evidence for the revised PR is recorded on its exact head.

## Local verification of the revised change

Node24.12.0/npm11.6.2, existing locked dependencies. `npm run check` passed lint,
strict types, **505 tests**, the fresh PostgreSQL/PostGIS security suite and the
production build. After adding the explicit public-recovery denial probe, the
complete database/security suite passed again. Built-server `check:public` passed
16 public pages/articles and 16 internal paths; the current checker was inspected
at390px with keyboard skip-link navigation. Migration identity preflight passed
111 local files and a separate authenticated main/four-open-PR comparison.

The official Production CLI dry-run listed only
`20261025200000_unavailable_catchment_evidence.sql`, with no seeds/roles and Vault
excluded. It did not apply it. Remote CI on the revised exact head is reported on
PR140; earlier green checks are not reused as evidence for this revision.
