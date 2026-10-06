import type { BusinessType } from "../wizard.ts";
import { uuid } from "../data/validation.ts";
export type Submission = { propertyId: string; businessType: BusinessType; nonce: string };
export function validateSubmission(value: unknown): Submission {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_submission");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 3 || Object.keys(row).some(key => !["propertyId", "businessType", "nonce"].includes(key)) || !uuid(row.propertyId) || !uuid(row.nonce) ||
    !["coffee-shop", "restaurant", "hair-salon", "beauty-salon"].includes(String(row.businessType))) throw new Error("invalid_submission");
  return { propertyId: row.propertyId, nonce: row.nonce, businessType: row.businessType as BusinessType };
}
export function sameOrigin(request: Request) {
  const expected = new URL(request.url);
  if (request.headers.get("host")) expected.host = request.headers.get("host")!;
  if (request.headers.get("x-forwarded-proto") === "https") expected.protocol = "https:";
  return request.headers.get("origin") === expected.origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function submissionBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length")) > 512) throw new Error("invalid_submission");
  const reader = request.body?.getReader(); if (!reader) throw new Error("invalid_submission");
  const parts: Uint8Array[] = []; let bytes = 0;
  while (true) { const item = await reader.read(); if (item.done) break; bytes += item.value.byteLength; if (bytes > 512) { await reader.cancel(); throw new Error("invalid_submission"); } parts.push(item.value); }
  return validateSubmission(JSON.parse(new TextDecoder().decode(Buffer.concat(parts))));
}
const flights = new Map<string, { nonce: string; hash: string; task: Promise<{ reportId: string; replay: boolean }> }>();
const attempts = new Map<string, { at: number; count: number }>();
export function ownedGeneration(owner: string, input: Submission, run: () => Promise<{ reportId: string; replay: boolean }>, now = Date.now()) {
  const hash = JSON.stringify({ propertyId: input.propertyId, businessType: input.businessType });
  const existing = flights.get(owner);
  if (existing) {
    if (existing.nonce === input.nonce && existing.hash === hash) return existing.task;
    throw new Error("generation_busy");
  }
  for (const [id, value] of attempts) if (now - value.at >= 3600000) attempts.delete(id);
  const attempt = attempts.get(owner);
  if ((attempt?.count ?? 0) >= 6 || flights.size >= 20 || !attempt && attempts.size >= 1000) throw new Error("generation_limit");
  attempts.set(owner, { at: attempt?.at ?? now, count: (attempt?.count ?? 0) + 1 });
  const task = Promise.resolve().then(run).finally(() => flights.delete(owner));
  flights.set(owner, { nonce: input.nonce, hash, task });
  return task;
}
