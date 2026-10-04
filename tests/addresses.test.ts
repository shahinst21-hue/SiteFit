import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseManualAddress,
  normalisePostcode,
  emptyManualAddress,
  manualErrors,
} from "../lib/addresses/model.ts";
import {
  createPostioProvider,
  normalisePostioAddress,
} from "../lib/addresses/postio.ts";
import {
  AddressError,
  type AddressLookupProvider,
} from "../lib/addresses/provider.ts";
import {
  handleAddressOperation,
  type AddressRouteDependencies,
} from "../lib/addresses/http.ts";
import type {
  PropertySelection,
  ResolvedAddress,
} from "../lib/addresses/model.ts";
import type { PropertyRepository } from "../lib/addresses/service.ts";
const row = (id = 99999991) => ({
  udprn: id,
  postcode: "ZZ1 1ZZ",
  address_line_1: `Synthetic Unit ${id}`,
  post_town: "TEST TOWN",
  country: "England",
  organisation_name: "",
  sub_building_name: `Unit ${id}`,
  district: "Synthetic district",
  ward: "Synthetic ward",
  latitude: 51.5,
  longitude: -0.1,
});
function response(results: unknown[], status = 200, extra: object = {}) {
  return Response.json(
    {
      success: status === 200,
      results,
      meta: { countResults: results.length, requestId: "synthetic-request-id" },
      ...extra,
    },
    { status },
  );
}
function fetcher(
  value: Response,
  inspect?: (url: string, init: RequestInit) => void,
): typeof fetch {
  return async (input, init) => {
    inspect?.(String(input), init!);
    return value;
  };
}
test("postcode formatting is broad, UK-wide and rejects obviously malformed paid requests", () => {
  for (const input of ["KT2 7AU", "kt2 7au", " KT27AU ", "kt2   7au"])
    assert.equal(normalisePostcode(input), "KT2 7AU");
  for (const input of [
    "GIR0AA",
    "BX11LT",
    "BF10AA",
    "N1C4AG",
    "EC1A1BB",
    "EH11YZ",
    "CF101EP",
    "BT15GS",
  ])
    assert.ok(normalisePostcode(input));
  for (const input of [
    "",
    "KT2",
    "123456",
    "London",
    "KT2<script>",
    "KT2 7A",
    null,
    123,
  ])
    assert.equal(normalisePostcode(input), null);
});
test("normalisation preserves separate delivery points, useful components and postcode provenance", () => {
  const address = normalisePostioAddress(row());
  assert.equal(address.udprn, "99999991");
  assert.equal(address.providerAddressId, "99999991");
  assert.equal(address.uprn, null);
  assert.equal(address.components.organisation, null);
  assert.equal(address.components.subBuilding, "Unit 99999991");
  assert.equal(address.components.district, "Synthetic district");
  assert.equal(address.coordinatePrecision, "postcode_centroid");
  assert.equal(address.resolution, "provider_verified");
  assert.equal(address.country, "England");
  assert.equal("county" in address, false);
  assert.equal("eastings" in address, false);
  const missing = normalisePostioAddress({
    ...row(),
    country: undefined,
    district: undefined,
    ward: undefined,
    latitude: undefined,
    longitude: undefined,
  });
  assert.equal(missing.country, null);
  assert.equal(missing.latitude, null);
  assert.equal(missing.coordinatePrecision, "unknown");
  assert.throws(
    () => normalisePostioAddress({ ...row(), latitude: 500 }),
    AddressError,
  );
  assert.throws(
    () => normalisePostioAddress({ ...row(), udprn: 1.2 }),
    AddressError,
  );
  assert.throws(
    () => normalisePostioAddress({ ...row(), country: "outside UK" }),
    AddressError,
  );
});
test("Postio lookup sends the key only in the server header, returns all candidates and deduplicates IDs only", async () => {
  const provider = createPostioProvider(
    "inert-test-key",
    fetcher(response([row(), row(), row(99999992)]), (url, init) => {
      assert.equal(
        url,
        "https://api.postio.co.uk/v1/address/postcode/ZZ1%201ZZ",
      );
      assert.equal(
        new Headers(init.headers).get("x-api-key"),
        "inert-test-key",
      );
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      assert.ok(init.signal);
    }),
  );
  const result = await provider.lookupByPostcode("zz11zz");
  assert.equal(result.candidates.length, 2);
  assert.notEqual(
    result.candidates[0].reference,
    result.candidates[1].reference,
  );
  assert.equal(result.requestId, "synthetic-request-id");
  assert.equal(JSON.stringify(result).includes("inert-test-key"), false);
  assert.equal("latitude" in result.candidates[0], false);
  const empty = createPostioProvider("test", fetcher(response([])));
  assert.deepEqual((await empty.lookupByPostcode("ZZ1 1ZZ")).candidates, []);
});
test("invalid postcode/query/reference never calls a billable endpoint", async () => {
  let calls = 0;
  const provider = createPostioProvider("test", async () => {
    calls++;
    return response([]);
  });
  await assert.rejects(
    provider.lookupByPostcode("not a postcode"),
    AddressError,
  );
  await assert.rejects(provider.resolveAddress("../connect"), AddressError);
  await assert.rejects(provider.searchAddress("ab"), AddressError);
  assert.equal(calls, 0);
});
test("suggestions are bounded and the exact identifier resolves to a current record", async () => {
  const search = createPostioProvider(
    "test",
    fetcher(
      response([{ udprn: 99999991, suggestion: "Synthetic Unit A" }]),
      (url) => assert.match(url, /max_results=10$/),
    ),
  );
  assert.equal(
    (await search.searchAddress("Synthetic Unit")).candidates[0].reference,
    "99999991",
  );
  const resolve = createPostioProvider(
    "test",
    fetcher(response([row()]), (url) =>
      assert.match(url, /\/udprn\/99999991$/),
    ),
  );
  assert.equal(
    (await resolve.resolveAddress("99999991")).address.udprn,
    "99999991",
  );
  const mismatch = createPostioProvider(
    "test",
    fetcher(response([row(99999992)])),
  );
  await assert.rejects(mismatch.resolveAddress("99999991"), AddressError);
  const missing = createPostioProvider("test", fetcher(response([])));
  await assert.rejects(missing.resolveAddress("99999991"), {
    code: "not_found",
  });
});
test("provider HTTP/errors, redirects, network, malformed and oversized responses fail with safe metadata", async () => {
  for (const status of [400, 401, 402, 403, 429, 500]) {
    const provider = createPostioProvider(
      "test",
      fetcher(
        response([], status, {
          error: "private_account_details",
          details: "SECRET",
        }),
      ),
    );
    await assert.rejects(
      provider.lookupByPostcode("ZZ1 1ZZ"),
      (error: unknown) =>
        error instanceof AddressError &&
        error.code ===
          (status === 429
            ? "busy"
            : status === 400
              ? "invalid_input"
              : "unavailable") &&
        error.requestId === "synthetic-request-id" &&
        !error.message.includes("SECRET"),
    );
  }
  for (const value of [
    new Response("not json"),
    response([row()], 200, { meta: { countResults: 2 } }),
    new Response("x".repeat(2_000_001)),
  ]) {
    await assert.rejects(
      createPostioProvider("test", fetcher(value)).lookupByPostcode("ZZ1 1ZZ"),
      AddressError,
    );
  }
  await assert.rejects(
    createPostioProvider("test", async () => {
      throw new Error("private transport state");
    }).lookupByPostcode("ZZ1 1ZZ"),
    { code: "unavailable" },
  );
  assert.deepEqual(
    await createPostioProvider(
      "test",
      fetcher(
        Response.json({ success: true, meta: { requestId: "health-test" } }),
      ),
    ).healthCheck(),
    { requestId: "health-test" },
  );
});
test("manual addresses keep missing geography/coordinates unknown and have no provider or UPRN", () => {
  assert.equal(Object.keys(manualErrors(emptyManualAddress())).length, 3);
  const manual = normaliseManualAddress({
    line1: "  Synthetic Unit A  ",
    line2: "",
    town: " Test Town ",
    postcode: "zz11zz",
  });
  assert.equal(manual.formattedAddress, "Synthetic Unit A, Test Town, ZZ1 1ZZ");
  assert.equal(manual.resolution, "manual_unverified");
  assert.equal(manual.country, null);
  for (const key of [
    "provider",
    "providerAddressId",
    "udprn",
    "uprn",
    "latitude",
    "longitude",
    "coordinateSource",
  ] as const)
    assert.equal(manual[key], null);
});
function request(body: unknown, origin = "https://sitefit.invalid") {
  return new Request("https://sitefit.invalid/api/addresses/lookup", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function dependencies() {
  const saved: ResolvedAddress[] = [];
  const events: unknown[] = [];
  const provider: AddressLookupProvider = createPostioProvider(
    "test",
    fetcher(response([row()])),
  );
  const repository: PropertyRepository = {
    async upsertSelected(address) {
      saved.push(address);
      return {
        ...address,
        id: "00000000-0000-4000-8000-000000000004",
        resolvedAt: "2026-10-04T12:00:00Z",
      } satisfies PropertySelection;
    },
  };
  const deps: AddressRouteDependencies = {
    provider: () => provider,
    repository: () => repository,
    allow: () => true,
    log: (event) => events.push(event),
  };
  return { deps, saved, events };
}
test("same-origin validation uses the incoming host behind Next canonicalisation", async () => {
  const { deps } = dependencies();
  const request = new Request("http://localhost:3000/api/addresses/lookup", {
    method: "POST",
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.equal((await handleAddressOperation(request, "lookup", deps)).status, 400);
});
test("anonymous same-origin postcode and empty lists work; invalid/cross-origin/oversized inputs spend nothing", async () => {
  const { deps } = dependencies();
  let calls = 0;
  deps.provider = () => {
    calls++;
    return createPostioProvider("test", fetcher(response([])));
  };
  const valid = await handleAddressOperation(
    request({ postcode: "zz11zz" }),
    "lookup",
    deps,
  );
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), {
    postcode: "ZZ1 1ZZ",
    candidates: [],
    count: 0,
  });
  assert.equal(valid.headers.get("cache-control"), "private, no-store");
  assert.equal(
    (await handleAddressOperation(request({ postcode: "bad" }), "lookup", deps))
      .status,
    400,
  );
  assert.equal(
    (
      await handleAddressOperation(
        request({ postcode: "ZZ1 1ZZ" }, "https://foreign.invalid"),
        "lookup",
        deps,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleAddressOperation(
        request({ postcode: "ZZ1 1ZZ", extra: "x".repeat(5000) }),
        "lookup",
        deps,
      )
    ).status,
    400,
  );
  assert.equal(calls, 1);
});
test("server selection ignores forged labels, coordinates, resolution and UPRN", async () => {
  const { deps, saved } = dependencies();
  const selected = await handleAddressOperation(
    request({
      reference: "99999991",
      formattedAddress: "FORGED",
      uprn: "99999991",
      resolution: "provider_verified",
      latitude: 0,
    }),
    "resolve",
    deps,
  );
  assert.equal(selected.status, 200);
  assert.equal(saved.length, 1);
  assert.notEqual(saved[0].formattedAddress, "FORGED");
  assert.equal(saved[0].uprn, null);
  assert.equal(saved[0].latitude, 51.5);
  assert.equal(
    (await selected.json()).property.id,
    "00000000-0000-4000-8000-000000000004",
  );
});
test("missing trusted write credential fails before a paid resolve; throttling and logs expose no payload", async () => {
  const { deps, events } = dependencies();
  let calls = 0;
  deps.provider = () => {
    calls++;
    throw new Error("SECRET");
  };
  deps.repository = () => {
    throw new AddressError("configuration");
  };
  const missing = await handleAddressOperation(
    request({ reference: "99999991" }),
    "resolve",
    deps,
  );
  assert.equal(missing.status, 503);
  assert.equal(calls, 0);
  assert.deepEqual(events, [
    { operation: "resolve", code: "configuration", requestId: null },
  ]);
  deps.allow = () => false;
  assert.equal(
    (
      await handleAddressOperation(
        request({ postcode: "ZZ1 1ZZ" }),
        "lookup",
        deps,
      )
    ).status,
    429,
  );
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(events).includes("SECRET"), false);
});
test("manual route validates necessary fields and never calls Postio", async () => {
  const { deps, saved } = dependencies();
  deps.provider = () => {
    throw new Error("Manual fallback must not call a provider");
  };
  assert.equal(
    (
      await handleAddressOperation(
        request({ line1: "", line2: "", town: "", postcode: "" }),
        "manual",
        deps,
      )
    ).status,
    400,
  );
  const result = await handleAddressOperation(
    request({
      line1: "Synthetic Unit A",
      line2: "",
      town: "Test Town",
      postcode: "ZZ1 1ZZ",
      provider: "postio",
      udprn: "99999991",
    }),
    "manual",
    deps,
  );
  assert.equal(result.status, 200);
  assert.equal(saved[0].resolution, "manual_unverified");
  assert.equal(saved[0].udprn, null);
});
