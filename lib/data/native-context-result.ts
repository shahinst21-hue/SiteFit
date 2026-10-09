import { object, uuid } from "./validation.ts";
import { nativeComparison } from "../analysis/native-comparison.ts";
import { SourceError } from "./errors.ts";

export type NativeContextResult = {schemaVersion: 1; kind: "native_context"; oaCode: string;
  oaReleaseId: string; nativeReleaseId: string; distribution: Record<string, unknown>};
/** Retain compact native operands once; reconstruct the existing descriptive
 * comparator on demand, without persisting duplicate transformed distributions. */
export function validateNativeContextResult(value: unknown): NativeContextResult {
  const p = object(value), d = object(p.distribution), target = object(d.target), geography = object(target.geography);
  if (Object.keys(p).sort().join() !== "distribution,kind,nativeReleaseId,oaCode,oaReleaseId,schemaVersion" ||
    p.schemaVersion !== 1 || p.kind !== "native_context" || !/^E00\d{6}$/.test(String(p.oaCode)) ||
    !uuid(p.oaReleaseId) || !uuid(p.nativeReleaseId) || !uuid(d.releaseId) || d.geographyReleaseId !== p.nativeReleaseId)
    throw new SourceError("invalid_response");
  nativeComparison(d, d.releaseId, p.nativeReleaseId, String(geography.code));
  return structuredClone(value) as NativeContextResult;
}
