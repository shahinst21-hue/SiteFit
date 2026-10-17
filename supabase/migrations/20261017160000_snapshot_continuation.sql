-- Explicit operator-issued free-only continuation. No row, approval or activation seeded.
create table public.snapshot_continuations(
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.controlled_proof(id),
 analysis_id uuid not null references public.analyses(id),input_id uuid not null references public.analysis_inputs(id),
 frozen_snapshots uuid[] not null check(cardinality(frozen_snapshots)=15),snapshot_digest text not null check(snapshot_digest ~ '^[a-f0-9]{64}$'),
 enabled boolean not null default false,expires_at timestamptz not null,
 state text not null default 'issued' check(state in('issued','running','intervention','ready')),token uuid,
 report_id uuid references public.reports(id),created_at timestamptz not null default now()
);
create unique index snapshot_continuation_active on public.snapshot_continuations(case_id) where enabled;
create table public.snapshot_continuation_dispatches(
 id uuid primary key default gen_random_uuid(),continuation_id uuid not null references public.snapshot_continuations(id),
 case_id uuid not null references public.controlled_proof(id),request_key text not null check(request_key ~ '^[a-f0-9]{64}$'),
 kind text not null check(kind in('ai','api.ratings.food.gov.uk')),ai_slot text check(ai_slot in('customer-base','market-position','customer-access','premises','synthesis')),
 reserved_micros bigint not null check(reserved_micros>=0),
 state text not null default 'intent' check(state in('intent','received','ambiguous')),response_digest text,
 ai_checkpoint text check(ai_checkpoint is null or kind='ai' and octet_length(ai_checkpoint)<=128000),
 created_at timestamptz not null default now(),unique(case_id,request_key),unique(case_id,ai_slot),check((kind='ai')=(ai_slot is not null))
);
alter table public.snapshot_continuations enable row level security;
alter table public.snapshot_continuation_dispatches enable row level security;
revoke all on public.snapshot_continuations,public.snapshot_continuation_dispatches from public,anon,authenticated,service_role;

create function public.sitefit_continuation_digest(p_ids uuid[]) returns text language sql stable set search_path='' as $$
 select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(s) order by id)::text,''),'UTF8')),'hex') from public.data_snapshots s where id=any(p_ids)
$$;
revoke all on function public.sitefit_continuation_digest(uuid[]) from public,anon,authenticated,service_role;

create function public.guard_sitefit_continuation() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.controlled_proof;begin
 if tg_op in('DELETE','TRUNCATE') then raise exception 'continuation_history_immutable';end if;
 if tg_op='INSERT' then
 select * into strict c from public.controlled_proof where id=new.case_id for update;
 if not c.singleton or c.enabled or c.state<>'intervention' or c.reserved_micros<>0 or new.enabled or new.state<>'issued' or new.token is not null or new.report_id is not null
 or exists(select 1 from public.proof_dispatches where case_id=c.id and kind='ai')
 or exists(select 1 from public.proof_dispatches where case_id=c.id and state<>'received')
 or exists(select 1 from public.snapshot_continuation_dispatches where case_id=c.id and state<>'received')
 or not exists(select 1 from public.analyses a join public.analysis_inputs i on i.analysis_id=a.id
 where a.id=new.analysis_id and i.id=new.input_id and a.owner_id=c.owner_id and a.property_id=c.property_id and a.business_type=c.business_type and a.submission_nonce=c.nonce)
 or (select count(*) from public.data_snapshots s where s.id=any(new.frozen_snapshots) and s.analysis_id=new.analysis_id and s.input_id=new.input_id and s.collection_key='free-enriched-v1' and s.source not in('fsa-establishments','govuk-non-domestic-epc'))<>15
 or exists(select 1 from public.reports where analysis_id=new.analysis_id and tier='free' and status='ready')
 or new.snapshot_digest<>public.sitefit_continuation_digest(new.frozen_snapshots)
 then raise exception 'continuation_binding_denied';end if;
 else
 if (to_jsonb(new)-array['enabled','state','token','report_id']) is distinct from (to_jsonb(old)-array['enabled','state','token','report_id'])
 or old.state<>'issued' and new.enabled and not old.enabled or old.token is not null and new.token is distinct from old.token
 or old.report_id is not null and new.report_id is distinct from old.report_id
 or old.state<>new.state and not (old.state='issued' and new.state='running' or old.state='running' and new.state in('intervention','ready'))
 then raise exception 'continuation_history_immutable';end if;
 end if;return new;
end$$;
create trigger continuation_identity before insert or update or delete on public.snapshot_continuations for each row execute function public.guard_sitefit_continuation();
create trigger continuation_no_truncate before truncate on public.snapshot_continuations for each statement execute function public.guard_sitefit_continuation();
revoke all on function public.guard_sitefit_continuation() from public,anon,authenticated,service_role;

create function public.guard_sitefit_continuation_dispatch() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op<>'UPDATE' then raise exception 'continuation_dispatch_frozen';end if;
 if old.state<>'intent' or new.state not in('received','ambiguous')
 or (to_jsonb(new)-array['state','response_digest','ai_checkpoint']) is distinct from (to_jsonb(old)-array['state','response_digest','ai_checkpoint'])
 then raise exception 'continuation_dispatch_frozen';end if;return new;
end$$;
create trigger continuation_dispatch_frozen before update or delete on public.snapshot_continuation_dispatches for each row execute function public.guard_sitefit_continuation_dispatch();
create trigger continuation_dispatch_no_truncate before truncate on public.snapshot_continuation_dispatches for each statement execute function public.guard_sitefit_continuation_dispatch();
revoke all on function public.guard_sitefit_continuation_dispatch() from public,anon,authenticated,service_role;

-- All caller paths lock parent before continuation, including concurrent admission.
create function public.sitefit_continuation_authority(p_id uuid,p_token uuid) returns public.snapshot_continuations
language plpgsql security definer set search_path='' as $$declare r public.snapshot_continuations;c public.controlled_proof;begin
 select * into strict c from public.controlled_proof where id=(select case_id from public.snapshot_continuations where id=p_id) for update;
 select * into strict r from public.snapshot_continuations where id=p_id for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if not c.singleton or c.enabled or c.state<>'intervention' or not r.enabled or r.state<>'running' or r.expires_at<=now() or r.token is distinct from p_token or p_token is null
 or not c.tariff_verified or c.input_rate<2.5 or c.output_rate<10
 or r.snapshot_digest<>public.sitefit_continuation_digest(r.frozen_snapshots)
 then raise exception 'continuation_authority_denied' using errcode='42501';end if;return r;
end$$;
revoke all on function public.sitefit_continuation_authority(uuid,uuid) from public,anon,authenticated,service_role;

create function public.claim_sitefit_snapshot_continuation(p_owner uuid,p_case uuid,p_property uuid,p_nonce uuid,p_business text) returns jsonb
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof;r public.snapshot_continuations;begin
 select * into c from public.controlled_proof where id=p_case for update;
 if not found or not exists(select 1 from public.snapshot_continuations where case_id=p_case) then return null;end if;
 perform public.assert_sitefit_processing_allowed(p_owner);
 if not c.singleton or c.enabled or c.state<>'intervention' or row(c.owner_id,c.property_id,c.nonce,c.business_type) is distinct from row(p_owner,p_property,p_nonce,p_business)
 or not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null and not is_anonymous)
 or not c.tariff_verified or not exists(select 1 from public.sale_policies where version=c.policy_version and snapshot=c.policy_snapshot)
 then raise exception 'continuation_owner_denied' using errcode='42501';end if;
 select * into strict r from public.snapshot_continuations where case_id=p_case and enabled for update;
 if r.expires_at<=now() or r.snapshot_digest<>public.sitefit_continuation_digest(r.frozen_snapshots) then raise exception 'continuation_binding_denied';end if;
 if r.state='ready' and r.report_id is not null then return jsonb_build_object('id',c.id,'recoveryId',r.id,'token',r.token,'inputRate',c.input_rate,'outputRate',c.output_rate,'reportId',r.report_id);end if;
 if r.state<>'issued' or exists(select 1 from public.snapshot_continuation_dispatches where case_id=c.id and state<>'received') then raise exception 'continuation_reconciliation_required';end if;
 update public.snapshot_continuations set state='running',token=gen_random_uuid() where id=r.id returning * into r;
 return jsonb_build_object('id',c.id,'recoveryId',r.id,'token',r.token,'inputRate',c.input_rate,'outputRate',c.output_rate,'analysisId',r.analysis_id,'inputId',r.input_id);
end$$;

create function public.reserve_sitefit_continuation_dispatch(p_id uuid,p_token uuid,p_key text,p_kind text,p_micros bigint,p_slot text default null) returns uuid
language plpgsql security definer set search_path='' as $$declare r public.snapshot_continuations;c public.controlled_proof;d uuid;begin
 r:=public.sitefit_continuation_authority(p_id,p_token);
 select * into strict c from public.controlled_proof where id=r.case_id;
 if exists(select 1 from public.snapshot_continuation_dispatches where case_id=c.id and state='ambiguous') then raise exception 'continuation_ambiguous';end if;
 if p_kind='ai' then
 if p_micros is null or p_micros<=0 or c.reserved_micros+(select coalesce(sum(reserved_micros),0) from public.snapshot_continuation_dispatches where case_id=c.id)+p_micros>650000
 or (select count(*) from public.proof_dispatches where case_id=c.id and kind='ai')+(select count(*) from public.snapshot_continuation_dispatches where case_id=c.id and kind='ai')>=5
 then raise exception 'continuation_budget_exhausted';end if;
 if not exists(select 1 from public.data_snapshots where analysis_id=r.analysis_id and input_id=r.input_id and source='fsa-establishments') then raise exception 'continuation_sources_incomplete';end if;
 elsif p_kind='api.ratings.food.gov.uk' then
 if p_micros is distinct from 0 or (select count(*) from public.snapshot_continuation_dispatches where case_id=c.id and kind=p_kind)>=2
 or exists(select 1 from public.data_snapshots where analysis_id=r.analysis_id and input_id=r.input_id and source='fsa-establishments') then raise exception 'continuation_source_denied';end if;
 else raise exception 'continuation_source_denied';end if;
 if pg_database_size(current_database())+262144>450000000 then raise exception 'continuation_capacity';end if;
 insert into public.snapshot_continuation_dispatches(continuation_id,case_id,request_key,kind,reserved_micros,ai_slot) values(r.id,c.id,p_key,p_kind,p_micros,p_slot) returning id into d;return d;
end$$;

create function public.settle_sitefit_continuation_dispatch(p_id uuid,p_token uuid,p_dispatch uuid,p_state text,p_digest text,p_checkpoint text) returns void
language plpgsql security definer set search_path='' as $$declare r public.snapshot_continuations;d public.snapshot_continuation_dispatches;begin
 r:=public.sitefit_continuation_authority(p_id,p_token);
 select * into strict d from public.snapshot_continuation_dispatches where id=p_dispatch and continuation_id=r.id for update;
 if d.state=p_state and d.response_digest is not distinct from p_digest and d.ai_checkpoint is not distinct from p_checkpoint then return;end if;
 if d.state<>'intent' or p_state is null or p_state not in('received','ambiguous') or p_state='received' and (p_digest is null or p_digest !~ '^[a-f0-9]{64}$')
 or p_checkpoint is not null and (d.kind<>'ai' or p_state<>'received' or jsonb_typeof(p_checkpoint::jsonb)<>'object')
 then raise exception 'continuation_settlement_denied';end if;
 update public.snapshot_continuation_dispatches set state=p_state,response_digest=p_digest,ai_checkpoint=p_checkpoint where id=d.id;
 if p_state='ambiguous' then update public.snapshot_continuations set state='intervention',enabled=false where id=r.id;end if;
end$$;

create function public.read_sitefit_continuation_response(p_id uuid,p_token uuid,p_key text) returns text
language plpgsql security definer set search_path='' as $$declare r public.snapshot_continuations;d public.snapshot_continuation_dispatches;begin
 r:=public.sitefit_continuation_authority(p_id,p_token);
 select * into d from public.snapshot_continuation_dispatches where case_id=r.case_id and request_key=p_key;
 if not found then return null;end if;
 if d.kind<>'ai' or d.state<>'received' or d.ai_checkpoint is null then raise exception 'continuation_no_resend';end if;
 return d.ai_checkpoint;
end$$;

create function public.interrupt_sitefit_snapshot_continuation(p_id uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.snapshot_continuations set state='intervention',enabled=false where id=p_id and token=p_token and state='running';
end$$;
create function public.finish_sitefit_snapshot_continuation(p_id uuid,p_token uuid,p_report uuid) returns void
language plpgsql security definer set search_path='' as $$declare r public.snapshot_continuations;begin
 r:=public.sitefit_continuation_authority(p_id,p_token);
 if not exists(select 1 from public.reports where id=p_report and analysis_id=r.analysis_id and input_id=r.input_id and tier='free' and status='ready')
 or exists(select 1 from public.snapshot_continuation_dispatches where case_id=r.case_id and state<>'received') then raise exception 'continuation_ready_denied';end if;
 update public.snapshot_continuations set state='ready',report_id=p_report where id=r.id;
end$$;

alter function public.read_sitefit_snapshot_proof(uuid,uuid) rename to read_sitefit_snapshot_proof_before_continuation;
revoke all on function public.read_sitefit_snapshot_proof_before_continuation(uuid,uuid) from public,anon,authenticated,service_role;
create function public.read_sitefit_snapshot_proof(p_owner uuid,p_case uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare c public.controlled_proof;p public.properties;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 if not exists(select 1 from public.snapshot_continuations where case_id=p_case) then return public.read_sitefit_snapshot_proof_before_continuation(p_owner,p_case);end if;
 select * into strict c from public.controlled_proof where id=p_case and owner_id=p_owner and singleton and not enabled and state='intervention';
 if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null and not is_anonymous)
 or not exists(select 1 from public.snapshot_continuations where case_id=p_case and enabled and expires_at>now() and state in('issued','running','ready')) then raise exception 'continuation_owner_denied' using errcode='42501';end if;
 select * into strict p from public.properties where id=c.property_id and address_resolution_state='provider_verified';
 return jsonb_build_object('business',c.business_type,'nonce',c.nonce,'property',jsonb_build_object('id',p.id,'formattedAddress',p.formatted_address,'lines',p.address_components->'lines','postcode',p.postcode,'postTown',p.post_town,'country',p.country,'components',p.address_components-'lines','provider',p.address_provider,'providerAddressId',p.provider_address_id,'udprn',p.udprn,'uprn',null,'latitude',p.latitude,'longitude',p.longitude,'coordinatePrecision',p.coordinate_precision,'coordinateSource',p.coordinate_source,'resolution',p.address_resolution_state,'resolvedAt',p.resolved_at));
end$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('claim_sitefit_snapshot_continuation','reserve_sitefit_continuation_dispatch','settle_sitefit_continuation_dispatch','read_sitefit_continuation_response','interrupt_sitefit_snapshot_continuation','finish_sitefit_snapshot_continuation','read_sitefit_snapshot_proof') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end$$;
