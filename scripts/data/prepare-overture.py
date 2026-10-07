"""Pinned London Places compact encoding; retain native provenance, never invent categories."""
import hashlib
import json
import math
import pathlib
import sys
from collections import defaultdict

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "supabase/.temp/phase8-implementation").resolve()
if not root.is_relative_to(pathlib.Path("supabase/.temp").resolve()):
    raise ValueError("Ignored directory required")
source = root / "overture-london-native.jsonl"
if hashlib.sha256(source.read_bytes()).hexdigest() != "a924bf853ad6c9e4b1d26f8e3297dbe7fc3e84a40fba0b409b9c12c69bc6aa21":
    raise ValueError("Pinned complete London artifact required")
source_fields = ["property", "dataset", "license", "record_id", "update_time", "confidence", "provider", "resource", "version", "between"]
address_fields = ["freeform", "locality", "postcode", "region", "country"]
tiles = defaultdict(list)
seen = set()
source_notices = set()
for line in source.open(encoding="utf8"):
    r = json.loads(line)
    if r["id"] in seen:
        raise ValueError("Duplicate native Overture ID")
    seen.add(r["id"])
    sources = []
    for provenance in r["sources"] or []:
        if set(provenance) != set(source_fields):
            raise ValueError("Native provenance schema changed")
        source_notices.add((provenance["dataset"], provenance["license"]))
        # Normalised provenance sufficient for identity, field lineage, vintage and rights.
        # Provider/resource strings duplicate native dataset identity; absent between is not persisted.
        sources.append([provenance[k] for k in ["property", "dataset", "license", "record_id", "update_time", "confidence", "version"]])
    addresses = []
    for address in r["addresses"] or []:
        if set(address) != set(address_fields):
            raise ValueError("Native address schema changed")
        addresses.append([address[k] for k in address_fields])
    x, y = r["point"]
    if not all(math.isfinite(v) for v in [x, y]) or not -180 <= x <= 180 or not -90 <= y <= 90:
        raise ValueError("Invalid native point")
    # Format is documented by position; decimals and all provided provenance fields remain exact.
    record = [r["id"], r["version"], r["name"], r["basic_category"], r["taxonomy"], x, y,
              r["confidence"], r["operating_status"], addresses, sources]
    tiles[(math.floor(x * 100), math.floor(y * 100))].append(record)
chunks = []
whole = hashlib.sha256()
for tile, records in sorted(tiles.items()):
    records.sort(key=lambda r: r[0])
    for offset in range(0, len(records), 500):
        part = records[offset:offset + 500]
        payload = json.dumps(part, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf8")
        if len(payload) > 1000000:
            raise ValueError("Bounded tile chunk exceeded")
        ordinal = len(chunks)
        (root / f"overture-chunk-{ordinal:04}.json").write_bytes(payload)
        whole.update(payload)
        chunks.append({"ordinal": ordinal, "tileX": tile[0], "tileY": tile[1], "rows": len(part), "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)})
manifest = {"format": 1, "release": "2026-09-23.1", "rows": len(seen), "chunkCount": len(chunks), "chunks": chunks,
            "bytes": sum(c["bytes"] for c in chunks), "sha256": whole.hexdigest(),
            "sourceSha256": "a924bf853ad6c9e4b1d26f8e3297dbe7fc3e84a40fba0b409b9c12c69bc6aa21",
            "sourceNotices": sorted(source_notices), "sourceFields": ["property", "dataset", "license", "record_id", "update_time", "confidence", "version"], "addressFields": address_fields,
            "duplicateIds": 0, "activated": False}
(root / "overture-compact-manifest.json").write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf8")
print(json.dumps({k: manifest[k] for k in ["rows", "chunkCount", "bytes", "sha256", "duplicateIds", "activated"]}))
