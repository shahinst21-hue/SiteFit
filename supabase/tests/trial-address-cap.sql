-- Synthetic boundary proof for the 40-request cap; no provider calls or retained rows.
begin;
do $$
declare
 owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); v_trial uuid:=gen_random_uuid();
 result jsonb; dispatch_id uuid; token_id uuid; n integer;
begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous)
 values(owner_id,'shahinst21@gmail.com',now(),false),(other_id,'trial-other@example.invalid',now(),false);
 insert into public.controlled_trials(id,owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,checkout_enabled,execution_enabled)
 values(v_trial,owner_id,now()+interval '1 hour',10000000,'sitefit-sale-v1-20261019-affirmative',true,repeat('a',64),2.5,10,true,true,true);
 insert into public.trial_address_dispatches(trial_id,request_key,state,response_body)
 select v_trial,lpad(to_hex(i),64,'0'),'received','{}' from generate_series(1,39) i;

 result:=public.reserve_sitefit_trial_address(v_trial,owner_id,repeat('f',64));
 dispatch_id:=(result->>'id')::uuid; token_id:=(result->>'token')::uuid;
 select count(*) into n from public.trial_address_dispatches d where d.trial_id=v_trial;
 if n<>40 then raise exception '40th unique request was not reserved';end if;
 begin
  perform public.reserve_sitefit_trial_address(v_trial,other_id,repeat('0',64));
  raise exception 'wrong owner admitted';
 exception when insufficient_privilege then null; end;
 begin
  perform public.reserve_sitefit_trial_address(v_trial,owner_id,repeat('e',64));
  raise exception 'request above 40 admitted';
 exception when others then if sqlerrm='request above 40 admitted' then raise;end if; end;

 perform public.settle_sitefit_trial_address(v_trial,owner_id,dispatch_id,token_id,'{"ok":true}');
 result:=public.reserve_sitefit_trial_address(v_trial,owner_id,repeat('f',64));
 if result->>'body' is distinct from '{"ok":true}' then raise exception 'completed request did not replay at cap';end if;
end $$;
rollback;
