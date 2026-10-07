import { test } from "node:test";
import assert from "node:assert/strict";
import { geoapifyWalking } from "../lib/data/adapters/geoapify.ts";
import type { Point } from "../lib/spatial/model.ts";
const origin: Point = { longitude: -0.1, latitude: 51.5, crs: "EPSG:4326", precision: "building", source: "synthetic-verified-identity" };
const key = "synthetic-geoapify-key";
const geometry = { type: "MultiPolygon", coordinates: [[[[-0.2, 51.4], [0, 51.4], [0, 51.6], [-0.2, 51.4]]]] };
const payload = () => ({ type: "FeatureCollection", properties: { apiKey: key }, features: [900, 300, 600].map(range => ({
  type: "Feature", properties: { lat: origin.latitude, lon: origin.longitude, mode: "walk", type: "time", range, id: "opaque-provider-id" }, geometry })) });
test("walking result retains three geometries and requested origin without inventing snap, vintage or observed billing", async () => {
  let calls = 0;
  const result = await geoapifyWalking({ key, fetcher: async (url, init) => {
    calls++; const u = new URL(String(url)); assert.equal(u.origin, "https://api.geoapify.com");
    assert.equal(u.searchParams.get("range"), "300,600,900"); assert.equal(u.searchParams.get("mode"), "walk");
    assert.equal(init?.redirect, "error"); return Response.json(payload());
  } })(origin);
  assert.equal(calls, 1); assert.deepEqual(result.polygons.map(p => p.seconds), [300, 600, 900]);
  assert.equal(result.snappedOrigin, null); assert.equal(result.routingVersion, null); assert.equal(result.credits.observed, null);
  assert.equal(JSON.stringify(result).includes(key), false); assert.equal(JSON.stringify(result).includes("opaque-provider-id"), false);
  assert.deepEqual(result.origin, origin);
});
test("unknown/centroid origins spend nothing; malformed ranges, request mismatch, geometry and URL-reflecting failures remain safe", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return Response.json(payload()); };
  for (const precision of ["unknown", "postcode_centroid"] as const) await assert.rejects(geoapifyWalking({ key, fetcher })({ ...origin, precision }), /invalid_request/);
  assert.equal(calls, 0);
  for (const mutate of [
    (p: ReturnType<typeof payload>) => { p.features[0].properties.range = 600; },
    (p: ReturnType<typeof payload>) => { p.features[0].properties.lat = 50; },
    (p: ReturnType<typeof payload>) => { p.features[0].geometry.coordinates[0][0][0][0] = NaN; },
  ]) { const p = payload(); mutate(p); await assert.rejects(geoapifyWalking({ key, fetcher: async () => Response.json(p) })(origin), /invalid_response/); }
  await assert.rejects(geoapifyWalking({ key, fetcher: async url => { throw new Error(String(url)); } })(origin), error =>
    error instanceof Error && error.message === "network_error" && !error.message.includes(key));
});
