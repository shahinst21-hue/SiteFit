-- Synthetic identities only; no provider call and no committed case.
begin;
do $$declare
 o uuid:=gen_random_uuid();other uuid:=gen_random_uuid();p uuid;p2 uuid;c uuid;c2 uuid;n uuid:=gen_random_uuid();n2 uuid:=gen_random_uuid();
 t uuid;t2 uuid;d uuid;v jsonb;history jsonb;dispatch_history jsonb;
begin
 if exists(select 1 from public.controlled_proof) then raise exception 'successor fixture needs empty authority';end if;
 insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 (o,'successor-synthetic@example.invalid',now(),false),(other,'successor-other@example.invalid',now(),false);
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic 67','E8 4PH','London','provider_verified','postio','11111111','11111111',now()) returning id into p;
 insert into public.properties(formatted_address,postcode,post_town,address_resolution_state,address_provider,provider_address_id,udprn,resolved_at)
 values('Synthetic 67B','E8 4PH','London','provider_verified','postio','22222222','22222222',now()) returning id into p2;
 insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at,enabled,tariff_verified,tariff_digest)
 select o,p,'coffee-shop',n,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour',true,true,repeat('b',64)
 from public.sale_policies where version='sitefit-sale-v1-20261016-review' returning id into c;
 begin update public.controlled_proof set singleton=false where id=c;raise exception 'running authority retired';
 exception when others then if sqlerrm<>'proof_retirement_denied' then raise;end if;end;
 v:=public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);t:=(v->>'token')::uuid;
 d:=public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('1',64),'ai',repeat('1',64),50000);
 perform public.interrupt_sitefit_controlled_proof(c,t);
 update public.controlled_proof set enabled=false where id=c;
 begin update public.controlled_proof set singleton=false where id=c;raise exception 'unsettled intent retired';
 exception when others then if sqlerrm<>'proof_retirement_denied' then raise;end if;end;
 -- An explicitly reconciled received result remains in history; its hold is not refunded.
 perform public.settle_sitefit_proof_dispatch(c,t,d,'received',repeat('c',64));
 select to_jsonb(x)-'singleton' into history from public.controlled_proof x where id=c;
 select to_jsonb(x) into dispatch_history from public.proof_dispatches x where id=d;
 begin update public.controlled_proof set singleton=false,reserved_micros=50001 where id=c;raise exception 'retirement rewrote hold';
 exception when others then if sqlerrm<>'proof_retirement_denied' then raise;end if;end;
 -- Removing the current slot alone cannot commit. Also exercise the transient
 -- absence directly: each ordinary entry point must fail closed in that gap.
 begin
 update public.controlled_proof set singleton=false where id=c;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',null,false,p2,n2,'coffee-shop',null);raise exception 'history-only ordinary claim';
 exception when others then if sqlerrm<>'proof_missing' then raise;end if;end;
 begin insert into public.analyses(owner_id,property_id,business_type,business_category,status,submission_nonce)
 values(other,p2,'coffee-shop','coffee-shop','draft',n2);raise exception 'history-only ordinary graph';
 exception when insufficient_privilege then null;end;
 set constraints proof_current_slot_required immediate;
 raise exception 'history-only gap committed';
 exception when others then if sqlerrm<>'proof_current_slot_required' then raise;end if;
 end;
 update public.controlled_proof set singleton=false where id=c;
 insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at)
 select o,p2,'coffee-shop',n2,version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour'
 from public.sale_policies where version='sitefit-sale-v1-20261016-review' returning id into c2;
 set constraints proof_current_slot_required immediate;
 if (select count(*) from public.controlled_proof)<>2 or (select count(*) from public.controlled_proof where singleton)<>1
 or (select enabled from public.controlled_proof where id=c2) then raise exception 'slot or disabled default broken';end if;
 begin insert into public.controlled_proof(owner_id,property_id,business_type,nonce,policy_version,policy_snapshot,policy_digest,expires_at)
 select o,p2,'coffee-shop',gen_random_uuid(),version,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),now()+interval '1 hour'
 from public.sale_policies where version='sitefit-sale-v1-20261016-review';raise exception 'two current cases admitted';
 exception when unique_violation then null;end;
 begin update public.controlled_proof set singleton=true where id=c;raise exception 'history reactivated';
 exception when others then if sqlerrm<>'proof_history_immutable' then raise;end if;end;
 begin update public.controlled_proof set enabled=true where id=c;raise exception 'history enabled';
 exception when others then if sqlerrm<>'proof_history_immutable' then raise;end if;end;
 begin delete from public.controlled_proof where id=c;raise exception 'history deleted';
 exception when others then if sqlerrm<>'proof_history_immutable' then raise;end if;end;
 begin truncate public.controlled_proof cascade;raise exception 'history truncated';
 exception when others then if sqlerrm<>'proof_history_immutable' then raise;end if;end;
 update public.controlled_proof set tariff_verified=true,tariff_digest=repeat('d',64),enabled=true where id=c2;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c,true,p,n,'coffee-shop',null);raise exception 'old environment ID admitted';
 exception when insufficient_privilege then null;end;
 begin perform public.claim_sitefit_controlled_proof(other,'snapshot',c2,true,p2,n2,'coffee-shop',null);raise exception 'foreign successor owner';
 exception when insufficient_privilege then null;end;
 begin perform public.claim_sitefit_controlled_proof(o,'snapshot',c2,true,p,n2,'coffee-shop',null);raise exception '67 substituted for 67B';
 exception when insufficient_privilege then null;end;
 begin perform public.read_sitefit_snapshot_proof(o,c);raise exception 'retired context returned';
 exception when insufficient_privilege then null;end;
 v:=public.claim_sitefit_controlled_proof(o,'snapshot',c2,true,p2,n2,'coffee-shop',null);t2:=(v->>'token')::uuid;
 -- The same request digest is independent for a different authorised property,
 -- but replay within this new case remains forbidden and holds stay atomic.
 perform public.reserve_sitefit_proof_dispatch(c2,t2,'snapshot',repeat('1',64),'ai',repeat('1',64),650000);
 begin perform public.reserve_sitefit_proof_dispatch(c2,t2,'snapshot',repeat('2',64),'ai',repeat('2',64),1);raise exception 'successor Snapshot cap exceeded';
 exception when others then if sqlerrm<>'proof_full_envelope_unavailable' then raise;end if;end;
 begin perform public.reserve_sitefit_proof_dispatch(c,t,'snapshot',repeat('3',64),'ai',repeat('3',64),1);raise exception 'retired dispatch admitted';
 exception when insufficient_privilege then null;end;
 begin perform public.settle_sitefit_proof_dispatch(c,t,d,'ambiguous',null);raise exception 'retired settlement mutated successor';
 exception when others then if sqlerrm<>'proof_settlement_denied' then raise;end if;end;
 perform public.interrupt_sitefit_controlled_proof(c,t);
 if (select state from public.controlled_proof where id=c2)<>'snapshot_running'
 or (select reserved_micros from public.controlled_proof where id=c2)<>650000
 or (select to_jsonb(x)-'singleton' from public.controlled_proof x where id=c) is distinct from history
 or (select to_jsonb(x) from public.proof_dispatches x where id=d) is distinct from dispatch_history
 then raise exception 'old history or new case corrupted';end if;
 if has_table_privilege('service_role','public.controlled_proof','INSERT')
 or has_function_privilege('service_role','public.guard_sitefit_proof_slot()','EXECUTE')
 or has_table_privilege('authenticated','public.controlled_proof','SELECT')
 then raise exception 'successor privileges widened';end if;
end$$;
rollback;
