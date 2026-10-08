-- Immutable station parents and native NUMBAT operands, without new lifecycle tables.
begin;
create function source_data.same_numbat_binary64(p_actual jsonb,p_expected jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare field text; i integer; a jsonb; e jsonb;
begin
 if p_actual-array['values','publishedTotals'] is distinct from p_expected-array['values','publishedTotals'] then return false; end if;
 foreach field in array array['values','publishedTotals'] loop
  a:=p_actual->field;e:=p_expected->field;
  if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a)<>jsonb_array_length(e) then return false; end if;
  for i in 0..jsonb_array_length(e)-1 loop
   if a->i='null'::jsonb or e->i='null'::jsonb then
    if a->i is distinct from e->i then return false; end if;
   elsif (a->>i)::double precision is distinct from (e->>i)::double precision then return false; end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
create function source_data.guard_station_enrichment_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare c jsonb; p jsonb:=new.normalised_data; m jsonb:=new.provider_metadata->'meta'; parent public.data_snapshots;
 outcome text:=new.provider_metadata->>'outcome'; release uuid; targets jsonb; omitted jsonb; truncated jsonb;
 item jsonb; expected jsonb; actual jsonb; mapping jsonb; station jsonb; profile jsonb; native jsonb;
 ids jsonb; id text; asc_code text; nlc integer; native_name text; hub text; i integer; partial boolean;
begin
 if new.source not in ('geoapify-access','tfl-station-activity') then return new; end if;
 select a.resolved_context into c from public.analysis_inputs a where a.id=new.input_id and a.analysis_id=new.analysis_id;
 if c->>'schemaVersion' is distinct from '2' or m->'licence'->>'policyId' is distinct from new.source or
    m->>'provider' is distinct from (case when new.source='geoapify-access' then 'geoapify' else 'tfl' end) or
    m->>'dataset' is distinct from (case when new.source='geoapify-access' then 'walking-matrix' else 'NUMBAT2025' end) or
    m->>'operation' is distinct from (case when new.source='geoapify-access' then 'reviewed-station-targets' else 'TWT-native-gateline-profiles' end) then
  raise exception using errcode='23514',message='station_enrichment_context_invalid'; end if;
 if p is null then
  if outcome in ('success','partial','empty') then raise exception using errcode='23514',message='station_enrichment_missingness'; end if;
  return new;
 end if;
 if c->'enrichment'->'identity'->>'state' is distinct from 'matched' or m->'quality'->>'precision' is distinct from 'building' or
    p->>'schemaVersion' is distinct from '1' or p->>'mappingVersion' is distinct from 'tfl-numbat-reviewed-20261007-1' or
    p->'entranceConfirmed' is distinct from 'false'::jsonb or outcome not in ('success','partial') then
  raise exception using errcode='23514',message='station_enrichment_payload_invalid'; end if;
 release:=(c->'enrichment'->'releases'->>'numbatReleaseId')::uuid;
 select s.* into parent from public.data_snapshots s where s.id=(p->'parent'->>'snapshotId')::uuid and s.analysis_id=new.analysis_id
  and s.input_id=new.input_id and s.collection_key=new.collection_key and s.source='tfl-stations';
 if parent.id is null or parent.provider_metadata->>'outcome' not in ('success','partial') or
    p->'parent'->>'checksum' is distinct from parent.provider_metadata->'meta'->>'checksum' then
  raise exception using errcode='23514',message='station_enrichment_parent_invalid'; end if;
 -- The exact reviewed IDs, names, modes and frozen release are the complete crosswalk.
 select coalesce(jsonb_agg(s order by s->>'id'),'[]'::jsonb) into targets
 from jsonb_array_elements(parent.normalised_data->'items') s
 where release='4f0ccc73-3f4c-4300-82f9-f53e21d3d4a7'::uuid and s->'point'<>'null'::jsonb
 and ((s->>'id'='910GLONFLDS' and s->>'name'='London Fields Rail Station') or
      (s->>'id'='910GCAMHTH' and s->>'name'='Cambridge Heath (London) Rail Station'))
 and string_to_array(s->>'originalMode',',') && array['overground','national-rail'];
 select coalesce(jsonb_agg(s->>'id' order by s->>'id'),'[]'::jsonb) into omitted
 from jsonb_array_elements(parent.normalised_data->'items') s where not exists
 (select 1 from jsonb_array_elements(targets) t where t->>'id'=s->>'id');
 select coalesce(jsonb_agg(t->>'id' order by n),'[]'::jsonb) into truncated
 from jsonb_array_elements(targets) with ordinality a(t,n) where n>8;
 if jsonb_array_length(targets)=0 or p->'registerComplete' is distinct from parent.normalised_data->'complete' or
    p->'omittedIds' is distinct from omitted or p->'truncatedReviewedIds' is distinct from truncated then
  raise exception using errcode='23514',message='station_enrichment_selection_invalid'; end if;
 partial:=parent.normalised_data->'complete'<>'true'::jsonb or jsonb_array_length(omitted)>0 or jsonb_array_length(truncated)>0;
 if new.source='geoapify-access' then
  if p->>'kind' is distinct from 'station_walking' or p->>'selectionVersion' is distinct from 'reviewed-station-id-order-1' or
     p->'matrix'->'origin' is distinct from c->'enrichment'->'identity'->'point' or new.dataset_release_id is not null or
     jsonb_typeof(p->'matrix'->'targets') is distinct from 'array' or
     jsonb_array_length(p->'matrix'->'targets')<>least(8,jsonb_array_length(targets)) then
   raise exception using errcode='23514',message='station_matrix_binding_invalid'; end if;
  for i in 0..least(8,jsonb_array_length(targets))-1 loop
   item:=p->'matrix'->'targets'->i;expected:=targets->i;
   if item->>'id' is distinct from expected->>'id' or item->'point' is distinct from expected->'point' then
    raise exception using errcode='23514',message='station_matrix_target_invalid'; end if;
   if item->>'outcome'='unavailable' then
    partial:=true;
    if item->'metres' is distinct from 'null'::jsonb or item->'seconds' is distinct from 'null'::jsonb or item->>'missingReason' is distinct from 'no_route' then
     raise exception using errcode='23514',message='station_matrix_missing_invalid'; end if;
   elsif item->>'outcome' is distinct from 'success' or jsonb_typeof(item->'metres') is distinct from 'number' or
     jsonb_typeof(item->'seconds') is distinct from 'number' or (item->>'metres')::numeric not between 0 and 100000 or
     (item->>'seconds')::numeric not between 0 and 86400 or item->'missingReason' is distinct from 'null'::jsonb then
    raise exception using errcode='23514',message='station_matrix_route_invalid'; end if;
  end loop;
 else
  if p->>'kind' is distinct from 'station_activity' or p->>'dayType' is distinct from 'TWT' or p->>'releaseId' is distinct from release::text or
     new.dataset_release_id is distinct from release or jsonb_typeof(p->'stations') is distinct from 'array' or
     jsonb_typeof(p->'failures') is distinct from 'array' or jsonb_array_length(p->'stations')=0 then
   raise exception using errcode='23514',message='station_native_binding_invalid'; end if;
  select jsonb_agg(x order by x) into ids from (
   select s->>'id' x from jsonb_array_elements(p->'stations') s union all
   select s->>'id' x from jsonb_array_elements(p->'failures') s) a;
  select jsonb_agg(t->>'id' order by t->>'id') into expected from jsonb_array_elements(targets) with ordinality a(t,n) where n<=8;
  if ids is distinct from expected then raise exception using errcode='23514',message='station_native_ids_invalid'; end if;
  for item in select s from jsonb_array_elements(p->'failures') s loop
   asc_code:=case item->>'id' when '910GLONFLDS' then 'LOFr' else 'CBHr' end;
   if item->>'reason'='native_profiles_missing' then
    if item->'error' is distinct from 'null'::jsonb or public.lookup_sitefit_station_activity(release,asc_code,'TWT') is not null then
     raise exception using errcode='23514',message='station_native_missing_invalid'; end if;
   elsif item->>'reason' is distinct from 'native_read_failed' or jsonb_typeof(item->'error') is distinct from 'object' then
    raise exception using errcode='23514',message='station_native_failure_invalid'; end if;
  end loop;
  for station in select s from jsonb_array_elements(p->'stations') s loop
   id:=station->>'id';actual:=station->'activity';mapping:=actual->'mapping';
   if id='910GLONFLDS' then asc_code:='LOFr';nlc:=6966;native_name:='London Fields';hub:='https://tfl.gov.uk/hub/stop/910GLONFLDS/london-fields-rail-station/';
   else asc_code:='CBHr';nlc:=6962;native_name:='Cambridge Heath';hub:='https://tfl.gov.uk/hub/stop/910GCAMHTH/cambridge-heath-london-rail-station/'; end if;
   select t into item from jsonb_array_elements(targets) t where t->>'id'=id;
   expected:=jsonb_build_object('stopId',id,'stopName',item->>'name','asc',asc_code,'nlc',nlc,'nativeName',native_name,
    'sourceReference',hub,'mappingVersion','tfl-numbat-reviewed-20261007-1','nativeReleaseId',release::text,
    'method','explicit_reviewed_crosswalk','reviewedAt','2026-10-07T21:27:02.387Z','entranceConfirmed',false);
   native:=public.lookup_sitefit_station_activity(release,asc_code,'TWT');
   if mapping is distinct from expected or native is null or actual->>'dayType' is distinct from 'TWT' or
      actual->>'basis' is distinct from 'modelled_typical_day_gateline_movements_not_pedestrian_footfall' or
      actual->'customerCount' is distinct from 'null'::jsonb or actual->'measuredPedestrianFootfall' is distinct from 'null'::jsonb or
      jsonb_typeof(actual->'profiles') is distinct from 'array' or jsonb_array_length(actual->'profiles')<>2 then
    raise exception using errcode='23514',message='station_native_mapping_invalid'; end if;
   for profile in select s from jsonb_array_elements(actual->'profiles') s loop
    select s into expected from jsonb_array_elements(native) s where s->>'measure'=profile->>'measure';
    if expected is null or not source_data.same_numbat_binary64(profile,expected) then
     raise exception using errcode='23514',message='station_native_operands_invalid'; end if;
   end loop;
   if (actual->'profiles'->0->>'measure')=(actual->'profiles'->1->>'measure') then
    raise exception using errcode='23514',message='station_native_duplicate_measure'; end if;
  end loop;
  partial:=partial or jsonb_array_length(p->'failures')>0;
 end if;
 if outcome is distinct from (case when partial then 'partial' else 'success' end) then
  raise exception using errcode='23514',message='station_enrichment_outcome_invalid'; end if;
 return new;
end $$;
create trigger station_enrichment_source_integrity before insert on public.data_snapshots
for each row execute function source_data.guard_station_enrichment_snapshot();
revoke all on function source_data.same_numbat_binary64(jsonb,jsonb),source_data.guard_station_enrichment_snapshot() from public,anon,authenticated;
grant execute on function source_data.same_numbat_binary64(jsonb,jsonb) to service_role;
commit;
