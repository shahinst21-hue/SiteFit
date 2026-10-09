import test from "node:test";
import assert from "node:assert/strict";
import { calculateEconomics } from "../lib/economics/calculate.ts";
import { prepareEconomics, applyEconomicEdits, economicScenarios } from "../lib/economics/prepare.ts";
import { validateEconomicInput, type Field, type Operand } from "../lib/economics/model.ts";
import { compatibleRentalArea, normaliseCommercialValuation, rentalReportProjection, type RentalArea } from "../lib/economics/rent.ts";
import { annualCost, annualOpenDays } from "../lib/economics/period.ts";
import { validateEconomicBundle } from "../lib/economics/bundle.ts";
import { propertyDataFacts } from "../lib/data/adapters/propertydata-facts.ts";
import { economicRepository } from "../lib/economics/repository.ts";
const user=(value:string|null):Operand=>({value,origin:"user_assumption",reference:null,reason:value===null?"unknown":null});
function caseInput(business:Parameters<typeof prepareEconomics>[0], values:Partial<Record<Field,string|null>>) {
  return prepareEconomics(business,{},Object.fromEntries(Object.entries(values).map(([k,v])=>[k,user(v)])));
}
test("independent coffee/restaurant/salon arithmetic and trade semantics",()=>{
  const coffee=caseInput("coffee-shop",{rent:"20000",staff:"30000",otherFixed:"10000",ownerAllowance:"12000",grossSpend:"5",grossMarginBps:"7000",variableNetBps:"0",variablePerTrade:"0",cardGrossBps:"0",annualOpenDays:"300",dailyTrade:"100"});
  const a=calculateEconomics(coffee);
  assert.equal(a.metrics.contribution.display,"350");assert.equal(a.metrics.breakEvenDailyTrade.display,"69");assert.equal(a.metrics.surplusAfterOwner.display,"3300000");assert.equal(a.metrics.customersNeeded.state,"unavailable");
  const r=caseInput("restaurant",{rent:"50000",staff:"80000",otherFixed:"20000",ownerAllowance:"30000",grossSpend:"30",grossMarginBps:"6500",cardGrossBps:"0",annualOpenDays:"300",dailyTrade:"40"});
  const b=calculateEconomics({...r,vat:"registered",costBasis:"net_recoverable"});
  assert.equal(b.metrics.netSpend.display,"2500");assert.equal(b.metrics.breakEvenDailyTrade.display,"37");assert.equal(b.metrics.surplusAfterOwner.display,"1500000");
  const s=caseInput("hair-salon",{rent:"20000",staff:"40000",otherFixed:"10000",ownerAllowance:"20000",grossSpend:"50",grossMarginBps:"9000",variableNetBps:"4000",cardGrossBps:"0",annualOpenDays:"250",dailyTrade:"16"});
  const c=calculateEconomics(s);assert.equal(c.metrics.contribution.display,"2500");assert.equal(c.metrics.breakEvenDailyTrade.display,"15");assert.equal(c.metrics.surplusAfterOwner.display,"1000000");assert.equal(c.metrics.breakEvenDailyTrade.unit,"appointment/open_day");
});
test("mixed VAT receipts, losses, missingness and nonpositive contribution",()=>{
  const base=caseInput("coffee-shop",{grossSpend:"12",standardRatedShareBps:"5000"});
  assert.equal(calculateEconomics({...base,vat:"registered",costBasis:"net_recoverable"}).metrics.netSpend.display,"1100");
  assert.equal(calculateEconomics({...base,vat:"unknown"}).metrics.breakEvenDailyTrade.state,"missing_input");
  const missing=calculateEconomics(applyEconomicEdits(base,{staff:user(null)}));assert.equal(missing.metrics.breakEvenDailyTrade.state,"missing_input");assert.equal(missing.metrics.contribution.state,"available");
  assert.equal(calculateEconomics(applyEconomicEdits(base,{grossMarginBps:user("0")})).metrics.breakEvenDailyTrade.state,"no_finite_break_even");
  assert.ok(Number(calculateEconomics(applyEconomicEdits(base,{dailyTrade:user("0")})).metrics.surplusAfterOwner.display)<0);
  assert.equal(calculateEconomics(applyEconomicEdits(base,{dailyTrade:user("0")})).metrics.surplusMarginBps.state,"unavailable");
});
test("source-first prepopulation and overrides remain honestly labelled",()=>{
  const evidence:Operand={value:"45000",origin:"provider_market_estimate",reference:"frozen-rental-receipt",reason:null};
  const p=prepareEconomics("beauty-salon",{rent:evidence});assert.equal(p.operands.rent.value,"45000");assert.equal(p.operands.staff.origin,"illustrative_assumption");
  assert.equal(prepareEconomics("beauty-salon",{rent:evidence},{rent:user("40000")}).operands.rent.origin,"user_assumption");
  assert.ok(calculateEconomics(p).warnings.includes("illustrative_scenario_not_verified_local_business_forecast"));
  assert.throws(()=>applyEconomicEdits(p,{rent:evidence}),/invalid_adjustment/);
  assert.throws(()=>validateEconomicInput({...p,otherFixedIncludes:["staff"]}),/duplicate_cost/);
  assert.throws(()=>validateEconomicInput({...p,unexpected:1}),/invalid_economic/);
  assert.throws(()=>applyEconomicEdits(p,{grossSpend:user("1e4")}),/invalid_decimal/);
  assert.throws(()=>applyEconomicEdits(p,{annualOpenDays:user("0")}),/invalid_operand/);
  assert.throws(()=>applyEconomicEdits(p,{annualGrossSales:user("100000")}),/duplicate_sales/);
});
test("bounded stresses recalculate without provider calls and preserve original input",()=>{
  const input=prepareEconomics("coffee-shop"), original=JSON.stringify(input);
  const output=economicScenarios(input,["rent_up_20","trade_down_20","margin_down_5pp","staff_up_10"]);
  assert.equal(JSON.stringify(input),original);
  assert.ok(Number(output.scenarios[0].result.metrics.breakEvenDailyTrade.display)>=Number(output.baseline.metrics.breakEvenDailyTrade.display));
  assert.ok(Number(output.scenarios[1].result.metrics.surplusAfterOwner.display)<Number(output.baseline.metrics.surplusAfterOwner.display));
  assert.throws(()=>economicScenarios(input,["rent_up_20","rent_up_20"]),/invalid_scenarios/);
});
test("rental valuation keeps provider error and requires exact-unit GIA without converting NIA",()=>{
  const propertyId="11111111-1111-4111-8111-111111111111",at="2026-10-09T12:00:00Z";
  const area:RentalArea={value:"500",unit:"sqft",basis:"GIA",propertyId,exactUnit:true,sourceReference:"synthetic-compatible-area-proof",observedAt:at,origin:"user_reported_document"};
  const response={status:"success",postcode:"E84PH",params:{property_type:"Restaurants",internal_area:500,area_unit:"sqft"},result:{estimate_annual:27000,estimate_monthly:2250,margin_annual:2500,per_sqf:53}};
  const val=normaliseCommercialValuation(response,{postcode:"E8 4PH",type:"restaurants",area,propertyId},at);
  assert.equal(val.reportedMarginPoundsYear,2500);assert.equal(val.marginMeaning,"provider_reported_plus_minus_not_statistical_confidence");
  assert.equal(compatibleRentalArea({...area,basis:"NIA"},propertyId),false);
  assert.equal(compatibleRentalArea({...area,exactUnit:false},propertyId),false);
  assert.throws(()=>normaliseCommercialValuation(response,{postcode:"E8 4PH",type:"restaurants",area:{...area,basis:"NIA"},propertyId},at),/incompatible/);
  assert.equal(rentalReportProjection(propertyId,null,null).propertySpecificState,"unavailable");
  assert.equal(rentalReportProjection(propertyId,null,val).financialCalculationsIncluded,false);
});
test("annual periods, calendar closures and stored outcome validation",()=>{
  assert.equal(annualCost("5000","monthly"),"60000.00");assert.equal(annualCost("1000","weekly"),"52000.00");
  assert.equal(annualOpenDays({daysPerWeek:6,weeks:"50"}),"300");assert.throws(()=>annualOpenDays({days:0}),/invalid_calendar/);
  const id="11111111-1111-4111-8111-111111111111";
  const bundle={schemaVersion:1,kind:"financial_engine",analysisId:id,inputId:id,propertyId:id,business:"coffee-shop",contextDigest:"a".repeat(64),runId:id,parentRunId:null,generatedAt:"2026-10-09T12:00:00Z",sourceBindings:[],result:economicScenarios(prepareEconomics("coffee-shop"))};
  const original=JSON.stringify(bundle);assert.equal(JSON.stringify(validateEconomicBundle(JSON.parse(original))),original);
  const tamper=JSON.parse(original);tamper.result.baseline.metrics.netSpend.exact.denominator="0";assert.throws(()=>validateEconomicBundle(tamper),/invalid_stored_metric/);
});
test("existing valuation transport is server-only, JSON-only and rejects incompatible basis before dispatch",async()=>{
  let calls=0;
  const provider=propertyDataFacts({key:"synthetic-private-key",fetcher:async(url,init)=>{
    calls++;const u=new URL(String(url));assert.equal(u.pathname,"/valuation-commercial-rent");assert.equal(u.searchParams.get("output"),"json");assert.equal(u.searchParams.get("key"),null);
    assert.equal(u.searchParams.get("area_unit"),"sqm");assert.equal(new Headers(init?.headers).get("X-API-Key"),"synthetic-private-key");assert.equal(init?.redirect,"error");
    return Response.json({status:"success",postcode:"E84PH",params:{property_type:"Retail",internal_area:50,area_unit:"sqm"},result:{estimate_annual:20000,estimate_monthly:1667,margin_annual:2500,per_sqf:37}});
  }});
  await provider.commercialValuation({postcode:"E8 4PH",type:"retail",area:"50",areaUnit:"sqm",areaBasis:"GIA"});
  await assert.rejects(provider.commercialValuation({postcode:"E8 4PH",type:"retail",area:"50",areaUnit:"sqm",areaBasis:"NIA" as "GIA"}));assert.equal(calls,1);
  const failed=propertyDataFacts({key:"synthetic-private-key",fetcher:async()=>new Response("private raw provider body",{status:503})});
  await assert.rejects(failed.commercialValuation({postcode:"E8 4PH",type:"restaurants",area:"50",areaUnit:"sqm",areaBasis:"GIA"}),e=>!String(e).includes("private raw provider body"));
});
test("owned stored economics read performs no calculations or provider dispatch",async()=>{
  const id="11111111-1111-4111-8111-111111111111";
  const bundle={schemaVersion:1,kind:"financial_engine",analysisId:id,inputId:id,propertyId:id,business:"coffee-shop",contextDigest:"a".repeat(64),runId:id,parentRunId:null,generatedAt:"2026-10-09T12:00:00Z",sourceBindings:[],result:economicScenarios(prepareEconomics("coffee-shop"))};
  const oldFetch=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;let calls=0;
  process.env.SUPABASE_URL="https://synthetic.supabase.co";process.env.SUPABASE_SECRET_KEY="sb_secret_synthetic";
  globalThis.fetch=async(url)=>{calls++;assert.equal(new URL(String(url)).pathname,"/rest/v1/rpc/read_sitefit_economics");return Response.json(bundle);};
  try{assert.deepEqual(await economicRepository(id).read(id,id),bundle);assert.equal(calls,1);}
  finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;}
});
