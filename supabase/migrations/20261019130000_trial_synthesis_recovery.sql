-- Operator-issued synthesis-only recovery. No authority or activation is seeded.
-- Original failed report and original dispatches remain immutable evidence.
create table public.trial_synthesis_recoveries(
 id uuid primary key default gen_random_uuid(), case_id uuid not null unique references public.controlled_proof(id),
 analysis_id uuid not null references public.analyses(id), input_id uuid not null references public.analysis_inputs(id),
 failed_report_id uuid not null references public.reports(id), failed_digest text not null check(failed_digest ~ '^[a-f0-9]{64}$'),
 frozen_snapshots uuid[] not null check(cardinality(frozen_snapshots)=17), source_digest text not null check(source_digest ~ '^[a-f0-9]{64}$'),
 enabled boolean not null default false, expires_at timestamptz not null,
 state text not null default 'issued' check(state in('issued','running','received','ambiguous','ready')),
 token uuid, request_key text check(request_key ~ '^[a-f0-9]{64}$'), reserved_micros bigint not null default 0 check(reserved_micros between 0 and 650000),
 response_digest text, checkpoint text check(octet_length(checkpoint)<=128000), report_id uuid references public.reports(id), created_at timestamptz not null default now()
);
alter table public.trial_synthesis_recoveries enable row level security;
revoke all on public.trial_synthesis_recoveries from public,anon,authenticated,service_role;

create function public.sitefit_trial_synthesis_authority(p_id uuid) returns public.trial_synthesis_recoveries
language plpgsql security definer set search_path='' as $$declare r public.trial_synthesis_recoveries;c public.controlled_proof;f public.reports;begin
 select * into strict c from public.controlled_proof where id=(select case_id from public.trial_synthesis_recoveries where id=p_id) for update;
 select * into strict r from public.trial_synthesis_recoveries where id=p_id for update;
 select * into strict f from public.reports where id=r.failed_report_id;
 if not r.enabled or r.expires_at<=now() or not c.enabled or c.state<>'intervention' or c.free_report_id is not null or c.payment_id is not null
 or not public.sitefit_trial_active(c.trial_id,c.owner_id) or c.expires_at<=now() or r.expires_at>c.expires_at
 or not c.tariff_verified or c.input_rate<2.5 or c.output_rate<10
 or not exists(select 1 from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id where a.id=r.analysis_id and i.id=r.input_id
 and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 or f.analysis_id<>r.analysis_id or f.input_id<>r.input_id or f.status<>'failed' or f.tier<>'free' or f.version<>1
 or encode(sha256(convert_to(to_jsonb(f)::text,'UTF8')),'hex')<>r.failed_digest
 or r.source_digest<>public.sitefit_continuation_digest(r.frozen_snapshots)
 or (select count(*) from public.data_snapshots where id=any(r.frozen_snapshots) and analysis_id=r.analysis_id and input_id=r.input_id and collection_key='free-enriched-v1')<>17
 or (select count(*) from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai')<>4
 or exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 or exists(select 1 from public.snapshot_continuations where case_id=c.id)
 or (select count(distinct s->>'section') from jsonb_array_elements(f.provenance->'partial'->'sections')s where s->>'section' in('customer-base','market-position','customer-access','premises'))<>4
 or jsonb_array_length(f.provenance->'partial'->'receipts')<>4
 or exists(select 1 from public.reports where analysis_id=r.analysis_id and tier='free' and status='ready')
 then raise exception 'trial_synthesis_authority_denied' using errcode='42501';end if;return r;
end$$;
revoke all on function public.sitefit_trial_synthesis_authority(uuid) from public,anon,authenticated,service_role;

create function public.guard_sitefit_trial_synthesis_history() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op in('DELETE','TRUNCATE') then raise exception 'synthesis_history_immutable';end if;
 if tg_op='INSERT' then
 if new.enabled or new.state<>'issued' or new.token is not null or new.request_key is not null or new.reserved_micros<>0 or new.checkpoint is not null or new.response_digest is not null or new.report_id is not null then raise exception 'synthesis_initial_state';end if;
 else
 if (to_jsonb(new)-array['enabled','state','token','request_key','reserved_micros','response_digest','checkpoint','report_id']) is distinct from (to_jsonb(old)-array['enabled','state','token','request_key','reserved_micros','response_digest','checkpoint','report_id'])
 or old.state<>'issued' and new.enabled is distinct from old.enabled
 or old.token is not null and new.token is distinct from old.token
 or old.request_key is not null and row(new.request_key,new.reserved_micros) is distinct from row(old.request_key,old.reserved_micros)
 or old.checkpoint is not null and row(new.checkpoint,new.response_digest) is distinct from row(old.checkpoint,old.response_digest)
 or old.report_id is not null and new.report_id is distinct from old.report_id
 or old.state<>new.state and not(old.state='issued' and new.state='running' or old.state='running' and new.state in('received','ambiguous') or old.state='received' and new.state='ready')
 then raise exception 'synthesis_history_immutable';end if;
 end if;return new;
end$$;
create trigger synthesis_history before insert or update or delete on public.trial_synthesis_recoveries for each row execute function public.guard_sitefit_trial_synthesis_history();
create trigger synthesis_no_truncate before truncate on public.trial_synthesis_recoveries for each statement execute function public.guard_sitefit_trial_synthesis_history();
revoke all on function public.guard_sitefit_trial_synthesis_history() from public,anon,authenticated,service_role;

create function public.claim_sitefit_trial_synthesis(p_id uuid,p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare r public.trial_synthesis_recoveries;c public.controlled_proof;begin
 r:=public.sitefit_trial_synthesis_authority(p_id);select * into strict c from public.controlled_proof where id=r.case_id;
 if c.owner_id is distinct from p_owner then raise exception 'synthesis_owner_denied' using errcode='42501';end if;
 -- Only an explicitly received checkpoint permits process-restart replay. An intent never permits resend.
 if r.state='issued' then update public.trial_synthesis_recoveries set state='running',token=gen_random_uuid() where id=r.id returning * into r;
 elsif r.state<>'received' then raise exception 'synthesis_no_redispatch';end if;
 return jsonb_build_object('token',r.token,'analysisId',r.analysis_id,'inputId',r.input_id,'failedReportId',r.failed_report_id,'snapshotIds',r.frozen_snapshots,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$$;

create function public.reserve_sitefit_trial_synthesis(p_id uuid,p_token uuid,p_key text,p_kind text,p_micros bigint,p_slot text) returns uuid
language plpgsql security definer set search_path='' as $$declare r public.trial_synthesis_recoveries;c public.controlled_proof;begin
 r:=public.sitefit_trial_synthesis_authority(p_id);select * into strict c from public.controlled_proof where id=r.case_id;
 if p_token is null or r.token is distinct from p_token or r.state<>'running' or r.request_key is not null or p_kind is distinct from 'ai' or p_slot is distinct from 'synthesis'
 or p_micros is null or p_micros<=0 or c.reserved_micros+p_micros>650000
 or pg_database_size(current_database())+2000000>450000000 then raise exception 'synthesis_reservation_denied';end if;
 update public.trial_synthesis_recoveries set request_key=p_key,reserved_micros=p_micros where id=r.id;
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where id=c.id;
 return r.id;
end$$;

create function public.read_sitefit_trial_synthesis_response(p_id uuid,p_token uuid,p_key text) returns text
language plpgsql security definer set search_path='' as $$declare r public.trial_synthesis_recoveries;begin
 r:=public.sitefit_trial_synthesis_authority(p_id);
 if p_token is null or r.token is distinct from p_token then raise exception 'synthesis_token_denied' using errcode='42501';end if;
 if r.request_key is null and r.state='running' then return null;end if;
 if r.request_key is distinct from p_key or r.state<>'received' or r.checkpoint is null then raise exception 'synthesis_no_redispatch';end if;
 return r.checkpoint;
end$$;

create function public.settle_sitefit_trial_synthesis(p_id uuid,p_token uuid,p_state text,p_digest text,p_checkpoint text) returns void
language plpgsql security definer set search_path='' as $$declare r public.trial_synthesis_recoveries;begin
 r:=public.sitefit_trial_synthesis_authority(p_id);
 if p_token is null or r.token is distinct from p_token or r.request_key is null then raise exception 'synthesis_token_denied' using errcode='42501';end if;
 if r.state=p_state and r.response_digest is not distinct from p_digest and r.checkpoint is not distinct from p_checkpoint then return;end if;
 if r.state<>'running' or p_state is null or p_state not in('received','ambiguous')
 or p_state='received' and (p_digest is null or p_digest !~ '^[a-f0-9]{64}$' or p_checkpoint is null or jsonb_typeof(p_checkpoint::jsonb) is distinct from 'object')
 or p_state='ambiguous' and (p_digest is not null or p_checkpoint is not null) then raise exception 'synthesis_settlement_denied';end if;
 update public.trial_synthesis_recoveries set state=p_state,response_digest=p_digest,checkpoint=p_checkpoint where id=r.id;
end$$;
create function public.finalise_sitefit_recovered_free(p_owner uuid,p_analysis uuid,p_input uuid,p_evidence jsonb,p_sections jsonb,p_projection jsonb,p_provenance jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare a public.analyses; rid uuid; item jsonb; pos integer:=0; c jsonb; walking jsonb; matrix jsonb; station_register jsonb; stations jsonb;
begin
 select * into a from public.analyses where id=p_analysis and owner_id=p_owner for update;
 if a.id is null then raise exception using errcode='42501',message='analysis_not_owned'; end if;
 select id into rid from public.reports where analysis_id=a.id and tier='free' and status='ready' and schema_version=2;
 if rid is not null then return rid; end if;
 if a.schema_version<>2 or not exists(select 1 from public.analysis_inputs where id=p_input and analysis_id=a.id and resolved_context is not null)
   or jsonb_typeof(p_evidence) is distinct from 'array' or jsonb_array_length(p_evidence)>512
   or jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections)<>5
   or jsonb_typeof(p_projection) is distinct from 'object' or octet_length(p_projection::text)>(case when p_projection->>'schemaVersion'='3' then 750000 else 100000 end)
   or jsonb_typeof(p_provenance) is distinct from 'object' or octet_length(p_provenance::text)>1000000
   or coalesce(p_projection->>'schemaVersion','') not in ('2','3') or p_projection->>'analysisId' is distinct from a.id::text
   or p_provenance->>'inputId' is distinct from p_input::text then raise exception using errcode='23514',message='invalid_free_report'; end if;
 if p_projection->>'schemaVersion'='3' then
  select resolved_context into c from public.analysis_inputs where id=p_input and analysis_id=a.id;
  if c->>'schemaVersion' is distinct from '2' or p_provenance->'inputContext' is distinct from c or
    jsonb_typeof(p_provenance->'sourceSnapshotIds') is distinct from 'array' or
    exists(select 1 from jsonb_array_elements_text(p_provenance->'sourceSnapshotIds') sid where not exists(
      select 1 from public.data_snapshots ds where ds.id=sid::uuid and ds.analysis_id=a.id and ds.input_id=p_input)) then
   raise exception using errcode='23514',message='enriched_projection_source_binding'; end if;
  select normalised_data into walking from public.data_snapshots where analysis_id=a.id and input_id=p_input and source='geoapify-walking'
    and id::text in (select jsonb_array_elements_text(p_provenance->'sourceSnapshotIds'));
  select normalised_data into matrix from public.data_snapshots where analysis_id=a.id and input_id=p_input and source='geoapify-access'
    and id::text in (select jsonb_array_elements_text(p_provenance->'sourceSnapshotIds'));
  if matrix is not null then select normalised_data into station_register from public.data_snapshots where id=(matrix->'parent'->>'snapshotId')::uuid and analysis_id=a.id and input_id=p_input;end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.v->>'id','name',r.v->>'name','mode',r.v->>'mode','point',r.v->'point',
    'seconds',t.v->'seconds','metres',t.v->'metres','outcome',t.v->>'outcome') order by t.ord),'[]'::jsonb) into stations
   from jsonb_array_elements(coalesce(matrix->'matrix'->'targets','[]'::jsonb)) with ordinality t(v,ord)
   join lateral jsonb_array_elements(station_register->'items') r(v) on r.v->>'id'=t.v->>'id';
  if p_projection->'spatial'->>'schemaVersion' is distinct from '1' or
    p_projection->'spatial'->'origin' is distinct from c->'enrichment'->'identity'->'point' or
    p_projection->'spatial'->'catchments' is distinct from coalesce(walking->'walking'->'polygons','[]'::jsonb) or
    p_projection->'spatial'->'stations' is distinct from stations then
   raise exception using errcode='23514',message='enriched_projection_operand_binding';end if;
 end if;
 if not (p_provenance ?& array['scoringVersions','weights','metrics','comparison','ai','generatedAt']) then raise exception using errcode='23514',message='missing_report_provenance'; end if;
 if (select count(distinct e->>'section') from jsonb_array_elements(p_sections)e where e->>'section' in ('early-view','customer-base','market-position','customer-access','premises'))<>5 then
   raise exception using errcode='23514',message='invalid_section_set'; end if;
 for item in select value from jsonb_array_elements(p_evidence) loop
   if item->>'analysisId' is distinct from a.id::text or item->>'inputId' is distinct from p_input::text or coalesce(item->>'schemaVersion','') not in ('1','2')
     or item->'licence'->>'representationAllowed' is distinct from 'true' then raise exception using errcode='23514',message='invalid_evidence_binding'; end if;
   if item->>'snapshotId' is not null and not exists(select 1 from public.data_snapshots where id=(item->>'snapshotId')::uuid and analysis_id=a.id and input_id=p_input) then
     raise exception using errcode='23514',message='invalid_evidence_snapshot'; end if;
   insert into public.evidence_items(id,analysis_id,input_id,snapshot_id,classification,knowledge,claim,envelope)
   values((item->>'id')::uuid,a.id,p_input,(item->>'snapshotId')::uuid,
     case when item->>'kind'='ai_inference' then 'ai_inference'::public.evidence_classification
       when item->>'sourceClass'='official_public' then 'official_public_data'::public.evidence_classification
       when item->>'sourceClass'='commercial' then 'commercial_data'::public.evidence_classification
       when item->>'sourceClass'='community_open' then 'community_open_data'::public.evidence_classification else 'user_supplied_information'::public.evidence_classification end,
     case when item->'quality'->>'available'='true' and (item->>'kind' in ('modelled','inferred','derived') or item->'geography'->'statistical'->>'estimated'='true') then 'estimated'::public.knowledge_status
       when item->'quality'->>'available'='true' then 'known'::public.knowledge_status else 'unknown'::public.knowledge_status end,
     item->>'scope',item);
 end loop;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
 values(a.id,p_input,2,2,'free','draft',p_provenance,p_projection) returning id into rid;
 for item in select value from jsonb_array_elements(p_sections) loop
   if jsonb_typeof(item->'evidenceIds') is distinct from 'array' or jsonb_array_length(item->'evidenceIds')=0
     or exists(select 1 from jsonb_path_query(item,'$.**.evidenceIds[*]') ref
       where not exists(select 1 from public.evidence_items e where e.analysis_id=a.id and e.input_id=p_input and e.id::text=(ref#>>'{}'))) then
     raise exception using errcode='23514',message='invalid_section_evidence';
   end if;
   pos:=pos+1;
   insert into public.report_sections(analysis_id,report_id,section_key,position,structured_content,claim_evidence)
   values(a.id,rid,item->>'section',pos,item,coalesce(item->'evidenceIds','[]'::jsonb));
 end loop;
 -- The analysis transition precedes the ready marker in this same transaction so future changes are frozen.
 update public.analyses set status='free_ready',failure_code=null where id=a.id;
 update public.reports set status='ready' where id=rid;
 return rid;
end $$;

revoke all on function public.finalise_sitefit_recovered_free(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create or replace function public.freeze_sitefit_proof_identity() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op<>'UPDATE' or (not old.singleton and old.trial_id is null) then raise exception 'proof_history_immutable';end if;
 if new.trial_id is distinct from old.trial_id or (old.trial_id is not null and new.singleton) then raise exception 'proof_trial_immutable';end if;
 if old.trial_id is null and not new.singleton then
 if old.enabled or old.state not in('intervention','complete')
 or (to_jsonb(new)-'singleton') is distinct from (to_jsonb(old)-'singleton')
 or exists(select 1 from public.proof_dispatches where case_id=old.id and state='intent')
 then raise exception 'proof_retirement_denied';end if;
 return new;
 end if;
 if row(new.id,new.owner_id,new.property_id,new.business_type,new.nonce,new.policy_version,new.policy_snapshot,new.policy_digest,new.ai_limit_micros) is distinct from
 row(old.id,old.owner_id,old.property_id,old.business_type,old.nonce,old.policy_version,old.policy_snapshot,old.policy_digest,old.ai_limit_micros)
 or new.reserved_micros<old.reserved_micros or old.state<>'issued' and
 row(new.expires_at,new.input_rate,new.output_rate,new.tariff_digest,new.tariff_verified) is distinct from
 row(old.expires_at,old.input_rate,old.output_rate,old.tariff_digest,old.tariff_verified)
 or old.state<>'issued' and new.state='issued' then raise exception 'proof_identity_or_hold_immutable';end if;
 if old.state<>new.state and not ((old.state='issued' and new.state='snapshot_running') or
 (old.state='snapshot_running' and new.state in('snapshot_ready','intervention')) or
 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.trial_synthesis_recoveries r join public.reports f on f.id=r.report_id
 where r.case_id=old.id and r.state='ready' and r.enabled and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='snapshot_ready' and new.state='full_running') or
 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;
 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or
 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or
 (old.payment_id is not null and new.payment_id is distinct from old.payment_id) then raise exception 'proof_binding_immutable';end if;
 return new;
end$$;


create function public.finish_sitefit_trial_synthesis(p_id uuid,p_token uuid,p_evidence jsonb,p_sections jsonb,p_projection jsonb,p_provenance jsonb) returns uuid
language plpgsql security definer set search_path='' as $$declare r public.trial_synthesis_recoveries;c public.controlled_proof;rid uuid;begin
 r:=public.sitefit_trial_synthesis_authority(p_id);select * into strict c from public.controlled_proof where id=r.case_id;
 if p_token is null or r.token is distinct from p_token or r.state<>'received' or r.checkpoint is null
 or p_provenance->'sourceSnapshotIds' is distinct from to_jsonb(r.frozen_snapshots)
 or p_provenance->'ai'->>'dispatches' is distinct from '5' or jsonb_array_length(p_provenance->'ai'->'receipts')<>5
 or p_evidence is distinct from (select provenance->'partial'->'evidence' from public.reports where id=r.failed_report_id)
 then raise exception 'synthesis_completion_denied';end if;
 rid:=public.finalise_sitefit_recovered_free(c.owner_id,r.analysis_id,r.input_id,p_evidence,p_sections,p_projection,p_provenance);
 update public.trial_synthesis_recoveries set state='ready',report_id=rid where id=r.id;
 update public.controlled_proof set state='snapshot_ready',free_report_id=rid where id=c.id;
 return rid;
end$$;
revoke all on function public.claim_sitefit_trial_synthesis(uuid,uuid),public.reserve_sitefit_trial_synthesis(uuid,uuid,text,text,bigint,text),public.read_sitefit_trial_synthesis_response(uuid,uuid,text),public.settle_sitefit_trial_synthesis(uuid,uuid,text,text,text),public.finish_sitefit_trial_synthesis(uuid,uuid,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.claim_sitefit_trial_synthesis(uuid,uuid),public.reserve_sitefit_trial_synthesis(uuid,uuid,text,text,bigint,text),public.read_sitefit_trial_synthesis_response(uuid,uuid,text),public.settle_sitefit_trial_synthesis(uuid,uuid,text,text,text),public.finish_sitefit_trial_synthesis(uuid,uuid,jsonb,jsonb,jsonb,jsonb) to service_role;
