import { createHash } from "node:crypto";
// JSONB changes object-key order. Hash semantic JSON, retaining array order.
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON((value as Record<string, unknown>)[key])}`).join(",")}}`;
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("invalid_canonical_json");
  return encoded;
}
export const packetDigest = (value: unknown) => createHash("sha256").update(canonicalJSON(value)).digest("hex");
