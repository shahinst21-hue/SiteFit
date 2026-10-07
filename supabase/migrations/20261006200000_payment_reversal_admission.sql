-- Forward integrity correction: SQL CHECK must reject null legacy versions,
-- and lost-dispute purchases cannot be repurchased under the approved policy.
alter table public.payments drop constraint payment_access_confirmation;
alter table public.payments add constraint payment_access_confirmation check (
 access_state='none' or (
  payment_version is not null and payment_version=1 and verified_at is not null
  and status in ('succeeded','refunded')
  and checkout_reference is not null and payment_reference is not null
 ));
create or replace function public.prepare_sitefit_payment(p_owner uuid,p_report uuid,p_id uuid,p_price text,p_parameters jsonb,p_expiry timestamptz)
returns public.payments language plpgsql security definer set search_path='' as $$
declare a public.analyses; r public.reports; p public.payments; account_email text;
begin
 if not public.sitefit_permanent_account(p_owner) then raise exception 'permanent_account_required' using errcode='42501'; end if;
 select * into r from public.reports where id=p_report and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'snapshot_unavailable' using errcode='42501'; end if;
 select * into a from public.analyses where id=r.analysis_id for update;
 if public.sitefit_access_owner(a.owner_id)<>p_owner or a.status<>'free_ready' then raise exception 'snapshot_unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.payments where analysis_id=a.id and payment_version=1 and (access_state in ('active','suspended') or reversal_state='lost_dispute')) then raise exception 'purchase_already_bound'; end if;
 select * into p from public.payments where analysis_id=a.id and payment_version=1 and status='pending';
 if found then
  if p.owner_id<>p_owner or p.report_id<>p_report then raise exception 'purchase_binding_conflict'; end if;
  return p;
 end if;
 select email into account_email from auth.users where id=p_owner;
 if p_expiry is null or p_parameters is null or p_expiry<now()+interval '30 minutes' or p_expiry>now()+interval '65 minutes'
  or jsonb_typeof(p_parameters) is distinct from 'object'
  or p_parameters->>'customer_email' is distinct from account_email
  or p_parameters->>'mode' is distinct from 'payment'
  or p_parameters->'metadata'->>'purchase_id' is distinct from p_id::text
  or p_parameters->'metadata'->>'analysis_id' is distinct from a.id::text
 then raise exception 'invalid_attempt_parameters'; end if;
 insert into public.payments(id,analysis_id,owner_id,report_id,provider,idempotency_key,price_reference,amount_minor,currency,product_type,payment_version,test_mode,attempt_parameters,expires_at)
 values(p_id,a.id,p_owner,p_report,'stripe','sitefit:test:v1:'||p_id::text,p_price,2900,'GBP','full_location_due_diligence_report',1,true,p_parameters,p_expiry) returning * into p;
 return p;
end $$;
