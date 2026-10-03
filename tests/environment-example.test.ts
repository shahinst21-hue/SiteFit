import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tracked environment template contains only names with empty values", () => {
  const lines = readFileSync(new URL("../.env.example", import.meta.url), "utf8")
    .split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  assert.ok(lines.length > 0, "Environment template must define the required names.");
  assert.ok(lines.every((line) => /^[A-Z_]+=$/.test(line)), "Environment template must never contain configured values.");
  assert.ok(lines.includes("SUPABASE_URL=") && lines.includes("SUPABASE_PUBLISHABLE_KEY="), "Required diagnostic names must exist.");
});
