-- Phase 7: current access principal is separate from immutable historical ownership.
begin;
create table public.guest_account_claims (
 id uuid primary key,
 guest_id uuid not null unique references public.profiles(id) on delete restrict,
 analysis_id uuid not null references public.analyses(id) on delete restrict,
 report_id uuid not null,
 capability_sha256 text not null check(capability_sha256 ~ '^[0-9a-f]{64}$'),
 browser_sha256 text not null check(browser_sha256 ~ '^[0-9a-f]{64}$'),
 method text check(method in ('google','email')),
 email_sha256 text check(email_sha256 ~ '^[0-9a-f]{64}$'),
 target_id uuid references public.profiles(id) on delete restrict,
 auth_target_id uuid references public.profiles(id) on delete restrict,
 auth_verified_at timestamptz,
 state text not null default 'pending' check(state in ('pending','completed','cancelled')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '1 hour',
 completed_at timestamptz,
 foreign key(analysis_id,report_id) references public.reports(analysis_id,id) on delete restrict,
 check(expires_at>created_at and expires_at<=created_at+interval '1 hour'),
 check((state='completed')=(target_id is not null and completed_at is not null)),
 check((auth_target_id is null)=(auth_verified_at is null)),
 check(method='email' or email_sha256 is null)
);
alter table public.guest_account_claims enable row level security;
revoke all on public.guest_account_claims from public,anon,authenticated;
grant select,insert,update on public.guest_account_claims to service_role;
create index guest_claims_target on public.guest_account_claims(target_id) where state='completed';

create function public.sitefit_permanent_account(p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=p_owner and u.is_anonymous=false
   and u.email_confirmed_at is not null and u.email is not null)
$$;
create function public.sitefit_access_owner(p_original uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select coalesce((select c.target_id from public.guest_account_claims c where c.guest_id=p_original and c.state='completed'),p_original)
$$;
create function public.sitefit_owner_is(p_original uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.sitefit_access_owner(p_original)=(select auth.uid())
$$;
create function public.sitefit_session_available() returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and public.sitefit_access_owner((select auth.uid()))=(select auth.uid())
$$;

create function public.sitefit_guard_claim() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' and (new.state<>'pending' or new.target_id is not null or new.auth_target_id is not null
   or not exists(select 1 from auth.users where id=new.guest_id and is_anonymous=true)) then
   raise exception using errcode='23514',message='claim_original_guest_required';
 end if;
 if tg_op='DELETE' or (tg_op='UPDATE' and old.state='completed') then
   raise exception using errcode='23514',message='claim_immutable';
 end if;
 if tg_op='UPDATE' and (new.guest_id is distinct from old.guest_id or new.id is distinct from old.id) then
   raise exception using errcode='23514',message='claim_identity_immutable';
 end if;
 return new;
end $$;
create trigger claim_integrity before insert or update or delete on public.guest_account_claims
for each row execute function public.sitefit_guard_claim();

create function public.prepare_sitefit_claim(p_guest uuid,p_report uuid,p_id uuid,p_capability text,p_browser text)
returns public.guest_account_claims language plpgsql security definer set search_path='' as $$
declare c public.guest_account_claims; aid uuid;
begin
 perform 1 from auth.users where id=p_guest and is_anonymous=true for update;
 if not found or public.sitefit_access_owner(p_guest)<>p_guest then
   raise exception using errcode='42501',message='guest_required'; end if;
 select a.id into aid from public.reports r join public.analyses a on a.id=r.analysis_id
 where r.id=p_report and a.owner_id=p_guest and a.status='free_ready' and r.tier='free' and r.status='ready' and r.schema_version=2;
 if aid is null or exists(select 1 from public.payments p join public.analyses a on a.id=p.analysis_id where a.owner_id=p_guest) then
   raise exception using errcode='42501',message='claim_ineligible'; end if;
 select * into c from public.guest_account_claims where guest_id=p_guest for update;
 if c.id is not null and c.state='pending' and c.expires_at>now() then
   if c.report_id<>p_report or c.capability_sha256<>p_capability or c.browser_sha256<>p_browser then
     raise exception using errcode='23514',message='claim_busy'; end if;
   return c;
 end if;
 if c.state='completed' then raise exception using errcode='42501',message='claim_completed'; end if;
 if c.id is null then
   insert into public.guest_account_claims(id,guest_id,analysis_id,report_id,capability_sha256,browser_sha256)
   values(p_id,p_guest,aid,p_report,p_capability,p_browser) returning * into c;
 else
   update public.guest_account_claims set analysis_id=aid,report_id=p_report,capability_sha256=p_capability,browser_sha256=p_browser,
    method=null,email_sha256=null,auth_target_id=null,auth_verified_at=null,state='pending',created_at=now(),expires_at=now()+interval '1 hour'
    where id=c.id returning * into c;
 end if;
 insert into public.system_events(analysis_id,event_type,outcome,safe_metadata)
 values(aid,'purchase_auth_started','pending','{"version":1,"test":true}');
 return c;
end $$;

create function public.start_sitefit_claim_auth(p_id uuid,p_guest uuid,p_capability text,p_browser text,p_method text,p_email_hash text)
returns public.guest_account_claims language plpgsql security definer set search_path='' as $$
declare c public.guest_account_claims;
begin
 select * into c from public.guest_account_claims where id=p_id for update;
 if c.id is null or c.guest_id<>p_guest or c.state<>'pending' or c.expires_at<=now()
   or c.capability_sha256<>p_capability or c.browser_sha256<>p_browser
   or not exists(select 1 from auth.users where id=p_guest and is_anonymous=true) then
   raise exception using errcode='42501',message='claim_proof_required'; end if;
 if p_method not in ('email','google') or (p_method='email' and p_email_hash is null) then
   raise exception using errcode='23514',message='claim_method_invalid'; end if;
 if c.method is not null and (c.method<>p_method or c.email_sha256 is distinct from p_email_hash) then
   raise exception using errcode='23514',message='claim_busy'; end if;
 update public.guest_account_claims set method=p_method,email_sha256=p_email_hash where id=c.id returning * into c;
 return c;
end $$;

-- Only the server's successful matching Supabase callback/OTP handler records this receipt.
create function public.verify_sitefit_claim_auth(p_id uuid,p_target uuid,p_capability text,p_browser text,p_method text)
returns void language plpgsql security definer set search_path='' as $$
declare c public.guest_account_claims; email text; signed_at timestamptz;
begin
 select * into c from public.guest_account_claims where id=p_id for update;
 if c.id is null or c.expires_at<=now() or c.capability_sha256<>p_capability or c.browser_sha256<>p_browser
   or c.method is distinct from p_method or not public.sitefit_permanent_account(p_target) then
   raise exception using errcode='42501',message='claim_auth_invalid'; end if;
 if c.state='completed' then
   if c.target_id=p_target then return; end if;
   raise exception using errcode='42501',message='claim_target_conflict'; end if;
 if c.state<>'pending' or (c.auth_target_id is not null and c.auth_target_id<>p_target) then
   raise exception using errcode='42501',message='claim_target_conflict'; end if;
 select u.email,u.last_sign_in_at into email,signed_at from auth.users u where id=p_target;
 if p_target<>c.guest_id and (signed_at is null or signed_at<c.created_at) then
   raise exception using errcode='42501',message='fresh_auth_required'; end if;
 if c.method='email' and c.email_sha256 is distinct from encode(sha256(convert_to(lower(email),'UTF8')),'hex') then
   raise exception using errcode='42501',message='claim_email_conflict'; end if;
 update public.guest_account_claims set auth_target_id=p_target,auth_verified_at=now() where id=c.id;
end $$;

create function public.complete_sitefit_claim(p_id uuid,p_target uuid,p_capability text,p_browser text)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.guest_account_claims;
begin
 select * into c from public.guest_account_claims where id=p_id;
 perform 1 from auth.users where id=c.guest_id for update;
 select * into c from public.guest_account_claims where id=p_id for update;
 if c.id is null or c.capability_sha256<>p_capability or c.browser_sha256<>p_browser
   or not public.sitefit_permanent_account(p_target) then raise exception using errcode='42501',message='claim_proof_required'; end if;
 if c.state='completed' then
   if c.target_id=p_target then return c.report_id; end if;
   raise exception using errcode='42501',message='claim_target_conflict'; end if;
 if c.state<>'pending' or c.expires_at<=now() or c.auth_target_id is distinct from p_target or c.auth_verified_at is null then
   raise exception using errcode='42501',message='claim_auth_required'; end if;
 if p_target<>c.guest_id and not exists(select 1 from auth.users where id=c.guest_id and is_anonymous=true) then
   raise exception using errcode='42501',message='guest_required'; end if;
 if public.sitefit_access_owner(p_target)<>p_target or not exists(select 1 from public.analyses a
   join public.reports r on r.analysis_id=a.id where a.id=c.analysis_id and a.owner_id=c.guest_id and r.id=c.report_id and r.tier='free' and r.status='ready') then
   raise exception using errcode='42501',message='claim_binding_invalid'; end if;
 update public.guest_account_claims set state='completed',target_id=p_target,completed_at=now() where id=c.id;
 insert into public.system_events(analysis_id,event_type,outcome,safe_metadata)
 values(c.analysis_id,'purchase_account_linked','completed','{"version":1,"test":true}');
 return c.report_id;
end $$;

create function public.sitefit_guard_active_analysis_owner() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from auth.users where id=new.owner_id for update;
 if public.sitefit_access_owner(new.owner_id)<>new.owner_id then
  raise exception using errcode='42501',message='consumed_guest'; end if;
 return new;
end $$;
create trigger active_analysis_owner before insert on public.analyses
for each row execute function public.sitefit_guard_active_analysis_owner();

create or replace function public.read_sitefit_free(p_report uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select r.free_projection from public.reports r join public.analyses a on a.id=r.analysis_id
 where r.id=p_report and public.sitefit_owner_is(a.owner_id) and r.tier='free' and r.status='ready' and r.schema_version=2
$$;
create function public.list_sitefit_history(p_offset integer default 0) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'analysisId',q.analysis_id,'address',q.free_projection->'property'->>'address',
  'businessType',q.free_projection->>'businessType','generatedAt',q.free_projection->>'generatedAt') order by q.created_at desc,q.id),'[]'::jsonb)
 from (select r.id,r.analysis_id,r.free_projection,r.created_at from public.reports r join public.analyses a on a.id=r.analysis_id
  where public.sitefit_owner_is(a.owner_id) and r.tier='free' and r.status='ready' and r.schema_version=2
  order by r.created_at desc,r.id limit 20 offset greatest(0,least(coalesce(p_offset,0),10000))) q
$$;
create or replace function public.list_sitefit_free() returns jsonb
language sql stable security definer set search_path='' as $$ select public.list_sitefit_history(0) $$;
drop policy analyses_owner_read on public.analyses;
create policy analyses_owner_read on public.analyses for select to authenticated using(public.sitefit_owner_is(owner_id));
create policy active_identity_only on public.analyses as restrictive for all to authenticated
 using(public.sitefit_session_available()) with check(public.sitefit_session_available());
drop policy properties_linked_owner_read on public.properties;
create policy properties_linked_owner_read on public.properties for select to authenticated using(
 exists(select 1 from public.analyses a where a.property_id=properties.id and public.sitefit_owner_is(a.owner_id)));
do $$ declare t text; begin
 foreach t in array array['analysis_inputs','data_snapshots','evidence_items','competitors','premises_events','economic_models','reports','report_sections','payments','pdf_exports'] loop
  execute format('drop policy analysis_owner_read on public.%I',t);
  execute format('create policy analysis_owner_read on public.%I for select to authenticated using(exists(select 1 from public.analyses a where a.id=%I.analysis_id and public.sitefit_owner_is(a.owner_id)))',t,t);
 end loop;
end $$;

revoke all on function public.sitefit_permanent_account(uuid),public.sitefit_access_owner(uuid),public.sitefit_owner_is(uuid),public.sitefit_session_available(),
 public.sitefit_guard_claim(),public.sitefit_guard_active_analysis_owner(),public.prepare_sitefit_claim(uuid,uuid,uuid,text,text),public.start_sitefit_claim_auth(uuid,uuid,text,text,text,text),
 public.verify_sitefit_claim_auth(uuid,uuid,text,text,text),public.complete_sitefit_claim(uuid,uuid,text,text),public.list_sitefit_history(integer) from public,anon,authenticated;
grant execute on function public.sitefit_permanent_account(uuid),public.sitefit_access_owner(uuid),public.prepare_sitefit_claim(uuid,uuid,uuid,text,text),
 public.start_sitefit_claim_auth(uuid,uuid,text,text,text,text),public.verify_sitefit_claim_auth(uuid,uuid,text,text,text),public.complete_sitefit_claim(uuid,uuid,text,text) to service_role;
grant execute on function public.sitefit_owner_is(uuid),public.sitefit_session_available(),public.list_sitefit_history(integer) to authenticated;
commit;
