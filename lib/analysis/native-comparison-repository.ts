import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { SourceError } from "../data/errors.ts";
import { uuid } from "../data/validation.ts";
import { nativeComparison } from "./native-comparison.ts";

export function nativeComparisonRepository() {
  return {async comparison(releaseId: string, geographyReleaseId: string, code: string, signal?: AbortSignal) {
    if (!uuid(releaseId) || !uuid(geographyReleaseId) || !/^E0[12]\d{6}$/.test(code)) throw new SourceError("invalid_request");
    const client = frameworkClient();
    const {data, error} = await client.rpc("lookup_sitefit_native_comparison", {
      p_release_id: releaseId, p_geography_release_id: geographyReleaseId, p_code: code,
    }).abortSignal(signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000));
    if (error) throw new SourceError("provider_unavailable");
    if (data === null) return null;
    if (JSON.stringify(data).length > 2_000_000) throw new SourceError("invalid_response");
    return nativeComparison(data, releaseId, geographyReleaseId, code);
  }};
}
