# Phase 4 status — address resolution and property identity

Updated 2026-10-04. **BLOCKED on secure runtime environment configuration and required end-to-end/Preview gates.** No Phase 5 work started. Implementation is on codex/phase-4-address-resolution, based on clean protected main 5d210990a4ab5b67f8568f491e761960e72c2777. Protected merge is intentionally pending.

## Implementation and evidence

Postio REST integration uses the server-only key/factory and a replaceable AddressLookupProvider. Explicit postcode Search normalises common UK formats and renders the complete actual candidate list. Optional genuine address autocomplete is bounded, debounced and cancelled. Exact selection resolves the current UDPRN server-side; client metadata is ignored. The existing anonymous Location → Business Type → Free Snapshot flow, optional economics and Phase 3.5 brand remain intact. Candidate lists and briefs stay page memory; only selected canonical properties are stored.

Canonical UUIDs use an atomic provider/identifier UPSERT and a unique database constraint. Separate units are distinct. UDPRN is separate from nullable future UPRN. Provider components are normalised, missing geography remains unknown and Postio coordinates are explicitly postcode_centroid. Manual fallback has four fields and manual_unverified provenance, no provider IDs/UPRN/coordinates. The new applied migration 20261004120000_property_address_identity.sql adds columns, constraints and a service-role-only SECURITY INVOKER RPC; existing Auth/private ownership RLS and applied history remain intact. Hosted generated types are updated.

Actual provider checks on 2026-10-04:

| Representative nation | Postcode | Actual candidates | Current selected-ID resolve | Geography/coordinates |
| --- | --- | ---: | --- | --- |
| England | KT2 7AU | 31 | Passed | Country/district/ward; postcode centroid |
| Scotland | EH1 1YZ | 1 | Passed | Country/district/ward; postcode centroid |
| Wales | CF10 1EP | 4 | Passed | Country/district/ward; postcode centroid |
| Northern Ireland | BT1 5GS | 1 | Passed | Provider omitted country/district/ward/coordinates; null/unknown retained |

Free health passed. Safe request IDs: England lookup a5484000-665f-4196-acc7-4f7eaed8aa87 / resolve 8fe4a8c6-ddf1-4cb3-b621-67ad64747fb9; Scotland 88524f80-1a94-4050-8f6c-65fb2c960d71 / 96fb5453-da7e-48b2-b01d-ff3212c9cdfa; Wales 105f4f9e-7c8d-4d9a-a1ee-d97db526fc6f / 3dd3aacf-3e9e-42fe-bdfb-e721488ff23d; NI focused rerun 03e28d54-deee-4d0f-bff7-eff58be21306 / eea3d591-8ddd-4ba6-a3ec-4ed0041eb0f8. The initial NI probe incorrectly required optional country; corrected the probe after inspecting field-presence metadata, then reran only NI. No geography was invented. Candidate counts are observations, not permanent expected counts. A separate actual built-app anonymous KT2 7AU browser search returned all 31 candidates.

Node 24.12.0/npm 11.6.2; npm ci passed with zero audited vulnerabilities. npm run check passed: lint, strict types, 43 tests and production build (23 routes). npm run check:public passed: 13 public pages/articles, 13 internal paths, metadata/JSON-LD/sitemap/robots/social image/404s and all four safe address-route boundaries. No paid provider request runs in normal CI. Fresh PostgreSQL rebuild includes ownership and property-identity SQL suites. Both hosted rolled-back SQL suites passed; migration histories match; test transactions rolled back. Hosted Auth integration passed again: verified identity, session/Account/refresh/sign-out, one-time replay rejection and isolation; disposable accounts were deleted. Real inbox and same-browser PKCE verification remains the prior human evidence in phase-3-status.md.

Responsive browser checks at 360, 375, 390, 430, 768 and 1440px found no horizontal overflow with the 31 real candidates, 31 synthetic long labels and the manual form. Real candidate buttons are at least 72px high; labels wrap fully. Keyboard Enter selects an exact synthetic candidate, focus moves to Business Type, Back preserves the UUID/list, and Continue reaches the existing Snapshot without a repeated lookup/resolve. Invalid postcode/manual submission focuses the first invalid field; labelled native controls, live status and alert messages are present. Synthetic fixtures verified empty results, provider failure, genuine pending-search disabled controls and manual-unverified Snapshot labelling. These ignored local fixtures are not deployed and are not evidence of real application database persistence. Current real selection fails safely on missing repository configuration before spending a UDPRN request.

## External gate and known limits

Local POSTIO_API_KEY exists, but SUPABASE_SECRET_KEY is absent. Vercel sitefit encrypted Preview environment metadata shows only the existing SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY; POSTIO_API_KEY and SUPABASE_SECRET_KEY are absent. The user explicitly requested HUMAN ACTION REQUIRED if Preview Postio configuration is missing. No secret was copied automatically or requested in chat. The new separate server repository needs the development secret because ordinary Auth/anonymous clients cannot write properties under existing RLS.

Required human action: privately add sitefit-dev sb_secret_ key as SUPABASE_SECRET_KEY to ignored .env.local; add that development secret and the existing POSTIO_API_KEY to sitefit Vercel **Preview only**. Optionally set ADDRESS_LOOKUP_PROVIDER=postio. Confirm configuration without sending values. Redeploy the Phase 4 Preview after configuration. Then verify actual anonymous selected/manual persistence, repeated selection UUID reuse and Preview journey; only after all gates pass make the PR ready, merge through required CI, and confirm clean main matches origin.

Four representative postcodes do not establish every UK address. NI optional geography is unknown. A postal delivery point does not prove building coordinates, commercial use, occupancy or demand. Manual records are not deduplicated speculatively. Throttles are bounded per-process/IP/global, not distributed; public Production abuse controls need review before rollout. No candidates/raw response bulk cache or PAF inventory is created; later commercial redistribution/export needs licence review. No analysis, demand/competition/accessibility/risk providers, economic computation, payments, AI, real reports/PDF or publishing automation is implemented.

## Delivery

Implementation commit 7e1210e9f7ca05273792498e1add67d3d854e6ff is pushed in [draft PR #10](https://github.com/shahinst21-hue/SiteFit/pull/10). Both [PR CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37209995592) and [push CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37209863764) completed successfully. Strict required checks/admin enforcement/PR protection remain verified. Documentation-only follow-up delivery is subject to the same required CI. The working branch is committed and clean; protected main remains at the baseline. No merge is permitted while real persistence and Preview integration remain unverified. Production auto-deployment remains disabled and Preview access stays protected.

Actual implementation [Vercel Preview](https://sitefit-fhrjsy6u2-shahinst21-hues-projects.vercel.app/check-location) is READY at the implementation SHA. Unauthenticated HTTP redirects (302) to vercel.com; access protection remains intact. Authenticated diagnostics return HTTP 200 for /check-location, /blog and /login, Preview noindex, actual postcode form and existing publishable Auth configuration. Valid postcode lookup and selected-reference resolve return safe HTTP 503 configuration failures without any key/provider detail. The Preview browser form was inspected; this confirms deployed shell and safe failure, **not successful address integration**. Production was not deployed. The missing environment gate remains unresolved.

## Definition of Done

Checked entries identify evidence above; unchecked entries still require a real application/Preview gate, even when their implementation and SQL/mock tests pass.
- [x] Real Postio connectivity works.
- [x] POSTIO_API_KEY remains server side.
- [x] Postcode input works.
- [x] UK postcode normalisation works.
- [x] Postcode search returns real address candidates.
- [x] KT2 7AU has been tested against the live provider.
- [x] Address results display correctly.
- [ ] The user can select an exact address.
- [ ] The selected address is resolved server side by provider identifier.
- [ ] SiteFit creates or finds a stable canonical property identity.
- [x] Repeated resolution of the same provider address does not create duplicate properties.
- [x] UDPRN is stored correctly.
- [x] UDPRN is not treated as UPRN.
- [x] UPRN remains nullable until a verified source supplies it.
- [x] Address components are normalised.
- [x] Postcode centroid coordinates are not misrepresented as rooftop coordinates.
- [x] England lookup works.
- [x] Scotland lookup works.
- [x] Wales lookup works.
- [x] Northern Ireland lookup works.
- [x] Manual address fallback exists.
- [x] Manual addresses are marked internally as unverified.
- [x] Provider verified addresses are distinguishable from manual addresses.
- [x] Anonymous address lookup works.
- [x] Login is not required before Free Snapshot.
- [x] Current Phase 3.5 branding remains intact.
- [x] Mobile First behaviour passes.
- [x] Accessibility basics pass.
- [x] Provider errors are handled safely.
- [x] No secrets are exposed.
- [x] No paid provider requests occur during normal CI.
- [x] Database migrations are reproducible.
- [x] Hosted development schema is verified.
- [x] Authentication still works.
- [x] Blog and SEO still work.
- [x] Lint passes.
- [x] Type checking passes.
- [x] Tests pass.
- [x] Production build passes.
- [x] Remote CI passes.
- [ ] Preview integration works.
- [x] Documentation is updated.
- [ ] Repository is clean after protected merge.
- [x] Phase 5 has not started.
