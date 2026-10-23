# MVP Snapshot and security correction — 23 October 2026

Owner authority: investigate TW1 1RD, fix demonstrated defects, verify and deploy scoped corrections; prepare Google Ads while every campaign remains paused. No payment/measurement activation, budget increase, new paid infrastructure or unnecessary provider execution.

## Existing TW1 1RD evidence

Production records identify analysis dbf3e641-0d0d-42b9-a6bb-84f550c43e07 and failed free report 5c0ce79d-a3c8-4707-a8d8-6e7a33f25091 (22 October, 19:05 UTC). Sources persisted. EPC dispatch became ambiguous; the case entered intervention. All four subsequent section attempts were rejected before AI admission: zero AI dispatch records, zero usage receipts, zero case AI reservation. The analysis row's collecting status is not evidence of active work. No new Snapshot or provider call was triggered by this investigation.

25% means two of eight confirmed milestones: sources complete, section interpretation next. It is not a time estimate. Historical Vercel runtime logs for the exact window are outside Hobby retention; the original HTTP/transport cause cannot be reconstructed from the stored generic EPC error. No claim is made that a specific EPC HTTP status occurred.

## Demonstrated defect and narrow correction

The controlled provider transport previously treated every non-2xx source response as an unknown execution, including an ordinary completed EPC 404/429/503. That poisoned the whole case before the adapter could classify missing/unavailable evidence. Recorded fixtures reproduce this defect. Completed, fully bounded non-AI responses now retain a received digest and their original HTTP status for adapter handling. They are not successful source evidence. No retry is introduced. Unknown network/body/settlement outcomes and all failed AI HTTP calls remain ambiguous, retain history/reservations and deny redispatch. No SQL authority or spending guard changes.

Terminal Snapshot copy now states that the check could not complete and offers saved-status/support recovery. A 25%-then-error stream fixture verifies a terminal error, no Ready and no second dispatch. Existing TW1 intervention/history is not reset and has not become Ready; recovery remains subject to reconciliation of its unknown historical dispatch.

## Security

npm audit identified Next.js 16.3.8 within GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r and GHSA-673q-mjm6-r5xr. Official advisories list patched 16.4.1; registry recommends current 16.4.2. Next and @next/env are pinned to 16.4.2; install audit reports zero vulnerabilities. No evidence of exploitation is asserted.

Live apex HTTP redirects to HTTPS; HTTPS homepage returns 200 with same-origin script resources and no unexpected iframe or meta-refresh redirect. Safe Browsing reports No unsafe content found on 23 October. The www hostname has a certificate-name mismatch; the ad destination is the working apex. Search Console Domain Property access is unavailable in the two existing relevant accounts; owner input requested. Google Ads labels remain distinct from proof of compromise.

## Verification / delivery

Targeted controlled-transport, EPC and progress tests: 17 passed. Clean npm ci and full npm run check passed: lint, strict types, 486 unit tests and Next.js 16.4.2 build. Protected CI, merge and production deployment remain pending until their actual receipts are recorded. Production payment/measurement/public sales gates remain unchanged. Google Ads appeal must reflect observed evidence/remediation and must never activate the paused campaign.

