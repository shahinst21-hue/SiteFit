# OS Open UPRN compact representation checkpoint

Measured 7 October 2026 in the existing development project. No Supabase upgrade, PropertyData subscription, new external service or Production change was made. The complete London release is now **loaded, verified and activated**; the sample experiment below remains separately labelled.

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

## Complete hosted admission and activation

Release `f9cfff94-6f19-4e97-9a4f-3841decb2e0f` is ready. All **5,317,412** London records were loaded in **532 chunks of at most 10,000**, retaining the same format and whole packed checksum above. The earlier 266 × 20,000 packing was rechunked after a real statement-timeout blocker; no record, precision or integrity requirement was removed. Actual serial admission took 1,401 seconds.

At 18:41 BST, **before activation**, PostgreSQL measured:

| Actual complete storage measurement | Bytes |
| --- | ---: |
| Main heap | 90,112 |
| Main indexes | 81,920 |
| TOAST heap | 73,547,776 |
| TOAST indexes | 819,200 |
| Total relation, including auxiliary allocation | **74,612,736** |
| Complete database | **246,118,067** |
| Remaining against conservative 500,000,000-byte allowance | **253,881,933** |

The relation total includes PostgreSQL auxiliary allocation; it need not equal the sum of the four main-fork figures. Logical uncompressed packed bytes remain 127,617,888. These are **complete actual storage measurements**, superseding the sample's capacity extrapolation.

Full stored SHA-256 matches the original packed input, with 532 expected chunks, exact count, no overlapping identifier ranges and all-record London admission. Independently decoded first/middle/last records from **every chunk**, plus both selected property identifiers, pass **1,598/1,598** lookups: database mean **5.284 ms**, p95 **13.355 ms**, maximum **84.447 ms**. Thirty-four separate request batches average 860.97 ms (p95 1,766 ms); batches generally contain 48 lookups and are not individual HTTP latency. This is normal development cache after ingestion, **not controlled cold-cache performance**. Absent identifiers return null; the public service RPC returns no loading-release data and requires the exact geography release. Ready RPCs reproduce both selected properties' original scaled XY/WGS84 and address/building precision.

Fresh PostGIS and hosted rollback suites verify checksum rejection, partial activation rejection, outside-London rejection, exact/conflicting replay, immutable ready rows and denial to browser roles. Six historical analysis/report graph fingerprints remain unchanged after activation.

Activation independently rechecks full count/checksum and refuses admission above a **375,000,000-byte development database ceiling**, preserving at least 125 MB against the conservative Free allowance. Current remaining capacity is about 50.8%; it is **not a prediction that all remaining Phase 8 data fits**. Measure each remaining full load and the final Phase 8 footprint, reserving room for reports and normal operation rather than targeting 499 MB. No upgrade is requested.

Forward migrations `20261007160000` through `20261007165000` implement private immutable chunks and progressively optimise an actual admission timeout: set-based decoding, bounded MultiPoint containment and direct byte arithmetic. All records remain validated; there is no nearest-point match, spatial index per UPRN, durable workflow table or distributed execution infrastructure. Existing CLI login-role timeouts were bypassed using the already authenticated Supabase Management SQL API; new migration SQL and its new history record were committed atomically, without editing applied migration history. No new service was introduced.

Ignored full receipts: `os-full-storage-receipt.json`, `os-full-lookup-receipt.json`, `os-activation-receipt.json`, `historical-after-full-os.json`. `scripts/data/import-os-uprn.ts` provides the pinned bounded load path; activation is deliberately separate.

## Remaining integration gates

Freeze this release only into new approved analysis contexts, preserve original native coordinates, extraction/retrieval dates, attribution and address/building precision, and complete runtime projection/security gates. Historical report inputs and snapshots remain unchanged. No cold-cache guarantee or entrance/unit suitability claim is made.

The current measurements support continuing the compact approach in existing infrastructure. They do **not** justify infrastructure spend or prove that all remaining Phase 8 datasets fit within the development quota. No spend is requested at this checkpoint.
