begin;
do $$ declare owner uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); p uuid;a uuid;i uuid;event uuid;b jsonb;
begin
 if has_function_privilege('anon','public.freeze_sitefit_premises_history(uuid,uuid,uuid,text,jsonb)','EXECUTE') or
   has_function_privilege('authenticated','public.read_sitefit_premises_history(uuid,uuid,uuid)','EXECUTE') or
   has_table_privilege('authenticated','public.premises_events','SELECT') or
   has_table_privilege('authenticated','public.premises_events','INSERT') then raise exception 'History exposed to browser role';end if;
 insert into auth.users(id) values(owner),(other);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,resolved_at)
 values('Synthetic history guard','E8 4PH','London','manual_unverified',now()) returning id into p;
 insert into public.analyses(owner_id,property_id,business_type,business_category) values(owner,p,'coffee-shop','coffee-shop') returning id into a;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(a,1,'{}') returning id into i;
 b:=jsonb_build_object('syntheticGuardFixture',true);
 begin perform public.freeze_sitefit_premises_history(other,a,i,'{}',b);raise exception 'Other owner wrote';exception when insufficient_privilege then null;end;
 begin perform public.freeze_sitefit_premises_history(owner,a,i,'{}',b);raise exception 'Unbound input wrote';exception when check_violation then null;end;
 begin insert into public.premises_events(analysis_id,property_id,history_input_id,history_bundle) values(a,p,i,b);
  raise exception 'Direct write passed';exception when insufficient_privilege then null;end;
 -- Privileged synthetic row exercises storage trigger/read independently of live contract admission.
 perform set_config('sitefit.history_writer','admitted',true);
 insert into public.premises_events(analysis_id,property_id,history_input_id,history_bundle) values(a,p,i,b) returning id into event;
 perform set_config('sitefit.history_writer','',true);
 if public.read_sitefit_premises_history(owner,a,i)<>b then raise exception 'Owned stored read failed';end if;
 begin perform public.read_sitefit_premises_history(other,a,i);raise exception 'Other owner read';exception when insufficient_privilege then null;end;
 begin update public.premises_events set history_bundle='{}' where id=event;raise exception 'History changed';exception when check_violation then null;end;
 begin delete from public.premises_events where id=event;raise exception 'History deleted';exception when check_violation then null;end;
 if public.read_sitefit_premises_history(owner,a,i)<>b then raise exception 'History changed after rejected writes';end if;
end $$;
rollback;
