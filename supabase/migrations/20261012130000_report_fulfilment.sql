-- Phase 14 development only. No dispatch, scheduler or support grant is enabled here.
create table public.report_fulfilment (
 id uuid primary key default gen_random_uuid(),
 payment_id uuid not null unique references public.payments(id),
 owner_id uuid not null references auth.users(id),
 free_report_id uuid not null references public.reports(id),
 report_id uuid references public.reports(id),
 state text not null default 'queued' check(state in ('queued','running','ready','intervention','awaiting_authorisation')),
 reason text check(reason in ('dispatch_ambiguous','validation_failed','execution_interrupted','access_unavailable','budget_unavailable','configuration_unavailable')),
 lease_token uuid, lease_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((state='running')=(lease_token is not null and lease_until is not null))
);
create index fulfilment_pending on public.report_fulfilment(created_at) where state in ('queued','running');
alter table public.report_fulfilment enable row level security;
revoke all on public.report_fulfilment from public,anon,authenticated,service_role;

create table public.fulfilment_control (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 -- Deployment identity is exact, not a caller-controlled host or URL proxy.
 runner_url text, vault_runner_secret uuid, vault_protection_secret uuid,
 check(runner_url is null or runner_url ~ '^https://sitefit-git-codex-phase-14-reliability-[a-z0-9-]+\.vercel\.app/api/internal/fulfilment$')
);
insert into public.fulfilment_control(singleton) values(true);
alter table public.fulfilment_control enable row level security;
revoke all on public.fulfilment_control from public,anon,authenticated,service_role;

create table public.fulfilment_support_accounts(owner_id uuid primary key references auth.users(id));
alter table public.fulfilment_support_accounts enable row level security;
revoke all on public.fulfilment_support_accounts from public,anon,authenticated,service_role;

create function public.enqueue_sitefit_fulfilment(p_owner uuid,p_payment uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.payments; j public.report_fulfilment;
begin
 select * into p from public.payments where id=p_payment and owner_id=p_owner and status='succeeded'
  and access_state='active' and verified_at is not null and payment_version=1 and test_mode=true;
 if not found then raise exception 'fulfilment_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,p.analysis_id,(select input_id from public.reports where id=p.report_id));
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,1414));
 select * into j from public.report_fulfilment where payment_id=p_payment;
 if found then return jsonb_build_object('id',j.id,'state',j.state);end if;
 if (select count(*) from public.report_fulfilment where owner_id=p_owner and created_at>now()-interval '10 minutes')>=5 then
  raise exception 'fulfilment_rate_limited' using errcode='54000';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'fulfilment_capacity_checkpoint' using errcode='23514';end if;
 insert into public.report_fulfilment(payment_id,owner_id,free_report_id)
 values(p.id,p_owner,p.report_id) returning * into j;
 return jsonb_build_object('id',j.id,'state',j.state);
end $$;

create function public.sitefit_payment_fulfilment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='succeeded' and new.access_state='active' and new.verified_at is not null and new.test_mode=true
  and (tg_op='INSERT' or old.status is distinct from new.status or old.access_state is distinct from new.access_state) then
  -- Fulfilment admission failure cannot discard a verified payment receipt.
  begin perform public.enqueue_sitefit_fulfilment(new.owner_id,new.id);
  exception when others then
   insert into public.system_events(event_type,analysis_id,safe_metadata)
   values('fulfilment-admission-failed',new.analysis_id,jsonb_build_object('code','admission_unavailable'));
  end;
 end if;
 return new;
end $$;
create trigger fulfilment_payment_confirmed after insert or update on public.payments
for each row execute function public.sitefit_payment_fulfilment();

create function public.read_sitefit_fulfilment(p_owner uuid,p_payment uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.payments;j public.report_fulfilment;
begin
 select * into p from public.payments where id=p_payment and owner_id=p_owner;
 if not found then raise exception 'fulfilment_unavailable' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,p.analysis_id,(select input_id from public.reports where id=p.report_id));
 select * into j from public.report_fulfilment where payment_id=p.id;
 if not found then return null;end if;
 return jsonb_build_object('id',j.id,'state',j.state,'reportId',case when j.state='ready' then j.report_id else null end,'updatedAt',j.updated_at,
  'stage',case when j.state='running' then (select case when provenance#>>'{checkpoint,state}'='validating' then 'validating'
   else provenance#>>'{checkpoint,dispatches,-1,group}' end from public.reports where id=j.report_id) else null end);
end $$;

create function public.claim_sitefit_fulfilment() returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.report_fulfilment;p public.payments;
begin
 if not exists(select 1 from public.fulfilment_control where enabled) then return null;end if;
 select * into j from public.report_fulfilment where state='queued' or (state='running' and lease_until<now())
  order by created_at for update skip locked limit 1;
 if not found then return null;end if;
 select * into p from public.payments where id=j.payment_id;
 if p.status<>'succeeded' or p.access_state<>'active' or p.verified_at is null then
  update public.report_fulfilment set state='intervention',reason='access_unavailable',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  return null;
 end if;
 -- Expired workers do NOT release authority to resend an unknown AI dispatch.
 if j.state='running' then
  update public.report_fulfilment set state='intervention',reason='execution_interrupted',lease_token=null,lease_until=null,updated_at=now() where id=j.id;
  return null;
 end if;
 update public.report_fulfilment set state='running',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now()
 where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'ownerId',j.owner_id,'freeReportId',j.free_report_id,'reportId',j.report_id,'token',j.lease_token);
end $$;

create function public.bind_sitefit_fulfilment(p_job uuid,p_token uuid,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$
declare j public.report_fulfilment;r public.reports;f public.reports;
begin
 select * into j from public.report_fulfilment where id=p_job and state='running' and lease_token=p_token and lease_until>now() for update;
 if not found then raise exception 'fulfilment_lease_lost' using errcode='40001';end if;
 select * into r from public.reports where id=p_report and tier='full' and full_binding is not null;
 select * into f from public.reports where id=j.free_report_id;
 if r.id is null or r.analysis_id<>f.analysis_id or r.input_id<>f.input_id or (j.report_id is not null and j.report_id<>r.id) then
  raise exception 'fulfilment_binding_invalid' using errcode='23514';end if;
 perform public.authorise_sitefit_economics(j.owner_id,r.analysis_id,r.input_id);
 update public.report_fulfilment set report_id=r.id,updated_at=now() where id=j.id;
end $$;

create function public.finish_sitefit_fulfilment(p_job uuid,p_token uuid,p_state text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare j public.report_fulfilment;r public.reports;
begin
 if p_state not in ('ready','intervention','awaiting_authorisation') then raise exception 'fulfilment_state_invalid';end if;
 select * into j from public.report_fulfilment where id=p_job and state='running' and lease_token=p_token and lease_until>now() for update;
 if not found then raise exception 'fulfilment_lease_lost' using errcode='40001';end if;
 if p_state='ready' then
  select * into r from public.reports where id=j.report_id and status='ready' and full_projection is not null;
  if not found then raise exception 'fulfilment_ready_required';end if;
  perform public.authorise_sitefit_economics(j.owner_id,r.analysis_id,r.input_id);
 end if;
 update public.report_fulfilment set state=p_state,reason=p_reason,lease_token=null,lease_until=null,updated_at=now() where id=j.id;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata)
 values('fulfilment-transition',(select analysis_id from public.reports where id=j.free_report_id),j.report_id,jsonb_build_object('state',p_state,'code',p_reason));
end $$;

create function public.sitefit_fulfilment_support(p_actor uuid,p_job uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fulfilment_support_accounts s join auth.users u on u.id=s.owner_id
  where s.owner_id=p_actor and not u.is_anonymous and u.email_confirmed_at is not null) then
  raise exception 'support_denied' using errcode='42501';end if;
 insert into public.system_events(event_type,safe_metadata) values('fulfilment-support-inspection',jsonb_build_object('actorId',p_actor));
 return (select coalesce(jsonb_agg(x),'[]'::jsonb) from (select id,state,reason,created_at,updated_at from public.report_fulfilment
  where p_job is null or id=p_job order by created_at desc limit 50) x);
end $$;

create function public.resume_sitefit_fulfilment(p_actor uuid,p_job uuid) returns void
language plpgsql security definer set search_path='' as $$
declare j public.report_fulfilment;r public.reports;
begin
 perform public.sitefit_fulfilment_support(p_actor,p_job);
 select * into j from public.report_fulfilment where id=p_job for update;
 if not found or j.state<>'intervention' or j.report_id is null then raise exception 'fulfilment_resume_denied';end if;
 select * into r from public.reports where id=j.report_id;
 perform public.authorise_sitefit_economics(j.owner_id,r.analysis_id,r.input_id);
 if exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d->>'state' in ('intent','ambiguous','invalid')) then
  raise exception 'fulfilment_dispatch_requires_intervention' using errcode='23514';end if;
 update public.report_fulfilment set state=case when r.status='ready' then 'ready' else 'queued' end,reason=null,updated_at=now() where id=j.id;
 insert into public.system_events(event_type,analysis_id,report_id,safe_metadata) values('fulfilment-support-resume',r.analysis_id,r.id,jsonb_build_object('actorId',p_actor,'jobId',j.id));
end $$;

-- pg_cron calls this small dispatcher. No work means no network invocation.
-- Extension installation and exact Preview/Vault configuration are operator-only.
create function public.tick_sitefit_fulfilment() returns bigint
language plpgsql security definer set search_path='' as $$
declare cfg public.fulfilment_control; runner_secret text; protection_secret text; request_id bigint;
begin
 select * into cfg from public.fulfilment_control where singleton;
 if not cfg.enabled or cfg.runner_url is null or cfg.vault_runner_secret is null or cfg.vault_protection_secret is null
  or not exists(select 1 from public.report_fulfilment where state='queued' or (state='running' and lease_until<now())) then return null;end if;
 -- Serialize ticks; a pending pg_net request is never blindly sent again.
 perform pg_advisory_xact_lock(14140001);
 if exists(select 1 from public.system_events where event_type='fulfilment-tick' and occurred_at>now()-interval '5 minutes') then return null;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into runner_secret using cfg.vault_runner_secret;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into protection_secret using cfg.vault_protection_secret;
 if runner_secret is null or runner_secret !~ '^[a-f0-9]{64}$' or protection_secret is null then return null;end if;
 execute 'select net.http_post(url:=$1,headers:=$2,timeout_milliseconds:=210000)' into request_id
 using cfg.runner_url,jsonb_build_object('Authorization','Bearer '||runner_secret,'x-vercel-protection-bypass',protection_secret);
 insert into public.system_events(event_type,safe_metadata) values('fulfilment-tick',jsonb_build_object('requestId',request_id));
 return request_id;
end $$;

revoke all on function public.enqueue_sitefit_fulfilment(uuid,uuid),public.sitefit_payment_fulfilment(),public.read_sitefit_fulfilment(uuid,uuid),public.claim_sitefit_fulfilment(),public.bind_sitefit_fulfilment(uuid,uuid,uuid),public.finish_sitefit_fulfilment(uuid,uuid,text,text),public.sitefit_fulfilment_support(uuid,uuid) from public,anon,authenticated;
grant execute on function public.enqueue_sitefit_fulfilment(uuid,uuid),public.read_sitefit_fulfilment(uuid,uuid),public.claim_sitefit_fulfilment(),public.bind_sitefit_fulfilment(uuid,uuid,uuid),public.finish_sitefit_fulfilment(uuid,uuid,text,text),public.sitefit_fulfilment_support(uuid,uuid) to service_role;
revoke all on function public.resume_sitefit_fulfilment(uuid,uuid),public.tick_sitefit_fulfilment() from public,anon,authenticated;
grant execute on function public.resume_sitefit_fulfilment(uuid,uuid) to service_role;
revoke all on function public.tick_sitefit_fulfilment() from service_role;
