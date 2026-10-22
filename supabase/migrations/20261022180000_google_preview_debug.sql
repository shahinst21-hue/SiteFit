begin;
-- Empty in every database by default. Only an operator may authorise a bounded existing-property sandbox proof.
-- No historical dispatch, payment, report, entitlement or budget is changed.
create table public.google_preview_debug_authorisations(
 id text primary key check(id ~ '^[a-z0-9-]{1,100}$'),
 destination text not null check(destination='G-ZRCDT4R80E'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null check(expires_at>created_at and expires_at<=created_at+interval '24 hours')
);
alter table public.google_preview_debug_authorisations enable row level security;
revoke all on public.google_preview_debug_authorisations from public,anon,authenticated,service_role;
create trigger google_preview_debug_history before update or delete on public.google_preview_debug_authorisations for each row execute function public.sitefit_google_dispatch_immutable();
create trigger google_preview_debug_no_truncate before truncate on public.google_preview_debug_authorisations for each statement execute function public.sitefit_google_dispatch_immutable();
create or replace function public.claim_sitefit_google_event(p_owner uuid,p_payment uuid,p_destination text,p_event text,p_provider_key text,p_total integer,p_tax integer,p_shipping integer,p_consent_at timestamptz,p_not_before timestamptz,p_test boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.payments;payload jsonb;dispatch uuid;value numeric;category text;
begin
 if p_provider_key is null or p_destination is null or p_destination !~ '^G-[A-Z0-9]+$' or p_event not in('begin_checkout','purchase','refund') or p_event is null or p_total is null or p_tax is null or p_shipping is null or least(p_total,p_tax,p_shipping)<0 or p_tax+p_shipping>p_total or p_test is null or p_consent_at is null or p_not_before is null or p_consent_at>now()+interval '1 minute' or p_consent_at<now()-interval '180 days' then return null;end if;
 -- Same row lock serialises concurrent browsers and attempts; the unique provider key is the final duplicate fence.
 select * into p from public.payments where id=p_payment for update;
 if not found or p_test and (p.payment_version is distinct from 1 or p_destination='G-ZRCDT4R80E' and not exists(select 1 from public.google_preview_debug_authorisations a where a.destination=p_destination and a.created_at<=p.created_at and a.expires_at>now())) or not p_test and (p.payment_version is distinct from 2 or p_destination<>'G-ZRCDT4R80E') or p.owner_id is distinct from p_owner or p.created_at<p_not_before or p.test_mode is distinct from p_test or p.currency<>'GBP' then return null;end if;
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

commit;

