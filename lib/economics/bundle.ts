import { object, uuid, timestamp } from "../data/validation.ts";
import { validateEconomicInput } from "./model.ts";
import type { economicScenarios } from "./prepare.ts";
import type { rentalReportProjection } from "./rent.ts";
export type EconomicBundle = { schemaVersion:1;kind:"financial_engine"|"rental_evidence";analysisId:string;inputId:string;propertyId:string;business:string;
  contextDigest:string;runId:string;parentRunId:string|null;generatedAt:string;sourceBindings:{snapshotId:string;checksum:string}[];
  result:ReturnType<typeof economicScenarios>|ReturnType<typeof rentalReportProjection> };
/** Validate historical output without invoking a calculator or provider. */
export function validateEconomicBundle(value:unknown):EconomicBundle {
  const b=object(value);
  const keys=["schemaVersion","kind","analysisId","inputId","propertyId","business","contextDigest","runId","parentRunId","generatedAt","sourceBindings","result"];
  const json=JSON.stringify(b);
  if (Object.keys(b).length!==keys.length||Object.keys(b).some(k=>!keys.includes(k))||json.length>100000||
    /(sb_secret_|sk-(proj-)?|sk_(live|test)_|Bearer\s|rawResponse|authorization|guestClaim)/i.test(json)||b.schemaVersion!==1||
    !["financial_engine","rental_evidence"].includes(String(b.kind))||![b.analysisId,b.inputId,b.propertyId,b.runId].every(uuid)||
    !(b.parentRunId===null||uuid(b.parentRunId))||!timestamp(b.generatedAt)||!/^([a-f0-9]{64})$/.test(String(b.contextDigest))||
    !["coffee-shop","restaurant","hair-salon","beauty-salon"].includes(String(b.business))||!Array.isArray(b.sourceBindings)||b.sourceBindings.length>30)throw new Error("invalid_economic_bundle");
  for(const s of b.sourceBindings){const source=object(s);if(Object.keys(source).length!==2||!uuid(source.snapshotId)||!/^[a-f0-9]{64}$/.test(String(source.checksum)))throw new Error("invalid_source_binding");}
  const r=object(b.result);
  if(b.kind==="financial_engine"){
    if(Object.keys(r).length!==2||!Array.isArray(r.scenarios)||r.scenarios.length>4)throw new Error("invalid_scenarios");
    for(const entry of [r.baseline,...r.scenarios.map(s=>object(s).result)]){
      const output=object(entry),input=validateEconomicInput(output.input);
      if(input.business!==b.business||output.modelVersion!=="economics-v1"||output.schemaVersion!==1||!Array.isArray(output.warnings)||!Array.isArray(output.exclusions))throw new Error("invalid_stored_economics");
      const metrics=object(output.metrics);
      for(const metric of Object.values(metrics)){
        const m=object(metric);
        if(!["available","missing_input","unavailable","not_applicable","no_finite_break_even"].includes(String(m.state))||!Array.isArray(m.operands)||!Array.isArray(m.reasons))throw new Error("invalid_stored_metric");
        if(m.state==="available") {const exact=object(m.exact);if(!/^-?\d+$/.test(String(exact.numerator))||! /^[1-9]\d*$/.test(String(exact.denominator))||! /^-?\d+$/.test(String(m.display)))throw new Error("invalid_stored_metric");}
        else if(m.exact!==null||m.display!==null)throw new Error("invalid_missing_metric");
      }
    }
  }else if(r.schemaVersion!==1||r.propertyId!==b.propertyId||r.financialCalculationsIncluded!==false||r.engineInputsRequired!==false||!["available","unavailable"].includes(String(r.propertySpecificState)))throw new Error("invalid_rental_projection");
  return b as unknown as EconomicBundle;
}
