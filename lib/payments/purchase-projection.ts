import { purchaseUuid } from "../auth/purchase-flow.ts";

// Accept only the current, owner-scoped database projection. The return page
// independently verifies ownership and reads the durable payment again.
export function activePurchaseId(value: unknown, expectedTest:boolean): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const purchase = value as Record<string, unknown>;
  return typeof purchase.id === "string" && purchaseUuid(purchase.id)
    && purchase.status === "succeeded" && purchase.access === "active"
    && purchase.test === expectedTest && purchase.reportGenerated === false
    ? purchase.id : null;
}
export function activeTestPurchaseId(value:unknown){return activePurchaseId(value,true);}
