-- Stored-evidence-only recovery for a controlled owner Snapshot that dispatched no AI.
-- Never modifies the failed report, original provider intents or budget ceiling.
create table public.snapshot_source_recoveries (
 id uuid primary key default gen_random_uuid(),case_id uuid not null unique references public.controlled_proof(id),
 analysis_id uuid not null references public.analyses(id),input_id uuid not null references public.analysis_inputs(id),
 failed_report_id uuid not null references public.reports(id),failed_digest text not null,
 frozen_snapshots uuid[] not null check(cardinality(frozen_snapshots)=17),source_digest text not null,
 state text not null default 'issued' check(state in('issued','running','ready')),token uuid,
 lease_until timestamptz,report_id uuid references public.reports(id),created_at timestamptz not null default now()
);
create table public.snapshot_source_recovery_dispatches (
 id uuid primary key default gen_random_uuid(),recovery_id uuid not null references public.snapshot_source_recoveries(id),
 request_key text not null check(request_key ~ '^[a-f0-9]{64}$'),
 slot text not null check(slot in('customer-base','market-position','customer-access','premises','synthesis')),
 reserved_micros bigint not null check(reserved_micros between 1 and 650000),
 state text not null default 'intent' check(state in('intent','received','ambiguous')),
 response_digest text,checkpoint text check(octet_length(checkpoint)<=128000),created_at timestamptz not null default now(),
 unique(recovery_id,request_key),unique(recovery_id,slot)
);
alter table public.snapshot_source_recoveries enable row level security;
alter table public.snapshot_source_recovery_dispatches enable row level security;
revoke all on public.snapshot_source_recoveries,public.snapshot_source_recovery_dispatches from public,anon,authenticated,service_role;

create function public.guard_sitefit_source_recovery_history() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op in('DELETE','TRUNCATE') then raise exception 'source_recovery_history_immutable';end if;
 if tg_table_name='snapshot_source_recoveries' then
  if tg_op='INSERT' then
   if new.state<>'issued' or new.token is not null or new.lease_until is not null or new.report_id is not null then raise exception 'source_recovery_initial_state';end if;
  elsif old.state='ready' or (to_jsonb(new)-array['state','token','lease_until','report_id']) is distinct from (to_jsonb(old)-array['state','token','lease_until','report_id'])
   or old.token is not null and new.token is distinct from old.token
   or old.lease_until is not null and (new.lease_until is null or new.lease_until<old.lease_until)
   or old.state<>new.state and not(old.state='issued' and new.state='running' or old.state='running' and new.state='ready')
   or old.report_id is not null and new.report_id is distinct from old.report_id then raise exception 'source_recovery_history_immutable';end if;
 else
  if tg_op='INSERT' then
   if new.state<>'intent' or new.response_digest is not null or new.checkpoint is not null then raise exception 'source_recovery_dispatch_initial_state';end if;
  elsif old.state<>'intent' or new.state not in('received','ambiguous')
   or (to_jsonb(new)-array['state','response_digest','checkpoint']) is distinct from (to_jsonb(old)-array['state','response_digest','checkpoint']) then raise exception 'source_recovery_dispatch_immutable';end if;
 end if;return new;
end$$;
create trigger source_recovery_history before insert or update or delete on public.snapshot_source_recoveries for each row execute function public.guard_sitefit_source_recovery_history();
create trigger source_recovery_no_truncate before truncate on public.snapshot_source_recoveries for each statement execute function public.guard_sitefit_source_recovery_history();
create trigger source_recovery_dispatch_history before insert or update or delete on public.snapshot_source_recovery_dispatches for each row execute function public.guard_sitefit_source_recovery_history();
create trigger source_recovery_dispatch_no_truncate before truncate on public.snapshot_source_recovery_dispatches for each statement execute function public.guard_sitefit_source_recovery_history();
revoke all on function public.guard_sitefit_source_recovery_history() from public,anon,authenticated,service_role;

create function public.sitefit_source_recovery_authority(p_id uuid) returns public.snapshot_source_recoveries
language plpgsql security definer set search_path='' as $$declare r public.snapshot_source_recoveries;c public.controlled_proof;f public.reports;begin
 select * into strict c from public.controlled_proof where id=(select case_id from public.snapshot_source_recoveries where id=p_id) for update;
 select * into strict r from public.snapshot_source_recoveries where id=p_id for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 select * into strict f from public.reports where id=r.failed_report_id;
 if c.trial_id is null or not public.sitefit_trial_active(c.trial_id,c.owner_id) or not c.enabled or c.expires_at<=now()
 or c.payment_id is not null or c.full_report_id is not null or not c.tariff_verified or c.input_rate<2.5 or c.output_rate<10
 or not exists(select 1 from public.sale_policies where version=c.policy_version and snapshot=c.policy_snapshot)
 or not exists(select 1 from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id where a.id=r.analysis_id and i.id=r.input_id and i.resolved_context is not null and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 or f.analysis_id<>r.analysis_id or f.input_id<>r.input_id or f.status<>'failed' or f.tier<>'free' or f.version<>1
 or encode(sha256(convert_to(to_jsonb(f)::text,'UTF8')),'hex')<>r.failed_digest
 or coalesce(jsonb_array_length(f.provenance#>'{partial,sections}'),-1)<>0
 or coalesce(jsonb_array_length(f.provenance#>'{partial,receipts}'),-1)<>0
 or coalesce(jsonb_array_length(f.provenance#>'{partial,packets}'),-1)<>4
 or coalesce((f.provenance#>>'{partial,dispatches}')::integer,-1) not between 0 and 4
 or r.source_digest<>public.sitefit_continuation_digest(r.frozen_snapshots)
 or (select count(*) from public.data_snapshots where id=any(r.frozen_snapshots) and analysis_id=r.analysis_id and input_id=r.input_id and collection_key='free-enriched-v1')<>17
 or exists(select 1 from public.proof_dispatches where case_id=c.id and (kind='ai' or state<>'received' and not(state='ambiguous' and public.sitefit_proof_source_unavailable(kind,stage,reserved_micros))))
 or not exists(select 1 from public.proof_dispatches where case_id=c.id and state='ambiguous' and public.sitefit_proof_source_unavailable(kind,stage,reserved_micros))
 or exists(select 1 from public.snapshot_continuations where case_id=c.id)
 or exists(select 1 from public.trial_synthesis_recoveries where case_id=c.id)
 or not exists(select 1 from public.controlled_trial_budget_events where trial_id=c.trial_id and reservation_key='snapshot:'||c.id::text and event_kind='reserve' and amount_micros=650000)
 or r.state<>'ready' and (c.state<>'intervention' or c.free_report_id is not null or exists(select 1 from public.controlled_trial_budget_events where trial_id=c.trial_id and reservation_key='snapshot:'||c.id::text and event_kind in('settlement','release')))
 or r.state='ready' and (c.free_report_id is distinct from r.report_id or not exists(select 1 from public.reports where id=r.report_id and status='ready' and version=2 and analysis_id=r.analysis_id))
 then raise exception 'source_recovery_authority_denied' using errcode='42501';end if;
 return r;
end$$;
revoke all on function public.sitefit_source_recovery_authority(uuid) from public,anon,authenticated,service_role;

create function public.claim_sitefit_source_recovery(p_owner uuid,p_case uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;r public.snapshot_source_recoveries;f public.reports;ids uuid[];begin
 select * into strict c from public.controlled_proof where id=p_case and owner_id=p_owner for update;
 if not public.sitefit_trial_active(c.trial_id,p_owner) then raise exception 'source_recovery_owner_denied' using errcode='42501';end if;
 select * into r from public.snapshot_source_recoveries where case_id=c.id;
 if not found then
  select q.* into strict f from public.reports q join public.analyses a on a.id=q.analysis_id where a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce and q.tier='free' and q.status='failed' and q.version=1;
  select array_agg(id order by id) into ids from public.data_snapshots where analysis_id=f.analysis_id and input_id=f.input_id and collection_key='free-enriched-v1';
  insert into public.snapshot_source_recoveries(case_id,analysis_id,input_id,failed_report_id,failed_digest,frozen_snapshots,source_digest)
   values(c.id,f.analysis_id,f.input_id,f.id,encode(sha256(convert_to(to_jsonb(f)::text,'UTF8')),'hex'),ids,public.sitefit_continuation_digest(ids)) returning * into r;
 end if;
 r:=public.sitefit_source_recovery_authority(r.id);
 if r.state='ready' then return jsonb_build_object('reportId',r.report_id);end if;
 if r.state='running' and (r.lease_until>now() or exists(select 1 from public.snapshot_source_recovery_dispatches where recovery_id=r.id and state<>'received')) then raise exception 'source_recovery_busy_or_unknown';end if;
 update public.snapshot_source_recoveries set state='running',token=coalesce(token,gen_random_uuid()),lease_until=now()+interval '2 minutes' where id=r.id returning * into r;
 return jsonb_build_object('id',r.id,'token',r.token,'analysisId',r.analysis_id,'inputId',r.input_id,'failedReportId',r.failed_report_id,'snapshotIds',r.frozen_snapshots,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$$;

create function public.reserve_sitefit_source_recovery(p_id uuid,p_token uuid,p_key text,p_kind text,p_micros bigint,p_slot text) returns uuid
language plpgsql security definer set search_path='' as $$declare r public.snapshot_source_recoveries;c public.controlled_proof;d uuid;begin
 r:=public.sitefit_source_recovery_authority(p_id);select * into strict c from public.controlled_proof where id=r.case_id;
 if r.state<>'running' or r.token is distinct from p_token or p_token is null or r.lease_until<=now() or p_kind is distinct from 'ai'
 or p_slot is null or p_slot not in('customer-base','market-position','customer-access','premises','synthesis')
 or p_micros is null or p_micros<=0 or c.reserved_micros+p_micros>650000
 or p_slot<>'synthesis' and not exists(select 1 from public.reports f,jsonb_array_elements(f.provenance#>'{partial,packets}')p where f.id=r.failed_report_id and p->>'section'=p_slot and p->>'strength'<>'insufficient')
 or p_slot='synthesis' and (select count(*) from public.snapshot_source_recovery_dispatches where recovery_id=r.id and state='received' and slot<>'synthesis')<>(select count(*) from public.reports f,jsonb_array_elements(f.provenance#>'{partial,packets}')p where f.id=r.failed_report_id and p->>'strength'<>'insufficient')
 or exists(select 1 from public.snapshot_source_recovery_dispatches where recovery_id=r.id and state='ambiguous')
 or pg_database_size(current_database())+2000000>450000000 then raise exception 'source_recovery_reservation_denied';end if;
 insert into public.snapshot_source_recovery_dispatches(recovery_id,request_key,slot,reserved_micros) values(r.id,p_key,p_slot,p_micros) returning id into d;
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where id=c.id;
 return d;
end$$;

create function public.read_sitefit_source_recovery_response(p_id uuid,p_token uuid,p_key text) returns text
language plpgsql security definer set search_path='' as $$declare r public.snapshot_source_recoveries;d public.snapshot_source_recovery_dispatches;begin
 r:=public.sitefit_source_recovery_authority(p_id);
 if r.state<>'running' or p_token is null or r.token is distinct from p_token or r.lease_until<=now() then raise exception 'source_recovery_token_denied' using errcode='42501';end if;
 select * into d from public.snapshot_source_recovery_dispatches where recovery_id=r.id and request_key=p_key;
 if not found then return null;end if;
 if d.state<>'received' or d.checkpoint is null then raise exception 'source_recovery_no_redispatch';end if;return d.checkpoint;
end$$;

create function public.settle_sitefit_source_recovery(p_id uuid,p_token uuid,p_dispatch uuid,p_state text,p_digest text,p_checkpoint text) returns void
language plpgsql security definer set search_path='' as $$declare r public.snapshot_source_recoveries;d public.snapshot_source_recovery_dispatches;begin
 r:=public.sitefit_source_recovery_authority(p_id);
 if p_token is null or r.token is distinct from p_token or r.state<>'running' then raise exception 'source_recovery_token_denied' using errcode='42501';end if;
 select * into strict d from public.snapshot_source_recovery_dispatches where id=p_dispatch and recovery_id=r.id for update;
 if d.state=p_state and d.response_digest is not distinct from p_digest and d.checkpoint is not distinct from p_checkpoint then return;end if;
 if d.state<>'intent' or p_state is null or p_state not in('received','ambiguous')
 or p_state='received' and (p_digest is null or p_digest !~ '^[a-f0-9]{64}$' or p_checkpoint is null or jsonb_typeof(p_checkpoint::jsonb) is distinct from 'object')
 or p_state='ambiguous' and (p_digest is not null or p_checkpoint is not null) then raise exception 'source_recovery_settlement_denied';end if;
 update public.snapshot_source_recovery_dispatches set state=p_state,response_digest=p_digest,checkpoint=p_checkpoint where id=d.id;
end$$;

create function public.finish_sitefit_source_recovery(p_id uuid,p_token uuid,p_evidence jsonb,p_sections jsonb,p_projection jsonb,p_provenance jsonb) returns uuid
language plpgsql security definer set search_path='' as $$declare r public.snapshot_source_recoveries;c public.controlled_proof;rid uuid;input_tokens bigint;output_tokens bigint;expected integer;begin
 r:=public.sitefit_source_recovery_authority(p_id);select * into strict c from public.controlled_proof where id=r.case_id;
 if r.state='ready' and r.token=p_token then return r.report_id;end if;
 select 1+count(*) into expected from public.reports f,jsonb_array_elements(f.provenance#>'{partial,packets}')p where f.id=r.failed_report_id and p->>'strength'<>'insufficient';
 select sum((checkpoint::jsonb#>>'{usage,input_tokens}')::bigint),sum((checkpoint::jsonb#>>'{usage,output_tokens}')::bigint) into input_tokens,output_tokens from public.snapshot_source_recovery_dispatches where recovery_id=r.id and state='received';
 if r.state<>'running' or r.token is distinct from p_token or p_token is null
 or (select count(*) from public.snapshot_source_recovery_dispatches where recovery_id=r.id and state='received')<>expected
 or exists(select 1 from public.snapshot_source_recovery_dispatches where recovery_id=r.id and state<>'received')
 or p_provenance->'sourceSnapshotIds' is distinct from to_jsonb(r.frozen_snapshots)
 or not public.sitefit_trial_snapshot_receipts_valid(p_provenance) or p_provenance#>>'{ai,dispatches}' is distinct from expected::text
 or (select sum((x->>'inputTokens')::bigint) from jsonb_array_elements(p_provenance#>'{ai,receipts}')x) is distinct from input_tokens
 or (select sum((x->>'outputTokens')::bigint) from jsonb_array_elements(p_provenance#>'{ai,receipts}')x) is distinct from output_tokens
 or input_tokens is null or output_tokens is null or round(input_tokens*c.input_rate+output_tokens*c.output_rate)>c.reserved_micros
 or p_evidence is distinct from (select provenance#>'{partial,evidence}' from public.reports where id=r.failed_report_id)
 then raise exception 'source_recovery_completion_denied';end if;
 rid:=public.finalise_sitefit_recovered_free(c.owner_id,r.analysis_id,r.input_id,p_evidence,p_sections,p_projection,p_provenance);
 update public.snapshot_source_recoveries set state='ready',report_id=rid where id=r.id;
 update public.controlled_proof set state='snapshot_ready',free_report_id=rid where id=c.id;
 return rid;
end$$;
revoke all on function public.claim_sitefit_source_recovery(uuid,uuid),public.reserve_sitefit_source_recovery(uuid,uuid,text,text,bigint,text),public.read_sitefit_source_recovery_response(uuid,uuid,text),public.settle_sitefit_source_recovery(uuid,uuid,uuid,text,text,text),public.finish_sitefit_source_recovery(uuid,uuid,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.claim_sitefit_source_recovery(uuid,uuid),public.reserve_sitefit_source_recovery(uuid,uuid,text,text,bigint,text),public.read_sitefit_source_recovery_response(uuid,uuid,text),public.settle_sitefit_source_recovery(uuid,uuid,uuid,text,text,text),public.finish_sitefit_source_recovery(uuid,uuid,jsonb,jsonb,jsonb,jsonb) to service_role;

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

 (old.state='intervention' and new.state='snapshot_ready' and exists(select 1 from public.snapshot_source_recoveries r join public.reports f on f.id=r.report_id where r.case_id=old.id and r.state='ready' and r.report_id=new.free_report_id and f.status='ready' and f.version=2 and f.analysis_id=r.analysis_id)) or
 (old.state='snapshot_ready' and new.state='full_running') or

 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;

 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or

 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or

 (old.payment_id is not null and new.payment_id is distinct from old.payment_id and not exists(

 select 1 from public.checkout_successors l join public.payments p on p.id=l.predecessor_id

 where l.case_id=old.id and l.owner_id=old.owner_id and (l.predecessor_id=old.payment_id or l.target_predecessor=old.payment_id) and l.successor_id=new.payment_id

 and p.status='failed' and p.expired_at is not null and p.verified_at is null and p.access_state='none'

 and old.trial_id is not null and old.state='snapshot_ready' and new.state='snapshot_ready')) then raise exception 'proof_binding_immutable';end if;

 return new;

end$function$
;
create function public.read_sitefit_source_recovery_candidate(p_trial uuid,p_owner uuid,p_property uuid,p_business text) returns uuid
language plpgsql stable security definer set search_path='' as $$declare c public.controlled_proof;f public.reports;begin
 if not public.sitefit_trial_active(p_trial,p_owner) then raise exception 'trial_not_authorised' using errcode='42501';end if;
 select * into c from public.controlled_proof where trial_id=p_trial and owner_id=p_owner and property_id=p_property and business_type=p_business and state='intervention' and enabled and expires_at>now() and free_report_id is null and payment_id is null;
 if not found then return null;end if;
 select q.* into f from public.reports q join public.analyses a on a.id=q.analysis_id where a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce and q.tier='free' and q.status='failed' and q.version=1;
 if f.id is null or coalesce(jsonb_array_length(f.provenance#>'{partial,sections}'),-1)<>0 or coalesce(jsonb_array_length(f.provenance#>'{partial,receipts}'),-1)<>0 or coalesce((f.provenance#>>'{partial,dispatches}')::integer,-1) not between 0 and 4
 or (select count(*) from public.data_snapshots where analysis_id=f.analysis_id and input_id=f.input_id and collection_key='free-enriched-v1')<>17
 or exists(select 1 from public.proof_dispatches where case_id=c.id and (kind='ai' or state<>'received' and not(state='ambiguous' and public.sitefit_proof_source_unavailable(kind,stage,reserved_micros))))
 or not exists(select 1 from public.proof_dispatches where case_id=c.id and state='ambiguous' and public.sitefit_proof_source_unavailable(kind,stage,reserved_micros)) then return null;end if;
 return c.id;
end$$;
revoke all on function public.read_sitefit_source_recovery_candidate(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_sitefit_source_recovery_candidate(uuid,uuid,uuid,text) to service_role;

