import { test } from "node:test";
import assert from "node:assert/strict";
import { propertyDataResolver, exactPropertyMatch } from "../lib/data/adapters/propertydata.ts";
const key = "synthetic-key-for-test-only";
const address = "Unit 1, Synthetic House, 1 Example Road, London, SW1A 1AA";
const candidate = { uprn: 123456789, address, lat: "51.5", lng: "-0.1", classificationCode: "CR", classificationCodeDesc: "Synthetic commercial classification" };
const response = (data: unknown[] = [candidate]) => Response.json({ status: "success", api_calls_cost: 10, data, parameters: { address }, process_time: "0.1" });

test("PropertyData identity uses server header only, one bounded call, UPRN strings and unknown point precision", async () => {
  let calls = 0;
  const resolver = propertyDataResolver({ key, fetcher: async (url, init) => {
    calls++; const u = new URL(String(url));
    assert.equal(u.origin, "https://api.propertydata.co.uk"); assert.equal(u.searchParams.get("address"), address);
    assert.equal(String(url).includes(key), false); assert.equal(new Headers(init?.headers).get("X-API-Key"), key);
    assert.equal(init?.redirect, "error"); return response();
  } });
  const result = await resolver(address);
  assert.equal(calls, 1); assert.equal(result.candidates[0].uprn, "123456789");
  assert.equal(result.candidates[0].point.precision, "unknown"); assert.equal(result.sourceDate, null);
  assert.equal(JSON.stringify(result).includes(key), false); assert.equal("parameters" in result, false);
});

test("unit mismatch/ambiguous/ranked candidates never become another property's precise point", async () => {
  const r = await propertyDataResolver({ key, fetcher: async () => response() })(address);
  assert.equal(exactPropertyMatch(address.toLowerCase(), r).state, "matched");
  assert.equal(exactPropertyMatch(address.replace("Unit 1", "Unit 2"), r).state, "unresolved");
  const duplicate = structuredClone(r); duplicate.candidates.push({ ...duplicate.candidates[0], uprn: "987654321" });
  assert.equal(exactPropertyMatch(address, duplicate).state, "ambiguous");
  r.candidates[0].classificationCode = "RD"; // Residential identity is not permission to operate commercially.
  assert.equal(exactPropertyMatch(address, r).state, "matched");
});

test("bad requests spend nothing; errors, duplicate/unsafe UPRNs, reflected secrets and malformed coordinates fail safely", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return response(); };
  await assert.rejects(propertyDataResolver({ key, fetcher })("postcode only"));
  await assert.rejects(propertyDataResolver({ key: undefined, fetcher })(address)); assert.equal(calls, 0);
  for (const bad of [{ ...candidate, uprn: Number.MAX_SAFE_INTEGER + 1 }, { ...candidate, lng: "" },
    { ...candidate, address: key }, { ...candidate, lat: "Infinity" }])
    await assert.rejects(propertyDataResolver({ key, fetcher: async () => response([bad]) })(address));
  await assert.rejects(propertyDataResolver({ key, fetcher: async () => response([candidate, candidate]) })(address));
  for (const status of [301, 401, 403, 429, 500]) {
    calls = 0; const r = propertyDataResolver({ key, fetcher: async () => { calls++; return new Response(key, { status }); } });
    await assert.rejects(r(address), e => e instanceof Error && !e.message.includes(key)); assert.equal(calls, 1);
  }
  await assert.rejects(propertyDataResolver({ key, fetcher: async () => { throw Error(key); } })(address), e => e instanceof Error && !e.message.includes(key));
  await assert.rejects(propertyDataResolver({ key, fetcher: async () => new Response("x".repeat(1_000_001), { headers: { "Content-Type": "application/json" } }) })(address));
});
