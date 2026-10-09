# Phase 9.5 status

Implementation in progress; not complete. Isolated `codex/phase-9-5-web-evidence` worktree from main 4f8ce4d; Phase 10 draft branch unchanged. No subscription, infrastructure purchase or Production activation.

## Pilot observations — 9 October 2026

Opened original primary sources, not only search summaries:

- Ground floor/basement **33 Broadway Market E8 4PH**: [Allsop particulars](https://www.allsop.co.uk/api/file/a3565abe-43ff-11e9-99ac-0242ac110002) identify Tiosk Ltd and source-reported reserved rent £45,000/year, lease expiry June 2026 and service charge. This is historical agent-reported contracted rent, not current asking/achieved rent. Publication date is not established from the PDF/URL. Selected building identity alone cannot establish this trading unit. Rights to retain particulars-derived facts require review; no document body retained.
- Whole building **2 Greek Street W1D 4NB**: [AG&G original particulars](https://agg.uk.com/sites/default/files/2018-09/Gay%20Hussar.pdf) identify former Gay Hussar, asking offers above £125,000/year and approximate GIA 231m². The URL contains 2018-09 but that is not a verified publication date. Whole-building evidence cannot be used as ground-floor unit rent. Agent disclaimer says particulars are not a contract; commercial retention permission not established.
- **67 Broadway Market E8 4PH**: [business's own account](https://climpsonandsons.com/blogs/journal/20-things-that-have-helped-us-survive-and-thrive-in-20-years-of-running-a-cafe) distinguishes 2002 market stall from 2005 permanent shop and reports a former butcher with the same name. Secondary directory conflicts by describing the permanent café as starting in 2002. No inferred closure date/reason or exact floor is admitted. First-party account provides useful leads beyond Phase 9's dated planning/EPC bundle; reuse permission is unresolved.
- **13 Ingestre Place**: search returned nearby-area brochures and a council report mentioning **13D**, not proof of the selected unit. Reject unit substitution.
- **Unit 1 Hutton House, Manorgate Road KT2 7AW**: returned residential-style modelled rental estimate with poor data quality, not an actual commercial listing; reject commercial-rent substitution.
- **Haven Hair Walthamstow**: ambiguous name-only query returned a Massachusetts salon; reject geographic/name-only match. This is a sparse-search control, not a canonical exact-address accuracy case.

One explicitly timed four-query batch took 1,989ms for the tool response (not model/API latency). Earlier exploratory searches were not individually timed; do not invent per-property latency. These six cases are a small purposive pilot, not a statistically representative London coverage/accuracy claim. Three have useful original-source leads. The sparse name-only control is excluded from exact-unit accuracy calculations. Search-tool execution here has no separately verified API invoice; no claim of a measured zero model/search cost.

## Approval and open gates

Owner approved **one** existing-account OpenAI search proof, **US$0.50** maximum, replacing proposed $5. That permission is now consumed: GPT 6.1 Sol, one tool call, 12,425 input tokens, 270 output tokens, 9,321ms; usage-derived conservative cost **US$0.03755**, not an invoice-confirmed charge. Before dispatch, the conservative plausible 128K-input/512-output scenario was estimated at US$0.27112; this was not represented as a provider-enforced input cap. No retries, second paid request, recurring execution budget or Production enablement.

The proof discovered Allsop particulars, a Rightmove-hosted agent brochure and [FSA record 1225476](https://ratings.food.gov.uk/business/1225476). Independent fixed-origin FSA API verification confirms `%Arabica` at **Basement To Ground Floor, 33 Broadway Market, E8 4PH**, matching the pilot's explicit ground-floor/basement unit. This is an observed register name, not an opening/closure date or proof of when Tiosk ceased operating. A legal tenant and a trading name are different roles. The brochure fetch timed out: its proposed £48,000 rent and date are **unverified**, and it cannot be called newer evidence. The FSA record gives one independently verified, reusable unit-linked observation; it does not prove that the name was entirely absent from existing Phase 8 radius inventory. No positive pilot finding has yet been durably attached to a real purchased analysis.

## Implemented and locally/hosted verified

- Private server-only bounded search, strict candidate/source URL and receipt validation; no arbitrary URL crawler, retries or model fallback.
- Exact address/unit and explicit date semantics; transient rent/area/lease/charge review distinguishes rent classes and preserves conflicts. Unknown commercial reuse excludes content retention. FSA normalised name/address facts use [the reviewed OGL policy](https://www.gov.uk/government/organisations/food-standards-agency/about/about-our-services); no logos, ratings or raw documents retained.
- Frozen existing PropertyData rent references/checksums remain qualified market estimates. No new PropertyData request, provider credit or financial assumption.
- Append-only discovery sidecar in private `premises_events`, using migrations `20261009150000_web_discovery.sql` and `20261009151000_web_discovery_account_policy.sql`. The corrective migration reuses the established permanent-account predicate. Both applied to hosted development; no applied history edited.
- Hosted rollback proofs: unpaid/pending/refunded preparation denied, another owner denied, browser grants denied, authorised append and identical replay accepted, changed replay/forged parent rejected, direct mutation rejected. Synthetic paid bindings test existing payment state, not a new Stripe delivery claim.
- All **28 existing ready-report fingerprints unchanged**. PostgreSQL storage **374,232,755 bytes**, versus 374,199,987 before migrations (32,768-byte increase); `premises_events` total relation 155,648 bytes. No infrastructure purchase.
- `npm ci`: 165 packages, zero reported vulnerabilities. `npm run check`: lint, strict typecheck, **246 tests** including fresh PostgreSQL/PostGIS/security rebuild, production build passed. Public HTTP regression passed for 13 pages/articles and 13 internal paths. Stored replay test makes zero source/search/context-write calls.
- Local scan of 20 changed/new source files and 20 built browser JS/HTML files against eight privately loaded credential values found zero matches. This is an artifact scan, not a claim of new DevTools, Network or Preview acceptance verification.

## Remaining gates and honest limits

The owner directs public-data use before revenue validation. No new subscription or purchase is proposed. Public visibility is not blanket permission to retain copyrighted particulars, database contents or personal information. Agency rent and first-party past-name sources currently remain references-only, with rights and unit/date limitations. **Automatic admission of property-specific rent and prior business-name evidence is not implemented or verified**; the narrow initial FSA verifier admits current register observations only. The framework therefore must not be presented as complete automated premises history or a validated current-rent feed.

Required independent integration/security checks, exact-head CI and protected delivery remain open. No automatic paid-report invocation exists until later Full Report preparation and a separately approved recurring search budget. Existing Free Snapshot, Auth and Test payment UI remain unchanged; no new visual/user acceptance or real 200% zoom claim is made.

Pilot agency discoveries are not customer report facts. Current UI remains not approved for launch; no UI change is planned. Phase 9.5 is **not complete**; incomplete admission/integration gates are not replaced by passing unit tests.
