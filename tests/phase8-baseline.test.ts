import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("Phase 8 keeps applied migrations and legacy Snapshot/account/security fixtures byte-reproducible", async () => {
  const root = new URL("../", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("tests/fixtures/data/phase8-baseline.json", root), "utf8")) as { files: Record<string, string> };
  assert.ok(Object.keys(manifest.files).length >= 15);
  for (const [path, expected] of Object.entries(manifest.files)) {
    assert.match(path, /^(supabase\/(migrations|tests)\/|tests\/fixtures\/data\/)[A-Za-z0-9_.-]+\.(sql|ts)$/);
    const bytes = (await readFile(new URL(path, root), "utf8")).replace(/\r\n/g, "\n");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, `Legacy source changed: ${path}`);
  }
});
