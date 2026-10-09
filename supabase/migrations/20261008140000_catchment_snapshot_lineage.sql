-- Bind dependent outcomes to the existing immutable walking snapshot and release vector.
begin;
alter table public.data_snapshots add constraint data_snapshots_catchment_prepared
 check(source not in ('ons-catchments','overture-catchments') or input_id is not null);
create function source_data.guard_catchment_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; parent public.data_snapshots;
 releases jsonb; ranges jsonb; range jsonb; item jsonb; shape jsonb; measured jsonb; i integer; j integer; successes integer:=0;
 keys text[]:=array['censusReleaseId','householdReleaseId','carsReleaseId','economicActivityReleaseId'];
 datasets text[]:=array['TS007A','TS003','TS045','TS066'];
begin
 if new.source not in ('ons-catchments','overture-catchments') then return new; end if;
 select resolved_context into c from public.analysis_inputs where id=new.input_id and analysis_id=new.analysis_id;
 releases:=c->'enrichment'->'releases';
 if c->>'schemaVersion' is distinct from '2' or m->>'provider' is distinct from (case when new.source='ons-catchments' then 'ons' else 'overture' end) or
 m->>'dataset' is distinct from (case when new.source='ons-catchments' then 'census-income-bres' else 'places' end) or
 m->'licence'->>'policyId' is distinct from new.source then raise exception using errcode='23514',message='catchment_source_binding_invalid'; end if;
 if p is null then
  if new.provider_metadata->>'outcome' in ('success','partial','empty') then raise exception using errcode='23514',message='catchment_missing_not_empty'; end if;
  return new;
 end if;
 if c->'enrichment'->'identity'->>'state' is distinct from 'matched' or p->>'schemaVersion' is distinct from '1' or
    m->'quality'->>'precision' is distinct from 'building' then raise exception using errcode='23514',message='catchment_context_invalid'; end if;
 select * into parent from public.data_snapshots where id=(p->'parent'->>'snapshotId')::uuid and analysis_id=new.analysis_id and input_id=new.input_id
  and collection_key=new.collection_key and source='geoapify-walking';
 if parent.id is null or coalesce(p->'parent'->>'checksum','') !~ '^[0-9a-f]{64}$' or parent.normalised_data->>'kind' is distinct from 'walking_geometry' or
    parent.provider_metadata->>'outcome' not in ('success','partial') or
    parent.provider_metadata->'meta'->>'checksum' is distinct from p->'parent'->>'checksum' then
  raise exception using errcode='23514',message='catchment_parent_invalid'; end if;
 if new.source='ons-catchments' then
  if p->>'kind' is distinct from 'catchment_statistics' or p->'releases' is distinct from releases or new.dataset_release_id is not null then
   raise exception using errcode='23514',message='catchment_release_binding_invalid'; end if;
 else
  if p->>'kind' is distinct from 'catchment_places' or p->>'releaseId' is distinct from releases->>'placesReleaseId' or
   p->>'geographyReleaseId' is distinct from releases->>'geographyReleaseId' or new.dataset_release_id is distinct from (releases->>'placesReleaseId')::uuid then
   raise exception using errcode='23514',message='catchment_release_binding_invalid'; end if;
 end if;
 ranges:=p->'ranges';
 if jsonb_typeof(ranges) is distinct from 'array' or jsonb_array_length(ranges)<>3 then raise exception using errcode='23514',message='catchment_ranges_invalid'; end if;
 for i in 0..2 loop
  range:=ranges->i; shape:=parent.normalised_data->'walking'->'polygons'->i->'geometry';
  if range->>'seconds' is distinct from ((i+1)*300)::text then raise exception using errcode='23514',message='catchment_range_invalid'; end if;
  if new.source='ons-catchments' then
   if jsonb_typeof(range->'statistics') is distinct from 'array' or jsonb_array_length(range->'statistics')<>4 then raise exception using errcode='23514',message='catchment_tables_invalid'; end if;
   for j in 0..3 loop
    item:=range->'statistics'->j;
    if item->>'dataset' is distinct from datasets[j+1] or item->>'releaseId' is distinct from releases->>keys[j+1] or item->>'referencePeriod' is distinct from '2021-03-21' then
     raise exception using errcode='23514',message='catchment_table_binding_invalid'; end if;
    if item->>'outcome'='success' then
     measured:=public.measure_sitefit_catchment((releases->>'geographyReleaseId')::uuid,(releases->>'nativeReleaseId')::uuid,
       (releases->>keys[j+1])::uuid,(releases->>'incomeReleaseId')::uuid,(releases->>'bresReleaseId')::uuid,shape);
     if item->'operands' is distinct from measured or item->'error' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='catchment_operands_invalid'; end if;
     successes:=successes+1;
    elsif item->>'outcome' is distinct from 'unavailable' or item->'operands' is distinct from 'null'::jsonb or jsonb_typeof(item->'error') is distinct from 'object' then
     raise exception using errcode='23514',message='catchment_missing_invalid'; end if;
   end loop;
  elsif range->>'outcome'='success' then
   measured:=public.lookup_sitefit_places((releases->>'placesReleaseId')::uuid,(releases->>'geographyReleaseId')::uuid,shape);
   if range->'inventory' is distinct from measured or range->'error' is distinct from 'null'::jsonb then raise exception using errcode='23514',message='catchment_inventory_invalid'; end if;
   successes:=successes+1;
  elsif range->>'outcome' is distinct from 'unavailable' or range->'inventory' is distinct from 'null'::jsonb or jsonb_typeof(range->'error') is distinct from 'object' then
   raise exception using errcode='23514',message='catchment_missing_invalid'; end if;
 end loop;
 if successes=0 or new.provider_metadata->>'outcome' is distinct from (case when successes=(case when new.source='ons-catchments' then 12 else 3 end) then 'success' else 'partial' end) then
  raise exception using errcode='23514',message='catchment_outcome_invalid'; end if;
 return new;
end $$;
create trigger sitefit_catchment_snapshot_integrity before insert on public.data_snapshots for each row execute function source_data.guard_catchment_snapshot();
revoke all on function source_data.guard_catchment_snapshot() from public,anon,authenticated;
commit;
