import "server-only";
import { handleAddressOperation, type AddressOperation } from "./http";
import { addressProvider } from "./server-provider";
import { propertyRepository } from "./repository";
const windows = new Map<string, { count: number; until: number }>();
let total = { count: 0, until: 0 };
function allow(request: Request, operation: AddressOperation) {
  const now = Date.now();
  if (total.until <= now) {
    total = { count: 0, until: now + 300000 };
    for (const [key, value] of windows)
      if (value.until <= now) windows.delete(key);
  }
  const ip = (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"
  ).slice(0, 100);
  const key = `${ip}:${operation === "search" ? "search" : "paid"}`;
  const limit = operation === "search" ? 60 : 20;
  const entry = windows.get(key);
  const window =
    !entry || entry.until <= now ? { count: 0, until: now + 300000 } : entry;
  if (
    window.count >= limit ||
    total.count >= 500 ||
    (!entry && windows.size >= 10000)
  )
    return false;
  window.count++;
  total.count++;
  windows.set(key, window);
  return true;
}
export function addressRoute(request: Request, operation: AddressOperation) {
  return handleAddressOperation(request, operation, {
    provider: addressProvider,
    repository: propertyRepository,
    allow,
    log: (event) => console.warn("address_operation", JSON.stringify(event)),
  });
}
