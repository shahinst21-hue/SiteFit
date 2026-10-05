# ONS London baseline policy — revision 1, reviewed 2026-10-05

Scope: Census 2021 TS001 residents, compatible official OA2021 boundaries/lookup and Greater London authority/region coverage. [Nomis bulk catalogue](https://www.nomisweb.co.uk/sources/census_2021_bulk) supplies geographic CSVs and explains disclosure perturbation. Public official data is preferred; no recurring provider fee or commercial account proposed. Exact selected boundary/lookup artefacts, checksums and their third-party notices must be verified in Step 5.5 before activation; this policy does not approve arbitrary catalogue downloads.

| Representation | SiteFit policy / duration |
| --- | --- |
| Raw download/response | Temporary bounded ingestion artefacts only, delete after verified import; no permanent whole-country archive. |
| Normalised London counts/geographies | Persist immutable release rows and permitted dated snapshots under each verified artefact's licence; OGL has no numeric expiry, but confirm boundary notices before enabling. |
| Derived metrics | Licence-permitted derivation only with provenance/units/versions; Phase 5 does not calculate demand/catchment totals. |
| References/retrieval timestamps | Retain URL without credentials, SHA-256, publication/effective/retrieval/import times and licences with release; unknown dates remain null. |
| Cache | Database local releases reused by explicit immutable release ID; no live download per analysis. |

Default attribution for OGL material: `Contains public sector information licensed under the Open Government Licence v3.0. Source: Office for National Statistics.` Add required OS/boundary notices for the actual artefacts. Runtime default-deny applies until exact policy/manifest is verified. Census effective date is 2021-03-21; a new download is not current demand. Missing or suppressed values stay null with reasons. Revised source content creates a new release; completed analyses retain their original releases.
