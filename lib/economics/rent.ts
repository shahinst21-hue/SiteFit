import { object, text, timestamp, uuid } from "../data/validation.ts";
import { normalisePostcode } from "../addresses/model.ts";
import type { normaliseRentBenchmark } from "../data/adapters/propertydata-facts.ts";

export type RentalArea = { value: string; unit: "sqft" | "sqm"; basis: "GIA" | "NIA" | "unknown";
  propertyId: string; exactUnit: boolean; sourceReference: string; observedAt: string; origin: "verified_source" | "user_reported_document" };
export const rentalPolicy = { version:"propertydata-rental-2026-10-09",source:"https://propertydata.co.uk/api/documentation/licensing",
  retention:"dated_historical_observation_not_current_cache",currentCacheDays:60,rawResponseRetained:false,attribution:"PropertyData",rights:"enhanced_customer_report_historical_snapshot" } as const;
export function compatibleRentalArea(area: RentalArea | null, propertyId: string): area is RentalArea {
  return !!area && uuid(propertyId) && area.propertyId===propertyId && area.exactUnit && area.basis==="GIA" &&
    ["sqft","sqm"].includes(area.unit) && typeof area.value==="string" && /^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(area.value) && Number(area.value)>0 &&
    text(area.sourceReference,500) && timestamp(area.observedAt) && ["verified_source","user_reported_document"].includes(area.origin);
}
export function normaliseCommercialValuation(value: unknown, expected: {postcode:string;type:"retail"|"restaurants";area:RentalArea;propertyId:string}, retrievedAt: string) {
  if (!compatibleRentalArea(expected.area,expected.propertyId)||!timestamp(retrievedAt)) throw new Error("incompatible_rental_area");
  const root=object(value),params=object(root.params),r=object(root.result);
  if (root.status!=="success" || normalisePostcode(root.postcode)!==normalisePostcode(expected.postcode) ||
    String(params.property_type).toLowerCase()!==expected.type || Number(params.internal_area)!==Number(expected.area.value) || params.area_unit!==expected.area.unit ||
    ![r.estimate_annual,r.estimate_monthly,r.margin_annual,r.per_sqf].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0) || Number(r.estimate_annual)<=0) throw new Error("invalid_rental_response");
  return {schemaVersion:1 as const,kind:"property_specific_estimated_rent" as const,propertyId:expected.propertyId,postcode:expected.postcode,type:expected.type,area:expected.area,
    poundsPerYear:Number(r.estimate_annual),poundsPerMonth:Number(r.estimate_monthly),reportedMarginPoundsYear:Number(r.margin_annual),providerPoundsPerSqft:Number(r.per_sqf),
    marginMeaning:"provider_reported_plus_minus_not_statistical_confidence" as const,classification:"market_estimate_not_agreed_lease" as const,retrievedAt,sourceDate:null,policy:rentalPolicy,
    limitations:["postcode_type_area_model_not_exact_unit_lease","incentives_VAT_rates_service_charge_excluded_or_unknown","provider_model_vintage_unknown"]};
}
export type RentalValuation=ReturnType<typeof normaliseCommercialValuation>;
export function rentalReportProjection(propertyId:string,benchmark:(ReturnType<typeof normaliseRentBenchmark>&{retrievedAt:string})|null,valuation:RentalValuation|null) {
  if (!uuid(propertyId))throw new Error("invalid_rental_property");
  if (valuation && valuation.propertyId!==propertyId) throw new Error("foreign_rental_valuation");
  if (benchmark && (!timestamp(benchmark.retrievedAt)||benchmark.kind!=="commercial_rent_candidate"||benchmark.admitted!==false||!["NIA","GIA"].includes(benchmark.areaBasis))) throw new Error("invalid_rental_benchmark");
  return {schemaVersion:1,propertyId,benchmark:benchmark?{classification:"local_modelled_asking_rent_benchmark",state:benchmark.pointsAnalysed>0&&benchmark.poundsPerSqftYear>0?"qualified":"unavailable",poundsPerSqftYear:benchmark.poundsPerSqftYear,averagePoundsYear:benchmark.poundsPerYear,
    selectedPremisesRent:null,sample:benchmark.pointsAnalysed,areaBasis:benchmark.areaBasis,type:benchmark.type,retrievedAt:benchmark.retrievedAt,sourceDate:benchmark.sourceDate,
    nativeRadius:benchmark.nativeRadius,radiusUnits:benchmark.radiusUnits,dispersion:benchmark.dispersion,policy:rentalPolicy,limitations:benchmark.missing}:null,
    valuation,propertySpecificState:valuation?"available":"unavailable",propertySpecificReason:valuation?null:"credible_compatible_exact_unit_area_or_valuation_unavailable",
    financialCalculationsIncluded:false,engineInputsRequired:false};
}
