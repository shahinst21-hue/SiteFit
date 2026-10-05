# TfL StopPoint policy — revision 1, reviewed 2026-10-05

Scope: official Unified API StopPoint locations/modes only. [API portal](https://api-portal.tfl.gov.uk/) recommends registration and a subscription key; use server-only `app_key`, never log a full query URL. [Transport Data Service licence](https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service) allows commercial reuse subject to attribution and continuing compliance. The portal/terms describe a free service and 500 calls/minute ceiling; verify subscribed quota, with much smaller bounded proof requests. No paid service enabled.

| Representation | SiteFit policy / duration |
| --- | --- |
| Raw response | Not persisted; bounded process memory, discarded after normalisation. Licence reuse permission is not a reason to retain unused fields. |
| Normalised non-personal stop IDs/names/modes/points | Retain dated immutable analysis representation while licence remains valid; no contractual numeric expiry found in reviewed terms. |
| Derived metrics | Licence permits adaptation; no walking time, frequency, footfall or scoring derived in Phase 5. Same attribution/termination obligations. |
| Source references and retrieval timestamps | Retain with historical normalised snapshot; no numeric expiry found. Never retain `app_key` in a reference. |
| Cache | Permitted normalised public records only, maximum 24 hours; finite process cache. Not a report refresh mechanism. |

Attribution: `Powered by TfL Open Data`; `Contains OS data © Crown copyright and database rights 2016`; `Geomni UK Map data © and database rights [2019]`, as specified by the reviewed terms. Preserve these strings as metadata for later rendering/export, without adding Phase 5 customer copy. No logos or imagery. The licence excludes personal data and ends on breach; terms deny rights after termination. Thus retention is conditional on compliance, not an unconditional perpetual guarantee. On changed/terminated rights, block new collection and review restricted retention/access; never refetch or rewrite old reports. Public report/PDF rollout must honour these notices and restrictions. No report integration is implemented here.

Unknown source observation/publication dates remain null. Stop proximity is not walking time or demand. Operational availability/key/quota is a separate live gate, not established by this policy review.

Actual 5.7b proof: registered local key yielded HTTP 200 for the existing canonical postcode-centroid query. StopTypes were checked against official metadata and schema against [Unified API Swagger](https://api.tfl.gov.uk/swagger/docs/v1). Retained ID/name/mode/point fields only. The service returns 22 observations while total/page/centre metadata are unset/defaults; completeness is unknown and the adapter returns partial. PostGIS measured a returned point at 527.109m for a 500m request, so the adapter explicitly warns that source radius selection is not a certified geodesic circle. No walking/catchment/transport score is calculated or claimed. This is a provider quality finding, not a weakened geographic guarantee or a need for durable execution machinery. Source publication/observation/release versions remain unknown. Future transport calculations must apply their approved geographic/sufficiency rules to the retained observations.
