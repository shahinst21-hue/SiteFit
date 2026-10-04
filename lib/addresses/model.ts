export const ukCountries = [
  "England",
  "Scotland",
  "Wales",
  "Northern Ireland",
] as const;
export type UkCountry = (typeof ukCountries)[number];
export type AddressComponents = {
  organisation: string | null;
  department: string | null;
  subBuilding: string | null;
  buildingName: string | null;
  buildingNumber: string | null;
  thoroughfare: string | null;
  dependentThoroughfare: string | null;
  dependentLocality: string | null;
  doubleDependentLocality: string | null;
  poBox: string | null;
  district: string | null;
  ward: string | null;
};
export type ResolvedAddress = {
  formattedAddress: string;
  lines: string[];
  postcode: string;
  postTown: string;
  country: UkCountry | null;
  components: AddressComponents;
  provider: string | null;
  providerAddressId: string | null;
  udprn: string | null;
  uprn: null;
  latitude: number | null;
  longitude: number | null;
  coordinatePrecision: "postcode_centroid" | "unknown";
  coordinateSource: string | null;
  resolution: "provider_verified" | "manual_unverified";
};
export type PropertySelection = ResolvedAddress & {
  id: string;
  resolvedAt: string;
};
export type AddressCandidate = { reference: string; label: string };
export type LookupResult = {
  candidates: AddressCandidate[];
  requestId: string | null;
};
export type ManualAddress = {
  line1: string;
  line2: string;
  town: string;
  postcode: string;
};
export const emptyManualAddress = (): ManualAddress => ({
  line1: "",
  line2: "",
  town: "",
  postcode: "",
});
export function hasControlCharacters(value: string) {
  return Array.from(value).some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );
}
export function normalisePostcode(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 20) return null;
  const compact = value.trim().toUpperCase().replace(/\s+/g, "");
  // Broad structural gate, not a PAF validity oracle. Includes GIR and BX edge cases.
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact) && compact !== "GIR0AA")
    return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
export function validReference(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,11}$/.test(value);
}
export function normaliseQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  return query.length >= 4 &&
    query.length <= 160 &&
    !hasControlCharacters(query)
    ? query
    : null;
}
export function manualErrors(
  value: ManualAddress,
): Partial<Record<keyof ManualAddress, string>> {
  const errors: Partial<Record<keyof ManualAddress, string>> = {};
  if (
    value.line1.trim().length < 3 ||
    value.line1.trim().length > 180 ||
    hasControlCharacters(value.line1)
  )
    errors.line1 = "Enter address line 1, using 3–180 characters.";
  if (value.line2.trim().length > 180 || hasControlCharacters(value.line2))
    errors.line2 = "Use up to 180 characters for address line 2.";
  if (
    !value.town.trim() ||
    value.town.trim().length > 100 ||
    hasControlCharacters(value.town)
  )
    errors.town = "Enter the town or city, using up to 100 characters.";
  if (!normalisePostcode(value.postcode))
    errors.postcode = "Enter a valid UK postcode.";
  return errors;
}
export function normaliseManualAddress(value: ManualAddress): ResolvedAddress {
  if (Object.keys(manualErrors(value)).length)
    throw new Error("Review the address details.");
  const lines = [value.line1.trim(), value.line2.trim()].filter(Boolean);
  const postcode = normalisePostcode(value.postcode)!;
  const postTown = value.town.trim();
  return {
    formattedAddress: [...lines, postTown, postcode].join(", "),
    lines,
    postcode,
    postTown,
    country: null,
    components: {
      organisation: null,
      department: null,
      subBuilding: null,
      buildingName: null,
      buildingNumber: null,
      thoroughfare: null,
      dependentThoroughfare: null,
      dependentLocality: null,
      doubleDependentLocality: null,
      poBox: null,
      district: null,
      ward: null,
    },
    provider: null,
    providerAddressId: null,
    udprn: null,
    uprn: null,
    latitude: null,
    longitude: null,
    coordinatePrecision: "unknown",
    coordinateSource: null,
    resolution: "manual_unverified",
  };
}
