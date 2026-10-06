# Phase 7 Preview ingress — proposal, not authorised or implemented

## Observed blocker

On 2026-10-06 the owner approved a temporary Stripe Test automation bypass subject to redaction verification and confirmed Preview callback allowance. A separate temporary token was created privately, existing tokens/protection preserved, and a controlled unsigned POST reached the application's safe HTTP 400 response. Actual Vercel request metadata omitted the token/query. The token was then revoked and a further request returned HTTP 401.

A dashboard-created Stripe Test destination used a **dummy, non-credential** query value, not the real token. An official synthetic `checkout.session.completed` event produced a protected HTTP 401 response. Stripe's actual delivery log retained the response's `protection.vercel_auth_callback`, which contained the URL-encoded original query. This demonstrates an authentication-failure logging path that does not redact the query. It does not claim that a successful, valid-token delivery was tested or that a real credential was exposed. The dummy destination is disabled; its safe screenshot is retained in ignored development evidence. No distinct real Preview webhook signing secret has been configured.

Approved plan §13 explicitly makes unsafe query logging a Preview proof blocker. Continuing with the URL-secret method would not satisfy the conditional approval.

## Proposed narrow alternative for owner review

Use one temporary Stripe Test webhook relay, for example a Cloudflare Worker on its Free plan, with a public URL containing **no credential**. This is a proposed response to a concrete ingress blocker, not deferred workflow infrastructure.

- Accept only POST on one fixed path, bounded to the existing 64 KiB raw-body limit.
- Verify Stripe's signature and timestamp before forwarding. Reject other methods, unsigned/invalid requests and unexpected query parameters.
- Forward the identical raw bytes and Stripe signature to the exact protected branch webhook path using the Vercel automation token in the **recommended header**, never a URL. Refuse redirects and arbitrary upstream destinations.
- Keep the existing SiteFit signature, Test/account/version/provider binding checks and atomic database receipt/access reducer authoritative. The relay never grants access or interprets payment state.
- Store only the Test webhook signing secret and temporary bypass as private relay secrets. No Supabase, Stripe API, user session, provider or AI credentials; no database, queue, durable objects, retry engine, cache or event storage.
- Return a small generic response mapped to the upstream status; do not forward authentication bodies/headers, log raw payloads/URLs/headers, or acknowledge upstream failures as successful delivery. Stripe retains its normal retry responsibility.
- Verify actual relay/Vercel/Stripe logging and failure behaviour before payment proofs. Revoke the temporary token and disable/remove the relay and Test destination after verification. Keep existing Preview protection and Production unchanged.

This introduces a new external service and transmits Stripe Test payloads to it; owner approval and account access are required **before implementation or enablement**. No service, subscription or paid plan has been enabled. Cloudflare documents a Free Workers allowance of 100,000 requests/day and 10 ms CPU per invocation; suitability/signature CPU limits and account availability still need verification. Exceeding that allowance is not approval to enable a paid plan. [Official pricing](https://developers.cloudflare.com/workers/platform/pricing/).

Vercel documents the header as the preferred automation bypass method. [Official bypass guidance](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

An owner-provided existing equivalent ingress can be evaluated instead. Do not disable project-wide Preview authentication or waive the logging gate. This proposal does not amend the payment/claim architecture, authorise implementation, close other Phase 7 gates, or start Phase 8.
