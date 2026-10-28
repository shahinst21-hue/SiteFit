# Customer sign-in, Checkout and mobile correction — 28 October 2026

## Authority and observed cause

Owner approves the complete bounded correction and Production delivery, including cross-device magic links, Google continuation, removal of customer OTP entry, primary mobile actions and smooth estimated Snapshot progress. Continue independently; list genuine hardware/external limitations at the end. No new plan, budget, paid AI request or real payment is authorised. The second device continues the original Snapshot; the original browser is not silently authenticated.

Live inspection found the reported 15:45 Google claim completed and a bound Stripe Session. A read-only retrieval found it expired/unpaid. Exact idempotent replay of its original, already-bound expired attempt (same key/parameters/API version, within 24 hours) returned the same Session's cached creation response: open/unpaid, `https://checkout.stripe.com/g/pay/<session>`. Existing validation accepted c/pay and f/pay only. This proves the server-side rejection after Session creation; it is not an inferred Google failure. No new Session, charge or analysis was created. Admit the observed g/pay format through the existing shared server/client predicate, preserving exact HTTPS host, port, credentials and path checks.

## Authentication and ownership

Both account email templates now send a SiteFit `/auth/confirm` TokenHash URL with the original requested return URL. GET displays confirmation only; a same-origin POST consumes the one-time token. Only allowlisted local return shapes are accepted. Purchase email return data contains a signed finite claim/report/capability/email-hash binding; no browser proof, address or session token is transferred. Google retains PKCE and its original browser checks. Previously issued ConfirmationURL/PKCE links retain their existing callback compatibility.

Forward migration `20261028170000_cross_device_email_claim.sql` adds one service-only function. The alternative email path checks the capability, exact report, intended verified email and permanent identity, then reuses existing freshness, expiry, target, ownership and immutable lineage writers under their existing lock order. It never grants the browser access to raw claims or writers. No table, queue, provider or quota infrastructure is added. Replays cannot retarget or duplicate completion. Auth success followed by database failure gets a short signed target-bound HttpOnly retry receipt; retry uses fresh verified identity without consuming the email token again.

Cross-device continuation returns the owned Snapshot purchase modal and renews consent on that device. The original browser must authenticate to the now-owned report. Expired/invalid callback recovery is branded rather than a generic missing page. Customer code entry and its verify_email API action are removed. Email delivery, rate limits, sender, one-hour OTP validity and confirmation requirements are retained; only subjects/HTML change in Auth settings.

## Mobile and progress

Move Check a Location and Account/Sign in above exploration links. Account navigation disables speculative prefetch and shows immediate pending feedback; a streamed loading boundary covers the account's verified history load. Keep Base UI Dialog/focus behavior, touch scroll and existing design tokens.

Snapshot progress is explicitly estimated: 0–90% over the first 60 seconds, then approaches a 95% ceiling. Existing actual milestones remain separately labelled. Only validated saved Ready reaches 100%; a fast result does not wait for the estimate. Error/stale states stop the timer and keep real saved progress. A 90-second wait explains the delay and warns against duplicate checks. Full Report milestone authority is unchanged. No animation dependency or processing retry is added.

## Validation and release status

Local tests cover actual Auth actions on a fresh cookie jar/device, token replay/expiry/tamper, origin rejection, account/claim binding, database-outage retry, existing Google/PKCE compatibility and consent renewal. PostgreSQL rebuild/security tests exercise the forward function, foreign email/report, stale login, rotated capability, expiry, immutable history, idempotency and client-role denial. The real g/pay response shape has a server-to-client regression with zero new Sessions. Progress uses a deterministic-clock bounded/monotonic estimate test.

At implementation time targeted journey tests and the fresh PostgreSQL suite pass. Full checks, protected CI, hosted migration verification, rollout, mobile browser and real email proof are subsequent gates; record their actual receipts in the PR. Never interpret a local preview as a received email or device emulation as a physical phone. Production state is not declared GO here.


## Actual inbox proof follow-up

The single authorised email reached the owner's Gmail inbox with the SiteFit subject, wordmark and cross-device wording. A fresh HTTP client confirmed GET did not consume/authenticate, but the page rejected the actual provider token: its TokenHash has the explicit `pkce_` prefix plus 56 hexadecimal characters. Accept that bounded provider format in the existing email-only parser and still let Supabase verify/consume it; never exchange it as an OAuth code. Add a regression for that real shape and reject malformed/oversized/repeated prefixes and other token purposes. This follow-up does not change the installed migration or email settings and requires its own protected CI/release before the same unused link can finish the actual sign-in proof.


## Invalid address bootstrap correction

Final HTTP checks created four anonymous Auth users per run before returning invalid-input errors. No provider/report/payment work occurred, and synthetic rollback fixture accounts were absent. The public address wrapper authenticated/created guests before calling its existing bounded input and rate validation. Move that existing admission into an optional asynchronous hook after method/origin/body/operation validation and the unchanged rate limiter, before provider/repository access. Invalid and limited traffic must create zero guest accounts; valid public traffic keeps the existing verified anonymous-session admission. No rate limit, Postio quota, budget or schema setting changes. Re-run the real Production invalid boundaries and compare Auth user count as well as financial/report fingerprints.

The actual synthetic browser rehearsal showed the estimate advancing while confirmed milestones stayed zero, including the long-wait message and pre-Ready ceiling. It also exposed a historical wizard CSS rule hiding the second progress footer span. Remove that rule so the explicitly promised Estimated progress label is visually present, not only in ARIA. Error states label their actual saved count as confirmed progress. This is presentation only; no execution/Ready policy changes.
