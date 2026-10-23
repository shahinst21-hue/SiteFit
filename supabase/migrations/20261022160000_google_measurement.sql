begin;
-- Additive observation only. No payment/report/reservation/release changes, and no Google calls from SQL.
create table public.google_measurement_attribution(
 report_id uuid primary key references public.reports(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 campaign jsonb not null check(jsonb_typeof(campaign)='object' and pg_column_size(campaign)<2048),
 consent_version text not null check(consent_version='sitefit-measurement-v1'),
 consent_at timestamptz not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '90 days'
);
create table public.google_measurement_dispatches(
 id uuid primary key default gen_random_uuid(),payment_id uuid not null references public.payments(id) on delete restrict,
 destination text not null check(destination ~ '^G-[A-Z0-9]+$'),event text not null check(event in('begin_checkout','purchase','refund')),
 provider_key text not null,consent_version text not null check(consent_version='sitefit-measurement-v1'),consent_at timestamptz not null,
 payload jsonb not null,claimed_at timestamptz not null default now(),
 unique(destination,event,provider_key)
);
alter table public.google_measurement_attribution enable row level security;
alter table public.google_measurement_dispatches enable row level security;
revoke all on public.google_measurement_attribution,public.google_measurement_dispatches from public,anon,authenticated,service_role;
create function public.sitefit_google_dispatch_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'measurement_dispatch_history_immutable' using errcode='55000';end$$;
create trigger google_dispatch_history before update or delete on public.google_measurement_dispatches for each row execute function public.sitefit_google_dispatch_immutable();
create function public.record_sitefit_google_attribution(p_owner uuid,p_report uuid,p_values jsonb,p_consent_at timestamptz,p_not_before timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.reports;a public.analyses;k text;v text;
begin
 if p_values is null or jsonb_typeof(p_values)<>'object' or pg_column_size(p_values)>2048 or p_consent_at is null or p_not_before is null or p_consent_at>now()+interval '1 minute' or p_consent_at<now()-interval '180 days' then return false;end if;
 for k,v in select key,value from jsonb_each_text(p_values) loop
  if k not in('utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','gbraid','wbraid') or v is null or length(v)>256 or v !~ '^[A-Za-z0-9_-]+$' then return false;end if;
 end loop;
 select * into r from public.reports where id=p_report and tier='free' and status='ready';if not found or r.created_at<p_not_before or r.created_at<now()-interval '15 minutes' then return false;end if;
 select * into a from public.analyses where id=r.analysis_id for update;
 if public.sitefit_access_owner(a.owner_id) is distinct from p_owner then return false;end if;
 delete from public.google_measurement_attribution where expires_at<now();
 if pg_database_size(current_database())+65536>450000000 then return false;end if;
 insert into public.google_measurement_attribution(report_id,owner_id,campaign,consent_version,consent_at) values(p_report,p_owner,p_values,'sitefit-measurement-v1',p_consent_at) on conflict(report_id) do nothing;
 return true;
end$$;
create function public.claim_sitefit_google_event(p_owner uuid,p_payment uuid,p_destination text,p_event text,p_provider_key text,p_total integer,p_tax integer,p_shipping integer,p_consent_at timestamptz,p_not_before timestamptz,p_test boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.payments;payload jsonb;dispatch uuid;value numeric;category text;
begin
 if p_provider_key is null or p_destination is null or p_destination !~ '^G-[A-Z0-9]+$' or p_event not in('begin_checkout','purchase','refund') or p_event is null or p_total is null or p_tax is null or p_shipping is null or least(p_total,p_tax,p_shipping)<0 or p_tax+p_shipping>p_total or p_test is null or p_consent_at is null or p_not_before is null or p_consent_at>now()+interval '1 minute' or p_consent_at<now()-interval '180 days' then return null;end if;
 -- Same row lock serialises concurrent browsers and attempts; the unique provider key is the final duplicate fence.
 select * into p from public.payments where id=p_payment for update;
 if not found or p_test and (p.payment_version is distinct from 1 or p_destination='G-ZRCDT4R80E') or not p_test and (p.payment_version is distinct from 2 or p_destination<>'G-ZRCDT4R80E') or p.owner_id is distinct from p_owner or p.created_at<p_not_before or p.test_mode is distinct from p_test or p.currency<>'GBP' then return null;end if;
 if not p_test and exists(select 1 from public.controlled_proof where payment_id=p.id or free_report_id=p.report_id) then return null;end if;
 if p_event='begin_checkout' then
  if p.checkout_reference is null or p.expires_at<=now() or p_provider_key is distinct from p.checkout_reference or p_total<>p.amount_minor or p.status<>'pending' or p.verified_at is not null then return null;end if;
 else
  if p.verified_at is null or p.status not in('succeeded','refunded') or p.payment_reference is null then return null;end if;
  if p_event='purchase' and (p_provider_key is distinct from p.payment_reference or p_total<>p.amount_minor) then return null;end if;
  if p_event='refund' and (p_provider_key !~ '^re_[A-Za-z0-9]+$' or p_total>p.amount_minor) then return null;end if;
 end if;
 value=(p_total-p_tax-p_shipping)::numeric/100;
 payload=jsonb_build_object('currency','GBP','value',value,'tax',p_tax::numeric/100,'shipping',p_shipping::numeric/100,'items',jsonb_build_array(jsonb_build_object('item_id','sitefit-full-report','item_name','SiteFit Full Report','price',value,'quantity',1)));
 select business_type into category from public.analyses where id=p.analysis_id;
 if category in('coffee-shop','restaurant','hair-salon','beauty-salon') then payload=payload||jsonb_build_object('business_type',category);end if;
 if p_event<>'begin_checkout' then payload=payload||jsonb_build_object('transaction_id','sf_'||p.id::text);end if;
 if pg_database_size(current_database())+65536>450000000 then return null;end if;
 insert into public.google_measurement_dispatches(payment_id,destination,event,provider_key,consent_version,consent_at,payload) values(p.id,p_destination,p_event,p_provider_key,'sitefit-measurement-v1',p_consent_at,payload) on conflict(destination,event,provider_key) do nothing returning id into dispatch;
 if dispatch is null then return null;end if;
 return payload;
end$$;
revoke all on function public.sitefit_google_dispatch_immutable() from public,anon,authenticated,service_role;
revoke all on function public.record_sitefit_google_attribution(uuid,uuid,jsonb,timestamptz,timestamptz),public.claim_sitefit_google_event(uuid,uuid,text,text,text,integer,integer,integer,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.record_sitefit_google_attribution(uuid,uuid,jsonb,timestamptz,timestamptz),public.claim_sitefit_google_event(uuid,uuid,text,text,text,integer,integer,integer,timestamptz,timestamptz,boolean) to service_role;
-- Existing operator-only rights workflow can inspect/erase the new acquisition association,
-- while minimal immutable dispatch tombstones continue to prevent repeat financial conversions.
create function public.sitefit_google_rights_plan(p_owner uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('attribution',coalesce((select jsonb_agg(to_jsonb(g)) from public.google_measurement_attribution g where public.sitefit_access_owner(g.owner_id)=p_owner),'[]'::jsonb),'dispatches',coalesce((select jsonb_agg(to_jsonb(d)) from public.google_measurement_dispatches d join public.payments p on p.id=d.payment_id where p.owner_id=p_owner),'[]'::jsonb));
$$;
create function public.erase_sitefit_google_attribution(p_owner uuid,p_case uuid,p_expected text) returns integer language plpgsql security definer set search_path='' as $$
declare plan jsonb;n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,17));
 plan:=public.sitefit_google_rights_plan(p_owner);
 if p_case is null or p_expected is distinct from encode(sha256(convert_to(plan::text,'UTF8')),'hex') or not exists(select 1 from public.data_rights_holds where owner_id=p_owner and restricted) then raise exception 'rights_review_required' using errcode='42501';end if;
 delete from public.google_measurement_attribution where public.sitefit_access_owner(owner_id)=p_owner;get diagnostics n=row_count;
 insert into public.data_rights_audit(owner_id,case_reference,action,plan_digest,affected) values(p_owner,p_case,'delete_campaign',p_expected,n);return n;
end$$;
create function public.purge_expired_sitefit_google_attribution() returns integer language plpgsql security definer set search_path='' as $$declare n integer;begin delete from public.google_measurement_attribution where expires_at<now();get diagnostics n=row_count;return n;end$$;
revoke all on function public.sitefit_google_rights_plan(uuid),public.erase_sitefit_google_attribution(uuid,uuid,text),public.purge_expired_sitefit_google_attribution() from public,anon,authenticated,service_role;
commit;
