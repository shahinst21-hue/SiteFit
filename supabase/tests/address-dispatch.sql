-- Actual reservation/settlement beyond the removed rehearsal ceiling; no provider calls.
begin;
do $$declare
 o uuid:=gen_random_uuid();g uuid:=gen_random_uuid();foreign_owner uuid:=gen_random_uuid();t uuid;
 v jsonb;first_request jsonb;before_budget jsonb;before_trial jsonb;n integer;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous)
 values(o,'address-owner-'||o::text||'@example.invalid',now(),false),(g,null,null,true),(foreign_owner,'unverified-'||foreign_owner::text||'@example.invalid',null,false);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,execution_enabled,public_customers_enabled)
 values(o,now()+interval '1 hour',10000000,'sitefit-sale-v1-20261019-affirmative',true,repeat('a',64),2.5,10,true,true,true) returning id into t;
 before_budget:=public.sitefit_trial_budget_snapshot(t);
 select to_jsonb(q) into before_trial from public.controlled_trials q where id=t;
 -- Each iteration uses the deployed RPCs, not a count-limit mock. Includes 39/40/41.
 for k in 1..81 loop
  v:=public.reserve_sitefit_trial_address(t,g,lpad(to_hex(k),64,'0'));
  if k=1 then first_request:=v;end if;
  if v->>'body' is not null then raise exception 'new request replayed another address';end if;
  begin
   perform public.reserve_sitefit_trial_address(t,g,lpad(to_hex(k),64,'0'));
   raise exception 'pending request dispatched twice';
  exception when others then if sqlerrm<>'trial_address_reconciliation_required' then raise;end if;end;
  begin
   perform public.settle_sitefit_trial_address(t,g,(v->>'id')::uuid,gen_random_uuid(),'{}');
   raise exception 'wrong settlement token admitted';
  exception when no_data_found then null;end;
  perform public.settle_sitefit_trial_address(t,g,(v->>'id')::uuid,(v->>'token')::uuid,'{"success":true}');
  if public.reserve_sitefit_trial_address(t,g,lpad(to_hex(k),64,'0'))->>'body' is distinct from '{"success":true}' then raise exception 'received replay missing';end if;
  if not public.sitefit_public_customers_available(t) then raise exception 'address count closed public entry';end if;
 end loop;
 select count(*) into n from public.trial_address_dispatches where trial_id=t;
 if n<>81 then raise exception 'reservation history missing or duplicated';end if;
 begin
  perform public.reserve_sitefit_trial_address(t,foreign_owner,repeat('e',64));raise exception 'unverified owner admitted';
 exception when insufficient_privilege then null;end;
 -- Ambiguous outcomes remain a stop for new work, with received cache still available.
 v:=public.reserve_sitefit_trial_address(t,g,repeat('f',64));
 perform public.settle_sitefit_trial_address(t,g,(v->>'id')::uuid,(v->>'token')::uuid,null);
 begin
  perform public.reserve_sitefit_trial_address(t,g,repeat('d',64));raise exception 'ambiguous outcome allowed dispatch';
 exception when others then if sqlerrm<>'trial_address_limit' then raise;end if;end;
 if public.sitefit_public_customers_available(t) then raise exception 'ambiguous outcome allowed entry';end if;
 v:=public.reserve_sitefit_trial_address(t,g,lpad(to_hex(1),64,'0'));
 if v->>'id' is distinct from first_request->>'id' or v->>'body' is distinct from '{"success":true}' then raise exception 'ambiguous stop blocked received replay';end if;
 if public.sitefit_trial_budget_snapshot(t) is distinct from before_budget
 or (select to_jsonb(q) from public.controlled_trials q where id=t) is distinct from before_trial then raise exception 'address use changed AI budget or trial controls';end if;
 if has_function_privilege('anon','public.reserve_sitefit_trial_address(uuid,uuid,text)','EXECUTE')
 or has_function_privilege('authenticated','public.reserve_sitefit_trial_address(uuid,uuid,text)','EXECUTE')
 or has_table_privilege('service_role','public.trial_address_dispatches','INSERT') then raise exception 'address authority exposed';end if;
end$$;
rollback;
