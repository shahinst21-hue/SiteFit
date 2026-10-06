import assert from "node:assert/strict";
import test from "node:test";
import { generateSnapshot } from "../lib/analysis/generate.ts";
import { context, ids } from "./fixtures/data/framework.ts";

test("failed frozen-input or unfinished-report reads stop before collection and AI", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY"];
  const saved = names.map(name => [name, process.env[name]] as const);
  const originalFetch = globalThis.fetch;
  const owner = "10000000-0000-0000-0000-000000000009";
  process.env.SUPABASE_URL = "https://database.example.invalid";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_synthetic_fixture";
  process.env.OPENAI_API_KEY = "sk-synthetic-fixture";
  try {
    for (const failure of ["input", "unfinished"] as const) {
      const calls: string[] = [];
      globalThis.fetch = async (input, init) => {
        const url = new URL(String(input)); calls.push(url.pathname);
        assert.equal(url.origin, "https://database.example.invalid");
        assert.ok(init?.signal, "Every direct generation database read is bounded");
        const ok = (value: unknown) => Response.json(value);
        const unavailable = () => Response.json({ code: "XX000", message: "synthetic private diagnostic" }, { status: 400 });
        if (url.pathname.endsWith("/rpc/submit_sitefit_analysis")) return ok({ id: ids.analysis, owner_id: owner });
        if (url.pathname.endsWith("/analysis_inputs")) return failure === "input" ? unavailable() : ok([{ resolved_context: context() }]);
        if (url.pathname.endsWith("/reports")) return url.searchParams.get("status") === "eq.ready" ? ok([]) : unavailable();
        assert.fail("Generation retried a provider or changed frozen context after a read failure");
      };
      await assert.rejects(generateSnapshot(owner, ids.property, "coffee-shop", ids.correlation),
        new RegExp(failure === "input" ? "^Error: stored_input_read_unavailable$" : "^Error: stored_report_read_unavailable$"));
      assert.deepEqual(calls, ["/rest/v1/rpc/submit_sitefit_analysis", "/rest/v1/reports", "/rest/v1/analysis_inputs",
        ...(failure === "unfinished" ? ["/rest/v1/reports"] : [])]);
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of saved) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
