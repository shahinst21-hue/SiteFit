-- Additive frozen input version. Postal selection stays intact; exact analysis
-- point is separately qualified. No lifecycle/request/job/cache tables.
begin;
alter table public.analysis_inputs drop constraint analysis_inputs_context_shape;
alter table public.analysis_inputs add constraint analysis_inputs_context_shape check (
 (resolved_context is null and context_schema_version is null) or
 (resolved_context is not null and context_schema_version is not null and context_schema_version in (1,2) and jsonb_typeof(resolved_context)='object'));

create function source_data.address_component_identity(v text) returns text
language sql immutable set search_path='' as $$
 select nullif(trim(regexp_replace(upper(normalize(v,NFKC)),'[.,\s]+',' ','g')),'');
$$;
create function source_data.check_enrichment_input(c jsonb,p_property uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare e jsonb:=c->'enrichment'; v jsonb:=e->'releases'; i jsonb:=e->'identity'; part jsonb:=i->'selectedParts';
 p public.properties; os jsonb; key text; expected text; expected_provider text; parent uuid; release source_data.dataset_releases;
begin
 if jsonb_typeof(e) is distinct from 'object' or (select count(*) from jsonb_object_keys(e))<>3
  or e->>'schemaVersion' is distinct from '1' or jsonb_typeof(v) is distinct from 'object'
  or (select count(*) from jsonb_object_keys(v))<>13 or jsonb_typeof(i) is distinct from 'object'
  or (select count(*) from jsonb_object_keys(i))<>9
  or v->>'geographyReleaseId' is distinct from c->'releases'->>'geography'
  or v->>'geographyReleaseId' is distinct from c->'region'->>'boundaryReleaseId' then
  raise exception using errcode='23514',message='enriched_input_shape'; end if;
 for key,expected,expected_provider in select * from (values
  ('geographyReleaseId','london-geography','ons'),('nativeReleaseId','london-native-geography','ons'),('censusReleaseId','TS007A','ons'),
  ('incomeReleaseId','income-AHC-FYE2023','ons'),('bresReleaseId','BRES2024','ons'),('placesReleaseId','places','overture'),
  ('conservationReleaseId','conservation-area','planning-data'),('article4ReleaseId','article-4-direction-area','planning-data'),
  ('osReleaseId','open-uprn','os'),('numbatReleaseId','NUMBAT2025','tfl'),
  ('householdReleaseId','TS003','ons'),('carsReleaseId','TS045','ons'),('economicActivityReleaseId','TS066','ons')) x(k,d,p)
 loop
  if v->>key is null then raise exception using errcode='23514',message='enriched_release_required'; end if;
  select * into release from source_data.dataset_releases where id=(v->>key)::uuid and state='ready' and dataset_id=expected and provider_id=expected_provider and subset_id='london';
  if not found then raise exception using errcode='23514',message='enriched_release_unavailable'; end if;
  parent:=case when key in ('incomeReleaseId','bresReleaseId') then (v->>'nativeReleaseId')::uuid else (v->>'geographyReleaseId')::uuid end;
  if key='nativeReleaseId' then
   if release.manifest->>'oaReleaseId' is distinct from parent::text then raise exception using errcode='23514',message='enriched_parent_invalid'; end if;
  elsif key not in ('geographyReleaseId','numbatReleaseId') then
   if release.manifest->>'geographyReleaseId' is distinct from parent::text then raise exception using errcode='23514',message='enriched_parent_invalid'; end if;
  end if;
 end loop;
 if i->>'state' is null or i->>'state' not in ('matched','unresolved','ambiguous','unavailable')
  or i->>'retrievedAt' is null or i->>'retrievedAt' !~ '^\d{4}-\d{2}-\d{2}T'
  or (i->>'retrievedAt')::timestamptz is null
  or (i->'observedCredits' is distinct from 'null'::jsonb and
   (jsonb_typeof(i->'observedCredits') is distinct from 'number' or (i->>'observedCredits')::numeric not between 0 and 20
    or trunc((i->>'observedCredits')::numeric)<>(i->>'observedCredits')::numeric)) then
  raise exception using errcode='23514',message='enriched_identity_invalid'; end if;
 if i->>'state'<>'matched' then
  if i->'uprn' is distinct from 'null'::jsonb or i->'point' is distinct from 'null'::jsonb
   or i->'coordinateBasis' is distinct from 'null'::jsonb or i->'method' is distinct from 'null'::jsonb
   or i->'selectedParts' is distinct from 'null'::jsonb or length(i->>'missingReason') not between 1 and 300
   or i->>'missingReason' is null then raise exception using errcode='23514',message='unresolved_identity_has_precision'; end if;
  return;
 end if;
 select * into p from public.properties where id=p_property;
 if p.address_resolution_state is distinct from 'provider_verified' or p.address_provider is distinct from 'postio'
  or i->>'uprn' is null or i->>'uprn' !~ '^[1-9][0-9]{0,11}$'
  or i->>'coordinateBasis' is distinct from 'address_building_not_entrance'
  or i->>'method' is distinct from 'exact_selected_address_components' or i->'missingReason' is distinct from 'null'::jsonb
  or jsonb_typeof(part) is distinct from 'object' or (select count(*) from jsonb_object_keys(part))<>5
  or not (part ?& array['primary','secondary','street','town','postcode'])
  or jsonb_typeof(part->'primary') is distinct from 'string' or jsonb_typeof(part->'street') is distinct from 'string'
  or jsonb_typeof(part->'town') is distinct from 'string' or jsonb_typeof(part->'postcode') is distinct from 'string'
  or (part->'secondary' is distinct from 'null'::jsonb and jsonb_typeof(part->'secondary') is distinct from 'string')
  or nullif(p.address_components->>'dependentThoroughfare','') is not null
  or nullif(p.address_components->>'department','') is not null or nullif(p.address_components->>'poBox','') is not null
  or (nullif(p.address_components->>'buildingNumber','') is not null and nullif(p.address_components->>'buildingName','') is not null)
  or source_data.address_component_identity(part->>'primary') is null
  or source_data.address_component_identity(part->>'street') is null or source_data.address_component_identity(part->>'town') is null
  or source_data.address_component_identity(part->>'primary') is distinct from source_data.address_component_identity(coalesce(nullif(p.address_components->>'buildingNumber',''),p.address_components->>'buildingName'))
  or source_data.address_component_identity(part->>'secondary') is distinct from source_data.address_component_identity(p.address_components->>'subBuilding')
  or source_data.address_component_identity(part->>'street') is distinct from source_data.address_component_identity(p.address_components->>'thoroughfare')
  or source_data.address_component_identity(part->>'town') is distinct from source_data.address_component_identity(p.post_town)
  or upper(regexp_replace(part->>'postcode','\s','','g')) is distinct from upper(regexp_replace(p.postcode,'\s','','g')) then
  raise exception using errcode='23514',message='enriched_selected_components_invalid'; end if;
 os:=public.lookup_sitefit_os_uprn((v->>'osReleaseId')::uuid,(v->>'geographyReleaseId')::uuid,i->>'uprn');
 if os is null or i->'point' is distinct from jsonb_build_object('longitude',(os->>'longitudeE7')::numeric/10000000,
  'latitude',(os->>'latitudeE7')::numeric/10000000,'crs','EPSG:4326','precision','building','source','os-open-uprn') then
  raise exception using errcode='23514',message='enriched_os_point_invalid'; end if;
 if c->'region'->>'eligible' is distinct from 'true' or c->'region'->>'method' is distinct from 'point_in_polygon'
  or c->'geography'->>'releaseId' is distinct from v->>'geographyReleaseId'
  or c->'geography'->>'method' is distinct from 'point_in_polygon' or c->'geography'->>'type' is distinct from 'OA2021'
  or not exists(select 1 from source_data.geography_features f where f.release_id=(v->>'geographyReleaseId')::uuid
    and f.geography_type='OA2021' and f.geography_code=c->'geography'->>'code'
    and gis.st_covers(f.geometry,gis.st_setsrid(gis.st_makepoint((os->>'longitudeE7')::float8/10000000,(os->>'latitudeE7')::float8/10000000),4326))) then
  raise exception using errcode='23514',message='enriched_geography_point_invalid'; end if;
end $$;

create or replace function public.sitefit_guard_input() returns trigger
language plpgsql security definer set search_path='' as $$
declare a public.analyses; p public.properties; c jsonb; expected_property jsonb;
begin
  if tg_op <> 'INSERT' then raise exception using errcode='23514',message='input_immutable'; end if;
  -- Ordinary draft user-input INSERT remains supported without granting a new RPC to clients.
  if new.resolved_context is null then
    select * into a from public.analyses where id=new.analysis_id for update;
    if not found then raise exception using errcode='42501',message='analysis_missing'; end if;
    if a.status='ready' or exists(select 1 from public.reports where analysis_id=a.id and tier='full' and status='ready') then
      raise exception using errcode='23514',message='analysis_frozen';
    end if;
  else a:=public.sitefit_assert_collectable(new.analysis_id); end if;
  if new.resolved_context is not null then
    c:=new.resolved_context;
    select * into p from public.properties where id=a.property_id;
    select resolved_context->'selectedProperty' into expected_property from public.analysis_inputs
      where analysis_id=a.id and resolved_context is not null order by version limit 1;
    expected_property:=coalesce(expected_property,jsonb_build_object('id',p.id,'formattedAddress',p.formatted_address,'postcode',p.postcode,
      'provider',p.address_provider,'providerAddressId',p.provider_address_id,'uprn',p.uprn,'resolution',p.address_resolution_state,
      'point',case when p.latitude is null then 'null'::jsonb else jsonb_build_object('longitude',p.longitude,'latitude',p.latitude,
        'precision',p.coordinate_precision,'source',p.coordinate_source,'crs','EPSG:4326') end));
    if p.id is null or new.context_schema_version not in (1,2) or (c->>'schemaVersion')::integer is distinct from new.context_schema_version or
       (c->>'analysisId')::uuid is distinct from a.id or (c->>'inputId')::uuid is distinct from new.id or
       (c->>'inputVersion')::integer is distinct from new.version or (c->>'analysisTimestamp')::timestamptz is distinct from a.created_at or
       (c->'selectedProperty'->>'id')::uuid is distinct from a.property_id or
       c->>'businessType' is distinct from a.business_type or c->>'category' is distinct from a.business_category::text or
       c->'selectedProperty' is distinct from expected_property or
       c->'region'->>'id' is distinct from 'london' then
      raise exception using errcode='23514',message='context_binding_invalid';
    end if;
  end if;
  if new.context_schema_version=1 and new.resolved_context ? 'enrichment' then
    raise exception using errcode='23514',message='enrichment_requires_version_two';
  end if;
  if new.context_schema_version=2 then perform source_data.check_enrichment_input(new.resolved_context,p.id); end if;
  return new;
end $$;

create or replace function source_data.guard_context_geography() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb:=new.resolved_context; region_id uuid; geography_id uuid; population_id uuid; lookup jsonb; point jsonb;
begin
 if c is null then return new; end if;
 region_id:=(c->'region'->>'boundaryReleaseId')::uuid; geography_id:=(c->'releases'->>'geography')::uuid; population_id:=(c->'releases'->>'population')::uuid;
 if c->'selectedProperty'->>'resolution' not in ('provider_verified','manual_unverified') or not exists(select 1 from source_data.dataset_releases where id=region_id and state='ready' and dataset_id='london-geography' and subset_id='london') then raise exception using errcode='23514',message='context_release_invalid'; end if;
 point:=case when c->>'schemaVersion'='2' and c->'enrichment'->'identity'->>'state'='matched' then c->'enrichment'->'identity'->'point' else c->'selectedProperty'->'point' end;
 if point='null'::jsonb then
  if c->'region'->>'eligible' is distinct from 'false' or c->'region'->>'method' is distinct from 'unknown' or c->'geography' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='unknown_location_required'; end if;
 else
  lookup:=public.lookup_sitefit_geography(region_id,(point->>'longitude')::double precision,(point->>'latitude')::double precision,point->>'precision');
  if c->'region'->>'eligible' is distinct from lookup->>'eligible' or c->'region'->>'method' is distinct from lookup->>'method' then raise exception using errcode='23514',message='context_coverage_invalid'; end if;
 end if;
 if geography_id is not null then
  if not exists(select 1 from source_data.dataset_releases where id=geography_id and state='ready' and dataset_id='london-geography') then raise exception using errcode='23514',message='context_geography_invalid'; end if;
  if c->'geography'<>'null'::jsonb then
   lookup:=public.lookup_sitefit_geography(geography_id,(point->>'longitude')::double precision,(point->>'latitude')::double precision,point->>'precision');
   if (c->'geography'->>'releaseId')::uuid is distinct from geography_id or c->'geography'->>'method' is distinct from lookup->>'method' or
      c->'geography'->>'ambiguous' is distinct from lookup->>'ambiguous' or lookup->>'ambiguous'='true' or
      jsonb_array_length(lookup->'matches')<>1 or c->'geography'->>'code' is distinct from lookup->'matches'->>0 then raise exception using errcode='23514',message='context_geography_invalid'; end if;
  end if;
 end if;
 if population_id is not null and not exists(select 1 from source_data.dataset_releases where id=population_id and state='ready' and dataset_id='TS001') then raise exception using errcode='23514',message='context_population_invalid'; end if;
 return new;
end $$;

create function public.prepare_sitefit_enriched_input(p_analysis_id uuid,p_user_supplied jsonb,p_context jsonb,p_enrichment jsonb)
returns public.analysis_inputs language plpgsql security invoker set search_path='' as $$
declare a public.analyses; p public.properties; result public.analysis_inputs;
 input_id uuid:=gen_random_uuid(); next_version integer; frozen jsonb;
begin
 a:=public.sitefit_assert_collectable(p_analysis_id);
 if exists(select 1 from public.analysis_inputs where analysis_id=a.id and resolved_context is not null) then
  raise exception using errcode='23514',message='analysis_input_already_frozen'; end if;
 select * into p from public.properties where id=a.property_id;
 if not found or jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_user_supplied) is distinct from 'object'
  or jsonb_typeof(p_enrichment) is distinct from 'object' then raise exception using errcode='23514',message='context_required'; end if;
 select coalesce(max(version),0)+1 into next_version from public.analysis_inputs where analysis_id=a.id;
 frozen:=p_context || jsonb_build_object('schemaVersion',2,'analysisId',a.id,'inputId',input_id,'inputVersion',next_version,
  'analysisTimestamp',a.created_at,'businessType',a.business_type,'category',a.business_category,'enrichment',p_enrichment,
  'selectedProperty',jsonb_build_object('id',p.id,'formattedAddress',p.formatted_address,'postcode',p.postcode,
   'provider',p.address_provider,'providerAddressId',p.provider_address_id,'uprn',p.uprn,'resolution',p.address_resolution_state,
   'point',case when p.latitude is null then 'null'::jsonb else jsonb_build_object('longitude',p.longitude,'latitude',p.latitude,
    'precision',p.coordinate_precision,'source',p.coordinate_source,'crs','EPSG:4326') end));
 -- Validate the ephemeral selected provider components, then retain only the
 -- existing canonical postal representation plus public OS identity/provenance.
 perform source_data.check_enrichment_input(frozen,p.id);
 if p_enrichment->'identity'->>'state'='matched' then
  frozen:=jsonb_set(frozen,'{enrichment,identity,selectedParts}',jsonb_build_object(
   'primary',coalesce(nullif(p.address_components->>'buildingNumber',''),p.address_components->>'buildingName'),
   'secondary',nullif(p.address_components->>'subBuilding',''),'street',p.address_components->>'thoroughfare',
   'town',p.post_town,'postcode',p.postcode));
 end if;
 insert into public.analysis_inputs(id,analysis_id,version,user_supplied,resolved_context,context_schema_version)
  values(input_id,a.id,next_version,p_user_supplied,frozen,2) returning * into result;
 return result;
end $$;
revoke all on function source_data.address_component_identity(text),source_data.check_enrichment_input(jsonb,uuid),
 public.prepare_sitefit_enriched_input(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function source_data.address_component_identity(text),source_data.check_enrichment_input(jsonb,uuid),
 public.prepare_sitefit_enriched_input(uuid,jsonb,jsonb,jsonb) to service_role;
commit;
