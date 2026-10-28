-- Additional regression; the original frozen account/RLS fixture stays unchanged.
begin;
do $$declare g uuid:=gen_random_uuid();u uuid:=gen_random_uuid();email text;aid uuid;iid uuid;rid uuid;c public.guest_account_claims;before_report jsonb;begin
 email:='signin-switch-'||u::text||'@example.invalid';
 insert into auth.users(id,email,is_anonymous,email_confirmed_at,last_sign_in_at) values(g,null,true,null,null),(u,email,false,now(),now());
 insert into public.analyses(owner_id,business_type,business_category,status) values(g,'coffee-shop','coffee-shop','free_ready') returning id into aid;
 insert into public.analysis_inputs(analysis_id,version,user_supplied) values(aid,1,'{}') returning id into iid;
 insert into public.reports(analysis_id,input_id,version,schema_version,tier,status,free_projection)
 values(aid,iid,1,2,'free','ready',jsonb_build_object('schemaVersion',2,'analysisId',aid,'property',jsonb_build_object('address','Synthetic signup journey'))) returning id into rid;
 select to_jsonb(r) into before_report from public.reports r where id=rid;
 c:=public.prepare_sitefit_claim(g,rid,gen_random_uuid(),repeat('a',64),repeat('b',64));
 perform public.start_sitefit_claim_auth(c.id,g,repeat('a',64),repeat('b',64),'google',null);
 perform public.cancel_sitefit_claim(c.id,g,repeat('a',64),repeat('b',64));
 c:=public.prepare_sitefit_claim(g,rid,gen_random_uuid(),repeat('c',64),repeat('d',64));
 if c.report_id<>rid or c.method is not null or c.auth_target_id is not null then raise exception 'unverified restart lost original report';end if;
 perform public.start_sitefit_claim_auth(c.id,g,repeat('c',64),repeat('d',64),'email',encode(sha256(convert_to(email,'UTF8')),'hex'));
 begin perform public.verify_sitefit_claim_auth(c.id,u,repeat('a',64),repeat('b',64),'google');raise exception 'old provider proof accepted';exception when insufficient_privilege then null;end;
 perform public.verify_sitefit_claim_auth(c.id,u,repeat('c',64),repeat('d',64),'email');
 begin perform public.cancel_sitefit_claim(c.id,g,repeat('c',64),repeat('d',64));raise exception 'verified binding cancelled';exception when insufficient_privilege then null;end;
 if public.complete_sitefit_claim(c.id,u,repeat('c',64),repeat('d',64))<>rid then raise exception 'signup lost report';end if;
 if public.complete_sitefit_claim(c.id,u,repeat('c',64),repeat('d',64))<>rid then raise exception 'completion replay changed report';end if;
 if (select to_jsonb(r) from public.reports r where id=rid) is distinct from before_report or (select owner_id from public.analyses where id=aid)<>g then raise exception 'immutable report ownership changed';end if;
 if public.sitefit_access_owner(g)<>u then raise exception 'verified account cannot access guest history';end if;
end$$;
rollback;
