import test from "node:test";
import assert from "node:assert/strict";
import { activeTestPurchaseId } from "../lib/payments/purchase-projection.ts";

test("returning purchase recovery admits only a complete active Test projection", () => {
  const id = "ffc2fa96-1f39-49ba-aeda-ee3ada803300";
  const confirmed = { id, status: "succeeded", access: "active", test: true, reportGenerated: false };
  assert.equal(activeTestPurchaseId(confirmed), id);
  for (const value of [null, undefined, [], id, {},
    { ...confirmed, id: "https://outside.example" },
    { ...confirmed, status: "pending" }, { ...confirmed, status: "refunded" },
    { ...confirmed, access: "suspended" }, { ...confirmed, access: "revoked" },
    { ...confirmed, test: false }, { ...confirmed, test: "true" },
    { ...confirmed, reportGenerated: true }, { ...confirmed, reportGenerated: undefined }]) {
    assert.equal(activeTestPurchaseId(value), null);
  }
});
