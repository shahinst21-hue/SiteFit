# Phase 4 status — address resolution and property identity

Updated 2026-10-04. **PHASE 4 COMPLETE.** All implementation, security, live end-to-end and protected implementation-delivery gates passed. No Phase 5 work started. Implementation branch codex/phase-4-address-resolution merged through protected PR #10. The completion record follows the same protected documentation workflow.

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

Responsive browser checks at 360, 375, 390, 430, 768 and 1440px found no horizontal overflow with the 31 real candidates, 31 synthetic long labels and the manual form. Real candidate buttons are at least 72px high; labels wrap fully. Keyboard Enter selects an exact synthetic candidate, focus moves to Business Type, Back preserves the UUID/list, and Continue reaches the existing Snapshot without a repeated lookup/resolve. Invalid postcode/manual submission focuses the first invalid field; labelled native controls, live status and alert messages are present. Synthetic fixtures verified empty results, provider failure, genuine pending-search disabled controls and manual-unverified Snapshot labelling. These ignored local fixtures are not deployed and are not evidence of real application database persistence. The previously missing runtime gate is now verified through the deployed application; the earlier safe-failure evidence is historical.

## Final end-to-end verification — 2026-10-04

The user securely configured local SUPABASE_SECRET_KEY and Preview-only POSTIO_API_KEY/SUPABASE_SECRET_KEY. No values were shared in chat, committed or copied automatically. Redeployed the implementation to [this protected Preview](https://sitefit-47dn81bu1-shahinst21-hues-projects.vercel.app/check-location), deployment dpl_DJon5bFyHUkGQw4GTASBWztU855J, target Preview, status READY. The observed stable branch alias is [Phase 4 Preview](https://sitefit-git-codex-phase-4-addre-2a7d1a-shahinst21-hues-projects.vercel.app/check-location). Production remains disabled.

The real deployed anonymous browser flow searched lowercase/unspaced kt27au, normalised to KT2 7AU and returned all 31 candidates. Keyboard Enter selected a real returned delivery point and reached Business Type, then Free Snapshot, without signing into SiteFit. Postal confirmation remains distinct from the explicitly unverified local evidence/schematic map.

Before this run there were zero hosted Postio properties for that postcode. The first actual Preview selection resolved Postio UDPRN 12091144 and persisted canonical UUID 2b5f2e12-8d0a-4523-a5a9-0f2ad4daa555. Direct hosted development queries verified provider_verified, UDPRN equal to the provider identifier, nullable UPRN, available components and postcode_centroid precision/source. A fresh check repeated postcode search and selection: the exact UUID and created_at were preserved, resolved_at advanced from 2026-10-04T15:42:04.191921Z to 2026-10-04T15:49:24.887653Z, and the provider-property count remained exactly one. A later actual local-built-app request audit resolved the same identifier successfully as well. No candidate inventory or analysis was stored.

Manual entry of the postal lines/town/postcode through the actual Preview persisted UUID b7976e98-d31a-4920-8115-ef192905b493. The hosted row is manual_unverified with unknown knowledge/precision, null provider/UDPRN/UPRN/coordinates/source. The browser reached Snapshot with “Manually entered address · unverified”. Manual entries are separate unverified inputs, not deduplicated by guessed text matching.

Both actual configured server keys were privately compared against tracked/new files, local browser bundles, local HTML, three deployed HTML pages, all 11 JavaScript assets referenced by those deployed pages, saved browser console logs and 200 deployed log lines. No match was found. An ignored request observer forwarded actual browser lookup/resolve requests to the real local production build, without mocked provider/database responses: POST bodies contained only postcode or reference; no SiteFit session cookie or privileged header was present; both request headers/URL/body and response headers/body were scanned against the actual keys with no match. These observers/probes remain ignored tooling and are not application routes or deployed code.

After npm ci (zero audit vulnerabilities), npm run check passed again: lint, strict types, all 43 tests and production build. Real public HTTP/SEO/404/address boundaries passed. Both hosted rolled-back SQL security suites passed again. Hosted development Auth/application/session/replay/isolation integration passed again and disposable accounts were removed. Previous six-width and keyboard verification remains valid; no product implementation changed during this continuation.

To preserve hosted Auth on the new observed stable Preview alias, only its exact callback/confirmation URLs were added to the existing development allowlist. Reviewed config diff had one declared change; push applied only that property and preserved the nine undeclared remote defaults. The post-push diff verified zero declared updates and the same nine undeclared differences. No wildcard, Production callback or SMTP setting was added.

## Verified delivery and limits

[PR #10](https://github.com/shahinst21-hue/SiteFit/pull/10) was converted from draft after the real end-to-end gates passed. Final head d32806adb36c1f52cf2903f337f3d3633a8db72a passed [PR CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37216380660) and [push CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37216376857). Required Lint, types, tests and build checks were verified successful immediately before the exact-head protected squash merge. GitHub accepted the protected merge as 4afce2575c5bb33fa157c4854fb80ee4ccc2fe36. No admin override, direct main commit or force push was used.

[Post-merge main CI](https://github.com/shahinst21-hue/SiteFit/actions/runs/37216771257) passed at 4afce2575c5bb33fa157c4854fb80ee4ccc2fe36. Main was fast-forwarded to that exact origin/main commit and the working tree was clean. This documentation-only completion record is delivered through its own required CI/PR; final main/origin and cleanliness are checked again after that delivery. Production auto-deployment remains disabled; Phase 5 is not authorised.
No human action remains outstanding. Four representative postcodes do not establish every UK address; NI optional geography remains unknown. Postal verification does not prove building coordinates, commercial use, occupancy or demand. Throttles are per-process rather than distributed; public Production abuse controls need review before rollout. No bulk cache/PAF inventory exists; later redistribution/export needs licence review. Phase 5, analysis/data collection, financial computation, payments, AI, real reports/PDF and publishing automation have not started.
## Definition of Done

All 44 entries passed with the evidence above; the implementation merge and post-merge synchronization are verified. Completion documentation delivery uses the same protected workflow.
- [x] Real Postio connectivity works.
- [x] POSTIO_API_KEY remains server side.
- [x] Postcode input works.
- [x] UK postcode normalisation works.
- [x] Postcode search returns real address candidates.
- [x] KT2 7AU has been tested against the live provider.
- [x] Address results display correctly.
- [x] The user can select an exact address.
- [x] The selected address is resolved server side by provider identifier.
- [x] SiteFit creates or finds a stable canonical property identity.
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
- [x] Preview integration works.
- [x] Documentation is updated.
- [x] Repository is clean after protected merge.
- [x] Phase 5 has not started.
