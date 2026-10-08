import "server-only";
import type { DataAdapter } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { safeError } from "../errors.ts";
import { validateContext, validateResult } from "../validation.ts";
import { propertyDataFacts, type PropertyFactsSelection } from "./propertydata-facts.ts";

export function premisesAdapter(id: "propertydata-premises" | "propertydata-flood" | "propertydata-rent",
  factory: () => ReturnType<typeof propertyDataFacts> = () => propertyDataFacts({key: process.env.PROPERTYDATA_API_KEY})): DataAdapter {
  const source = definitions[id];
  return {source, supports: c => coverage(id, c), async retrieve(request, execution) {
    validateContext(request.context);
    const r = initialResult(source, request, execution), eligible = coverage(id, request.context);
    if (!eligible.eligible) {r.outcome = eligible.outcome; r.error = {code: eligible.code, retryable: false, status: null}; return validateResult(r);}
    const identity = request.context.enrichment!.identity, start = performance.now();
    const selected: PropertyFactsSelection = {uprn: identity.uprn!, address: request.context.selectedProperty.formattedAddress,
      point: identity.point!, osReleaseId: request.context.enrichment!.releases.osReleaseId,
      coordinateBasis: "address_building_not_entrance", selectedParts: identity.selectedParts!, classificationCode: null, classificationDescription: null};
    try {
      const provider = factory();
      const binding = {uprn: selected.uprn, point: selected.point, osReleaseId: selected.osReleaseId};
      r.meta.execution.attempts = 1;
      if (id === "propertydata-premises") r.payload = {schemaVersion: 1, kind: "property_fact", binding,
        operation: "uprn", facts: await provider.premises(selected, execution.signal)};
      else if (id === "propertydata-flood") r.payload = {schemaVersion: 1, kind: "property_fact", binding,
        operation: "flood-risk", facts: await provider.flood(selected, execution.signal)};
      else r.payload = {schemaVersion: 1, kind: "property_fact", binding,
        operation: "rents-commercial", facts: await provider.rent(selected, "restaurants", execution.signal)};
      r.outcome = "partial";
      r.meta.sourceRetrievedAt = r.payload.facts.retrievedAt;
      r.meta.quality.missing = ["source_publication_date", "source_model_vintage", "verified_trading_unit_extent"];
      r.meta.cost = {units: r.payload.facts.cost.observedCredits ?? r.payload.facts.cost.estimatedCreditCeiling,
        money: null, currency: null, category: r.payload.facts.cost.observedCredits === null ? "estimated" : "observed",
        priceReference: "https://propertydata.co.uk/api/pricing"};
      r.limitations = id === "propertydata-premises" ? ["Provider classification is not authoritative planning consent; commercial rates, non-domestic certificate and area remain unavailable."] :
        id === "propertydata-flood" ? ["Point rivers/sea context does not cover surface water, premises extent or overall premises risk."] :
        ["Unadmitted modelled quoting-rent candidate: source vintage, radius units, dispersion and selected-format comparability remain unproven; not an achieved lease or actual user rent."];
      r.observations = [{id: selected.uprn, recordId: selected.uprn, path: "facts", reference: `https://propertydata.co.uk/api/documentation/${r.payload.operation}`,
        observedAt: null, units: id === "propertydata-rent" ? "GBP_sqft_year_candidate" : "qualified_property_context",
        geography: null, sourceClass: "commercial_data", kind: id === "propertydata-premises" ? "direct_register" : "modelled", limitations: [...r.limitations]}];
    } catch (error) {r.outcome = "unavailable"; r.payload = null; r.observations = []; r.error = safeError(error);}
    r.meta.execution.durationMs = Math.round(performance.now() - start); r.meta.retrievedAt = execution.now().toISOString();
    r.meta.quality.limitations = [...r.limitations]; return validateResult(r);
  }};
}
