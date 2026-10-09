import { fields, validateEconomicInput, type Field } from "./model.ts";
import { add, sub, mul, div, fraction, decimal, rounded, serialise, type Rational } from "./rational.ts";

export const economicRules = Object.freeze({ version: "uk-vat-2026-10-09", standardRateBps: 2000, taxableThresholdPence: "9000000",
  sources: ["https://www.gov.uk/vat-rates","https://www.gov.uk/how-vat-works/vat-thresholds"], attribution: "Contains public sector information licensed under the Open Government Licence v3.0." });
type State = "available" | "missing_input" | "unavailable" | "not_applicable" | "no_finite_break_even";
export type EconomicMetric = { state: State; unit: string; exact: ReturnType<typeof serialise> | null; display: string | null; operands: string[]; reasons: string[] };
/** Conditional planning arithmetic, no sales forecast or provider dispatch. Monetary units are pence. */
export function calculateEconomics(value: unknown) {
  const input = validateEconomicInput(value), p = input.operands;
  const v = (f: Field) => p[f].value === null ? null : decimal(p[f].value!, f.endsWith("Bps") ? 1n : ["annualOpenDays","dailyTrade","capacityPerDay","unitsPerCustomer"].includes(f) ? 1n : 100n);
  const out: Record<string, EconomicMetric> = {}, warnings: string[] = [];
  const metric = (name: string, amount: Rational | null, unit: string, dependencies: readonly Field[], state: State = "missing_input", reasons: string[] = [], ceil = false) => {
    out[name] = {state: amount ? "available" : state, unit, exact:amount ? serialise(amount):null, display:amount ? rounded(amount,ceil):null,
      operands: dependencies.map(f=>`operands.${f}`), reasons:amount ? [] : [...dependencies.filter(f=>p[f].value===null).map(f=>`missing:${f}`),...reasons]};
  };
  const G=v("grossSpend"), M=v("grossMarginBps"), V=v("variableNetBps"), K=v("variablePerTrade"), Card=v("cardGrossBps"), D=v("annualOpenDays"), W=v("ownerAllowance"), Rent=v("rent"), Staff=v("staff"), Other=v("otherFixed"), q=v("standardRatedShareBps"), tenK=fraction(10000n);
  const costConsistent = input.vat === "registered" ? input.costBasis === "net_recoverable" : input.vat === "not_registered" && input.costBasis === "inclusive_nonrecoverable";
  const A = G && costConsistent ? input.vat === "registered" ? q ? mul(G,add(sub(fraction(1n),div(q,tenK)),div(div(q,tenK),fraction(6n,5n)))) : null : G : null;
  const C=A&&M&&V&&K&&Card&&G ? sub(mul(A,div(sub(M,V),tenK)),add(K,mul(G,div(Card,tenK)))) : null;
  const completeCosts = input.otherFixedIncludes.length > 0;
  const F=Rent&&Staff&&Other&&completeCosts ? add(add(Rent,Staff),Other) : null;
  const total=F&&W ? add(F,W) : null;
  metric("netSpend",A,"pence/trade",["grossSpend","standardRatedShareBps"],"missing_input",!costConsistent?["VAT_or_cost_basis_unknown_or_incompatible"]:[]);
  metric("contribution",C,"pence/trade",["grossSpend","grossMarginBps","variableNetBps","variablePerTrade","cardGrossBps","standardRatedShareBps"]);
  metric("fixedBeforeOwner",F,"pence/year",["rent","staff","otherFixed"],"missing_input",completeCosts?[]:["fixed_cost_inclusions_unknown"]);
  metric("fixedIncludingOwner",total,"pence/year",["rent","staff","otherFixed","ownerAllowance"]);
  const B=total&&C&&C.n>0n ? div(total,C):null, beState=C&&C.n<=0n?"no_finite_break_even":"missing_input";
  const beDeps: Field[]=["rent","staff","otherFixed","ownerAllowance","grossSpend","grossMarginBps","variableNetBps","variablePerTrade","cardGrossBps","annualOpenDays","standardRatedShareBps"];
  metric("breakEvenTradeYear",B,"trade/year",beDeps,beState);
  metric("breakEvenGrossSales",B&&G?mul(B,G):null,"pence/year",beDeps,beState);
  metric("breakEvenNetSales",B&&A?mul(B,A):null,"pence/year",beDeps,beState);
  const daily=B&&D?div(B,D):null;
  metric("breakEvenDailyTrade",daily,`${input.tradeUnit}/open_day`,beDeps,beState,[],true);
  const units=v("unitsPerCustomer");
  metric("customersNeeded",daily&&(input.tradeUnit==="cover"||units)? input.tradeUnit==="cover"?daily:div(daily,units!):null,"customer_equivalent/open_day",[...beDeps,"unitsPerCustomer"],"unavailable",["trade_units_are_not_unique_people"],true);
  const N=v("dailyTrade"), gross=v("annualGrossSales"), annualTrade=N&&D?mul(N,D):gross&&G?div(gross,G):null;
  const grossSales=annualTrade&&G?mul(annualTrade,G):null, netSales=annualTrade&&A?mul(annualTrade,A):null, contribution=annualTrade&&C?mul(annualTrade,C):null;
  const before=contribution&&F?sub(contribution,F):null, after=before&&W?sub(before,W):null;
  metric("scenarioGrossSales",grossSales,"pence/year",["dailyTrade","annualGrossSales","annualOpenDays","grossSpend"]);
  metric("scenarioNetSales",netSales,"pence/year",["dailyTrade","annualGrossSales","annualOpenDays","grossSpend","standardRatedShareBps"]);
  const revenueDeps:Field[]=[...beDeps,"dailyTrade","annualGrossSales"];
  metric("surplusBeforeOwner",before,"pence/year",revenueDeps);
  metric("surplusAfterOwner",after,"pence/year",revenueDeps);
  metric("surplusMarginBps",after&&netSales&&netSales.n>0n?mul(div(after,netSales),tenK):null,"bps",revenueDeps,netSales?.n===0n?"unavailable":"missing_input",netSales?.n===0n?["zero_sales"]:[]);
  const target=v("targetSurplus");
  metric("targetDailyTrade",total&&target&&C&&C.n>0n&&D?div(div(add(total,target),C),D):null,`${input.tradeUnit}/open_day`,[...beDeps,"targetSurplus"],beState,[],true);
  const capacity=v("capacityPerDay");
  metric("capacityPressureBps",daily&&capacity&&capacity.n>0n?mul(div(daily,capacity),tenK):null,"bps",[...beDeps,"capacityPerDay"],"unavailable",["capacity_not_measured"]);
  metric("rentHeadroom",contribution&&Staff&&Other&&W&&completeCosts?sub(sub(sub(contribution,Staff),Other),W):null,"pence/year",revenueDeps);
  warnings.push("VAT_status_and_cost_basis_are_declared_scenario_assumptions_not_verified_tax_status");
  if (input.vat==="not_registered"&&grossSales&&grossSales.n>9000000n*grossSales.d) warnings.push("VAT_threshold_review_required_taxable_share_unknown_no_automatic_registration");
  if (fields.some(f=>p[f].value!==null&&p[f].origin==="illustrative_assumption")) warnings.push("illustrative_scenario_not_verified_local_business_forecast");
  if (C&&C.n<=0n) warnings.push("no_finite_break_even_nonpositive_contribution");
  return {schemaVersion:1 as const,modelVersion:"economics-v1",rules:economicRules,input,metrics:out,warnings,
    exclusions:["tax","interest","depreciation","financing","capex","working_capital"],rounding:"exact_rational_intermediates_half_up_pence_ceil_required_trade"};
}
