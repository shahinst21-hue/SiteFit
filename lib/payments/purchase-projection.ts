import { purchaseUuid } from "../auth/purchase-flow.ts";

// Accept only the current, owner-scoped database projection. The return page
// independently verifies ownership and reads the durable payment again.
export function activeTestPurchaseId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const purchase = value as Record<string, unknown>;
  return typeof purchase.id === "string" && purchaseUuid(purchase.id)
    && purchase.status === "succeeded" && purchase.access === "active"
    && purchase.test === true && purchase.reportGenerated === false
    ? purchase.id : null;
}
