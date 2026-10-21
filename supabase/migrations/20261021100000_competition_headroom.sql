-- Optional Competition evidence. Existing provider/AI ceilings and historical Ready rows unchanged.
create table public.competition_collections(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),analysis_id uuid not null references public.analyses(id),input_id uuid not null references public.analysis_inputs(id),
 walking_id uuid not null references public.data_snapshots(id),population_id uuid not null references public.data_snapshots(id),walking_checksum text not null,category text not null check(category in('coffee-shop','restaurant','hair-salon','beauty-salon')),
 model text not null default 'competition_headroom_v1' check(model='competition_headroom_v1'),state text not null default 'collecting' check(state in('collecting','finished')),
 token uuid not null default gen_random_uuid(),lease_until timestamptz not null default now()+interval '60 seconds',result jsonb,created_at timestamptz not null default now(),
 unique(analysis_id,input_id,model),check((state='finished')=(result is not null)),check(octet_length(result::text)<=45000));
create table public.competition_pages(
 id uuid primary key default gen_random_uuid(),collection_id uuid not null references public.competition_collections(id),page_offset integer not null check(page_offset between 0 and 2500 and page_offset%500=0),attempt integer not null check(attempt between 1 and 2),
 state text not null default 'intent' check(state in('intent','received','failed','ambiguous')),reserved_credits integer not null default 25 check(reserved_credits=25),page jsonb,reason text,
 created_at timestamptz not null default now(),unique(collection_id,page_offset,attempt),check(octet_length(page::text)<=600000),check((state='received')=(page is not null)));
alter table public.competition_collections enable row level security;
alter table public.competition_pages enable row level security;
revoke all on public.competition_collections,public.competition_pages from public,anon,authenticated,service_role;
create function public.claim_sitefit_competition(p_owner uuid,p_analysis uuid,p_input uuid,p_walking uuid,p_population uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.analyses;c jsonb;w public.data_snapshots;p public.data_snapshots;j public.competition_collections;g gis.geometry;unions jsonb:='[]';i integer;
begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into strict a from public.analyses where id=p_analysis and owner_id=p_owner for update;
 select resolved_context into strict c from public.analysis_inputs where id=p_input and analysis_id=a.id;
 select * into j from public.competition_collections where analysis_id=a.id and input_id=p_input;
 if j.id is not null then
  if j.walking_id<>p_walking or j.population_id<>p_population or j.category<>a.business_type then raise exception 'competition_binding_invalid';end if;
  if j.state='finished' then return jsonb_build_object('result',j.result);end if;
  -- A crashed collection is never silently resent or indefinitely pending.
  if j.lease_until>now() then raise exception 'competition_busy';end if;
  if exists(select 1 from public.competition_pages where collection_id=j.id and state in('intent','ambiguous')) then raise exception 'competition_unconfirmed';end if;
  update public.competition_collections set token=gen_random_uuid(),lease_until=now()+interval '60 seconds' where id=j.id returning * into j;
 else
  perform public.sitefit_assert_collectable(a.id);
  if exists(select 1 from public.reports where analysis_id=a.id and status='ready' and tier='free') then raise exception 'competition_ready_immutable';end if;
  select * into strict w from public.data_snapshots where id=p_walking and analysis_id=a.id and input_id=p_input and source='geoapify-walking';
  select * into strict p from public.data_snapshots where id=p_population and analysis_id=a.id and input_id=p_input and source='ons-catchments';
  if w.normalised_data is null or w.normalised_data#>'{walking,origin}' is distinct from source_data.contextual_walking_origin(c) or
    p.collection_key<>w.collection_key or p.normalised_data#>>'{parent,snapshotId}' is distinct from w.id::text or p.normalised_data#>>'{parent,checksum}' is distinct from w.provider_metadata#>>'{meta,checksum}' then raise exception 'competition_binding_invalid';end if;
  perform public.validate_sitefit_walking_geometry((c#>>'{enrichment,releases,geographyReleaseId}')::uuid,w.normalised_data->'walking');
  if pg_database_size(current_database())+2000000>450000000 then raise exception 'competition_capacity';end if;
  insert into public.competition_collections(owner_id,analysis_id,input_id,walking_id,population_id,walking_checksum,category) values(p_owner,a.id,p_input,w.id,p.id,w.provider_metadata#>>'{meta,checksum}',a.business_type) returning * into j;
 end if;
 select * into strict w from public.data_snapshots where id=j.walking_id;
 -- Effective cumulative unions retain the originals and do not simplify, buffer or fill holes.
 for i in 0..2 loop
  if i=0 then g:=source_data.checked_enrichment_polygon(w.normalised_data#>'{walking,polygons,0,geometry}');
  else g:=gis.st_union(g,source_data.checked_enrichment_polygon(w.normalised_data#>array['walking','polygons',i::text,'geometry']));end if;
  if not gis.st_isvalid(g) then raise exception 'competition_geometry_invalid';end if;
  unions:=unions||jsonb_build_array(gis.st_asgeojson(g,15)::jsonb);
 end loop;
 return jsonb_build_object('id',j.id,'token',j.token,'geometries',unions,'createdAt',j.created_at,'walkingChecksum',j.walking_checksum);
end$$;
create function public.reserve_sitefit_competition_page(p_owner uuid,p_collection uuid,p_token uuid,p_offset integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.competition_collections;c public.controlled_proof;v public.competition_pages;n integer;attempt integer;
begin
 select * into strict j from public.competition_collections where id=p_collection and owner_id=p_owner for update;
 perform public.assert_sitefit_processing_allowed(p_owner);
 if j.state<>'collecting' or j.token is distinct from p_token or j.lease_until<=now() or p_offset not between 0 and 2500 or p_offset%500<>0 then raise exception 'competition_reservation_denied';end if;
 if exists(select 1 from public.reports where analysis_id=j.analysis_id and tier='free' and status='ready') then raise exception 'competition_ready_immutable';end if;
 select * into v from public.competition_pages where collection_id=j.id and page_offset=p_offset and state='received';
 if v.id is not null then return jsonb_build_object('id',v.id,'cached',v.page,'reservedCredits',(select coalesce(sum(reserved_credits),0) from public.competition_pages where collection_id=j.id));end if;
 if exists(select 1 from public.competition_pages where collection_id=j.id and state in('intent','ambiguous')) then raise exception 'competition_unconfirmed';end if;
 if p_offset>0 and not exists(select 1 from public.competition_pages where collection_id=j.id and page_offset=p_offset-500 and state='received' and (page->>'size')::integer=500) then raise exception 'competition_page_sequence';end if;
 select count(*)+1 into attempt from public.competition_pages where collection_id=j.id and page_offset=p_offset;
 if attempt>2 or (select coalesce(sum(reserved_credits),0) from public.competition_pages where collection_id=j.id)+25>75 then raise exception 'competition_budget_unavailable';end if;
 -- Subordinate to the EXISTING provider governor; no increase from its two-call cap.
 select * into c from public.controlled_proof where owner_id=p_owner and property_id=(select property_id from public.analyses where id=j.analysis_id) and nonce=(select submission_nonce from public.analyses where id=j.analysis_id) and business_type=j.category and state='snapshot_running' and enabled and expires_at>now() for update;
 if not exists(select 1 from public.sale_policies where version=c.policy_version and snapshot=c.policy_snapshot) then raise exception 'competition_policy_revoked';end if;
 if c.id is null or (c.trial_id is not null and not public.sitefit_trial_active(c.trial_id,p_owner)) then raise exception 'competition_not_authorised';end if;
 select count(*) into n from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='api.geoapify.com';
 n:=n+(select count(*) from public.competition_pages cp join public.competition_collections cc on cc.id=cp.collection_id where cc.analysis_id=j.analysis_id);
 if n>=2 then raise exception 'competition_budget_unavailable';end if;
 insert into public.competition_pages(collection_id,page_offset,attempt) values(j.id,p_offset,attempt) returning * into v;
 return jsonb_build_object('id',v.id,'cached',null,'reservedCredits',(select coalesce(sum(reserved_credits),0) from public.competition_pages where collection_id=j.id));
end$$;
create function public.settle_sitefit_competition_page(p_owner uuid,p_collection uuid,p_token uuid,p_page uuid,p_state text,p_value jsonb,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare j public.competition_collections;v public.competition_pages;
begin
 select * into strict j from public.competition_collections where id=p_collection and owner_id=p_owner for update;
 if j.token is distinct from p_token or j.state<>'collecting' or p_state not in('received','failed','ambiguous') then raise exception 'competition_settlement_denied';end if;
 select * into strict v from public.competition_pages where id=p_page and collection_id=j.id for update;
 if v.state=p_state and v.page is not distinct from p_value then return;end if;
 if v.state<>'intent' or length(p_reason)>80 or (p_state='received' and (jsonb_typeof(p_value->'items') is distinct from 'array' or jsonb_array_length(p_value->'items')>500 or p_value->>'size' is distinct from jsonb_array_length(p_value->'items')::text)) or (p_state<>'received' and p_value is not null) then raise exception 'competition_settlement_invalid';end if;
 update public.competition_pages set state=p_state,page=p_value,reason=p_reason where id=v.id;
end$$;
create function public.finish_sitefit_competition(p_owner uuid,p_collection uuid,p_token uuid,p_result jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare j public.competition_collections;n integer;credits integer;
begin
 select * into strict j from public.competition_collections where id=p_collection and owner_id=p_owner for update;
 if j.state='finished' and j.result=p_result then return;end if;
 if j.state<>'collecting' or j.token is distinct from p_token or p_result->>'version' is distinct from 'competition_headroom_v1' or p_result->>'category' is distinct from j.category or p_result#>>'{provenance,collectionId}' is distinct from j.id::text or p_result#>>'{provenance,walkingSnapshotId}' is distinct from j.walking_id::text or p_result#>>'{provenance,walkingChecksum}' is distinct from j.walking_checksum then raise exception 'competition_finish_binding';end if;
 select count(distinct page_offset),coalesce(sum(reserved_credits),0) into n,credits from public.competition_pages where collection_id=j.id;
 if (p_result#>>'{provenance,reservedCredits}')::integer is distinct from credits then raise exception 'competition_credit_binding';end if;
 if jsonb_typeof(p_result) is distinct from 'object' or p_result->>'state' is null or p_result->>'state' not in('ready','incomplete','provider_unavailable','classification_ambiguous','invalid_coordinates','invalid_geometry','population_unavailable','budget_unavailable','collection_unconfirmed','unsupported') or (p_result->>'state'<>'ready' and p_result->>'score' is not null) then raise exception 'competition_state_invalid';end if;
 if p_result->>'state'='ready' and (exists(select 1 from public.competition_pages where collection_id=j.id and state in('intent','ambiguous')) or not exists(select 1 from public.competition_pages where collection_id=j.id and state='received' and (page->>'size')::integer<500) or (p_result#>>'{provenance,pages}')::integer<>n) then raise exception 'competition_incomplete_not_ready';end if;
 update public.competition_collections set state='finished',result=p_result where id=j.id;
end$$;
-- Prevent new report projections from substituting another property's Competition result.
create function public.guard_sitefit_competition_report() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb;stored jsonb;free_id uuid;
begin
 if new.tier='free' then
  r:=new.free_projection->'competition';
  if r is null then return new;end if;
  if r->>'score' is not null and r->>'state' is distinct from 'ready' then raise exception 'competition_unavailable_score';end if;
  if r#>>'{provenance,collectionId}' is not null then
   select result into stored from public.competition_collections where id=(r#>>'{provenance,collectionId}')::uuid and analysis_id=new.analysis_id and input_id=new.input_id and state='finished';
   if stored is distinct from r then raise exception 'competition_report_binding';end if;
  elsif r->>'state'='ready' then raise exception 'competition_ready_without_collection';end if;
 else
  r:=new.provenance#>'{preparation,presentation,competition}';
  if r is null then return new;end if;
  free_id:=(new.provenance#>>'{preparation,presentation,freeReportId}')::uuid;
  select free_projection->'competition' into stored from public.reports where id=free_id and analysis_id=new.analysis_id and input_id=new.input_id and tier='free' and status='ready';
  if stored is distinct from r then raise exception 'competition_full_binding';end if;
 end if;
 return new;
end$$;
create trigger competition_report_binding before insert or update on public.reports for each row execute function public.guard_sitefit_competition_report();
revoke all on function public.claim_sitefit_competition(uuid,uuid,uuid,uuid,uuid),public.reserve_sitefit_competition_page(uuid,uuid,uuid,integer),public.settle_sitefit_competition_page(uuid,uuid,uuid,uuid,text,jsonb,text),public.finish_sitefit_competition(uuid,uuid,uuid,jsonb),public.guard_sitefit_competition_report() from public,anon,authenticated;
grant execute on function public.claim_sitefit_competition(uuid,uuid,uuid,uuid,uuid),public.reserve_sitefit_competition_page(uuid,uuid,uuid,integer),public.settle_sitefit_competition_page(uuid,uuid,uuid,uuid,text,jsonb,text),public.finish_sitefit_competition(uuid,uuid,uuid,jsonb) to service_role;

-- Both reservation paths lock the same case, so optional Places cannot race the existing governor.
alter function public.reserve_sitefit_proof_dispatch(uuid,uuid,text,text,text,text,bigint) rename to reserve_sitefit_proof_dispatch_pre_competition;
revoke all on function public.reserve_sitefit_proof_dispatch_pre_competition(uuid,uuid,text,text,text,text,bigint) from public,anon,authenticated,service_role;
create function public.reserve_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_stage text,p_key text,p_kind text,p_digest text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;n integer;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 if p_kind='api.geoapify.com' then
  select count(*) into n from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind=p_kind;
  n:=n+(select count(*) from public.competition_pages cp join public.competition_collections cc on cc.id=cp.collection_id join public.analyses a on a.id=cc.analysis_id where a.owner_id=c.owner_id and a.submission_nonce=c.nonce and a.property_id=c.property_id and a.business_type=c.business_type);
  if n>=2 then raise exception 'proof_dispatch_cap';end if;
 end if;
 return public.reserve_sitefit_proof_dispatch_pre_competition(p_case,p_token,p_stage,p_key,p_kind,p_digest,p_micros);
end$$;
revoke all on function public.reserve_sitefit_proof_dispatch(uuid,uuid,text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_sitefit_proof_dispatch(uuid,uuid,text,text,text,text,bigint) to service_role;

alter function public.read_sitefit_full_material(uuid,uuid) rename to read_sitefit_full_material_pre_competition;
revoke all on function public.read_sitefit_full_material_pre_competition(uuid,uuid) from public,anon,authenticated,service_role;
create function public.read_sitefit_full_material(p_owner uuid,p_free uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m jsonb;r jsonb;begin
 m:=public.read_sitefit_full_material_pre_competition(p_owner,p_free);
 select free_projection->'competition' into r from public.reports where id=p_free and tier='free' and status='ready';
 return case when r is null then m else m||jsonb_build_object('competition',r) end;
end$$;
revoke all on function public.read_sitefit_full_material(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_full_material(uuid,uuid) to service_role;

create function public.guard_sitefit_competition_collection() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or old.state='finished' or row(new.id,new.owner_id,new.analysis_id,new.input_id,new.walking_id,new.population_id,new.walking_checksum,new.category,new.model,new.created_at) is distinct from row(old.id,old.owner_id,old.analysis_id,old.input_id,old.walking_id,old.population_id,old.walking_checksum,old.category,old.model,old.created_at) then raise exception 'competition_collection_frozen';end if;
 return new;
end$$;
create trigger competition_collection_frozen before update or delete on public.competition_collections for each row execute function public.guard_sitefit_competition_collection();
revoke all on function public.guard_sitefit_competition_collection() from public,anon,authenticated;
