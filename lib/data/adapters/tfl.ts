import "server-only";
import type { DataAdapter, ExecutionContext, TransportAccessPoints, SourceDefinition } from "../contracts.ts";
import { coverage } from "../coverage.ts";
import { SourceError, safeError } from "../errors.ts";
import { definitions } from "../registry.ts";
import { initialResult } from "../result.ts";
import { object, text, validateContext, validateResult } from "../validation.ts";
import { validPoint } from "../../spatial/model.ts";
import { createTransport, processQuota } from "../transport.ts";
import type { JsonTransport } from "../transport.ts";
import { queryPoint } from "../query-point.ts";
const quota = processQuota(30);
const modes: Record<string, TransportAccessPoints["items"][number]["mode"]> = { bus:"bus", tube:"tube", dlr:"rail", "national-rail":"rail", overground:"rail", "elizabeth-line":"rail", tram:"tram", "river-bus":"water", "river-tour":"water" };
function invalid(): never { throw new SourceError("invalid_response"); }
export function normaliseTfl(value: unknown, maxRecords: number): TransportAccessPoints {
  const data = object(value); if (!Array.isArray(data.stopPoints)) invalid();
  const seen = new Set<string>();
  const items = data.stopPoints.slice(0,maxRecords).map(value => {
    const row = object(value);
    if (!text(row.id,120) || !/^[A-Za-z0-9:_-]+$/.test(row.id) || seen.has(row.id) || !text(row.commonName,300)) invalid(); seen.add(row.id);
    if (row.modes !== undefined && (!Array.isArray(row.modes) || row.modes.length > 10 || !row.modes.every(m=>text(m,50)))) invalid();
    const original = Array.isArray(row.modes) && row.modes.length ? [...new Set(row.modes)].join(",") : "unknown";
    if (original.length > 100) invalid();
    const point = row.lat === null || row.lon === null || row.lat === undefined || row.lon === undefined ? null : { longitude:row.lon,latitude:row.lat,crs:"EPSG:4326" as const,precision:"unknown" as const,source:"tfl-stop-point" };
    if (point && !validPoint(point)) invalid();
    return { id:row.id, name:row.commonName, originalMode:original, mode:modes[original]??"other", point };
  });
  const totalKnown = Number.isSafeInteger(data.total) && Number(data.total) >= data.stopPoints.length;
  return { schemaVersion:1,kind:"transport_access_points",complete:totalKnown && data.total===data.stopPoints.length && data.stopPoints.length<=maxRecords,items };
}
export function tflAdapter(factory: (execution: ExecutionContext) => JsonTransport = e => createTransport(definitions["tfl-stop-points"],e,{key:process.env.TFL_APP_KEY,quota})): DataAdapter {
  return registeredAdapter(definitions["tfl-stop-points"],factory,false);
}
export function tflStationsAdapter(factory: (execution: ExecutionContext) => JsonTransport = e => createTransport(definitions["tfl-stations"],e,{key:process.env.TFL_APP_KEY,quota})): DataAdapter {
  return registeredAdapter(definitions["tfl-stations"],factory,true);
}
function registeredAdapter(source:SourceDefinition,factory:(execution:ExecutionContext)=>JsonTransport,stations:boolean):DataAdapter {
  return { source,supports:c=>coverage(source.id,c),async retrieve(request,execution) {
    validateContext(request.context); const result=initialResult(source,request,execution);const eligible=coverage(source.id,request.context);let transport:JsonTransport|undefined;
    if(!eligible.eligible){result.outcome=eligible.outcome;result.error={code:eligible.code,retryable:false,status:null};return validateResult(result);}
    try {
      if(!Number.isSafeInteger(request.radiusMetres)||request.radiusMetres<1||request.radiusMetres>1000)throw new SourceError("invalid_request");
      const point=queryPoint(request.context)!;transport=factory(execution);
      const data=await transport.request({lat:String(point.latitude),lon:String(point.longitude),radius:String(stations?1000:request.radiusMetres),stopTypes:stations?"NaptanMetroStation,NaptanRailStation":"NaptanPublicBusCoachTram,NaptanMetroStation,NaptanRailStation,NaptanFerryPort",useStopPointHierarchy:stations?"true":"false",returnLines:"false",categories:"none"});
      const payload=normaliseTfl(data,source.maxRecords);
      result.outcome=payload.items.length?payload.complete?"success":"partial":"empty";
      result.payload=payload.items.length?payload:null;
      result.meta.quality.truncated=!payload.complete;
      result.meta.quality.missing=["source_observation_date","source_publication_date","cross_border_coverage_unassessed","exact_radius_selection_unverified"];
      if(!payload.complete)result.meta.quality.missing.push("provider_total_or_complete_result_set");
      if(payload.items.some(i=>!i.point))result.meta.quality.missing.push("stop_coordinates");
      if(payload.items.some(i=>i.originalMode==="unknown"))result.meta.quality.missing.push("stop_modes");
      result.limitations=["Direct stop register, not service frequency, walking time, step-free access or footfall.","Query uses the property's recorded point precision; a centroid does not identify the premises.","A radius may cross the London service boundary; this is not a complete London catchment.","TfL spatial selection may include points beyond the requested geodesic radius; radius is a request parameter, not a proven proximity metric.","Provider point accuracy and observation date are unspecified; multimodal/unknown modes remain other with originals preserved."];
      if(!payload.complete)result.limitations.push("Complete result count is unavailable/inconsistent or static record limit reached; returned observations remain partial.");
      result.observations=payload.items.map((item,index)=>({id:item.id,path:`items/${index}`,recordId:item.id,reference:`https://api.tfl.gov.uk/StopPoint/${encodeURIComponent(item.id)}`,observedAt:null,units:"access_point",geography:null,sourceClass:"official_public_data",kind:"direct_register",limitations:["Register presence is not service/footfall evidence."]}));
    } catch(error){result.outcome="unavailable";result.payload=null;result.observations=[];result.error=safeError(error);}
    if(transport)result.meta.execution=transport.summary();
    result.meta.retrievedAt=execution.now().toISOString();result.meta.sourceRetrievedAt=result.meta.retrievedAt;
    result.meta.cost={units:result.meta.execution.attempts,money:"0",currency:"GBP",category:"estimated",priceReference:"https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service"};
    result.meta.quality.limitations=[...result.limitations];return validateResult(result);
  } };
}
