# FSA establishment policy — revision 1, reviewed 2026-10-05

[Official open-data guidance](https://ratings.food.gov.uk/open-data) describes a free keyless API. [Terms](https://ratings.food.gov.uk/terms-and-conditions) license ratings data under the [Open Government Licence v3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). Phase 5 uses establishment identities, authority/type/name and permitted geocodes only; no rating imagery, logos, scores or personal contact fields. Use API v2 headers and bounded pages. No paid provider/plan.

| Representation | SiteFit policy / duration |
| --- | --- |
| Raw response | No persistence; discard after bounded normalisation. |
| Normalised establishment records | Dated immutable snapshots of public non-personal establishment fields; no contractual numeric expiry in OGL. Respect withheld private addresses/geocodes and personal-data exclusions. |
| Derived metrics | OGL permits adaptation with attribution; no competitor ranking/count, survival inference or rating interpretation implemented now. |
| Source references and retrieval timestamps | Persist with dated snapshot; no contractual numeric expiry found. |
| Cache | Only permitted normalised public records; maximum 24 hours, bounded process memory. |

Attribution: `Contains public sector information licensed under the Open Government Licence v3.0. Source: Food Standards Agency.` Historical use must show dates; current ratings must not be implied from old observations. FHRS IDs can be recycled or change, and a register is not exhaustive competition or occupancy evidence. Missing/withheld locations stay null. Applicable only to coffee/restaurant category; salon produces not-applicable without a provider call. No fixed numerical API quota was established: one in-process call at a time, conservative page/request limits, respect 429 and never assume process caps are global. Operational verification remains separate.
