-- Idempotent delivered-Ready replay retains all entitlement/checkpoint/graph guards.
begin;
create or replace function public.recover_sitefit_ready_fulfilment(p_owner uuid,p_payment uuid,p_test boolean) returns uuid
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
  -- A completed delivered edition has no remaining finalisation work. Legacy
  -- purchases predate the shared reservation ledger; never fabricate or repeat it.
  if j.state='ready' and c.state='complete' then return r.id;end if;
  if c.state<>'complete' then update public.controlled_proof set state='complete' where id=c.id;end if;
  perform public.sitefit_record_ready_report_usage(r.id);
 end if;
 if j.state='ready' then return r.id;end if;
 update public.report_fulfilment set state='ready',reason=null,lease_token=null,lease_until=null,updated_at=now() where id=j.id;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata)
 values('fulfilment-stored-ready-recovery',r.analysis_id,r.id,'{"code":"received_output_only"}');
 return r.id;
end$$;
commit;
