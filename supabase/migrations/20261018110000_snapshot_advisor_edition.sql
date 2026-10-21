-- A separately authorised, one-call advisory edition of a Ready Free Snapshot.
-- No authority is seeded. Original reports, evidence and dispatches stay frozen.
create table public.snapshot_advisor_editions (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.controlled_proof(id),
 report_id uuid not null references public.reports(id),version text not null check(version='snapshot-advisor-v1'),
 report_digest text not null check(report_digest ~ '^[a-f0-9]{64}$'),
 research jsonb not null default '[]' check(jsonb_typeof(research)='array' and jsonb_array_length(research)<=3 and octet_length(research::text)<=8000),
 enabled boolean not null default false,expires_at timestamptz not null,
 state text not null default 'issued' check(state in('issued','intent','received','ready','ambiguous')),
 request_key text check(request_key ~ '^[a-f0-9]{64}$'),reserved_micros bigint not null default 0 check(reserved_micros>=0),
 checkpoint text check(octet_length(checkpoint)<=128000),advice jsonb,created_at timestamptz not null default now(),
 unique(case_id,version),unique(report_id,version)
);
alter table public.snapshot_advisor_editions enable row level security;
revoke all on public.snapshot_advisor_editions from public,anon,authenticated,service_role;

create function public.guard_sitefit_advisor_edition() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op in('DELETE','TRUNCATE') then raise exception 'advisor_history_immutable';end if;
 if tg_op='INSERT' then
  if new.enabled or new.state<>'issued' or new.reserved_micros<>0 or new.request_key is not null or new.checkpoint is not null or new.advice is not null then raise exception 'advisor_initial_state';end if;
 else
  if (to_jsonb(new)-array['enabled','state','request_key','reserved_micros','checkpoint','advice']) is distinct from
     (to_jsonb(old)-array['enabled','state','request_key','reserved_micros','checkpoint','advice'])
   or old.state<>'issued' and new.enabled is distinct from old.enabled
   or old.state<>new.state and not(old.state='issued' and new.state='intent' or old.state='intent' and new.state in('received','ambiguous') or old.state='received' and new.state='ready')
   or old.request_key is not null and new.request_key is distinct from old.request_key
   or old.reserved_micros>0 and new.reserved_micros<>old.reserved_micros
   or old.checkpoint is not null and new.checkpoint is distinct from old.checkpoint
   or old.advice is not null and new.advice is distinct from old.advice then raise exception 'advisor_history_immutable';end if;
 end if;return new;
end$$;
create trigger advisor_history before insert or update or delete on public.snapshot_advisor_editions for each row execute function public.guard_sitefit_advisor_edition();
create trigger advisor_no_truncate before truncate on public.snapshot_advisor_editions for each statement execute function public.guard_sitefit_advisor_edition();
revoke all on function public.guard_sitefit_advisor_edition() from public,anon,authenticated,service_role;

create function public.sitefit_advisor_authority(p_id uuid,p_owner uuid) returns public.snapshot_advisor_editions
language plpgsql security definer set search_path='' as $$declare e public.snapshot_advisor_editions;c public.controlled_proof;r public.reports;begin
 select * into strict c from public.controlled_proof where id=(select case_id from public.snapshot_advisor_editions where id=p_id) for update;
 select * into strict e from public.snapshot_advisor_editions where id=p_id for update;
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into strict r from public.reports where id=e.report_id and analysis_id in(select id from public.analyses where owner_id=p_owner and property_id=c.property_id and submission_nonce=c.nonce and business_type=c.business_type);
 if c.owner_id<>p_owner or not c.singleton or c.enabled or c.state<>'intervention' or not c.tariff_verified or c.input_rate<2.5 or c.output_rate<10
 or not e.enabled or e.expires_at<=now() or r.tier<>'free' or r.status<>'ready'
 or encode(sha256(convert_to(r.free_projection::text,'UTF8')),'hex')<>e.report_digest
 or exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 or exists(select 1 from public.snapshot_continuation_dispatches where case_id=c.id and state<>'received')
 or not exists(select 1 from public.snapshot_continuations where case_id=c.id and report_id=r.id and state='ready')
 or not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null and not is_anonymous)
 then raise exception 'advisor_authority_denied' using errcode='42501';end if;return e;
end$$;
revoke all on function public.sitefit_advisor_authority(uuid,uuid) from public,anon,authenticated,service_role;

create function public.reserve_sitefit_snapshot_advisor(p_id uuid,p_owner uuid,p_key text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare e public.snapshot_advisor_editions;held bigint;begin
 e:=public.sitefit_advisor_authority(p_id,p_owner);
 if e.state<>'issued' or p_key is null or p_key !~ '^[a-f0-9]{64}$' or p_micros is null or p_micros<=0 then raise exception 'advisor_no_redispatch';end if;
 select c.reserved_micros+(select coalesce(sum(d.reserved_micros),0) from public.snapshot_continuation_dispatches d where d.case_id=c.id)
  +(select coalesce(sum(a.reserved_micros),0) from public.snapshot_advisor_editions a where a.case_id=c.id)
 into held from public.controlled_proof c where c.id=e.case_id;
 if held+p_micros>650000 then raise exception 'advisor_aggregate_budget';end if;
 if pg_database_size(current_database())+524288>450000000 then raise exception 'advisor_capacity';end if;
 update public.snapshot_advisor_editions set state='intent',request_key=p_key,reserved_micros=p_micros where id=e.id;
 return e.id;
end$$;

create function public.settle_sitefit_snapshot_advisor(p_id uuid,p_owner uuid,p_state text,p_checkpoint text) returns void
language plpgsql security definer set search_path='' as $$declare e public.snapshot_advisor_editions;begin
 e:=public.sitefit_advisor_authority(p_id,p_owner);
 if e.state=p_state and e.checkpoint is not distinct from p_checkpoint then return;end if;
 if e.state<>'intent' or p_state is null or p_state not in('received','ambiguous') or
  p_state='received' and (p_checkpoint is null or jsonb_typeof(p_checkpoint::jsonb)<>'object') or p_state='ambiguous' and p_checkpoint is not null
 then raise exception 'advisor_settlement_denied';end if;
 update public.snapshot_advisor_editions set state=p_state,checkpoint=p_checkpoint where id=e.id;
end$$;

create function public.freeze_sitefit_snapshot_advisor(p_id uuid,p_owner uuid,p_advice jsonb) returns void
language plpgsql security definer set search_path='' as $$declare e public.snapshot_advisor_editions;item jsonb;keys text[]:=array['recommendation','why','counterargument','change','action'];k text;response jsonb;begin
 e:=public.sitefit_advisor_authority(p_id,p_owner);
 if e.state='ready' and e.advice=p_advice then return;end if;
 response:=e.checkpoint::jsonb;
 if e.state<>'received' or response->>'status'<>'completed' or response->>'model' not like 'gpt-6.1-sol%'
 or p_advice->>'version' is distinct from 'snapshot-advisor-v1' or coalesce(p_advice->>'stance','') not in('recommended','conditional','not_recommended')
 or p_advice->>'leaseCommitment' is distinct from 'withhold' or jsonb_typeof(p_advice->'formats') is distinct from 'array'
 or octet_length(p_advice::text)>10000 or (select count(*) from jsonb_object_keys(p_advice))<>9
 or not exists(select 1 from jsonb_array_elements(response->'output') m,jsonb_array_elements(m->'content') content
 where m->>'type'='message' and content->>'type'='output_text' and (content->>'text')::jsonb=p_advice)
 then raise exception 'invalid_advisor_output';end if;
 if jsonb_array_length(p_advice->'formats')<>(case when (select business_type from public.controlled_proof where id=e.case_id)='coffee-shop' then 3 else 0 end)
 or (select count(distinct f->>'id') from jsonb_array_elements(p_advice->'formats') f)<>jsonb_array_length(p_advice->'formats')
 or exists(select 1 from jsonb_array_elements(p_advice->'formats') f where coalesce(f->>'id','') not in('takeaway','specialty','seated'))
 then raise exception 'invalid_advisor_formats';end if;
 foreach k in array keys loop
  item:=p_advice->k;
  if jsonb_typeof(item->'text') is distinct from 'string' or length(item->>'text') not between 1 and 350 or item->>'text' ~ '[<>]'
   or jsonb_typeof(item->'sectionIds') is distinct from 'array' or jsonb_array_length(item->'sectionIds') not between 1 and 4
   or exists(select 1 from jsonb_array_elements_text(item->'sectionIds') v where v not in('customer-base','market-position','customer-access','premises'))
  then raise exception 'invalid_advisor_statement';end if;
 end loop;
 for item in select f->'assessment' from jsonb_array_elements(p_advice->'formats') f loop
  if jsonb_typeof(item->'text') is distinct from 'string' or length(item->>'text') not between 1 and 350 or item->>'text' ~ '[<>]'
   or jsonb_typeof(item->'sectionIds') is distinct from 'array' or jsonb_array_length(item->'sectionIds') not between 1 and 4
   or exists(select 1 from jsonb_array_elements_text(item->'sectionIds') v where v not in('customer-base','market-position','customer-access','premises'))
  then raise exception 'invalid_advisor_statement';end if;
 end loop;
 update public.snapshot_advisor_editions set state='ready',advice=p_advice where id=e.id;
end$$;

create function public.read_sitefit_snapshot_advisor(p_report uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare original jsonb;begin
 original:=public.read_sitefit_free(p_report);
 if original is null then return null;end if;
 return (select jsonb_build_object('advice',advice,'research',research) from public.snapshot_advisor_editions where report_id=p_report and state='ready' and
  report_digest=(select encode(sha256(convert_to(free_projection::text,'UTF8')),'hex') from public.reports where id=p_report));
end$$;
revoke all on function public.read_sitefit_snapshot_advisor(uuid) from public,anon;
grant execute on function public.read_sitefit_snapshot_advisor(uuid) to authenticated;
do $$declare f record;begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('reserve_sitefit_snapshot_advisor','settle_sitefit_snapshot_advisor','freeze_sitefit_snapshot_advisor') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end$$;
