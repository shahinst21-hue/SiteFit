# OS Open UPRN compact representation checkpoint

Measured 7 October 2026 in the existing development project. No Supabase upgrade, PropertyData subscription, new external service or Production change was made. This is an implementation experiment, **not an activated dataset release**.

## Lossless representation

The exact London subset contains 5,317,412 records, selected by the frozen London region using boundary-inclusive covers. Its CSV is 282,966,942 bytes, SHA-256 `27c677c2381e42ff917248ab163b0a0154bf9ce0853b95c6ba9e8f3fe9db0d3c`. OS filename release is September 2026; the embedded extraction date is 14 August 2026.

Format 1 stores each record in 24 big-endian bytes: unsigned 64-bit UPRN; signed 32-bit original easting and northing multiplied by 100; signed 32-bit original latitude and longitude multiplied by 10,000,000. Decimal scaling is lossless representation, **not a claim of centimetre or entrance accuracy**. The initial integer-metre experiment rejected fractional source XY; it was corrected rather than rounding coordinates.

The complete sorted London input was checked for unique ascending UPRNs, exact decimal scaling and coordinate bounds. Zero duplicates and zero rounded coordinates. Packed bytes total **127,617,888**, SHA-256 `edbbb860d1a17fb68c61dc8e82efd9a460ef91c3d54eb5a3421010338ff4d491`; 266 chunks of at most 20,000 records. Python packing after query preparation took 96.96 seconds; this is not an end-to-end ingestion SLA.

`lib/data/os-uprn.ts` implements bounded, strict encoding/validation and exact identifier lookup. This pure codec does not import the dataset into application bundles, activate a release or establish property/unit identity. London admission, release provenance, per-chunk/whole checksum verification and immutability must be enforced by the subsequent importer/database boundary.

## Actual hosted PostgreSQL experiment

A rollback-only temporary table holds the first real 20,000-record chunk as bytea, with first/last UPRN and primary key. `pg_total_relation_size`, including table, TOAST and index, is **294,912 bytes**. The previous representative row-per-UPRN layout used **11,763,712 bytes per 100,000 rows**.

| Measurement | Result | Scope |
| --- | --- | --- |
| Complete packed payload | 127,617,888 bytes | All London records, before PostgreSQL compression/overhead |
| Actual compact PostgreSQL relation | 294,912 bytes | One real 20,000-record chunk |
| Compact full relation extrapolation | 78,408,431 bytes | Projection from that sample, **not measured full admission** |
| Previous row layout extrapolation | 625,525,034 bytes | Representative 100,000-row experiment |
| 1,000 successful indexed-chunk/binary searches | 9,981.099 ms total | Warm development PostgreSQL execution; varied positions within one chunk |
| Mean time in that experiment | 9.98 ms per lookup | Includes SQL target decoding; excludes HTTP/network latency |
| Exact first/last lookup and absent UPRN | Passed; absent returns null | Same real chunk |

The benchmark materialises the bytea before repeated byte reads to avoid repeatedly decompressing a toasted value. It includes extraction of target identifiers from the real bytes, and is conservative relative to already supplied UPRNs. Do not infer p95, cold-cache performance or 266-chunk routing performance from this result. A larger one-request experiment hit the Management API request-size limit; the probe was reduced, not deployed through a new service. SQL was transactional and rolled back; no report or ready release was mutated.

Private ignored receipts: `supabase/.temp/phase8-implementation/os-compact-measurement.json`, `os-compact-performance.sql` and `os-compact-performance.json`. These contain public-source identifiers/coordinates and measurements, not credentials. No candidate postcode search result was persisted by this experiment.

## Next admission gates

Measure full stored relation size and lookup distribution across head/middle/tail chunks, misses and cold/warm access before relying on the capacity projection. Implement private immutable release-bound chunks, strict decoder and checksum validation, non-overlap/full-count activation, exact replay/conflict rejection, client denial and ready update/delete denial. Preserve original native coordinates, source extraction/retrieval dates, attribution, London geography release and address/building precision. Validate selected commercial UPRNs against the stored release and freeze only new analysis contexts. Historical report inputs and snapshots remain unchanged.

The current measurements support continuing the compact approach in existing infrastructure. They do **not** justify infrastructure spend or prove that all remaining Phase 8 datasets fit within the development quota. No spend is requested at this checkpoint.
