begin;
create function public.list_sitefit_testing_reports(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if public.read_sitefit_testing_credits(p_owner) is null then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(jsonb_build_object('freeReportId',v.free_report_id,'state',v.state,'progress',j.state,'reportId',case when r.status='ready' then r.id else null end))
 from public.owner_full_credit_uses v left join public.report_fulfilment j on j.credit_use_id=v.id
 left join public.reports r on r.id=v.report_id where v.owner_id=p_owner),'[]'::jsonb);
end$$;

create function public.recover_sitefit_testing_report(p_owner uuid,p_free uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.owner_full_credit_uses;j public.report_fulfilment;r public.reports;c public.controlled_proof;
begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into v from public.owner_full_credit_uses where owner_id=p_owner and free_report_id=p_free for update;
 if not found or v.state='released' or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null) then raise exception 'testing_credit_unavailable' using errcode='42501';end if;
 select * into strict j from public.report_fulfilment where credit_use_id=v.id for update;
 if j.state='running' and j.lease_until>now() then return jsonb_build_object('state',j.state);end if;
 select * into r from public.reports where id=v.report_id;
 if r.status='ready' and source_data.ready_paid_full_case(v.case_id,r.id) then
  perform public.authorise_sitefit_economics(p_owner,r.analysis_id,r.input_id);
  update public.controlled_proof set state='complete' where id=v.case_id and state in('intervention','full_running');
  update public.report_fulfilment set state='ready',reason=null,lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  return jsonb_build_object('state','ready','reportId',r.id);
 end if;
 -- Only acknowledged checkpoints are recoverable. A browser retry never
 -- authorises an uncertain provider dispatch, a new edition or a new credit.
 if j.state in('intervention','awaiting_authorisation','running')
 and not exists(select 1 from public.proof_dispatches where case_id=v.case_id and stage='full' and state<>'received')
 and not exists(select 1 from jsonb_array_elements(coalesce(r.provenance#>'{checkpoint,dispatches}','[]')) d where d->>'state' in('intent','ambiguous','invalid')) then
  select * into c from public.controlled_proof where id=v.case_id;
  if c.enabled and c.expires_at>now() and public.sitefit_trial_active(c.trial_id,p_owner) then
   update public.report_fulfilment set state='queued',reason=null,lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  end if;
 end if;
 return jsonb_build_object('state',(select state from public.report_fulfilment where id=j.id));
end$$;
revoke all on function public.list_sitefit_testing_reports(uuid),public.recover_sitefit_testing_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_sitefit_testing_reports(uuid),public.recover_sitefit_testing_report(uuid,uuid) to service_role;

-- Resume keeps the original case token and accepted receipt ledger. Ordinary
-- paid recovery and unknown outcomes retain their existing behaviour.
do $$declare s text;needle text;begin
 s:=pg_get_functiondef('public.claim_sitefit_controlled_proof(uuid,text,uuid,boolean,uuid,uuid,text,uuid)'::regprocedure);
 needle:='if c.state<>''snapshot_ready'' or';
 if position(needle in s)=0 then raise exception 'credit_recovery_anchor_missing';end if;
 s:=replace(s,needle,$replacement$
 if c.state in('full_running','intervention') and c.full_report_id=p_report
 and exists(select 1 from public.owner_full_credit_uses v join public.report_fulfilment j on j.credit_use_id=v.id
 where v.case_id=c.id and v.report_id=p_report and v.owner_id=p_owner and v.state='reserved' and j.state='running' and j.lease_until>now())
 and not exists(select 1 from public.proof_dispatches where case_id=c.id and stage='full' and state<>'received')
 and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' in('intent','ambiguous','invalid')) then
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate);end if;
 if c.state<>'snapshot_ready' or$replacement$);
 execute s;
end$$;

-- A recoverable interrupted case may finish with its original token; it never
-- rewinds dispatch state or changes the accepted report identity.
do $$declare s text;begin
 s:=pg_get_functiondef('public.finish_sitefit_controlled_proof(uuid,uuid,text,uuid)'::regprocedure);
 if position('c.state<>p_stage||''_running''' in s)=0 then raise exception 'credit_finish_anchor_missing';end if;
 s:=replace(s,'c.state<>p_stage||''_running''',
 '(c.state<>p_stage||''_running'' and not (p_stage=''full'' and c.state=''intervention'' and source_data.ready_paid_full_case(c.id,p_report)))');
 execute s;
end$$;
commit;
