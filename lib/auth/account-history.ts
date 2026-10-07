import { uuid } from "../data/validation.ts";

// Missing presentation metadata must not hide an otherwise owned stored report.
// Ownership is established by the caller-scoped database RPC, never this parser.
export function accountHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item) || !uuid(item.id)) return [];
    return [{
      id: item.id as string,
      address: typeof item.address === "string" && item.address.trim() ? item.address : "Saved Snapshot",
      business: typeof item.businessType === "string" ? item.businessType : "",
      generatedAt: typeof item.generatedAt === "string" && Number.isFinite(Date.parse(item.generatedAt)) ? item.generatedAt : null,
    }];
  });
}
