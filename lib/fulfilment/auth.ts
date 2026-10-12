import "server-only";
import { timingSafeEqual } from "node:crypto";
export function runnerAuthorised(header: string | null, secret: string | undefined) {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret) || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7)), expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
