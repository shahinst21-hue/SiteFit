begin;
do $$declare o uuid:=gen_random_uuid();g uuid:=gen_random_uuid();t uuid;exhausted_trial uuid;before_trial jsonb;begin
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values(o,'entry-owner-'||o::text||'@example.invalid',now(),false),(g,null,null,true);
 insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,execution_enabled,public_customers_enabled)
 values(o,now()+interval '1 hour',10000000,'sitefit-sale-v1-20261019-affirmative',true,repeat('a',64),2.5,10,true,true,true) returning id into t;
 select to_jsonb(q) into before_trial from public.controlled_trials q where id=t;
 begin
  insert into public.trial_address_dispatches(trial_id,request_key,state,response_body) values(t,repeat('d',64),'ambiguous',null);
  if public.sitefit_public_customers_available(t) then raise exception 'ambiguous source admitted entry below count limit';end if;
  raise exception 'rollback_ambiguous_entry';
 exception when others then if sqlerrm<>'rollback_ambiguous_entry' then raise;end if;end;
 insert into public.trial_address_dispatches(trial_id,request_key,state,response_body)
 select t,lpad(to_hex(i),64,'0'),'received','{}' from generate_series(1,38)i;
 if not public.sitefit_public_customers_available(t) then raise exception 'public entry unavailable at old boundary';end if;
 insert into public.trial_address_dispatches(trial_id,request_key,state,response_body) values(t,repeat('f',64),'received','{}');
 if not public.sitefit_public_customers_available(t) then raise exception 'old address headroom blocked public entry';end if;
 insert into public.trial_address_dispatches(trial_id,request_key,state,response_body)
 select t,lpad(to_hex(i),64,'0'),'received','{}' from generate_series(39,100)i;
 if not public.sitefit_public_customers_available(t) then raise exception 'historical address count blocked public entry';end if;
 if public.reserve_sitefit_trial_address(t,g,repeat('f',64))->>'body' is distinct from '{}' then raise exception 'cached address replay blocked by entry capacity';end if;
 begin
  perform public.reserve_sitefit_trial_address(t,g,repeat('e',64));
  perform public.settle_sitefit_trial_address(t,g,(select id from public.trial_address_dispatches where trial_id=t and request_key=repeat('e',64)),(select token from public.trial_address_dispatches where trial_id=t and request_key=repeat('e',64)),null);
  if public.sitefit_public_customers_available(t) then raise exception 'ambiguous source admitted public entry';end if;
  raise exception 'rollback_ambiguous_capacity_probe';
 exception when others then if sqlerrm<>'rollback_ambiguous_capacity_probe' then raise;end if;end;
 begin
  update public.controlled_trials set execution_enabled=false where id=t;
  if public.sitefit_public_customers_available(t) then raise exception 'disabled execution admitted entry';end if;
  raise exception 'rollback_execution_probe';
 exception when others then if sqlerrm<>'rollback_execution_probe' then raise;end if;end;
 begin
  update public.controlled_trials set enabled=false where id=t;
  insert into public.controlled_trials(owner_id,expires_at,total_limit_micros,policy_version,tariff_verified,tariff_digest,input_rate,output_rate,enabled,execution_enabled,public_customers_enabled)
  values(o,now()+interval '1 hour',1,'sitefit-sale-v1-20261019-affirmative',true,repeat('a',64),2.5,10,true,true,true) returning id into exhausted_trial;
  if public.sitefit_public_customers_available(exhausted_trial) then raise exception 'AI budget exhaustion admitted entry';end if;
  raise exception 'rollback_budget_probe';
 exception when others then if sqlerrm<>'rollback_budget_probe' then raise;end if;end;
 if (select to_jsonb(q) from public.controlled_trials q where id=t) is distinct from before_trial then raise exception 'capacity probe changed allowance';end if;
end$$;
rollback;
