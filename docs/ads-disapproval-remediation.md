# Google Ads destination investigation — 24 October 2026

Owner authority: implement the approved internal investigation/hardening plan for ticket **2-9004000042132**. This is a security correction, not commercial activation or Google policy clearance. No account message or appeal is sent by this work. Preserve the current domain, consent, purchase/execution/budget gates, applied migrations and protected delivery workflow.

## Findings and limits

The support email confirms that Google's internal advertising systems still classify the destination as malicious. It identifies no offending resource, affected URL, detection time or exploit. The owner cannot currently access additional Policy details. The cause remains **unresolved**; neither a false positive nor an intrusion has been established.

Authenticated Vercel read-back after routine renewal of the existing CLI session independently identifies the current Production deployment as `dpl_BsjEAsgDDKa4p1Azra9mTWpUn6C9`, READY, built from protected main commit `2d6cdbb08290cb00aa35e6a8d1f681be7faad923`. Its retained build events explicitly record `npm ci`, zero reported vulnerabilities, detected/built **Next.js 16.4.2**, and completed build. The public application bundle separately advertises 16.4.2. This is stronger than inferring the deployed server version from local package.json alone.

The latest eight deployment records correspond to identifiable repository commits/branches. A separate authenticated read of the latest 100 project activity records covers 22 October 19:39 UTC through 24 October 13:19 UTC; every returned actor is the existing owner account. It includes 29 deployment, 35 alias, nine environment and one domain/DNS-related event, plus 26 other events. This is a bounded attribution check, not proof that every action was authorised or that the account was never compromised. Current apex/www DNS answers and working HTTPS redirects are observations, not historical registrar change logs. Historical runtime requests, registrar DNS change history and the period before the framework patch have not yet been independently reconstructed.

The existing framework correction is documented in [MVP security correction](mvp-snapshot-security-correction.md): Next.js 16.3.8 was replaced by pinned 16.4.2. The [official advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) identifies a critical image-optimization vulnerability and patched releases. A previously affected version is a real maintenance finding; it does not prove exploitation or explain Google's particular detection.

Initial read-only checks on 24 October reported zero known vulnerabilities in both runtime and full npm audits. All 278 lockfile download URLs use registry.npmjs.org, with integrity metadata; the installed-tree signature check verified 218 registry signatures and 99 attestations. These checks cover the checked lockfile/installation and available registry records, not all possible malicious package behavior. Public asset inspection found no standalone JavaScript/HTML or suspicious active SVG patterns under public/. The clean worktree installation and final validation are recorded below separately.

Public homepage/checker/404 and HTTP/www redirect checks found no unexpected iframe, meta refresh or external script in initial HTML. An AdsBot User-Agent comparison also returned the normal page; this is not a genuine Google-origin crawl. The twelve observed homepage JavaScript resources returned HTTP 200. The initial browser document contained only same-origin scripts and no iframe; that observation does not cover every consent or authenticated state.

Nominet's [RDAP record](https://rdap.nominet.uk/uk/domain/sitefit.co.uk) reports the current registration on 9 October 2026. Registration recency alone neither establishes the cause nor proves the domain never had a prior registration.

## Implemented correction

- Apply `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'` across application routes and assets. Existing private/no-store, no-referrer and noindex rules remain in place.
- Keep the CSP limited to the approved baseline: it blocks framing/plugin objects and external base-URL changes. It does **not** establish a script-source allowlist or prove that scripts are benign. A nonce-based script policy needs separate Preview validation before enforcement; no permissive wildcard or new reporting service is introduced here.
- Add `npm audit --audit-level=high` to the existing required CI job. Registry errors fail the check rather than being reported as a clean audit. No dependency version or lockfile change is required by the currently clean audit.
- Extend the existing real HTTP smoke check to verify these headers on pages, same-origin JavaScript assets, redirects, 404s and API error responses, while preserving the existing privacy/authentication/CSRF checks.

Public API bodies, database schema, report logic, indexing approval, tracking consent and release authority are unchanged. These are defense-in-depth corrections; their absence was not established as Google's disapproval trigger.

## Verification and delivery ledger

- Isolated worktree: clean origin/main base `2d6cdbb`; no .env.local or Production credential file copied into the build directory.
- Clean `npm ci` installed 219 packages and reported zero known vulnerabilities. A fresh full audit again reported zero; the clean installed-tree audit verified 218 signatures and 99 attestations. The lockfile is unchanged.
- `npm run check` passed lint, strict types, **491/491 tests**, zero failures/skips, and the Next.js 16.4.2 production build. Application credentials were removed from the command environment and no local credential file was copied into this worktree.
- The actual built server at 127.0.0.1:3016 passed `check:public`: 16 pages/articles, 16 internal paths and 15 same-origin scripts, including headers on redirects/404s/API errors. `check:measurement`, `check:marketing` and the production Snapshot UI denial probe also passed. These local probes used no provider, report, AI or payment execution.
- Browser checks of the hardened local build covered the honest unconfigured login state, cookie preferences, Escape/focus return and emulated 390/1280px layouts without horizontal overflow or observed browser warnings/errors. This is not a new hosted sign-in or physical-device proof.
- A separate bounded browser check of the existing Production login preserved the existing authenticated session. Initially saved optional consent was denied; no external script appeared. Granting Analytics and Advertising with Personalization off added only the official googletagmanager.com loader to the observed script origins. Withdrawal refreshed the document, removed external script elements and restored all three choices to their original denied state. No browser warnings/errors or iframes were observed. This is a DOM/script observation, not a complete transitive network capture or Ads receiving proof.
- Generated-asset inspection at 18:46:19 UTC examined 29 local client JavaScript/map files (zero .map files) and all 12 homepage Production scripts (zero advertised source maps). Comparison against 12 privately held local secret values plus private-key patterns found zero matches; values were neither printed nor copied into application files. SHA-256 asset inventory and command/screenshot evidence remain outside Git under the local Codex temporary evidence directory. Lack of an advertised map does not prove no unlinked map exists.
- Protected PR/CI and any new deployed header verification are separate delivery receipts; the local results above do not assert those external gates have passed.
- Existing Vercel account read-back reports Hobby. [The release record](mvp-release-20261023.md) retains the commercial deployment hold. This patch does not establish hosting eligibility or change account plans; Preview/security delivery must preserve that boundary.
- Google review: not requested, not approved. Technical validation and advertising-policy approval are separate outcomes.

## Draft follow-up — not sent

Subject: Technical investigation details requested — case 2-9004000042132

Hello Srilekha,

We are investigating sitefit.co.uk from the application source, dependency chain and hosting configuration. We are not assuming that the disapproval is an error.

We independently verified the currently served deployment and its retained build logs: Next.js 16.4.2 is deployed. We also obtained clean npm vulnerability results and verified package registry signatures. These checks do not rule out every possible compromise or replace your internal advertising assessment.

Your message does not identify an offending resource. Could the specialist team provide any shareable affected URL, script/resource URL or domain, redirect chain, last detection timestamp, and whether the finding concerns currently served content or historical observations? Please also clarify whether the malicious entity is sitefit.co.uk itself or a resource it loads or links to.

We will use that information to reproduce and remediate the finding before requesting a further review. The additional browser-hardening changes described in our investigation are defense in depth; they are not evidence that your finding has been resolved.

Thank you.

## Review procedure

Use the existing case and the actual affected ads. After any demonstrated correction is deployed and independently checked, follow [Google's Compromised sites guidance](https://support.google.com/adspolicy/answer/15938376?hl=en). Describe actual changes accurately; do not claim that clean Safe Browsing, dependency audits or header additions establish policy compliance. Retain the exact deployment/time/evidence and any newly supplied indicator. Keep campaign activation and any outgoing correspondence separately authorised.
