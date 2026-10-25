-- Received-output recovery only. No provider/AI dispatch, new allowance or browser grants.
-- The original operator function and failed edition stay immutable.
begin;
create function source_data.assert_saved_snapshot_owner(p_owner uuid,c public.controlled_proof) returns void
language plpgsql stable security definer set search_path='' as $$begin
 if c.id is null or c.trial_id is null or not c.enabled or c.expires_at<=now()
 or public.sitefit_access_owner(c.owner_id) is distinct from p_owner
 or public.sitefit_access_owner(p_owner) is distinct from p_owner
 or not public.sitefit_trial_active(c.trial_id,c.owner_id)
 or not exists(select 1 from auth.users u where u.id=p_owner and (u.is_anonymous or u.email_confirmed_at is not null))
 then raise exception 'saved_snapshot_not_owned' using errcode='42501';end if;
 perform public.assert_sitefit_processing_allowed(p_owner);
 perform public.assert_sitefit_processing_allowed(c.owner_id);
end$$;
revoke all on function source_data.assert_saved_snapshot_owner(uuid,public.controlled_proof) from public,anon,authenticated,service_role;

create function source_data.saved_snapshot_checkpoint(p jsonb) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p#>'{partial,errors}' in ('[{"section":"early-view","code":"report_persistence_failed"}]'::jsonb,
 '[{"section":"early-view","code":"report_persistence_pending"}]'::jsonb),false)
$$;
revoke all on function source_data.saved_snapshot_checkpoint(jsonb) from public,anon,authenticated,service_role;

-- Three minutes exceeds the declared 120-second route window. This is never
-- permission to resend. Complete received checkpoints plus SQL locks/digests
-- arbitrate a surviving finalisation; the quiet window is not a remote lease.
create function source_data.saved_snapshot_quiescent(c public.controlled_proof,f public.reports) returns boolean
language sql stable set search_path='' as $$
 select c.state='intervention' or c.state='snapshot_running' and f.updated_at<now()-interval '3 minutes'
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and created_at>=now()-interval '3 minutes')
$$;
revoke all on function source_data.saved_snapshot_quiescent(public.controlled_proof,public.reports) from public,anon,authenticated,service_role;

create function source_data.received_ready_snapshot(p_case uuid,p_report uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_proof c join public.analyses a
 on a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce
 join public.reports r on r.analysis_id=a.id and r.id=p_report
 where c.id=p_case and c.trial_id is not null and c.free_report_id is null and c.full_report_id is null and c.payment_id is null
 and r.status='ready' and r.version=1 and r.tier='free' and r.schema_version=2
 and source_data.saved_snapshot_quiescent(c,r)
 and public.sitefit_trial_snapshot_receipts_valid(r.provenance)
 and jsonb_array_length(r.provenance#>'{ai,receipts}')=(select count(*) from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai')
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 and (select count(*) from public.report_sections where report_id=r.id)=5)
$$;
revoke all on function source_data.received_ready_snapshot(uuid,uuid) from public,anon,authenticated,service_role;

-- Selected by verified session identity and property/category, never a browser-supplied case.
create function public.read_sitefit_saved_snapshot(p_trial uuid,p_owner uuid,p_property uuid,p_business text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.controlled_proof;f public.reports;a public.analyses;material jsonb;begin
 select * into c from public.controlled_proof where trial_id=p_trial and property_id=p_property and business_type=p_business
 and public.sitefit_access_owner(owner_id)=p_owner order by (free_report_id is not null) desc,id limit 1;
 if not found then return null;end if;
 perform source_data.assert_saved_snapshot_owner(p_owner,c);
 if exists(select 1 from public.reports where id=c.free_report_id and status='ready' and tier='free')
 then return jsonb_build_object('reportId',c.free_report_id);end if;
 if c.state not in('intervention','snapshot_running') or c.free_report_id is not null or c.full_report_id is not null or c.payment_id is not null
 or not exists(select 1 from public.controlled_trials where id=p_trial and enabled and execution_enabled)
 or exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 or exists(select 1 from public.snapshot_continuations where case_id=c.id)
 or exists(select 1 from public.trial_synthesis_recoveries where case_id=c.id)
 or exists(select 1 from public.snapshot_source_recoveries where case_id=c.id) then return null;end if;
 select * into a from public.analyses where owner_id=c.owner_id and property_id=c.property_id and business_type=c.business_type and submission_nonce=c.nonce;
 select * into f from public.reports where analysis_id=a.id and version=1 and tier='free' and schema_version=2;
 if found and source_data.received_ready_snapshot(c.id,f.id) then return jsonb_build_object('caseId',c.id,'readyReportId',f.id);end if;
 if not found or f.status<>'failed' or not source_data.saved_snapshot_quiescent(c,f) or not source_data.saved_snapshot_checkpoint(f.provenance)
 or jsonb_typeof(f.provenance#>'{partial,early}') is distinct from 'object'
 or jsonb_array_length(f.provenance#>'{partial,sections}') is distinct from 4
 or jsonb_array_length(f.provenance#>'{partial,receipts}') is distinct from
 (select count(*)::int from public.proof_dispatches where case_id=c.id and stage='snapshot' and kind='ai')
 or (select count(*) from public.data_snapshots where analysis_id=a.id and input_id=f.input_id and collection_key='free-enriched-v1')<>17 then return null;end if;
 select jsonb_build_object('caseId',c.id,'failedReportId',f.id,'failedDigest',encode(sha256(convert_to(to_jsonb(f)::text,'UTF8')),'hex'),
 'partial',f.provenance->'partial','context',i.resolved_context,
 'snapshots',(select jsonb_agg(to_jsonb(s) order by s.id) from public.data_snapshots s where s.analysis_id=a.id and s.input_id=i.id and s.collection_key='free-enriched-v1'),
 'competition',coalesce(f.provenance#>'{partial,competition}',(select result from public.competition_collections where analysis_id=a.id and input_id=i.id and state='finished')))
 into material from public.analysis_inputs i where i.id=f.input_id and i.analysis_id=a.id;
 return material;
end$$;
revoke all on function public.read_sitefit_saved_snapshot(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_sitefit_saved_snapshot(uuid,uuid,uuid,text) to service_role;

-- Account recovery survives a refresh; return owned display metadata only.
create function public.list_sitefit_saved_snapshot_checks(p_trial uuid,p_owner uuid) returns jsonb
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
 where c.trial_id=p_trial and public.sitefit_access_owner(c.owner_id)=p_owner and c.enabled and c.expires_at>now()
 and public.sitefit_trial_active(c.trial_id,c.owner_id) and c.state in('intervention','snapshot_running') and source_data.saved_snapshot_quiescent(c,f) and c.free_report_id is null and c.full_report_id is null and c.payment_id is null
 and (source_data.saved_snapshot_checkpoint(f.provenance) or source_data.received_ready_snapshot(c.id,f.id))
 order by f.created_at desc limit 20) rows),'[]'::jsonb);
end$$;
revoke all on function public.list_sitefit_saved_snapshot_checks(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_sitefit_saved_snapshot_checks(uuid,uuid) to service_role;

create function public.finish_sitefit_saved_snapshot(p_owner uuid,p_case uuid,p_failed uuid,p_failed_digest text,p_projection jsonb,p_provenance jsonb)
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
 or not t.enabled or not t.execution_enabled or not public.sitefit_trial_active(t.id,c.owner_id)
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

revoke all on function public.finish_sitefit_saved_snapshot(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.finish_sitefit_saved_snapshot(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;

create function public.finish_sitefit_stored_ready_snapshot(p_owner uuid,p_case uuid,p_report uuid) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;t public.controlled_trials;begin
 select * into strict c from public.controlled_proof where id=p_case;
 perform source_data.assert_saved_snapshot_owner(p_owner,c);
 if c.free_report_id=p_report and exists(select 1 from public.reports where id=p_report and status='ready' and tier='free') then return p_report;end if;
 select * into strict t from public.controlled_trials where id=c.trial_id for update;
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform source_data.assert_saved_snapshot_owner(p_owner,c);
 if c.free_report_id=p_report and exists(select 1 from public.reports where id=p_report and status='ready' and tier='free') then return p_report;end if;
 perform 1 from public.reports where id=p_report for update;
 if not t.execution_enabled or not source_data.received_ready_snapshot(c.id,p_report)
 or exists(select 1 from public.snapshot_continuations where case_id=c.id)
 or exists(select 1 from public.trial_synthesis_recoveries where case_id=c.id)
 or exists(select 1 from public.snapshot_source_recoveries where case_id=c.id)
 then raise exception 'stored_ready_snapshot_binding_denied';end if;
 update public.controlled_proof set state='snapshot_ready',free_report_id=p_report where id=c.id;
 return p_report;
end$$;
revoke all on function public.finish_sitefit_stored_ready_snapshot(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.finish_sitefit_stored_ready_snapshot(uuid,uuid,uuid) to service_role;

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

 (old.state='intervention' and new.state='snapshot_ready' and source_data.received_ready_snapshot(old.id,new.free_report_id)) or
 (old.state='intervention' and new.state='snapshot_ready' and exists(
 select 1 from public.saved_trial_finalisations r join public.reports f on f.id=r.report_id
 where r.case_id=old.id and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.trial_synthesis_recoveries r join public.reports f on f.id=r.report_id

 where r.case_id=old.id and r.state='ready' and r.enabled and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or

 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.snapshot_source_recoveries r join public.reports f on f.id=r.report_id where r.case_id=old.id and r.state='ready' and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='snapshot_ready' and new.state='full_running') or

 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;

 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or

 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or

 (old.payment_id is not null and new.payment_id is distinct from old.payment_id and not exists(

 select 1 from public.checkout_successors l join public.payments p on p.id=l.predecessor_id

 where l.case_id=old.id and l.owner_id=public.sitefit_access_owner(old.owner_id) and (l.predecessor_id=old.payment_id or l.target_predecessor=old.payment_id) and l.successor_id=new.payment_id

 and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'

 and old.trial_id is not null and old.state='snapshot_ready' and new.state='snapshot_ready')) then raise exception 'proof_binding_immutable';end if;

 return new;

end$function$;

commit;
