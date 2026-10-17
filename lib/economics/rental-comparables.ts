/** Property-market comparables, never evidence of named business competition. */
export function commercialComparableTypes(business: string): readonly string[] {
  if (business === "coffee-shop") return ["restaurants", "retail"];
  if (business === "restaurant") return ["restaurants"];
  if (["hair-salon", "beauty-salon", "hair-beauty-salon"].includes(business)) return ["retail"];
  throw Error("unsupported_rental_business");
}
export function comparableRelevance(type: string) {
  return type === "restaurants" ? "Food-service activity comparator; kitchen, size and lease requirements may differ from a coffee shop."
    : "Retail property-market comparator; local geography and typical unit size may be useful, but food-service permissions and fit-out are not established.";
}
