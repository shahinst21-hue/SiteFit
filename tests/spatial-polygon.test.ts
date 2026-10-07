import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePolygonGeometry } from "../lib/spatial/polygon.ts";

const shell = [[-0.2, 51.4], [0, 51.4], [0, 51.6], [-0.2, 51.6], [-0.2, 51.4]];
const hole = [[-0.15, 51.45], [-0.15, 51.5], [-0.1, 51.5], [-0.1, 51.45], [-0.15, 51.45]];

test("versioned polygon boundary preserves holes and disconnected parts without changing old map readers", () => {
  const input = { type: "MultiPolygon", coordinates: [[shell, hole], [[[0.1, 51.4], [0.2, 51.4], [0.2, 51.5], [0.1, 51.4]]]] };
  const parsed = validatePolygonGeometry(input);
  assert.deepEqual(parsed, input);
  parsed.coordinates[0][0] = [];
  assert.deepEqual(input.coordinates[0][0], shell);
  assert.deepEqual(validatePolygonGeometry({ type: "Polygon", coordinates: [shell, hole] }), { type: "Polygon", coordinates: [shell, hole] });
});

test("untrusted geometry rejects incorrect nesting, Z/CRS, unclosed/degenerate rings, nonfinite coordinates and excessive vertices", () => {
  for (const value of [null, { type: "Point", coordinates: [0, 51] },
    { type: "Polygon", coordinates: shell }, { type: "MultiPolygon", coordinates: [] },
    { type: "Polygon", coordinates: [shell], crs: "EPSG:27700" },
    { type: "Polygon", coordinates: [shell.slice(0, -1)] },
    { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
    { type: "Polygon", coordinates: [[[0, 51, 3], [0.1, 51], [0.1, 51.1], [0, 51, 3]]] },
    { type: "Polygon", coordinates: [[[NaN, 51], [0.1, 51], [0.1, 51.1], [NaN, 51]]] },
    { type: "Polygon", coordinates: [[[181, 51], [0.1, 51], [0.1, 51.1], [181, 51]]] },
    { type: "Polygon", coordinates: [Array.from({ length: 20_001 }, (_, i) => shell[i % shell.length])] },
  ]) assert.throws(() => validatePolygonGeometry(value));
});
