import 'server-only';
import {frameworkClient} from '../data/server-client.ts';
import {selectEnrichmentReleases} from '../data/enrichment-preparation.ts';
import {uuid} from '../data/validation.ts';
import {validPoint} from '../spatial/model.ts';
import {geographyContext} from '../spatial/geography.ts';

/** Read-only preflight, before a case or AI envelope is claimed. No provider call. */
export async function assertSnapshotCoverage(propertyId:string,signal?:AbortSignal){
 if(!uuid(propertyId))throw Error('property_unavailable');
 const bound=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(8000)]);
 const client=frameworkClient();
 const {data:property,error}=await client.from('properties').select('latitude,longitude,coordinate_precision,coordinate_source,address_resolution_state')
  .eq('id',propertyId).abortSignal(bound).single();
 if(error||!property)throw Error('property_unavailable');
 const point={longitude:property.longitude,latitude:property.latitude,crs:'EPSG:4326' as const,
  precision:property.coordinate_precision,source:property.coordinate_source??'unknown'};
 if(property.address_resolution_state!=='provider_verified'||!validPoint(point)||point.precision==='unknown')throw Error('location_precision_unavailable');
 const releases=await selectEnrichmentReleases(bound);
 const {data,error:geographyError}=await client.rpc('lookup_sitefit_geography',{
  p_release_id:releases.legacy.geography,p_longitude:point.longitude,p_latitude:point.latitude,p_precision:point.precision,
 }).abortSignal(bound);
 if(geographyError||!data)throw Error('coverage_check_unavailable');
 if(!geographyContext(data,point,releases.legacy.geography).region.eligible)throw Error('outside_analysis_coverage');
}
