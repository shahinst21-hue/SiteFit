import { test } from "node:test";
import assert from "node:assert/strict";
import { propertyDataComponents, exactSelectedComponents } from "../lib/data/adapters/propertydata-components.ts";
import type { ResolvedAddress } from "../lib/addresses/model.ts";
const key = "synthetic-key-components", postcode = "SW1A 1AA";
const selected: ResolvedAddress = { formattedAddress: "1 Synthetic Street, London, SW1A 1AA", lines: ["1 Synthetic Street"], postcode,
  postTown: "London", country: "England", provider: "synthetic-postal", providerAddressId: "1", udprn: "1", uprn: null,
  latitude: null, longitude: null, coordinatePrecision: "unknown", coordinateSource: null, resolution: "provider_verified",
  components: { organisation: "Synthetic Cafe", department: null, subBuilding: null, buildingName: null, buildingNumber: "1", thoroughfare: "Synthetic Street",
    dependentThoroughfare: null, dependentLocality: null, doubleDependentLocality: null, poBox: null, district: null, ward: null } };
const row = (uprn = 123, secondary: string | null = null) => ({ uprn, address: `${secondary ?? "Synthetic Cafe"}, 1, Synthetic Street, District, London, ${postcode}`,
  lat: "51.5", lng: "-0.1", classificationCode: secondary ? "RD06" : "CR07", classificationCodeDesc: "Synthetic classification",
  addressParts: { secondary, primary: "1", street: "Synthetic Street", town: "London", district: "District", postcode } });
const response = (data = [row(), row(124, "Flat A")]) => Response.json({ status: "success", strict_postcode_mode: true, postcode, api_calls_cost: 6, data });
test("component identity distinguishes commercial primary and residential secondary despite identical coordinates and organisation labels", async () => {
  let calls = 0;
  const r = await propertyDataComponents({ key, fetcher: async (url, init) => {
    calls++; const u = new URL(String(url)); assert.equal(u.pathname, "/uprns"); assert.equal(u.searchParams.get("strict"), "true");
    assert.equal(u.searchParams.get("results"), "200"); assert.equal(u.searchParams.has("key"), false); assert.equal(new Headers(init?.headers).get("X-API-Key"), key);
    return response();
  } })(postcode);
  assert.equal(calls, 1); const primary = exactSelectedComponents(selected, r); assert.equal(primary.state, "matched"); assert.equal(primary.candidate?.uprn, "123");
  const administrative = structuredClone(selected); administrative.components.district = "Synthetic London Boro";
  assert.equal(exactSelectedComponents(administrative, r).state, "matched");
  assert.equal(exactSelectedComponents({ ...selected, postTown: "Manchester" }, r).state, "unresolved");
  const flat = structuredClone(selected); flat.components.subBuilding = "Flat A";
  assert.equal(exactSelectedComponents(flat, r).candidate?.uprn, "124");
  flat.components.subBuilding = "Flat B"; assert.equal(exactSelectedComponents(flat, r).state, "unresolved");
  assert.equal(exactSelectedComponents({ ...selected, resolution: "manual_unverified" }, r).state, "unresolved");
  const duplicate = structuredClone(r); duplicate.candidates.push({ ...duplicate.candidates[0], uprn: "125" });
  assert.equal(exactSelectedComponents(selected, duplicate).state, "ambiguous");
  const capped = structuredClone(r); capped.candidates = Array.from({ length: 200 }, () => r.candidates[0]); assert.equal(exactSelectedComponents(selected, capped).state, "ambiguous");
  const cappedResponse = await propertyDataComponents({ key, fetcher: async () => response(Array.from({ length: 200 }, (_, i) => row(1000 + i))) })(postcode);
  assert.equal(cappedResponse.outcome, "partial"); assert.equal(exactSelectedComponents(selected, cappedResponse).state, "ambiguous");
  const composite = structuredClone(selected); composite.components.buildingName = "Synthetic House"; assert.equal(exactSelectedComponents(composite, r).state, "unresolved");
});
test("non-strict, cross-postcode, duplicate identifiers, unsafe/reflected strings and invalid paid requests cannot resolve", async () => {
  let calls = 0;
  await assert.rejects(propertyDataComponents({ key, fetcher: async () => { calls++; return response(); } })("bad"), /invalid_request/); assert.equal(calls, 0);
  for (const data of [
    { status: "success", strict_postcode_mode: false, postcode, api_calls_cost: 6, data: [row()] },
    { status: "success", strict_postcode_mode: true, postcode, api_calls_cost: 6, data: [row(), row()] },
    { status: "success", strict_postcode_mode: true, postcode, api_calls_cost: 6, data: [{ ...row(), address: key }] },
    { status: "success", strict_postcode_mode: true, postcode, api_calls_cost: 6, data: [{ ...row(), addressParts: { ...row().addressParts, postcode: "M1 1AE" } }] },
  ]) await assert.rejects(propertyDataComponents({ key, fetcher: async () => Response.json(data) })(postcode), /invalid_response/);
  await assert.rejects(propertyDataComponents({ key, fetcher: async () => { throw Error(key); } })(postcode), error => error instanceof Error && error.message === "network_error");
});
