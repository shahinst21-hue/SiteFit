import "server-only";
import { frameworkClient } from "../data/server-client.ts";
import { uuid } from "../data/validation.ts";
import { validateComparison } from "./metrics.ts";
export function comparisonRepository() {
  const client = frameworkClient();
  return {
    async releases() {
      const { data, error } = await client.rpc("select_sitefit_analysis_releases").abortSignal(AbortSignal.timeout(2000));
      if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error("analysis_releases_unavailable");
      const row = data as Record<string, unknown>;
      if (!uuid(row.population) || !uuid(row.geography)) throw new Error("invalid_release_pair");
      return { population: row.population, geography: row.geography };
    },
    async residential(population: string, geography: string, code: string) {
      if (!uuid(population) || !uuid(geography) || !/^E00\d{6}$/.test(code)) throw new Error("invalid_comparison_request");
      const { data, error } = await client.rpc("lookup_sitefit_residential_comparison", {
        p_population_release: population, p_geography_release: geography, p_code: code,
      // Full geodesic cohort aggregation measured 5.5s in hosted development.
      // This bound is separate from the two-second release/context lookup.
      }).abortSignal(AbortSignal.timeout(10000));
      if (error) throw new Error("comparison_unavailable");
      return data === null ? null : validateComparison(data);
    },
  };
}
