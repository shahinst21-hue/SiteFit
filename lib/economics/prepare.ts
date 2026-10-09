import { fields, validateEconomicInput, type EconomicInput, type Operand, type Field } from "./model.ts";
import { calculateEconomics } from "./calculate.ts";
import { decimal, mul, fraction, rounded } from "./rational.ts";

const illustration = (value: string | null): Operand => ({value,origin:"illustrative_assumption",reference:"illustration-v1-not-sector-data",reason:value===null?"not_assumed":null});
/** Product illustrations, not measured costs/margins/demand. No provider/LLM calls. */
export function prepareEconomics(business: EconomicInput["business"], trusted: Partial<Record<Field, Operand>> = {}, edits: Partial<Record<Field, Operand>> = {}): EconomicInput {
  const coffee=business==="coffee-shop", restaurant=business==="restaurant";
  const amounts: Record<Field,string|null>={rent:"30000",staff:coffee?"30000":restaurant?"90000":"40000",otherFixed:coffee?"10000":restaurant?"30000":"15000",
    ownerAllowance:"24000",grossSpend:coffee?"5":restaurant?"30":"50",grossMarginBps:coffee?"7000":restaurant?"6500":"9000",
    variableNetBps:"0",variablePerTrade:"0",cardGrossBps:"150",annualOpenDays:"300",dailyTrade:coffee?"100":restaurant?"40":"12",annualGrossSales:null,
    capacityPerDay:null,unitsPerCustomer:null,targetSurplus:null,standardRatedShareBps:"10000"};
  for (const record of [trusted,edits]) if (Object.keys(record).some(k=>!fields.includes(k as Field))) throw new Error("invalid_adjustment");
  for (const operand of Object.values(trusted)) if (operand && !["verified_source","provider_market_estimate"].includes(operand.origin)) throw new Error("invalid_trusted_origin");
  for (const operand of Object.values(edits)) if (operand && !["user_assumption","user_reported_document"].includes(operand.origin)) throw new Error("invalid_edit_origin");
  const operands=Object.fromEntries(fields.map(f=>[f,edits[f]??trusted[f]??illustration(amounts[f])])) as Record<Field,Operand>;
  return validateEconomicInput({schemaVersion:1,business,vat:"not_registered",costBasis:"inclusive_nonrecoverable",tradeUnit:coffee?"transaction":restaurant?"cover":"appointment",
    otherFixedIncludes:["rates","service_charge","insurance","utilities","maintenance","software","waste","marketing"],operands});
}
/** Natural-language/AI proposals enter the same bounded edit contract. No generated total has authority. */
export function applyEconomicEdits(input: EconomicInput, edits: Partial<Record<Field, Operand>>) {
  for (const [field,operand] of Object.entries(edits)) if (!fields.includes(field as Field)||!operand||!["user_assumption","user_reported_document"].includes(operand.origin)) throw new Error("invalid_adjustment");
  return validateEconomicInput({...input,operands:{...input.operands,...edits}});
}
export type Stress = "rent_up_20" | "trade_down_20" | "margin_down_5pp" | "staff_up_10";
export function economicScenarios(value: unknown, selected: Stress[] = []) {
  const baseline=validateEconomicInput(value);
  if (!Array.isArray(selected)||selected.length>4||new Set(selected).size!==selected.length) throw new Error("invalid_scenarios");
  const scenarios=selected.map(stress=>{
    const config = {rent_up_20:["rent",120],trade_down_20:["dailyTrade",80],margin_down_5pp:["grossMarginBps",0],staff_up_10:["staff",110]} as const;
    if (!(stress in config)) throw new Error("invalid_scenarios");
    const [field,multiplier]=config[stress], source=baseline.operands[field];
    let next=source.value;
    if (next!==null) next=stress==="margin_down_5pp"?String(Math.max(0,Number(next)-500)): (()=>{
      const pennies=rounded(mul(decimal(next),fraction(BigInt(multiplier),100n)));
      return `${BigInt(pennies)/100n}.${(BigInt(pennies)%100n).toString().padStart(2,"0")}`;
    })();
    const input=validateEconomicInput({...baseline,operands:{...baseline.operands,[field]:{...source,value:next,origin:"illustrative_assumption",reference:`stress-v1:${stress}`}}});
    return {name:stress,changedOperand:`operands.${field}`,result:calculateEconomics(input)};
  });
  return {baseline:calculateEconomics(baseline),scenarios};
}
