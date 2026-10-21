begin;
create table public.saved_trial_finalisations (
 case_id uuid primary key references public.controlled_proof(id),
 failed_report_id uuid not null unique references public.reports(id),
 analysis_id uuid not null references public.analyses(id),
 failed_digest text not null check(failed_digest ~ '^[a-f0-9]{64}$'),
 source_digest text not null check(source_digest ~ '^[a-f0-9]{64}$'),
 candidate_digest text not null check(candidate_digest ~ '^[a-f0-9]{64}$'),
 report_id uuid not null unique references public.reports(id),
 created_at timestamptz not null default now()
);
alter table public.saved_trial_finalisations enable row level security;
revoke all on public.saved_trial_finalisations from public,anon,authenticated,service_role;
create function source_data.freeze_saved_trial_finalisation() returns trigger
language plpgsql security invoker set search_path='' as $$begin
 raise exception 'saved_finalisation_history_immutable';end$$;
create trigger saved_trial_finalisation_history before update or delete on public.saved_trial_finalisations
 for each row execute function source_data.freeze_saved_trial_finalisation();
create trigger saved_trial_finalisation_no_truncate before truncate on public.saved_trial_finalisations
 for each statement execute function source_data.freeze_saved_trial_finalisation();
revoke all on function source_data.freeze_saved_trial_finalisation() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.finalise_sitefit_free(p_owner uuid, p_analysis uuid, p_input uuid, p_evidence jsonb, p_sections jsonb, p_projection jsonb, p_provenance jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    p_projection->'spatial'->'origin' is distinct from (case when walking is not null then source_data.contextual_walking_origin(c) else c->'enrichment'->'identity'->'point' end) or
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
 select id into rid from public.reports where analysis_id=a.id and version=1 and tier='free' and schema_version=2 and status<>'ready';
 if rid is null then
   insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,provenance,free_projection)
   values(a.id,p_input,1,2,'free','draft',p_provenance,p_projection) returning id into rid;
 else
   update public.reports set status='draft',provenance=p_provenance,free_projection=p_projection where id=rid and input_id=p_input;
   if not found then raise exception using errcode='23514',message='report_input_mismatch'; end if;
 end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.finalise_sitefit_recovered_free(p_owner uuid, p_analysis uuid, p_input uuid, p_evidence jsonb, p_sections jsonb, p_projection jsonb, p_provenance jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$

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

    p_projection->'spatial'->'origin' is distinct from (case when walking is not null then source_data.contextual_walking_origin(c) else c->'enrichment'->'identity'->'point' end) or

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

end $function$;

CREATE OR REPLACE FUNCTION public.freeze_sitefit_proof_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin

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

 (old.state='intervention' and new.state='snapshot_ready' and exists(
 select 1 from public.saved_trial_finalisations r join public.reports f on f.id=r.report_id
 where r.case_id=old.id and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.trial_synthesis_recoveries r join public.reports f on f.id=r.report_id

 where r.case_id=old.id and r.state='ready' and r.enabled and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or

 (old.state='snapshot_ready' and new.state='full_running') or

 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;

 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or

 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or

 (old.payment_id is not null and new.payment_id is distinct from old.payment_id and not exists(

 select 1 from public.checkout_successors l join public.payments p on p.id=l.predecessor_id

 where l.case_id=old.id and l.owner_id=old.owner_id and l.predecessor_id=old.payment_id and l.successor_id=new.payment_id

 and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'

 and old.trial_id is not null and old.state='snapshot_ready' and new.state='snapshot_ready')) then raise exception 'proof_binding_immutable';end if;

 return new;

end$function$;

-- Operator-only deterministic completion: no source/AI dispatch, no reset, no new hold.
create function source_data.complete_saved_trial_free(p_case uuid,p_failed uuid,p_failed_digest text,p_projection jsonb,p_provenance jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.controlled_proof; f public.reports; a public.analyses; t public.controlled_trials;
 rid uuid; ids uuid[]; sections jsonb; partial jsonb; digest text;
begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 select * into strict f from public.reports where id=p_failed for update;
 select * into strict a from public.analyses where id=f.analysis_id for update;
 digest:=encode(sha256(convert_to(to_jsonb(f)::text,'UTF8')),'hex');
 if digest is distinct from p_failed_digest or f.status<>'failed' or f.version<>1 or f.tier<>'free'
 or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id
 or a.business_type is distinct from c.business_type or a.submission_nonce is distinct from c.nonce
 then raise exception 'saved_completion_binding_denied';end if;
 select report_id into rid from public.saved_trial_finalisations where case_id=c.id and failed_report_id=f.id and failed_digest=digest;
 if rid is not null then return rid;end if;
 select * into strict t from public.controlled_trials where id=c.trial_id for update;
 if c.state<>'intervention' or c.free_report_id is not null or c.full_report_id is not null
 or not t.enabled or not t.execution_enabled or t.expires_at<=now() or t.owner_id is distinct from c.owner_id
 or not exists(select 1 from auth.users u where u.id=c.owner_id and u.email='shahinst21@gmail.com' and not u.is_anonymous and u.email_confirmed_at is not null)
 or exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 or exists(select 1 from public.snapshot_continuations where case_id=c.id)
 or exists(select 1 from public.trial_synthesis_recoveries where case_id=c.id)
 then raise exception 'saved_completion_authority_denied';end if;
 partial:=f.provenance->'partial';
 if partial->'errors' is distinct from '[{"section":"early-view","code":"report_persistence_failed"}]'::jsonb
 or jsonb_array_length(partial->'sections')<>4 or jsonb_typeof(partial->'early') is distinct from 'object'
 or jsonb_array_length(partial->'receipts') is distinct from
  (select count(*)::int from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai')
 or p_provenance->'ai'->'receipts' is distinct from partial->'receipts'
 or p_provenance->'ai'->'dispatches' is distinct from partial->'dispatches'
 then raise exception 'saved_completion_checkpoint_denied';end if;
 select array_agg(id order by id) into ids from public.data_snapshots
 where analysis_id=a.id and input_id=f.input_id and collection_key='free-enriched-v1';
 if cardinality(ids)<>17 or p_provenance->'sourceSnapshotIds' is distinct from to_jsonb(ids)
 then raise exception 'saved_completion_sources_denied';end if;
 select jsonb_build_array(jsonb_build_object('section','early-view')||(partial->'early')) ||
 coalesce(jsonb_agg(s||jsonb_build_object('evidenceIds',(
 select coalesce(jsonb_agg(v order by v),'[]'::jsonb) from
 (select distinct v from jsonb_path_query(s,'$.**.evidenceIds[*]') v) refs
 )) order by ord),'[]'::jsonb) into sections
 from jsonb_array_elements(partial->'sections') with ordinality x(s,ord);
 rid:=public.finalise_sitefit_recovered_free(c.owner_id,a.id,f.input_id,partial->'evidence',sections,p_projection,p_provenance);
 insert into public.saved_trial_finalisations(case_id,failed_report_id,analysis_id,failed_digest,source_digest,candidate_digest,report_id)
 values(c.id,f.id,a.id,digest,public.sitefit_continuation_digest(ids),
 encode(sha256(convert_to(jsonb_build_object('projection',p_projection,'provenance',p_provenance)::text,'UTF8')),'hex'),rid);
 update public.controlled_proof set state='snapshot_ready',free_report_id=rid where id=c.id;
 return rid;
end$$;
revoke all on function source_data.complete_saved_trial_free(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
commit;
