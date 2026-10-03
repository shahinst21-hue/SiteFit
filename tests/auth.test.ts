import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authDestination,
  authFailure,
  callbackCredentials,
  completeAuthCallback,
  emailInput,
} from "../lib/auth/flow.ts";
import { readPublicSupabaseConfig } from "../lib/supabase/config.ts";
test("auth inputs reject open redirects, provider error text and invalid emails", () => {
  for (const value of [
    "https://evil.invalid",
    "//evil.invalid",
    "/%2f%2fevil.invalid",
    "/auth/confirm",
    "/account?next=evil",
    "\\evil",
    ["/check-location"],
  ])
    assert.equal(authDestination(value), "/account");
  assert.equal(authDestination("/check-location"), "/check-location");
  assert.equal(emailInput(" test@example.invalid "), "test@example.invalid");
  for (const value of [
    "bad",
    "a@b",
    "\na@example.invalid\nx",
    null,
    "a".repeat(255) + "@example.invalid",
  ])
    assert.equal(emailInput(value), null);
  assert.equal(authFailure("<script>"), null);
  assert.equal(authFailure("invalid-link"), "invalid-link");
});
test("callback rejects missing, mixed, repeated and wrong-purpose credentials", () => {
  const token = "a".repeat(64);
  const code = "valid-test-code-0123456789";
  assert.deepEqual(callbackCredentials(new URLSearchParams({ code })), {
    kind: "code",
    value: code,
  });
  assert.deepEqual(
    callbackCredentials(
      new URLSearchParams({ token_hash: token, type: "email" }),
    ),
    { kind: "email", value: token },
  );
  for (const value of [
    "",
    `token_hash=${token}&type=recovery`,
    `code=${code}&code=${code}`,
    `code=${code}&token_hash=${token}&type=email`,
    `code=${code}&error=denied`,
    `token_hash=${token}&type=email&type=recovery`,
    `code=<script>`,
  ])
    assert.equal(callbackCredentials(new URLSearchParams(value)), null);
});
test("callback exchanges correct credential and fails closed on expiry/network failure", async () => {
  const calls: unknown[] = [];
  const auth = {
    exchangeCodeForSession: async (value: string) => {
      calls.push(value);
      return { error: null };
    },
    verifyOtp: async (value: unknown) => {
      calls.push(value);
      return { error: null };
    },
  };
  assert.equal(
    await completeAuthCallback({ kind: "code", value: "code" }, auth),
    true,
  );
  assert.equal(
    await completeAuthCallback({ kind: "email", value: "hash" }, auth),
    true,
  );
  assert.deepEqual(calls, ["code", { token_hash: "hash", type: "email" }]);
  assert.equal(
    await completeAuthCallback(
      { kind: "code", value: "expired" },
      {
        ...auth,
        exchangeCodeForSession: async () => ({
          error: { code: "otp_expired" },
        }),
      },
    ),
    false,
  );
  assert.equal(
    await completeAuthCallback(
      { kind: "email", value: "hash" },
      {
        ...auth,
        verifyOtp: async () => {
          throw new Error("secret must not escape");
        },
      },
    ),
    false,
  );
});
test("browser config accepts only publishable keys and safe origins", () => {
  const env = {
    SUPABASE_URL: "https://project.example.invalid",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
  };
  assert.deepEqual(readPublicSupabaseConfig(env), {
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  });
  for (const key of ["sb_secret_test", "service_role", "eyJlegacyjwt", ""])
    assert.equal(
      readPublicSupabaseConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: key }),
      null,
    );
  for (const url of [
    "https://user:pass@project.example.invalid",
    "https://project.example.invalid/path",
    "http://external.example.invalid",
    "https://project.example.invalid?key=x",
  ])
    assert.equal(readPublicSupabaseConfig({ ...env, SUPABASE_URL: url }), null);
  assert.equal(readPublicSupabaseConfig({}), null);
});
