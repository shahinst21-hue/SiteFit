import test from "node:test";
import assert from "node:assert/strict";
import { accountHistory } from "../lib/auth/account-history.ts";

test("owned history keeps original report IDs even when optional display metadata is absent", () => {
  const id = "72ba76a3-ffc8-4e12-9264-3b9c04aa814a";
  assert.deepEqual(accountHistory([{ id, address: "Original stored property", businessType: "coffee-shop", generatedAt: "2026-10-06T10:00:00Z" }]),
    [{ id, address: "Original stored property", business: "coffee-shop", generatedAt: "2026-10-06T10:00:00Z" }]);
  for (const generatedAt of [null, undefined, "invalid date"]) {
    assert.equal(accountHistory([{ id, address: "Original stored property", generatedAt }])[0]?.id, id);
    assert.equal(accountHistory([{ id, generatedAt }])[0]?.generatedAt, null);
  }
  assert.deepEqual(accountHistory([{ id }]), [{ id, address: "Saved Snapshot", business: "", generatedAt: null }]);
  assert.deepEqual(accountHistory([null, [], {}, { id: "../../foreign" }]), []);
  assert.deepEqual(accountHistory(null), []);
});
