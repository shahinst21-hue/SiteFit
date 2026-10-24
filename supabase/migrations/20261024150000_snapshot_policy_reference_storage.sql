-- Keep deterministic policy collection bindings in the validated projection.
-- Narrative claim references and every existing operator/receipt/history guard
-- remain unchanged. Existing function privileges are retained; no new grant.
create or replace function source_data.complete_saved_trial_free(p_case uuid,p_failed uuid,p_failed_digest text,p_projection jsonb,p_provenance jsonb)
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
