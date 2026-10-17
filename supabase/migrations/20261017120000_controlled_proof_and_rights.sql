-- Additive, disabled preparation only. No purchaser, approval, dispatch or spending is seeded.
create table public.data_rights_holds (
 owner_id uuid primary key references auth.users(id), restricted boolean not null default true,
 case_reference uuid not null, updated_at timestamptz not null default now()
);
create table public.data_rights_audit (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 case_reference uuid not null, action text not null, plan_digest text not null,
 affected integer not null, actor text not null default session_user, created_at timestamptz not null default now()
);
alter table public.data_rights_holds enable row level security;
alter table public.data_rights_audit enable row level security;
revoke all on public.data_rights_holds,public.data_rights_audit from public,anon,authenticated,service_role;

create function public.assert_sitefit_processing_allowed(p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 if p_owner is null or exists(select 1 from public.data_rights_holds where owner_id=p_owner and restricted) then
 raise exception 'subject_processing_restricted' using errcode='42501';end if;
end$$;
revoke all on function public.assert_sitefit_processing_allowed(uuid) from public,anon,authenticated;
grant execute on function public.assert_sitefit_processing_allowed(uuid) to service_role;

-- Read-only, database-operator-only preview. Deliberately no Auth secrets or report content.
create function public.sitefit_rights_plan(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 if not exists(select 1 from auth.users where id=p_owner) then raise exception 'rights_subject_missing';end if;
 select jsonb_build_object('owner',p_owner,'profile',to_jsonb(p),
 'campaigns',(select coalesce(jsonb_agg(to_jsonb(c) order by c.analysis_id),'[]') from public.campaign_attribution c join public.analyses a on a.id=c.analysis_id where a.owner_id=p_owner),
 'retainedContracts',(select count(*) from public.sale_contracts where owner_id=p_owner),
 'retainedPayments',(select count(*) from public.payments where owner_id=p_owner),
 'retainedReports',(select count(*) from public.reports r join public.analyses a on a.id=r.analysis_id where a.owner_id=p_owner),
 'hold',(select to_jsonb(h) from public.data_rights_holds h where owner_id=p_owner)) into v from public.profiles p where id=p_owner;
 if v is null then raise exception 'rights_profile_missing';end if;
 return jsonb_build_object('digest',encode(sha256(convert_to(v::text,'UTF8')),'hex'),'plan',v);
end$$;
revoke all on function public.sitefit_rights_plan(uuid) from public,anon,authenticated,service_role;

-- Explicit CAS on an operator-reviewed plan. No generic graph/Auth/Storage deletion bypass.
create function public.apply_sitefit_rights_action(p_owner uuid,p_case uuid,p_action text,p_expected text) returns jsonb
language plpgsql security definer set search_path='' as $$declare plan jsonb; affected integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,17));
 if p_case is null or p_action not in ('restrict','release','anonymise_profile','delete_campaign') then raise exception 'rights_action_invalid';end if;
 plan:=public.sitefit_rights_plan(p_owner);
 if p_expected is null or p_expected<>plan->>'digest' then raise exception 'rights_plan_changed' using errcode='40001';end if;
 if p_action in ('restrict','release') then
 insert into public.data_rights_holds(owner_id,restricted,case_reference) values(p_owner,p_action='restrict',p_case)
 on conflict(owner_id) do update set restricted=excluded.restricted,case_reference=excluded.case_reference,updated_at=now();affected:=1;
 else
 if not exists(select 1 from public.data_rights_holds where owner_id=p_owner and restricted) then raise exception 'rights_hold_required';end if;
 if p_action='anonymise_profile' then update public.profiles set display_name=null where id=p_owner and display_name is not null;
 else delete from public.campaign_attribution c using public.analyses a where c.analysis_id=a.id and a.owner_id=p_owner;end if;
 get diagnostics affected=row_count;
 end if;
 insert into public.data_rights_audit(owner_id,case_reference,action,plan_digest,affected) values(p_owner,p_case,p_action,p_expected,affected);
 return jsonb_build_object('affected',affected,'action',p_action);
end$$;
revoke all on function public.apply_sitefit_rights_action(uuid,uuid,text,text) from public,anon,authenticated,service_role;

create table public.controlled_proof (
 singleton boolean primary key default true check(singleton), id uuid not null unique default gen_random_uuid(),
 owner_id uuid not null references auth.users(id), property_id uuid not null references public.properties(id),
 business_type text not null check(business_type in('coffee-shop','restaurant','hair-salon','beauty-salon')),
 nonce uuid not null unique, policy_version text not null references public.sale_policies(version), policy_snapshot jsonb not null,
 policy_digest text not null check(policy_digest ~ '^[a-f0-9]{64}$'),
 enabled boolean not null default false, expires_at timestamptz not null,
 tariff_verified boolean not null default false, tariff_digest text check(tariff_digest ~ '^[a-f0-9]{64}$'),
 input_rate numeric not null default 2.5 check(input_rate>=2.5 and input_rate<1000000), output_rate numeric not null default 10 check(output_rate>=10 and output_rate<1000000),
 ai_limit_micros bigint not null default 950000 check(ai_limit_micros=950000),
 reserved_micros bigint not null default 0 check(reserved_micros between 0 and 950000),
 state text not null default 'issued' check(state in('issued','snapshot_running','snapshot_ready','full_running','complete','intervention')),
 token uuid, free_report_id uuid references public.reports(id), full_report_id uuid references public.reports(id),
 payment_id uuid unique references public.payments(id),
 check(not enabled or (tariff_verified and tariff_digest is not null))
);
create table public.proof_dispatches (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.controlled_proof(id),
 stage text not null check(stage in('snapshot','full')), request_key text not null check(request_key ~ '^[a-f0-9]{64}$'),
 kind text not null, request_digest text not null check(request_digest ~ '^[a-f0-9]{64}$'),
 reserved_micros bigint not null check(reserved_micros>=0),
 state text not null default 'intent' check(state in('intent','received','ambiguous')),
 response_digest text check(response_digest ~ '^[a-f0-9]{64}$'), created_at timestamptz not null default now(),
 unique(case_id,stage,request_key)
);
alter table public.controlled_proof enable row level security;
alter table public.proof_dispatches enable row level security;
revoke all on public.controlled_proof,public.proof_dispatches from public,anon,authenticated,service_role;

create function public.freeze_sitefit_proof_identity() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op<>'UPDATE' then raise exception 'proof_history_immutable';end if;
 if row(new.id,new.owner_id,new.property_id,new.business_type,new.nonce,new.policy_version,new.policy_snapshot,new.policy_digest,new.ai_limit_micros) is distinct from
 row(old.id,old.owner_id,old.property_id,old.business_type,old.nonce,old.policy_version,old.policy_snapshot,old.policy_digest,old.ai_limit_micros)
 or new.reserved_micros<old.reserved_micros or old.state<>'issued' and
 row(new.expires_at,new.input_rate,new.output_rate,new.tariff_digest,new.tariff_verified) is distinct from
 row(old.expires_at,old.input_rate,old.output_rate,old.tariff_digest,old.tariff_verified)
 or old.state<>'issued' and new.state='issued' then raise exception 'proof_identity_or_hold_immutable';end if;
 if old.state<>new.state and not ((old.state='issued' and new.state='snapshot_running') or
 (old.state='snapshot_running' and new.state in('snapshot_ready','intervention')) or
 (old.state='snapshot_ready' and new.state='full_running') or
 (old.state='full_running' and new.state in('complete','intervention'))) then raise exception 'proof_transition_denied';end if;
 if (old.free_report_id is not null and new.free_report_id is distinct from old.free_report_id) or
 (old.full_report_id is not null and new.full_report_id is distinct from old.full_report_id) or
 (old.payment_id is not null and new.payment_id is distinct from old.payment_id) then raise exception 'proof_binding_immutable';end if;
 return new;
end$$;
create trigger proof_identity_frozen before update or delete on public.controlled_proof for each row execute function public.freeze_sitefit_proof_identity();
create trigger proof_no_truncate before truncate on public.controlled_proof for each statement execute function public.freeze_sitefit_proof_identity();
revoke all on function public.freeze_sitefit_proof_identity() from public,anon,authenticated,service_role;

create function public.claim_sitefit_controlled_proof(p_owner uuid,p_stage text,p_case uuid,p_approved boolean,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; r public.reports; a public.analyses;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof for update;
 if not found then if p_case is not null then raise exception 'proof_missing';end if;return null;end if;
 -- An issued but disabled proof also fences ordinary production execution: no public fall-through.
 if not p_approved or p_approved is null or p_case is distinct from c.id or not c.enabled or c.expires_at<=now() or
 c.owner_id<>p_owner or not c.tariff_verified or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null)
 or not exists(select 1 from public.properties where id=c.property_id and address_resolution_state='provider_verified' and provider_address_id is not null)
 or c.policy_digest<>encode(sha256(convert_to(c.policy_snapshot::text,'UTF8')),'hex')
 or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot)
 then raise exception 'proof_not_authorised' using errcode='42501';end if;
 if p_stage='snapshot' then
 if row(p_property,p_nonce,p_business) is distinct from row(c.property_id,c.nonce,c.business_type) then raise exception 'proof_case_mismatch' using errcode='42501';end if;
 if c.state in('snapshot_ready','full_running','complete') and c.free_report_id is not null then
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate,'reportId',c.free_report_id);end if;
 if c.state<>'issued' then raise exception 'proof_reconciliation_required';end if;
 update public.controlled_proof set state='snapshot_running',token=gen_random_uuid() where singleton returning * into c;
 elsif p_stage='full' then
 select * into r from public.reports where id=p_report and tier='full' and status<>'ready';
 select * into a from public.analyses where id=r.analysis_id;
 if c.state<>'snapshot_ready' or c.payment_id is null or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or
 a.business_type is distinct from c.business_type or not exists(select 1 from public.reports f where f.id=c.free_report_id and f.analysis_id=a.id)
 or not exists(select 1 from public.report_fulfilment j where j.payment_id=c.payment_id and j.report_id=p_report and j.state='running' and j.lease_until>now())
 then raise exception 'proof_full_binding_denied' using errcode='42501';end if;
 update public.controlled_proof set state='full_running',full_report_id=p_report,token=gen_random_uuid() where singleton returning * into c;
 else raise exception 'proof_stage_invalid';end if;
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$$;

create function public.reserve_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_stage text,p_key text,p_kind text,p_digest text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; n integer; cap integer; d uuid;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if c.token is distinct from p_token or p_token is null or not c.enabled or c.expires_at<=now() or c.state<>p_stage||'_running' then raise exception 'proof_dispatch_denied' using errcode='42501';end if;
 if not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot) then raise exception 'proof_policy_revoked' using errcode='42501';end if;
 if exists(select 1 from public.proof_dispatches where case_id=p_case and state='ambiguous') then raise exception 'proof_ambiguous';end if;
 if p_kind='ai' then
 cap:=case when p_stage='snapshot' then 5 else 3 end;
 if p_micros is null or p_micros<=0 or c.reserved_micros+p_micros>c.ai_limit_micros then raise exception 'proof_budget_exhausted';end if;
 if p_stage='full' and (select coalesce(sum(reserved_micros),0) from public.proof_dispatches where case_id=p_case and stage='full')+p_micros>300000 then raise exception 'proof_full_reservation_exhausted';end if;
 else
 if p_stage<>'snapshot' or p_micros is distinct from 0 then raise exception 'proof_source_denied';end if;
 cap:=case p_kind when 'api.propertydata.co.uk' then 4 when 'api.geoapify.com' then 2 when 'api.tfl.gov.uk' then 4 when 'api.ratings.food.gov.uk' then 2 when 'api.get-energy-performance-data.communities.gov.uk' then 2 else 0 end;
 end if;
 select count(*) into n from public.proof_dispatches where case_id=p_case and stage=p_stage and kind=p_kind;
 if n>=cap then raise exception 'proof_dispatch_cap';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'proof_capacity';end if;
 insert into public.proof_dispatches(case_id,stage,request_key,kind,request_digest,reserved_micros) values(p_case,p_stage,p_key,p_kind,p_digest,p_micros) returning id into d;
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where singleton;return d;
end$$;

create function public.settle_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_dispatch uuid,p_state text,p_digest text) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;d public.proof_dispatches;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 if c.token is distinct from p_token or p_token is null or p_state not in('received','ambiguous') or p_state is null then raise exception 'proof_settlement_denied';end if;
 select * into strict d from public.proof_dispatches where id=p_dispatch and case_id=p_case for update;
 if d.state=p_state and d.response_digest is not distinct from p_digest then return;end if;
 if d.state<>'intent' or p_state='received' and p_digest is null then raise exception 'proof_settlement_conflict';end if;
 update public.proof_dispatches set state=p_state,response_digest=p_digest where id=d.id;
 if p_state='ambiguous' then update public.controlled_proof set state='intervention' where singleton;end if;
end$$;

create function public.interrupt_sitefit_controlled_proof(p_case uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.controlled_proof set state='intervention' where id=p_case and token=p_token and state in('snapshot_running','full_running');
 -- Outstanding intents stay unknown and their holds are never released.
end$$;
create function public.finish_sitefit_controlled_proof(p_case uuid,p_token uuid,p_stage text,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;r public.reports;a public.analyses;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 select * into r from public.reports where id=p_report and status='ready' and tier=case when p_stage='snapshot' then 'free' else 'full' end;
 select * into a from public.analyses where id=r.analysis_id;
 if c.token is distinct from p_token or p_token is null or c.state<>p_stage||'_running' or not c.enabled or c.expires_at<=now() or
 a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or a.business_type is distinct from c.business_type or
 a.submission_nonce is distinct from c.nonce or exists(select 1 from public.proof_dispatches where case_id=p_case and state<>'received')
 then raise exception 'proof_completion_denied';end if;
 if p_stage='snapshot' then update public.controlled_proof set state='snapshot_ready',free_report_id=p_report where singleton;
 elsif p_stage='full' and c.full_report_id=p_report then update public.controlled_proof set state='complete' where singleton;
 else raise exception 'proof_stage_invalid';end if;
end$$;

-- Mandatory SQL guards on existing entry points, not caller-submitted flags.
create function public.guard_sitefit_subject_work() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;c public.controlled_proof;begin
 if tg_table_name='analyses' then owner:=new.owner_id;
 elsif tg_table_name='payments' then select coalesce(new.owner_id,owner_id) into owner from public.analyses where id=new.analysis_id;
 else select owner_id into owner from public.analyses where id=new.analysis_id;end if;
 perform public.assert_sitefit_processing_allowed(owner);
 select * into c from public.controlled_proof for update;
 if found then
 if tg_table_name='analyses' then
 if not c.enabled or c.state<>'snapshot_running' or row(new.owner_id,new.property_id,new.business_type,new.submission_nonce) is distinct from row(c.owner_id,c.property_id,c.business_type,c.nonce) then raise exception 'proof_analysis_denied' using errcode='42501';end if;
 elsif tg_table_name='payments' then
 if not c.enabled or c.state<>'snapshot_ready' or new.owner_id is distinct from c.owner_id or new.payment_version<>2 or new.test_mode or
 not exists(select 1 from public.reports where id=c.free_report_id and analysis_id=new.analysis_id)
 or c.payment_id is not null and new.id<>c.payment_id then raise exception 'proof_payment_denied' using errcode='42501';end if;
 else
 if not exists(select 1 from public.analyses a where a.id=new.analysis_id and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 then raise exception 'proof_owned_graph_denied' using errcode='42501';end if;
 end if;end if;return new;
end$$;
create trigger subject_analysis_guard before insert on public.analyses for each row execute function public.guard_sitefit_subject_work();
create trigger subject_payment_guard before insert on public.payments for each row execute function public.guard_sitefit_subject_work();
create function public.bind_sitefit_proof_payment() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.controlled_proof set payment_id=new.id where singleton;return new;end$$;
create trigger proof_payment_binding after insert on public.payments for each row execute function public.bind_sitefit_proof_payment();
revoke all on function public.bind_sitefit_proof_payment() from public,anon,authenticated,service_role;
create function public.guard_sitefit_proof_contract() returns trigger language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 select * into c from public.controlled_proof;
 if found and (new.owner_id is distinct from c.owner_id or new.payment_id is distinct from c.payment_id or
 new.policy_version is distinct from c.policy_version or new.policy_snapshot is distinct from c.policy_snapshot) then raise exception 'proof_contract_mismatch' using errcode='42501';end if;return new;
end$$;
create trigger proof_contract_binding before insert on public.sale_contracts for each row execute function public.guard_sitefit_proof_contract();
revoke all on function public.guard_sitefit_proof_contract() from public,anon,authenticated,service_role;
create trigger subject_report_guard before insert or update on public.reports for each row execute function public.guard_sitefit_subject_work();
create trigger subject_campaign_guard before insert or update on public.campaign_attribution for each row execute function public.guard_sitefit_subject_work();
create function public.sitefit_own_profile_unrestricted() returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.data_rights_holds where owner_id=auth.uid() and restricted)
$$;
revoke all on function public.sitefit_own_profile_unrestricted() from public,anon,service_role;
grant execute on function public.sitefit_own_profile_unrestricted() to authenticated;
create policy profile_rights_hold on public.profiles as restrictive for update to authenticated
 using(public.sitefit_own_profile_unrestricted()) with check(public.sitefit_own_profile_unrestricted());
revoke all on function public.guard_sitefit_subject_work() from public,anon,authenticated,service_role;

alter function public.bind_sitefit_fulfilment(uuid,uuid,uuid) rename to bind_sitefit_fulfilment_before_rights;
revoke all on function public.bind_sitefit_fulfilment_before_rights(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.bind_sitefit_fulfilment(p_job uuid,p_token uuid,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$declare owner uuid;begin
 select owner_id into owner from public.report_fulfilment where id=p_job;
 perform public.assert_sitefit_processing_allowed(owner);
 perform public.bind_sitefit_fulfilment_before_rights(p_job,p_token,p_report);
end$$;

-- Same existing queue semantics, adding eligibility filters only. Held/foreign jobs retain their state.
create or replace function public.claim_sitefit_fulfilment() returns jsonb
language plpgsql security definer set search_path='' as $$declare j public.report_fulfilment;p public.payments;begin
 if not exists(select 1 from public.fulfilment_control where enabled) then return null;end if;
 select * into j from public.report_fulfilment q
 where (q.state='queued' or (q.state='running' and q.lease_until<now()))
 and not exists(select 1 from public.data_rights_holds h where h.owner_id=q.owner_id and h.restricted)
 and (not exists(select 1 from public.controlled_proof) or exists(select 1 from public.controlled_proof c
  where c.enabled and c.expires_at>now() and c.owner_id=q.owner_id and c.payment_id=q.payment_id and c.free_report_id=q.free_report_id and c.state in('snapshot_ready','full_running','complete')))
 and (q.state='running' or not exists(select 1 from public.payments v where v.id=q.payment_id and v.status='succeeded' and v.access_state='active' and v.verified_at is not null)
 or exists(select 1 from public.reports r where r.id=q.report_id and r.status='ready') or public.sitefit_supply_permitted(q.payment_id))
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 select * into p from public.payments where id=j.payment_id;
 if p.status<>'succeeded' or p.access_state<>'active' or p.verified_at is null then
 update public.report_fulfilment set state='intervention',reason='access_unavailable',lease_token=null,lease_until=null,updated_at=now() where id=j.id;return null;end if;
 if j.state='running' then
 update public.report_fulfilment set state='intervention',reason='execution_interrupted',lease_token=null,lease_until=null,updated_at=now() where id=j.id;return null;end if;
 update public.report_fulfilment set state='running',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'ownerId',j.owner_id,'freeReportId',j.free_report_id,'reportId',j.report_id,'token',j.lease_token);
end$$;
revoke all on function public.claim_sitefit_fulfilment() from public,anon,authenticated;
grant execute on function public.claim_sitefit_fulfilment() to service_role;
revoke all on function public.bind_sitefit_fulfilment(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.bind_sitefit_fulfilment(uuid,uuid,uuid) to service_role;

alter function public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text) rename to prepare_sitefit_live_payment_before_proof;
revoke all on function public.prepare_sitefit_live_payment_before_proof(uuid,uuid,uuid,text,jsonb,timestamptz,text) from public,anon,authenticated,service_role;
create function public.prepare_sitefit_live_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz,p_account text) returns public.payments
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof for update;
 if found and (not c.enabled or c.expires_at<=now() or c.owner_id is distinct from p_owner or c.free_report_id is distinct from p_report
 or c.state<>'snapshot_ready' or not exists(select 1 from public.sale_policies where version=c.policy_version and approved and snapshot=c.policy_snapshot))
 then raise exception 'proof_checkout_denied' using errcode='42501';end if;
 return public.prepare_sitefit_live_payment_before_proof(p_owner,p_report,p_id,p_price,p_parameters,p_expiry,p_account);
end$$;
revoke all on function public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text) from public,anon,authenticated;
grant execute on function public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text) to service_role;

do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('claim_sitefit_controlled_proof','reserve_sitefit_proof_dispatch','settle_sitefit_proof_dispatch','interrupt_sitefit_controlled_proof','finish_sitefit_controlled_proof') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end$$;
