-- Expiry ends dispatch authority, not delivery of already received frozen output.
-- No collection, extension, new reservation or paid execution is authorised here.
begin;
create function source_data.saved_snapshot_owner_allowed(p_owner uuid,c public.controlled_proof) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(c.id is not null and c.trial_id is not null and c.enabled
 and public.sitefit_access_owner(c.owner_id)=p_owner and public.sitefit_access_owner(p_owner)=p_owner
 and exists(select 1 from auth.users u where u.id=p_owner and (u.is_anonymous or u.email_confirmed_at is not null))
 and exists(select 1 from public.controlled_trials t where t.id=c.trial_id and t.enabled and t.tariff_verified
 and (t.owner_id=c.owner_id or t.public_customers_enabled)),false)
$$;
revoke all on function source_data.saved_snapshot_owner_allowed(uuid,public.controlled_proof) from public,anon,authenticated,service_role;
create or replace function source_data.assert_saved_snapshot_owner(p_owner uuid,c public.controlled_proof) returns void
language plpgsql stable security definer set search_path='' as $$begin
 if not source_data.saved_snapshot_owner_allowed(p_owner,c) then raise exception 'saved_snapshot_not_owned' using errcode='42501';end if;
 perform public.assert_sitefit_processing_allowed(p_owner);
 perform public.assert_sitefit_processing_allowed(c.owner_id);
end$$;
create or replace function public.list_sitefit_saved_snapshot_checks(p_trial uuid,p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if p_owner is null or public.sitefit_access_owner(p_owner) is distinct from p_owner
 or not exists(select 1 from auth.users where id=p_owner and (is_anonymous or email_confirmed_at is not null))
 then raise exception 'saved_snapshot_not_owned' using errcode='42501';end if;
 perform public.assert_sitefit_processing_allowed(p_owner);
 return coalesce((select jsonb_agg(v) from (
 select jsonb_build_object('propertyId',c.property_id,'businessType',c.business_type,'address',p.formatted_address) v
 from public.controlled_proof c join public.properties p on p.id=c.property_id
 join public.analyses a on a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce
 join public.reports f on f.analysis_id=a.id and f.version=1 and f.tier='free' and f.status in('failed','ready')
 where c.trial_id=p_trial and public.sitefit_access_owner(c.owner_id)=p_owner and source_data.saved_snapshot_owner_allowed(p_owner,c) and c.state in('intervention','snapshot_running') and source_data.saved_snapshot_quiescent(c,f) and c.free_report_id is null and c.full_report_id is null and c.payment_id is null
 and (source_data.saved_snapshot_checkpoint(f.provenance) or source_data.received_ready_snapshot(c.id,f.id))
 order by f.created_at desc limit 20) rows),'[]'::jsonb);
end$$;

create or replace function public.finish_sitefit_saved_snapshot(p_owner uuid,p_case uuid,p_failed uuid,p_failed_digest text,p_projection jsonb,p_provenance jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.controlled_proof; f public.reports; a public.analyses; t public.controlled_trials;
 rid uuid; ids uuid[]; sections jsonb; partial jsonb; digest text;
begin
 select * into strict c from public.controlled_proof where id=p_case;
 perform source_data.assert_saved_snapshot_owner(p_owner,c);
 select * into strict f from public.reports where id=p_failed;
 -- Match the normal finaliser's analysis-before-report lock order.
 select * into strict a from public.analyses where id=f.analysis_id for update;
 select * into strict f from public.reports where id=p_failed for update;
 perform source_data.assert_saved_snapshot_owner(p_owner,c);
 digest:=encode(sha256(convert_to(to_jsonb(f)::text,'UTF8')),'hex');
 if digest is distinct from p_failed_digest or f.status<>'failed' or f.version<>1 or f.tier<>'free'
 or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id
 or a.business_type is distinct from c.business_type or a.submission_nonce is distinct from c.nonce
 then raise exception 'saved_completion_binding_denied';end if;
 select report_id into rid from public.saved_trial_finalisations where case_id=c.id and failed_report_id=f.id and failed_digest=digest;
 if rid is not null then return rid;end if;
 select * into strict t from public.controlled_trials where id=c.trial_id for update;
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform source_data.assert_saved_snapshot_owner(p_owner,c);
 if c.state='snapshot_running' and source_data.saved_snapshot_quiescent(c,f) then
 update public.controlled_proof set state='intervention' where id=c.id;
 select * into strict c from public.controlled_proof where id=c.id;end if;
 if c.state<>'intervention' or c.free_report_id is not null or c.full_report_id is not null or c.payment_id is not null
 or not t.enabled or not t.execution_enabled or not source_data.saved_snapshot_owner_allowed(p_owner,c)
 or exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 or exists(select 1 from public.snapshot_continuations where case_id=c.id)
 or exists(select 1 from public.trial_synthesis_recoveries where case_id=c.id)
 or exists(select 1 from public.snapshot_source_recoveries where case_id=c.id)
 then raise exception 'saved_completion_authority_denied';end if;
 partial:=f.provenance->'partial';
 if not source_data.saved_snapshot_checkpoint(f.provenance)
 or jsonb_array_length(partial->'sections')<>4 or jsonb_typeof(partial->'early') is distinct from 'object'
 or jsonb_array_length(partial->'receipts') is distinct from
  (select count(*)::int from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai')
 or p_provenance->'ai'->'receipts' is distinct from partial->'receipts'
 or p_provenance->'ai'->'dispatches' is distinct from partial->'dispatches'
 then raise exception 'saved_completion_checkpoint_denied';end if;
 select array_agg(id order by id) into ids from public.data_snapshots
 where analysis_id=a.id and input_id=f.input_id and collection_key='free-enriched-v1';
 if cardinality(ids) is distinct from 17 or p_provenance->'sourceSnapshotIds' is distinct from to_jsonb(ids)
 then raise exception 'saved_completion_sources_denied';end if;
 select jsonb_build_array(jsonb_build_object('section','early-view')||((partial->'early')-'decision')) ||
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


-- The existing subject trigger also fences report INSERTs by execution expiry.
-- Permit only a bound received-output v2 Draft; the actual finaliser still
-- validates all evidence, sections and projection before making it Ready.
create function source_data.saved_snapshot_draft_allowed(c public.controlled_proof,r jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(c.state='intervention' and c.free_report_id is null and c.full_report_id is null and c.payment_id is null
 and source_data.saved_snapshot_owner_allowed(public.sitefit_access_owner(c.owner_id),c)
 and r->>'tier'='free' and r->>'version'='2' and r->>'schema_version'='2' and r->>'status'='draft'
 and exists(select 1 from public.reports f where f.analysis_id=(r->>'analysis_id')::uuid and f.input_id=(r->>'input_id')::uuid
 and f.version=1 and f.tier='free' and f.status='failed' and source_data.saved_snapshot_checkpoint(f.provenance)
 and jsonb_array_length(f.provenance#>'{partial,sections}')=4 and jsonb_typeof(f.provenance#>'{partial,early}')='object'
 and r#>'{provenance,ai,receipts}'=f.provenance#>'{partial,receipts}'
 and r#>'{provenance,ai,dispatches}'=f.provenance#>'{partial,dispatches}'
 and jsonb_array_length(f.provenance#>'{partial,receipts}')=(select count(*) from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai')
 and r#>'{provenance,sourceSnapshotIds}'=(select jsonb_agg(id order by id) from public.data_snapshots where analysis_id=f.analysis_id and input_id=f.input_id and collection_key='free-enriched-v1')
 and (select count(*) from public.data_snapshots where analysis_id=f.analysis_id and input_id=f.input_id and collection_key='free-enriched-v1')=17)
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received'),false)
$$;
revoke all on function source_data.saved_snapshot_draft_allowed(public.controlled_proof,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_sitefit_subject_work()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare owner uuid;c public.controlled_proof;begin
 if tg_table_name='analyses' then owner:=new.owner_id;
 elsif tg_table_name='payments' then select coalesce(new.owner_id,owner_id) into owner from public.analyses where id=new.analysis_id;
 else select owner_id into owner from public.analyses where id=new.analysis_id;end if;
 perform public.assert_sitefit_processing_allowed(owner);
 select q.* into c from public.controlled_proof q where q.trial_id is not null and public.sitefit_access_owner(q.owner_id)=public.sitefit_access_owner(owner) and (
 (tg_table_name='analyses' and to_jsonb(new)->>'property_id'=q.property_id::text and to_jsonb(new)->>'business_type'=q.business_type and to_jsonb(new)->>'submission_nonce'=q.nonce::text)
 or (tg_table_name<>'analyses' and exists(select 1 from public.analyses a where a.id=(to_jsonb(new)->>'analysis_id')::uuid and a.property_id=q.property_id and a.business_type=q.business_type and a.submission_nonce=q.nonce))) for update;
 if not found then select * into c from public.controlled_proof where singleton for update;end if;
 if c.trial_id is not null and not public.sitefit_trial_active(c.trial_id,owner)
 and not (tg_table_name='reports' and (
 (tg_op='INSERT' and source_data.saved_snapshot_draft_allowed(c,to_jsonb(new)))
 or (tg_op='UPDATE' and to_jsonb(old)->>'status'='draft' and to_jsonb(new)->>'status'='ready'
 and (to_jsonb(new)-'status'-'updated_at')=(to_jsonb(old)-'status'-'updated_at')
 and source_data.saved_snapshot_draft_allowed(c,jsonb_set(to_jsonb(new),'{status}','"draft"'::jsonb)))))
 then raise exception 'trial_not_authorised';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if not found and exists(select 1 from public.controlled_proof) then raise exception 'proof_current_slot_unavailable' using errcode='42501';end if;
 if found then
 if tg_table_name='analyses' then
 if not c.enabled or c.state<>'snapshot_running' or row(new.owner_id,new.property_id,new.business_type,new.submission_nonce) is distinct from row(c.owner_id,c.property_id,c.business_type,c.nonce) then raise exception 'proof_analysis_denied' using errcode='42501';end if;
 elsif tg_table_name='payments' then
 if not c.enabled or c.state<>'snapshot_ready' or new.owner_id is distinct from public.sitefit_access_owner(c.owner_id) or new.payment_version<>2 or new.test_mode or
 not exists(select 1 from public.reports where id=c.free_report_id and analysis_id=new.analysis_id)
 or c.payment_id is not null and new.id<>c.payment_id and not exists(select 1 from public.checkout_successors l
 where l.case_id=c.id and l.owner_id=public.sitefit_access_owner(c.owner_id) and (l.predecessor_id=c.payment_id or l.target_predecessor=c.payment_id) and l.successor_id=new.id) then raise exception 'proof_payment_denied' using errcode='42501';end if;
 else
 if not exists(select 1 from public.analyses a where a.id=new.analysis_id and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 then raise exception 'proof_owned_graph_denied' using errcode='42501';end if;
 end if;end if;return new;
end$function$
;
commit;
