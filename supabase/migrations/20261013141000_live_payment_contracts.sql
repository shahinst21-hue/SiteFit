-- Phase17 Live v2 contracts. Existing Test v1 rows/readers remain immutable.
alter table public.payments add column stripe_account_id text;
alter table public.payments drop constraint phase7_payment_contract;
alter table public.payments add constraint phase7_payment_contract check(payment_version is null or (
 ((payment_version=1 and test_mode=true and stripe_account_id is null) or (payment_version=2 and test_mode=false and stripe_account_id is not null and stripe_account_id ~ '^acct_[A-Za-z0-9]+$'))
 and test_mode is not null and owner_id is not null and report_id is not null and provider='stripe' and product_type='full_location_due_diligence_report' and product_type is not null
 and amount_minor=2900 and currency='GBP' and price_reference ~ '^price_[A-Za-z0-9]+$' and attempt_parameters is not null and jsonb_typeof(attempt_parameters)='object' and expires_at is not null));
alter table public.payments drop constraint payment_access_confirmation;
alter table public.payments add constraint payment_access_confirmation check(access_state='none' or (payment_version is not null and payment_version in(1,2) and verified_at is not null and status in('succeeded','refunded') and checkout_reference is not null and payment_reference is not null));
create unique index live_payment_one_attempt on public.payments(analysis_id,product_type) where payment_version=2 and status='pending';
create unique index live_payment_one_access on public.payments(analysis_id,product_type) where payment_version=2 and access_state in('active','suspended');
alter table public.payment_events drop constraint payment_events_test_mode_check;
create function public.guard_sitefit_payment_event_mode() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.payments p where p.id=new.payment_id and p.payment_version in(1,2) and p.test_mode=new.test_mode) then
  raise exception 'payment_event_mode_mismatch' using errcode='23514';end if;return new;
end $$;
create trigger payment_event_mode_integrity before insert on public.payment_events for each row execute function public.guard_sitefit_payment_event_mode();
revoke all on function public.guard_sitefit_payment_event_mode() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.sitefit_guard_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_op='INSERT' and new.payment_version in(1,2) and not public.sitefit_payment_mode_allowed(new.payment_version,new.test_mode) then raise exception 'payment_environment_mismatch' using errcode='23514';end if;
 if tg_op='DELETE' then raise exception 'payment_history_immutable' using errcode='55000'; end if;
 if tg_op='UPDATE' and old.payment_version in(1,2) and (
  row(new.id,new.analysis_id,new.owner_id,new.report_id,new.provider,new.idempotency_key,new.price_reference,new.amount_minor,new.currency,new.product_type,new.payment_version,new.test_mode,new.attempt_parameters,new.expires_at,new.created_at,new.stripe_account_id)
  is distinct from row(old.id,old.analysis_id,old.owner_id,old.report_id,old.provider,old.idempotency_key,old.price_reference,old.amount_minor,old.currency,old.product_type,old.payment_version,old.test_mode,old.attempt_parameters,old.expires_at,old.created_at,old.stripe_account_id)
  or (old.checkout_reference is not null and new.checkout_reference is distinct from old.checkout_reference)
  or (old.payment_reference is not null and new.payment_reference is distinct from old.payment_reference)
  or (old.verified_at is not null and new.verified_at is distinct from old.verified_at)
 ) then raise exception 'payment_binding_immutable' using errcode='55000'; end if;
 if new.payment_version in(1,2) and not public.sitefit_permanent_account(new.owner_id) then raise exception 'permanent_account_required' using errcode='42501'; end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.authorise_sitefit_economics(p_owner uuid, p_analysis uuid, p_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_owner is null or not exists(select 1 from public.analyses a join auth.users u on u.id=p_owner
  join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
  where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner and not u.is_anonymous and u.email_confirmed_at is not null
  and exists(select 1 from public.payments p where p.analysis_id=a.id and p.owner_id=p_owner and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode)
    and p.access_state='active' and p.status='succeeded' and p.verified_at is not null)) then raise exception 'paid_economics_required' using errcode='42501';end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.authorise_sitefit_web_discovery(p_owner uuid, p_analysis uuid, p_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_owner is null or not public.sitefit_permanent_account(p_owner) or not exists(select 1 from public.analyses a
  join public.analysis_inputs i on i.analysis_id=a.id and i.id=p_input
  where a.id=p_analysis and public.sitefit_access_owner(a.owner_id)=p_owner
  and exists(select 1 from public.payments p where p.analysis_id=a.id and p.owner_id=p_owner and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode)
    and p.access_state='active' and p.status='succeeded' and p.verified_at is not null)) then raise exception 'paid_discovery_required' using errcode='42501';end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.enqueue_sitefit_fulfilment(p_owner uuid, p_payment uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.payments; j public.report_fulfilment;
begin
 select * into p from public.payments where id=p_payment and owner_id=p_owner and status='succeeded'
  and access_state='active' and verified_at is not null and public.sitefit_payment_mode_allowed(payment_version,test_mode);
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
end $function$
;
CREATE OR REPLACE FUNCTION public.read_sitefit_fulfilment(p_owner uuid, p_payment uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;
CREATE OR REPLACE FUNCTION public.read_sitefit_purchase(p_report uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce((select jsonb_build_object('id',p.id,'status',p.status,'access',p.access_state,'test',p.test_mode,'reportGenerated',false)
  from public.payments p where p.report_id=r.id and p.owner_id=auth.uid() and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode) order by p.created_at desc,p.id limit 1),'null'::jsonb)
 from public.reports r join public.analyses a on a.id=r.analysis_id where r.id=p_report and public.sitefit_owner_is(a.owner_id)
$function$
;
CREATE OR REPLACE FUNCTION public.read_sitefit_sale(p_owner uuid, p_payment uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.sale_contracts;
begin
 if not exists(select 1 from public.payments where id=p_payment and owner_id=p_owner and public.sitefit_payment_mode_allowed(payment_version,test_mode)) then raise exception 'sale_owner_denied' using errcode='42501';end if;
 select * into c from public.sale_contracts where payment_id=p_payment and owner_id=p_owner;
 if not found then return null;end if;
 return jsonb_build_object('version',c.policy_version,'acceptedAt',c.accepted_at,'consent',c.consent,'policy',c.policy_snapshot,'confirmationDelivered',c.confirmation_delivered_at is not null);
end $function$
;
CREATE OR REPLACE FUNCTION public.record_sitefit_sale(p_owner uuid, p_payment uuid, p_version text, p_consent jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.payments; policy public.sale_policies; existing public.sale_contracts;
begin
 select * into p from public.payments where id=p_payment and owner_id=p_owner and public.sitefit_payment_mode_allowed(payment_version,test_mode) for update;
 if not found or not exists(select 1 from auth.users where id=p_owner and is_anonymous=false and email_confirmed_at is not null) then raise exception 'sale_owner_denied' using errcode='42501';end if;
 select * into policy from public.sale_policies where version=p_version and approved=true;
 if not found then raise exception 'sale_policy_not_approved' using errcode='23514';end if;
 if jsonb_typeof(p_consent)<>'object' or (select count(*) from jsonb_object_keys(p_consent))<>5 or
 not(p_consent ?& array['version','buyerKind','termsAccepted','immediateRequested','acknowledgement']) or
 p_consent->>'version'<>p_version or p_consent->>'buyerKind' not in ('consumer','business') or
 p_consent->'termsAccepted'<>'true'::jsonb or p_consent->'immediateRequested'<>'true'::jsonb or p_consent->'acknowledgement'<>'true'::jsonb then raise exception 'sale_consent_required' using errcode='23514';end if;
 select * into existing from public.sale_contracts where payment_id=p_payment;
 if found then
  if existing.owner_id<>p_owner or existing.policy_version<>p_version or existing.consent<>p_consent then raise exception 'sale_changed_replay' using errcode='23514';end if;
  return jsonb_build_object('accepted',true,'acceptedAt',existing.accepted_at);
 end if;
 if p.status<>'pending' then raise exception 'historical_consent_not_inferred' using errcode='23514';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'sale_capacity_checkpoint' using errcode='23514';end if;
 insert into public.sale_contracts(payment_id,owner_id,policy_version,consent,policy_snapshot) values(p_payment,p_owner,p_version,p_consent,policy.snapshot);
 return jsonb_build_object('accepted',true);
end $function$
;
CREATE OR REPLACE FUNCTION public.request_sitefit_cancellation(p_owner uuid, p_payment uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_reason not in ('change_of_mind','failed_delivery','report_problem','other') then raise exception 'invalid_purchase_request' using errcode='23514';end if;
 if not exists(select 1 from public.payments where id=p_payment and owner_id=p_owner and status='succeeded' and public.sitefit_payment_mode_allowed(payment_version,test_mode)) then raise exception 'purchase_request_denied' using errcode='42501';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'purchase_request_capacity' using errcode='23514';end if;
 insert into public.purchase_requests(payment_id,owner_id,reason) values(p_payment,p_owner,p_reason) on conflict do nothing;
 return jsonb_build_object('status','requested','refundIssued',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.sitefit_supply_permitted(p_payment uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.sale_contracts c join public.sale_policies s on s.version=c.policy_version
 join public.payments p on p.id=c.payment_id and p.owner_id=c.owner_id
 where c.payment_id=p_payment and s.approved and s.classification is not null and s.confirmation_channel is not null
 and c.confirmation_delivered_at is not null and c.confirmation_channel=s.confirmation_channel
 and p.status='succeeded' and p.access_state='active' and public.sitefit_payment_mode_allowed(p.payment_version,p.test_mode))
$function$
;
CREATE OR REPLACE FUNCTION public.sitefit_payment_fulfilment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status='succeeded' and new.access_state='active' and new.verified_at is not null and public.sitefit_payment_mode_allowed(new.payment_version,new.test_mode)
  and (tg_op='INSERT' or old.status is distinct from new.status or old.access_state is distinct from new.access_state) then
  -- Fulfilment admission failure cannot discard a verified payment receipt.
  begin perform public.enqueue_sitefit_fulfilment(new.owner_id,new.id);
  exception when others then
   insert into public.system_events(event_type,analysis_id,safe_metadata)
   values('fulfilment-admission-failed',new.analysis_id,jsonb_build_object('code','admission_unavailable'));
  end;
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.prepare_sitefit_live_payment(p_owner uuid, p_report uuid, p_id uuid, p_price text, p_parameters jsonb, p_expiry timestamp with time zone, p_account text)
 RETURNS payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.analyses; r public.reports; p public.payments; account_email text;
begin
 if not exists(select 1 from public.commercial_release_control c join public.sale_policies s on s.version=c.policy_version where c.mode='live' and c.checkout_enabled and c.execution_enabled and c.total_ai_limit_micros is not null and c.stripe_account_id=p_account and s.approved and p_parameters->>'success_url'=c.production_origin||'/purchase/return?purchase='||p_id::text and p_parameters->>'cancel_url'=c.production_origin||'/purchase/return?purchase='||p_id::text||'&cancel=1') then raise exception 'commercial_checkout_not_approved' using errcode='42501';end if;
 if p_parameters#>>'{metadata,version}' is distinct from '2' then raise exception 'live_metadata_required' using errcode='23514';end if;
 if not public.sitefit_permanent_account(p_owner) then raise exception 'permanent_account_required' using errcode='42501'; end if;
 select * into r from public.reports where id=p_report and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'snapshot_unavailable' using errcode='42501'; end if;
 select * into a from public.analyses where id=r.analysis_id for update;
 if public.sitefit_access_owner(a.owner_id)<>p_owner or a.status<>'free_ready' then raise exception 'snapshot_unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.payments where analysis_id=a.id and payment_version=2 and (access_state in ('active','suspended') or reversal_state='lost_dispute')) then raise exception 'purchase_already_bound'; end if;
 select * into p from public.payments where analysis_id=a.id and payment_version=2 and status='pending';
 if found then
  if p.owner_id<>p_owner or p.report_id<>p_report then raise exception 'purchase_binding_conflict'; end if;
  perform public.reserve_sitefit_commercial_payment(p_owner,p.id);return p;
 end if;
 select email into account_email from auth.users where id=p_owner;
 if p_expiry is null or p_parameters is null or p_expiry<now()+interval '30 minutes' or p_expiry>now()+interval '65 minutes'
  or jsonb_typeof(p_parameters) is distinct from 'object'
  or p_parameters->>'customer_email' is distinct from account_email
  or p_parameters->>'mode' is distinct from 'payment'
  or p_parameters->'metadata'->>'purchase_id' is distinct from p_id::text
  or p_parameters->'metadata'->>'analysis_id' is distinct from a.id::text
 then raise exception 'invalid_attempt_parameters'; end if;
 insert into public.payments(id,analysis_id,owner_id,report_id,provider,idempotency_key,price_reference,amount_minor,currency,product_type,payment_version,test_mode,attempt_parameters,expires_at,stripe_account_id)
 values(p_id,a.id,p_owner,p_report,'stripe','sitefit:live:v2:'||p_id::text,p_price,2900,'GBP','full_location_due_diligence_report',2,false,p_parameters,p_expiry,p_account) returning * into p;
 perform public.reserve_sitefit_commercial_payment(p_owner,p.id);return p;
end $function$
;
CREATE OR REPLACE FUNCTION public.bind_sitefit_live_checkout(p_id uuid, p_session text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.payments; begin
 if p_session is null or p_session !~ '^cs_live_[A-Za-z0-9]+$' then raise exception 'invalid_live_session'; end if;
 select * into p from public.payments where id=p_id and payment_version=2 for update;
 if not found or (p.checkout_reference is not null and p.checkout_reference<>p_session) then raise exception 'payment_binding_conflict'; end if;
 if p.checkout_reference is null then
  update public.payments set checkout_reference=p_session,revision=revision+1 where id=p_id;
  insert into public.system_events(analysis_id,payment_id,event_type,outcome,safe_metadata) values(p.analysis_id,p.id,'checkout_started','live',jsonb_build_object('version',2,'test',false));
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.confirm_sitefit_live_payment(p_id uuid, p_event text, p_type text, p_revision integer, p_session text, p_intent text, p_outcome text, p_reversal text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.payments; next_status text; next_access text; was_confirmed boolean; begin
 select * into p from public.payments where id=p_id and payment_version=2 for update;
 if not found then raise exception 'payment_unavailable'; end if;
 if exists(select 1 from public.payment_events where id=p_event and payment_id=p_id) then return false; end if;
 if p.revision<>p_revision then raise exception 'retry_current_provider_state' using errcode='40001'; end if;
 if p_session is null or p_session !~ '^cs_live_[A-Za-z0-9]+$' or p_outcome is null or p_outcome not in ('pending','paid','expired','failed')
  or p_reversal is null or p_reversal not in ('none','pending_refund','partial_refund','full_refund','open_dispute','lost_dispute')
  or (p.checkout_reference is not null and p.checkout_reference<>p_session)
  or (p.payment_reference is not null and p.payment_reference is distinct from p_intent)
  or (p_outcome='paid' and (p_intent is null or p_intent !~ '^pi_[A-Za-z0-9]+$'))
 then raise exception 'payment_binding_conflict'; end if;
 was_confirmed=p.verified_at is not null;
 next_status=p.status; next_access=p.access_state;
 -- A successful payment is a historical fact. Full reversals are terminal.
 if p.status='refunded' or p.reversal_state in ('full_refund','lost_dispute') then
  p_reversal=p.reversal_state; next_access='revoked';
 elsif was_confirmed or p_outcome='paid' then
  next_status=case when p_reversal='full_refund' then 'refunded' else 'succeeded' end;
  next_access=case when p_reversal in ('full_refund','lost_dispute') then 'revoked' when p_reversal='none' then 'active' else 'suspended' end;
 elsif p_outcome in ('expired','failed') then next_status='failed';
 end if;
 insert into public.payment_events(id,payment_id,event_type,test_mode,outcome,reversal_state) values(p_event,p_id,p_type,false,p_outcome,p_reversal);
 update public.payments set checkout_reference=p_session,payment_reference=coalesce(payment_reference,p_intent),
  status=next_status,access_state=next_access,reversal_state=p_reversal,revision=revision+1,
  verified_at=case when p_outcome='paid' then coalesce(verified_at,now()) else verified_at end,
  expired_at=case when not was_confirmed and p_outcome='expired' then now() else expired_at end where id=p_id;
 if not was_confirmed and p_outcome='paid' then
  insert into public.system_events(analysis_id,payment_id,event_type,outcome,safe_metadata) values(p.analysis_id,p.id,'payment_confirmed','live',jsonb_build_object('version',2,'test',false));
 end if;
 if next_access<>p.access_state then
  insert into public.system_events(analysis_id,payment_id,event_type,outcome,safe_metadata) values(p.analysis_id,p.id,'payment_access_changed',next_access,jsonb_build_object('version',2,'test',false));
 end if;
 return true;
end $function$
;
CREATE OR REPLACE FUNCTION public.start_sitefit_commercial_full(p_owner uuid, p_free uuid, p_preparation text, p_checkpoint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f public.reports;r public.reports;a public.analysis_assessments;b jsonb;c jsonb;binding text;reserved bigint;
begin
 select * into f from public.reports where id=p_free and tier='free' and status='ready' and schema_version=2;
 if not found then raise exception 'free_report_required' using errcode='42501';end if;
 perform public.authorise_sitefit_economics(p_owner,f.analysis_id,f.input_id);
 perform 1 from public.analyses where id=f.analysis_id for update;
 if pg_database_size(current_database())+400000>450000000 then raise exception 'full_capacity_checkpoint' using errcode='23514';end if;
 if p_preparation is null or octet_length(p_preparation)>128000 or p_checkpoint is null or octet_length(p_checkpoint)>65536 then raise exception 'full_preparation_invalid' using errcode='23514';end if;
 b:=p_preparation::jsonb;c:=p_checkpoint::jsonb;binding:=encode(sha256(convert_to(p_preparation,'UTF8')),'hex');
 if jsonb_typeof(b)<>'object' or b->>'version' is distinct from 'full-preparation-v1' or b->>'analysisId' is distinct from f.analysis_id::text or b->>'inputId' is distinct from f.input_id::text or
  b->>'configuration' is distinct from 'full-intelligence-v1' or jsonb_typeof(b->'catalog') is distinct from 'object' or
  c->>'version' is distinct from 'full-intelligence-v1' or c->>'bindingDigest' is distinct from binding or c->>'revision' is distinct from '0' or c->>'state' is distinct from 'prepared' or c->'dispatches' is distinct from '[]'::jsonb or c->>'repairUsed' is distinct from 'false' or
  source_data.sitefit_report_private_text(b) then raise exception 'full_preparation_invalid' using errcode='23514';end if;
 select * into a from public.analysis_assessments where id=(b->>'assessmentId')::uuid and analysis_id=f.analysis_id and input_id=f.input_id and content_digest=b->>'assessmentDigest';
 if not found or b#>>'{catalog,assessmentDigest}' is distinct from a.content_digest or b#>'{catalog,index}' is distinct from a.bundle->'index' or b#>'{catalog,readiness}' is distinct from a.bundle#>'{decision,readiness}' then raise exception 'full_assessment_invalid' using errcode='23514';end if;
 select * into r from public.reports where analysis_id=f.analysis_id and input_id=f.input_id and full_binding=binding;
 if found then
  if r.status<>'ready' then perform public.bind_sitefit_commercial_reservation(p_owner,r.id);end if;
  return public.read_sitefit_full(p_owner,r.id);end if;
 -- Live allowance was atomically reserved before Checkout; never consume development grants.
 perform set_config('sitefit.full_writer','admitted',true);
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,full_binding,full_revision,provenance)
 values(f.analysis_id,f.input_id,(select coalesce(max(version),0)+1 from public.reports where analysis_id=f.analysis_id),3,'full','draft',binding,0,jsonb_build_object('preparation',b,'checkpoint',c)) returning * into r;
 perform public.bind_sitefit_commercial_reservation(p_owner,r.id);
 perform set_config('sitefit.full_writer','',true);return public.read_sitefit_full(p_owner,r.id);
end $function$
;
revoke all on function public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text), public.bind_sitefit_live_checkout(uuid,text), public.confirm_sitefit_live_payment(uuid,text,text,integer,text,text,text,text), public.start_sitefit_commercial_full(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_sitefit_live_payment(uuid,uuid,uuid,text,jsonb,timestamptz,text), public.bind_sitefit_live_checkout(uuid,text), public.confirm_sitefit_live_payment(uuid,text,text,integer,text,text,text,text), public.start_sitefit_commercial_full(uuid,uuid,text,text) to service_role;
