# Test results and evidence ledger

Date2026-10-24. Node24.12.0/npm11.6.2 on Windows. Baseline and revision drift are defined in [strategy](test_strategy.md). Private raw operational evidence stays ignored in `.vercel/`; only sanitised conclusions appear here. No credentials, connection strings or customer payloads are included.

## Executed checks

| ID | Environment / method | Expected | Actual / result | Reproduction or local evidence |
| --- | --- | --- | --- | --- |
| BASE-01 | Local baseline full suite | Existing assertions pass | **491 pass,0 fail,0 skipped**,168.331s | `npm test`; `.vercel/independent-unit-baseline.log` |
| BASE-02 | Local ESLint | No warnings/errors | PASS, exit0 | `npm run lint`; `.vercel/independent-lint.log` |
| BASE-03 | Local strict types before new acceptance tests | Type generation/compiler success | PASS, exit0 | `npm run typecheck`; `.vercel/independent-typecheck.log` |
| BASE-05 | Final local lint and strict types, including audit probes | No warnings/compiler errors | PASS both exit0 | `.vercel/audit-final-lint.log`, `.vercel/audit-final-typecheck.log` |
| HTTP-02 | Keyless local completed production build on3052 | Public smoke succeeds without provider work | PASS16pages/articles+16internal paths, metadata/404/legal/privacy and four safe API boundaries | `node scripts/check-public-site.ts http://127.0.0.1:3052`; `.vercel/audit-local-public-http.log` |
| BASE-04 | Local final build with DB/provider keys explicitly blank | Complete optimised build | PASS exit0, complete route output after audit fixture tuple correction | `.vercel/audit-final-build.log`; first build caught the harness type error described below |
| CI-01 | GitHub API, former main2d6cdbb | Mandatory check green | PASS | `Lint, types, tests and build`,completed/success |
| CI-02 | GitHub API, current main683c7f1 | Mandatory check green | PASS | Current commit check completed/success; PR137 adds dependency audit |
| GEO-01 | Local geospatial/scoring/economics targeted suite | Deterministic safeguards hold | 36 pass; overlaps BASE-01 | See location audit; not36 extra unique tests |
| SEC-01 | Local auth/checkout/webhook/reversals/measurement | Wrong ownership/signature/amount cannot grant | 52 pass; overlaps BASE-01 | See security audit; no live payment |
| REL-T01/02 | Local provider deadline/recovery/continuation | Document known state transitions | 44 pass; overlaps BASE-01 | See failure register; fixtures, not Production faults |
| GEO-02/03 | Seeded independent metamorphic checks | Monotone score, deterministic thresholds | PASS3,000 assertions+64 boundary cases | `node --conditions=react-server tests/qa/score-invariants.mjs`; seed2401024 |
| QA-01 | New desired-behaviour acceptance probe | Nonproduction writable path refuses Production target | **FAIL**; mixed configuration accepted | `node --conditions=react-server --test tests/qa/campaign-readiness.test.ts` |
| QA-02 | Same isolated acceptance probe | Empty response alone cannot assert coverage | **FAIL**; result ready100 and coverageVerified | Same command; `.vercel/audit-acceptance-probes.log` |
| GEO-05 | Independent contract adversary | Accepted residential provenance also valid for Recommendation | MISMATCH reproduced: empty arrays accepted by first, rejected by second | No demonstrated customer input exploit; location audit |
| QUALITY-01 |3 historical full dashboard fixtures | Bound fact references |330 references,0 unbound,0 duplicate source IDs | References are not independent claims of factual truth |
| HTTP-01 | Existing read-only public smoke against live domain | Entire script succeeds | **FAIL** at address malformed-body assertion403 versus400 | `node scripts/check-public-site.ts https://sitefit.co.uk`; `.vercel/audit-public-http.log` |
| OPS-01 | Production explicitly read-only SQL | Ledger coherent, no stranded active holds | PASS at observed instant; details below | `.vercel/audit-operating-state.sql/json`; transaction rollback |
| OPS-02 | Production read-only capacity/migrations/cron | Current history and bounded headroom |107 local=107 applied; no missing/unapplied versions; active5min job;288 SQL job successes/24h | `.vercel/audit-capacity.sql/json` |
| DEP-01 | npm registry production dependency audit | No known advisory | PASS0 reported vulnerabilities | `npm audit --omit=dev --json`; `.vercel/audit-dependencies.json`; not malware certification |
| UI-01 | Live homepage/checker, current browser session | London/pricing/limits visible | PASS wording observed, £29 one-off, supported categories | Actual browser AX/DOM; no analysis submission |
| UI-02 | Live manual form, empty submission | Accessible errors, no provider request | PASS specific line1/city/postcode errors and focus line1 | Existing browser session; no valid address persisted |
| UI-03 | Live stored W6 report replay | Summary/decision/details agree | PASS52Moderate/33Limited; counts3/21/37; caution; no horizontal overflow at actual1280px | `.vercel/audit-saved-report.png`; old saved report, not fresh collection |
| UI-04 | Browser viewport request390px | Actual viewport390 | **BLOCKED** override returned but DOM remained1280; no mobile pass claimed | `.vercel/audit-report-390.png` is1280 evidence despite filename |
| UI-05 | Keyless local isolated interface | Browser reaches current local app | **BLOCKED** localhost and127.0.0.1 connection timeout | Local Next startup succeeded; no bypass attempted |
| UI-06 | Live checker prior to consent acceptance | No Google script loaded | PASS observed Google script list empty | Existing session, not fresh-storage or full network assertion |
| ENV-01 | Effective local env preflight, values not printed | Writable tests target isolated DB | **BLOCKED fresh runs**: Production target true; privileged key present; VERCEL_ENV absent | Sanitised boolean preflight; no remote mutation |
| ENV-02 | Owner-unlocked Vercel Preview public URL + live Development read-only schema | Current code/schema contracts exist in isolated target | **FAIL/BLOCKED fresh runs**: distinct Development confirmed but98migrations versus107, Competition claim/table and current extent/recovery absent | `evidence/development-preflight.json`; REL-05; no provider dispatch |
| UI-07 | Actual live Competition modal | Coverage wording matches valid three-band evidence | **FAIL** `partially available` inferred from one snapshot ID, although snapshot covers all three bands | `evidence/competition-evidence.png`; failure register |
| UI-08 | Actual753px existing report tab | Modal closes with Escape and returns focus | PASS focus returns `evidence-market-position`, no horizontal overflow | Actual measured753×716; not390px or real Safari |
| UI-09 | Existing consent session, Reject all then refresh/reopen | Choices remain off, no Google loader | PASS all optional boxes off, Google script list empty, no captured error logs | `evidence/privacy-preferences.png`; not acceptance/fresh-context proof |

Unique automated Node test accounting: existing491pass + new3fail =494 test cases executed. The UI-07 probe initially timed out at30s; rerun with120s completed actual rendering in13.923s and failed the expected coverage-label assertion. Its timeout is not counted as an additional product defect or unique test. Role-specific repeats are not summed. Additional assertion groups, browser checks, SQL reads and CI observations above are separate units; no misleading all-tests percentage is presented.

## Production operational readback

OPS-01 observed at13:42:50UTC: original AI limit$10 + one append-only$13.39 adjustment = **$23.39 effective**. Settled$0.492003; active reservations$0; available$22.897997. Reserve events$13.40 = release events$12.907997 + settlements$0.492003. Adjustment count1. These are global owner-trial figures, not new audit cost.

Trial enabled/unexpired, checkout/execution enabled for controlled owner; snapshots16/fullReports3. Commercial DB control mode live and checkout/execution flags true **do not establish public activation**: application release authority remains false and owner restriction is separate. One fulfilmentReady, proof states14snapshot_ready/3intervention/1complete. Counts are states, not an unbiased reliability rate: retries and historical failure conditions differ.

OPS-02 observed19:14:30UTC: database378,574,515bytes; margin to documented450,000,000 internal checkpoint71,425,485bytes. This is PostgreSQL physical size, not provider billing/storage quota equivalence. Cron active every5min;288 SQL executions succeeded in24h. SQL success does not prove every asynchronous HTTP response or fulfilment delivery succeeded. Fulfilment runner/secret configured; protection secret absent is not automatically an error for the public Production endpoint. No secrets or runner URLs exported.

## Blocked/unverified critical acceptance

Fresh genuine location analyses **0**; fresh paid test purchases **0**; current authorised customer PDF downloads **0**. No current cross-account live RLS experiment, fresh-browser consent sequence, real mobile hardware, multi-session DB concurrency, isolated chaos/load or full external GA4 receipt verification. These are not labelled passed. Historical evidence and fixture PDF success remain separately described in the quality audit.

Incremental paid provider/AI cost **£0/$0**. Existing AI historical two-run total$0.059721 is not an audit run cost or complete unit-economics estimate. No budget increase, live payment, migration, deployment or advertisement change occurred.

## Final audit-harness validation

The added polygon fixture initially inferred arrays too broadly and caused strict TypeScript/build validation to fail. Its tuple type was corrected in the audit test only, and `npm run typecheck` then passed. This introduced-and-corrected harness error is not attributed to the application baseline. Desired-behaviour assertions remain unchanged and failing. Both files are intentionally explicit-run audit probes; no existing production test was weakened.

Final `npm run build` completed with exit0 after that correction. The two initial acceptance probes failed again on rerun. The later third UI probe failed the actual rendered-label assertion on its completed rerun. Explicit-run audit probes are outside the established npm test glob, but included in strict TypeScript checking.

Final local public smoke passed against the keyless production server:16 public pages/articles,16 internal paths, metadata, JSON-LD, sitemap, robots, social image,404s, legal/client-asset privacy and four safe address-route boundaries. This contrasts with the Production403 failure and supports the environment-policy explanation rather than a generally broken address endpoint. The localhost browser timeout was specific to CUA access; shell HTTP reached the local server successfully.

## Development preflight follow-up

The owner completed the Vercel email verification requested during the audit. Preview origin was then confirmed as the distinct Development project. An explicit `BEGIN TRANSACTION READ ONLY`/`ROLLBACK` query against that target succeeded without credentials being printed. Database382,662,323bytes;98versions applied,9missing relative to the107-version repository/Production. No Competition claim/table, no extent read and no source-recovery table. A generic catchment measurement exists, but the latest coverage migrations are missing. Therefore the missing access confirmation was resolved; fresh execution remains blocked by a concrete schema mismatch, not by an unanswered approval. No migration or report was created.

## Revision drift evidence

At the later live read, Vercel project overview assigned `sitefit.co.uk` to Ready deployment `6Ay4Y5riwAw3SwHKX5pyewyUGend`, source main `683c7f1847d0748e39d5005ca5d2cb1c25628d97`. Previous BsjEAsgDD deployment was Stale and no longer listed the custom domain. GitHub current main CI completed/success. Comparison from2d6cdbb has exactly4 files: CI workflow, new Ads document, next.config security headers and public smoke script. No scoring/payment/data/consent code changed. Local baseline findings are therefore scoped to unchanged modules, not an assertion that the current entire deployed build was rerun locally.
