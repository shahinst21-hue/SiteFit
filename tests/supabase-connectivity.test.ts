import assert from "node:assert/strict";
import test from "node:test";
import { readSupabaseConnection, verifySupabaseConnection } from "../scripts/supabase-connectivity.ts";

// Reserved non-resolving host and inert test value; never used for a live request.
const env = { SUPABASE_URL: "https://example.invalid", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_UNIT_TEST_ONLY" };

test("missing configuration fails with variable names and no values", () => {
  assert.throws(() => readSupabaseConnection({}), /Set SUPABASE_URL/);
  assert.throws(() => readSupabaseConnection({ SUPABASE_URL: env.SUPABASE_URL }), /Set SUPABASE_PUBLISHABLE_KEY/);
});

test("rejects insecure remote origins, embedded credentials and non-origin URLs", () => {
  for (const url of ["not a URL", "http://example.invalid", "https://user:password@example.invalid", "https://example.invalid/path", "https://example.invalid?key=value", "https://example.invalid/#fragment"]) {
    assert.throws(() => readSupabaseConnection({ ...env, SUPABASE_URL: url }), /SUPABASE_URL/);
  }
  assert.equal(readSupabaseConnection({ ...env, SUPABASE_URL: "http://127.0.0.1:54321" }).url.port, "54321");
});

test("accepts only publishable keys and never repeats rejected values", () => {
  for (const key of ["sb_secret_UNIT_TEST_ONLY", "legacy-key", "malformed-value"]) {
    assert.throws(() => readSupabaseConnection({ ...env, SUPABASE_PUBLISHABLE_KEY: key }), (error: unknown) =>
      error instanceof Error && !error.message.includes(key) && error.message.includes("publishable key"));
  }
});

test("read-only Data API probe authenticates, bounds time and refuses redirects", async () => {
  await verifySupabaseConnection(readSupabaseConnection(env), async (url, init) => {
    assert.equal(url.href, "https://example.invalid/rest/v1/__sitefit_infrastructure_probe__");
    assert.equal(init.method, "GET");
    assert.equal(new Headers(init.headers).get("apikey"), env.SUPABASE_PUBLISHABLE_KEY);
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ code: "PGRST205" }, { status: 404 });
  });
});

test("HTTP failure does not expose the provider response body", async () => {
  await assert.rejects(verifySupabaseConnection(readSupabaseConnection(env), async () =>
    new Response("sensitive provider detail", { status: 401 })), /^Error: Supabase Data API returned an unexpected response \(HTTP 401\)\.$/);
});

test("network errors are redacted", async () => {
  await assert.rejects(verifySupabaseConnection(readSupabaseConnection(env), async () => {
    throw new Error("sensitive network detail");
  }), /^Error: Supabase Data API request failed or timed out\./);
});

test("a successful HTTP status alone cannot establish connectivity", async () => {
  for (const body of ["not JSON", "null", "{}", '{"message":"ok"}', '{"swagger":null,"paths":null}', '{"swagger":"2.0","paths":[]}']) {
    await assert.rejects(verifySupabaseConnection(readSupabaseConnection(env), async () => new Response(body)), /unexpected response|absent diagnostic relation/);
  }
});

test("a generic 404 or a real relation cannot pass the diagnostic", async () => {
  for (const [status, code] of [[404, "NOT_FOUND"], [200, "PGRST205"], [500, "PGRST205"]] as const) {
    await assert.rejects(verifySupabaseConnection(readSupabaseConnection(env), async () =>
      Response.json({ code }, { status })), /absent diagnostic relation/);
  }
});
