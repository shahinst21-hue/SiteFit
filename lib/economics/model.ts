import { object, text } from "../data/validation.ts";
import { decimal } from "./rational.ts";

export const fields = ["rent", "staff", "otherFixed", "ownerAllowance", "grossSpend", "grossMarginBps", "variableNetBps", "variablePerTrade", "cardGrossBps", "annualOpenDays", "dailyTrade", "annualGrossSales", "capacityPerDay", "unitsPerCustomer", "targetSurplus", "standardRatedShareBps"] as const;
export type Field = typeof fields[number];
export type Origin = "verified_source" | "provider_market_estimate" | "user_assumption" | "user_reported_document" | "illustrative_assumption";
export type Operand = { value: string | null; origin: Origin; reference: string | null; reason: string | null };
export type EconomicInput = { schemaVersion: 1; business: "coffee-shop" | "restaurant" | "hair-salon" | "beauty-salon";
  vat: "registered" | "not_registered" | "unknown"; costBasis: "net_recoverable" | "inclusive_nonrecoverable" | "unknown";
  tradeUnit: "transaction" | "cover" | "appointment"; otherFixedIncludes: string[]; operands: Record<Field, Operand> };
function closed(v: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(v).length !== allowed.length || Object.keys(v).some(k => !allowed.includes(k))) throw new Error("invalid_economic_contract");
}
export function validateEconomicInput(value: unknown): EconomicInput {
  const v = object(value); closed(v,["schemaVersion","business","vat","costBasis","tradeUnit","otherFixedIncludes","operands"]);
  if (v.schemaVersion !== 1 || !["coffee-shop","restaurant","hair-salon","beauty-salon"].includes(String(v.business)) ||
    !["registered","not_registered","unknown"].includes(String(v.vat)) || !["net_recoverable","inclusive_nonrecoverable","unknown"].includes(String(v.costBasis)) ||
    v.tradeUnit !== (v.business === "coffee-shop" ? "transaction" : v.business === "restaurant" ? "cover" : "appointment")) throw new Error("invalid_economic_contract");
  if (!Array.isArray(v.otherFixedIncludes) || v.otherFixedIncludes.length > 20 || !v.otherFixedIncludes.every(s => text(s,80)) || new Set(v.otherFixedIncludes).size !== v.otherFixedIncludes.length ||
    v.otherFixedIncludes.some(s => ["rent","staff","ownerAllowance","goods","commission"].includes(String(s)))) throw new Error("duplicate_cost_basis");
  const operands = object(v.operands); closed(operands,fields);
  for (const field of fields) {
    const p = object(operands[field]); closed(p,["value","origin","reference","reason"]);
    if (!["verified_source","provider_market_estimate","user_assumption","user_reported_document","illustrative_assumption"].includes(String(p.origin)) ||
      !(p.reference === null || text(p.reference,500)) || !(p.reason === null || text(p.reason,200))) throw new Error("invalid_provenance");
    if (p.value === null) { if (!p.reason) throw new Error("missing_reason_required"); continue; }
    if (typeof p.value !== "string") throw new Error("invalid_decimal");
    const parsed = decimal(p.value,1n);
    const max = field.endsWith("Bps") ? 10000n : field === "annualOpenDays" ? 366n : field === "grossSpend" ? 1000000n : 100000000n;
    if (parsed.n > max*parsed.d || ((field.endsWith("Bps") || field === "annualOpenDays") && parsed.d !== 1n) ||
      (["grossSpend","annualOpenDays","unitsPerCustomer"].includes(field) && parsed.n === 0n)) throw new Error("invalid_operand_range");
    if (["verified_source","provider_market_estimate","illustrative_assumption"].includes(String(p.origin)) && !p.reference) throw new Error("source_reference_required");
  }
  if (object(operands.dailyTrade).value !== null && object(operands.annualGrossSales).value !== null) throw new Error("duplicate_sales_driver");
  return v as unknown as EconomicInput;
}
