import "server-only";
import type { DataAdapter, ExecutionContext, FoodEstablishments } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { SourceError, safeError } from "../errors.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { object, text, timestamp, validateContext, validateResult } from "../validation.ts";
import { validPoint } from "../../spatial/model.ts";
import { createTransport, processQuota } from "../transport.ts";
import type { JsonTransport } from "../transport.ts";
import { queryPoint } from "../query-point.ts";
const quota=processQuota(10);
function invalid():never{throw new SourceError("invalid_response");}
function coordinate(value:unknown):number|null{
  if(value===null||value===undefined||value==="")return null;
  if(typeof value==="number"&&Number.isFinite(value))return value;
  if(typeof value==="string"&&/^-?\d+(\.\d+)?$/.test(value)&&Number.isFinite(Number(value)))return Number(value);
  return invalid();
}
export function normaliseFsa(value:unknown,expectedPage:number){
  const data=object(value),meta=object(data.meta);
  if(!Array.isArray(data.establishments)||data.establishments.length>100||meta.pageNumber!==expectedPage||!Number.isSafeInteger(meta.totalCount)||Number(meta.totalCount)<0||!Number.isSafeInteger(meta.totalPages)||Number(meta.totalPages)<0||!Number.isSafeInteger(meta.pageSize)||Number(meta.pageSize)<1||Number(meta.pageSize)>100)invalid();
  const items:FoodEstablishments["items"]=data.establishments.map(value=>{
    const row=object(value);if(!Number.isSafeInteger(row.FHRSID)||Number(row.FHRSID)<1||!text(row.BusinessName,300)||!text(row.BusinessType,120)||!text(row.LocalAuthorityCode,120))invalid();
    const geo=row.geocode===null||row.geocode===undefined?{}:object(row.geocode),longitude=coordinate(geo.longitude),latitude=coordinate(geo.latitude);
    const point=longitude===null||latitude===null?null:{longitude,latitude,crs:"EPSG:4326" as const,precision:"unknown" as const,source:"fsa-register"};if(point&&!validPoint(point))invalid();
    return{id:String(row.FHRSID),authorityId:row.LocalAuthorityCode,name:row.BusinessName,businessType:row.BusinessType,point,observedAt:null};
  });
  if(new Set(items.map(i=>i.id)).size!==items.length||items.length>Number(meta.totalCount))invalid();
  return{items,totalPages:Number(meta.totalPages),totalCount:Number(meta.totalCount),extractDate:timestamp(meta.extractDate)?meta.extractDate:null};
}
export function fsaAdapter(factory:(execution:ExecutionContext)=>JsonTransport=e=>createTransport(definitions["fsa-establishments"],e,{quota})):DataAdapter{
  const source=definitions["fsa-establishments"];
  return{source,supports:c=>coverage(source.id,c),async retrieve(request,execution){
    validateContext(request.context);const result=initialResult(source,request,execution),eligible=coverage(source.id,request.context);let transport:JsonTransport|undefined;
    if(!eligible.eligible){result.outcome=eligible.outcome;result.error={code:eligible.code,retryable:false,status:null};return validateResult(result);}
    const items:FoodEstablishments["items"]=[];const ids=new Set<string>();let complete=false,total:number|null=null,extractDate:string|null=null;
    try{
      if(!Number.isSafeInteger(request.radiusMetres)||request.radiusMetres<1||request.radiusMetres>1000)throw new SourceError("invalid_request");
      transport=factory(execution);const point=queryPoint(request.context)!;
      for(let page=1;page<=source.maxPages;page++){
        if(transport.summary().attempts>=source.maxAttempts)break;
        const parsed=normaliseFsa(await transport.request({longitude:String(point.longitude),latitude:String(point.latitude),maxDistanceLimit:String(request.radiusMetres/1609.344),pageNumber:String(page),pageSize:"100",sortOptionKey:"distance",schemeTypeKey:"FHRS"}),page);
        if(total!==null&&total!==parsed.totalCount)throw new SourceError("invalid_response");total=parsed.totalCount;extractDate=parsed.extractDate;
        for(const item of parsed.items){if(ids.has(item.id))throw new SourceError("invalid_response");ids.add(item.id);items.push(item);}
        if(page>=parsed.totalPages){complete=items.length===parsed.totalCount;break;}
        if(!parsed.items.length)throw new SourceError("invalid_response");
      }
      if(items.length===0&&total!==0)throw new SourceError("invalid_response");
      result.outcome=items.length?complete?"success":"partial":"empty";
    }catch(error){result.error=safeError(error);result.outcome=items.length?"partial":"unavailable";complete=false;}
    result.payload=items.length?{schemaVersion:1,kind:"food_establishments",complete,items}:null;
    result.meta.sourceVersion="FHRS-api-v2";
    result.meta.quality.truncated=!complete;result.meta.quality.missing=["record_observation_date","source_publication_date","dataset_release_version","cross_border_coverage_unassessed","exact_radius_selection_unverified"];
    if(items.some(i=>!i.point))result.meta.quality.missing.push("withheld_or_missing_coordinates");
    result.limitations=["Food register only; not exhaustive competition, business occupancy, demand or survival evidence.","FHRS identifiers may be recycled; these are dated historical records, not current ratings.","Private contact/address/rating fields are discarded; withheld locations remain unknown.","Source point accuracy is unspecified; property postcode-centroid input does not identify the premises.","Provider query radius may be capped/cross London; no exact catchment or geodesic proximity claim."];
    if(!complete)result.limitations.push("Page/attempt limit or source failure leaves an incomplete register result.");
    if(extractDate)result.limitations.push(`Provider extract timestamp ${extractDate}; not a registration, observation or publication date.`);
    result.observations=items.map((item,index)=>({id:item.id,path:`items/${index}`,recordId:item.id,reference:`https://ratings.food.gov.uk/business/${encodeURIComponent(item.id)}`,observedAt:null,units:"registered_establishment",geography:null,sourceClass:"official_public_data",kind:"direct_register",limitations:["Dated register identity; ID may be recycled."]}));
    if(transport)result.meta.execution=transport.summary();result.meta.retrievedAt=execution.now().toISOString();result.meta.sourceRetrievedAt=result.meta.retrievedAt;
    result.meta.cost={units:result.meta.execution.attempts,money:"0",currency:"GBP",category:"estimated",priceReference:"https://ratings.food.gov.uk/open-data"};result.meta.quality.limitations=[...result.limitations];return validateResult(result);
  }};
}
