-- Phase 5: existing input versions and immutable source snapshots. No job/lease tables.
begin;
alter table public.analysis_inputs
  add column resolved_context jsonb,
  add column context_schema_version integer,
  add constraint analysis_inputs_context_shape check (
    (resolved_context is null and context_schema_version is null) or
    (resolved_context is not null and context_schema_version is not null and jsonb_typeof(resolved_context)='object' and context_schema_version=1));
alter table public.data_snapshots
  add column input_id uuid,
  add column collection_key text check(char_length(collection_key) between 1 and 100),
  add column request_sha256 text check(request_sha256 ~ '^[0-9a-f]{64}$'),
  add column dataset_release_id uuid,
  add column contract_version integer not null default 1 check(contract_version=1),
  add column adapter_version text,
  add column normalisation_version text,
  add column source_retrieved_at timestamptz,
  add column effective_from timestamptz,
  add column effective_to timestamptz,
  add column payload_sha256 text check(payload_sha256 ~ '^[0-9a-f]{64}$'),
  add column licence_metadata jsonb not null default '{}' check(jsonb_typeof(licence_metadata)='object'),
  add column quality_metadata jsonb not null default '{}' check(jsonb_typeof(quality_metadata)='object'),
  add column cache_metadata jsonb not null default '{}' check(jsonb_typeof(cache_metadata)='object'),
  add constraint data_snapshots_input_fk foreign key(analysis_id,input_id) references public.analysis_inputs(analysis_id,id) on delete restrict,
  add constraint data_snapshots_logical_unique unique(analysis_id,input_id,collection_key,source,request_sha256),
  add constraint data_snapshots_framework_identity check (
    (input_id is null and collection_key is null and request_sha256 is null) or
    (input_id is not null and collection_key is not null and request_sha256 is not null)),
  add constraint data_snapshots_effective_range check(effective_to is null or (effective_from is not null and effective_to>=effective_from)),
  add constraint data_snapshots_framework_raw_discard check(input_id is null or permitted_raw_reference is null),
  add constraint data_snapshots_registered_input check(source not in ('ons-population','tfl-stop-points','fsa-establishments') or input_id is not null);

create function public.sitefit_assert_collectable(p_analysis_id uuid) returns public.analyses
language plpgsql security invoker set search_path='' as $$
declare a public.analyses;
begin
  select * into a from public.analyses where id=p_analysis_id for update;
  if not found then raise exception using errcode='42501',message='analysis_missing'; end if;
  if a.status='ready' or exists(select 1 from public.reports where analysis_id=a.id and tier='full' and status='ready') then
    raise exception using errcode='23514',message='analysis_frozen';
  end if;
  return a;
end $$;

create function public.sitefit_guard_input() returns trigger
language plpgsql security invoker set search_path='' as $$
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
    if p.id is null or new.context_schema_version<>1 or (c->>'schemaVersion')::integer is distinct from 1 or
       (c->>'analysisId')::uuid is distinct from a.id or (c->>'inputId')::uuid is distinct from new.id or
       (c->>'inputVersion')::integer is distinct from new.version or (c->>'analysisTimestamp')::timestamptz is distinct from a.created_at or
       (c->'selectedProperty'->>'id')::uuid is distinct from a.property_id or
       c->>'businessType' is distinct from a.business_type or c->>'category' is distinct from a.business_category::text or
       c->'selectedProperty' is distinct from expected_property or
       c->'region'->>'id' is distinct from 'london' then
      raise exception using errcode='23514',message='context_binding_invalid';
    end if;
  end if;
  return new;
end $$;
create trigger sitefit_input_integrity before insert or update or delete on public.analysis_inputs
for each row execute function public.sitefit_guard_input();

create function public.sitefit_guard_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb;
begin
  if tg_op<>'INSERT' then raise exception using errcode='23514',message='snapshot_immutable'; end if;
  perform public.sitefit_assert_collectable(new.analysis_id);
  if new.input_id is not null then
    select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
    if c is null then raise exception using errcode='23514',message='prepared_input_required'; end if;
    if new.provider_metadata->>'schemaVersion' is distinct from '1' or
       new.provider_metadata->'meta'->>'source' is distinct from new.source or
       new.provider_metadata->'meta'->>'contractVersion' is distinct from '1' or
       new.provider_metadata->>'outcome' is null or not (new.provider_metadata->>'outcome'=any(array['success','partial','empty','unavailable','unsupported','not_applicable','policy_blocked'])) or
       jsonb_typeof(new.provider_metadata->'observations') is distinct from 'array' or
       new.source_retrieved_at is null or new.adapter_version is null or new.normalisation_version is null or
       new.licence_metadata->'normalised'->>'allowed' is distinct from 'true' or
       new.licence_metadata->'references'->>'allowed' is distinct from 'true' or
       new.licence_metadata->'timestamps'->>'allowed' is distinct from 'true' or
       new.licence_metadata->>'rawDisposition' is null or new.licence_metadata->>'rawDisposition' not in ('discarded','not_returned','forbidden') then
      raise exception using errcode='23514',message='snapshot_metadata_invalid';
    end if;
    if new.source='ons-population' and new.normalised_data is not null and
       ((new.normalised_data->>'releaseId')::uuid is distinct from new.dataset_release_id or
        (new.normalised_data->>'releaseId')::uuid is distinct from (c->'releases'->>'population')::uuid or
        (new.normalised_data->>'geographyReleaseId')::uuid is distinct from (c->'releases'->>'geography')::uuid) then
      raise exception using errcode='23514',message='snapshot_release_binding_invalid';
    end if;
  end if;
  return new;
end $$;
create trigger sitefit_snapshot_integrity before insert or update or delete on public.data_snapshots
for each row execute function public.sitefit_guard_snapshot();

create function public.sitefit_guard_analysis_context() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.status='ready' and new.status<>'ready' then raise exception using errcode='23514',message='analysis_frozen'; end if;
  if exists(select 1 from public.analysis_inputs where analysis_id=old.id and resolved_context is not null) and
     (new.property_id is distinct from old.property_id or new.business_type is distinct from old.business_type or
      new.business_category is distinct from old.business_category or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at) then
    raise exception using errcode='23514',message='analysis_context_frozen';
  end if;
  return new;
end $$;
create trigger sitefit_analysis_context_integrity before update on public.analyses
for each row execute function public.sitefit_guard_analysis_context();

-- Serialize report readiness with input/snapshot append; this is an integrity transaction, not job ownership.
create function public.sitefit_lock_report_parent() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op<>'INSERT' and old.tier='full' and old.status='ready' and
     (tg_op='DELETE' or new.analysis_id is distinct from old.analysis_id or new.tier is distinct from old.tier or new.status is distinct from old.status) then
    raise exception using errcode='23514',message='ready_marker_frozen';
  end if;
  if tg_op='DELETE' then return old; end if;
  perform 1 from public.analyses where id=new.analysis_id for update;
  return new;
end $$;
create trigger sitefit_report_parent_integrity before insert or update or delete on public.reports
for each row execute function public.sitefit_lock_report_parent();

create function public.prepare_sitefit_input(p_analysis_id uuid,p_user_supplied jsonb,p_context jsonb)
returns public.analysis_inputs language plpgsql security invoker set search_path='' as $$
declare a public.analyses; p public.properties; result public.analysis_inputs; next_version integer; input_id uuid:=gen_random_uuid(); frozen jsonb; property_context jsonb;
begin
  a:=public.sitefit_assert_collectable(p_analysis_id);
  select * into p from public.properties where id=a.property_id;
  if not found or jsonb_typeof(p_context)<>'object' or jsonb_typeof(p_user_supplied)<>'object' then raise exception using errcode='23514',message='context_required'; end if;
  select coalesce(max(version),0)+1 into next_version from public.analysis_inputs where analysis_id=a.id;
  select resolved_context->'selectedProperty' into property_context from public.analysis_inputs where analysis_id=a.id and resolved_context is not null order by version limit 1;
  frozen:=p_context || jsonb_build_object('schemaVersion',1,'analysisId',a.id,'inputId',input_id,'inputVersion',next_version,
    'analysisTimestamp',a.created_at,'businessType',a.business_type,'category',a.business_category,
    'selectedProperty',coalesce(property_context,jsonb_build_object('id',p.id,'formattedAddress',p.formatted_address,'postcode',p.postcode,
      'provider',p.address_provider,'providerAddressId',p.provider_address_id,'uprn',p.uprn,'resolution',p.address_resolution_state,
      'point',case when p.latitude is null then 'null'::jsonb else jsonb_build_object('longitude',p.longitude,'latitude',p.latitude,
        'precision',p.coordinate_precision,'source',p.coordinate_source,'crs','EPSG:4326') end)));
  insert into public.analysis_inputs(id,analysis_id,version,user_supplied,resolved_context,context_schema_version)
    values(input_id,a.id,next_version,p_user_supplied,frozen,1) returning * into result;
  return result;
end $$;

create function public.append_sitefit_snapshot(p_analysis_id uuid,p_input_id uuid,p_collection_key text,p_request_sha256 text,p_result jsonb)
returns public.data_snapshots language plpgsql security invoker set search_path='' as $$
declare result public.data_snapshots; m jsonb:=p_result->'meta'; payload jsonb:=nullif(p_result->'payload','null'::jsonb); outcome text:=p_result->>'outcome';
begin
  perform public.sitefit_assert_collectable(p_analysis_id);
  insert into public.data_snapshots(analysis_id,input_id,collection_key,request_sha256,source,dataset_version,retrieved_at,
    observed_at,availability,normalised_data,provider_metadata,cost_metadata,dataset_release_id,adapter_version,normalisation_version,
    source_retrieved_at,effective_from,payload_sha256,licence_metadata,quality_metadata,cache_metadata,expires_at)
  values(p_analysis_id,p_input_id,p_collection_key,p_request_sha256,m->>'source',m->>'sourceVersion',(m->>'retrievedAt')::timestamptz,
    (m->>'observedAt')::timestamptz,case outcome when 'success' then 'available' when 'empty' then 'available' when 'partial' then 'partial' when 'unavailable' then 'unavailable' else 'unknown' end,
    payload,p_result-'payload',m->'cost',(m->>'datasetReleaseId')::uuid,m->>'adapterVersion',m->>'normalisationVersion',
    (m->>'sourceRetrievedAt')::timestamptz,(m->>'observedAt')::timestamptz,
    case when payload is null then null else encode(sha256(convert_to(payload::text,'UTF8')),'hex') end,
    m->'licence',m->'quality',m->'cache',case when m->'licence'->'normalised'->>'maxDays' is null then null
      else (m->>'sourceRetrievedAt')::timestamptz + ((m->'licence'->'normalised'->>'maxDays')::integer * interval '1 day') end)
  on conflict on constraint data_snapshots_logical_unique do nothing returning * into result;
  if result.id is null then select * into result from public.data_snapshots where analysis_id=p_analysis_id and input_id=p_input_id and collection_key=p_collection_key and source=m->>'source' and request_sha256=p_request_sha256; end if;
  return result;
end $$;

revoke all on function public.sitefit_assert_collectable(uuid),public.sitefit_guard_input(),public.sitefit_guard_snapshot(),
  public.sitefit_guard_analysis_context(),public.sitefit_lock_report_parent(),public.prepare_sitefit_input(uuid,jsonb,jsonb),
  public.append_sitefit_snapshot(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.sitefit_assert_collectable(uuid),public.prepare_sitefit_input(uuid,jsonb,jsonb),
  public.append_sitefit_snapshot(uuid,uuid,text,text,jsonb) to service_role;
-- Existing column-only INSERT grants stay unchanged: no client resolved_context grant.
revoke truncate on public.analysis_inputs,public.data_snapshots from service_role;
commit;
