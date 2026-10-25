-- Deliver an already immutable Ready edition after a worker/response loss.
-- No generation, payment reconciliation, dispatch or additional reservation.
begin;
create function source_data.ready_paid_full_case(p_case uuid,p_report uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.controlled_proof c join public.payments p on p.id=c.payment_id
 join public.report_fulfilment j on j.payment_id=p.id and j.owner_id=p.owner_id
 join public.reports r on r.id=p_report and r.id=j.report_id and r.id=c.full_report_id
 join public.analyses a on a.id=r.analysis_id
 where c.id=p_case and c.state in('full_running','intervention','complete')
 and public.sitefit_access_owner(c.owner_id)=p.owner_id and a.owner_id=c.owner_id and a.property_id=c.property_id
 and a.business_type=c.business_type and a.submission_nonce=c.nonce
 and p.report_id=c.free_report_id and j.free_report_id=c.free_report_id and p.analysis_id=a.id
 and p.status='succeeded' and p.access_state='active' and p.verified_at is not null
 and r.tier='full' and r.schema_version=3 and r.status='ready' and r.full_binding is not null and r.full_projection is not null
 and jsonb_array_length(r.provenance#>'{checkpoint,dispatches}')=3
 and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' is distinct from 'accepted' or jsonb_typeof(d->'receipt') is distinct from 'object')
 and (select count(*) from public.proof_dispatches where case_id=c.id and stage='full' and kind='ai')=3
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full' and state<>'received'))
$$;
revoke all on function source_data.ready_paid_full_case(uuid,uuid) from public,anon,authenticated,service_role;

create function public.recover_sitefit_ready_fulfilment(p_owner uuid,p_payment uuid,p_test boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.payments;j public.report_fulfilment;r public.reports;f public.reports;c public.controlled_proof;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into p from public.payments where id=p_payment and owner_id=p_owner and test_mode=p_test
 and status='succeeded' and access_state='active' and verified_at is not null for update;
 if not found then raise exception 'ready_fulfilment_not_owned' using errcode='42501';end if;
 select * into strict j from public.report_fulfilment where payment_id=p.id and owner_id=p_owner for update;
 select * into r from public.reports where id=j.report_id and tier='full' and schema_version=3 and status='ready' and full_projection is not null and full_binding is not null;
 select * into f from public.reports where id=j.free_report_id and id=p.report_id and status='ready' and tier='free';
 if r.id is null or f.id is null or r.analysis_id is distinct from p.analysis_id
 or r.analysis_id is distinct from f.analysis_id or r.input_id is distinct from f.input_id
 or not public.sitefit_supply_permitted(p.id) or j.state='running' and j.lease_until>now()
 then raise exception 'ready_fulfilment_unavailable';end if;
 perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
 if jsonb_array_length(r.provenance#>'{checkpoint,dispatches}') is distinct from 3
 or exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' is distinct from 'accepted' or jsonb_typeof(d->'receipt') is distinct from 'object')
 then raise exception 'ready_fulfilment_checkpoint_denied';end if;
 select * into c from public.controlled_proof where payment_id=p.id;
 if found then
  if c.trial_id is not null then perform 1 from public.controlled_trials where id=c.trial_id for update;end if;
  select * into strict c from public.controlled_proof where payment_id=p.id for update;
  perform public.assert_sitefit_processing_allowed(c.owner_id);
  if not source_data.ready_paid_full_case(c.id,r.id) then raise exception 'ready_fulfilment_proof_denied';end if;
  if c.state<>'complete' then update public.controlled_proof set state='complete' where id=c.id;end if;
  perform public.sitefit_record_ready_report_usage(r.id);
 end if;
 if j.state='ready' then return r.id;end if;
 update public.report_fulfilment set state='ready',reason=null,lease_token=null,lease_until=null,updated_at=now() where id=j.id;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata)
 values('fulfilment-stored-ready-recovery',r.analysis_id,r.id,'{"code":"received_output_only"}');
 return r.id;
end$$;
revoke all on function public.recover_sitefit_ready_fulfilment(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.recover_sitefit_ready_fulfilment(uuid,uuid,boolean) to service_role;

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

 (old.state='full_running' and new.state in('complete','intervention')) or
 (old.state='intervention' and new.state='complete' and source_data.ready_paid_full_case(old.id,new.full_report_id))) then raise exception 'proof_transition_denied';end if;

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
