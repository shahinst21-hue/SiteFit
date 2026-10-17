-- Owner-authorised free Snapshot proof only. Frozen policy identity remains mandatory.
-- Paid Full still requires an approved sale policy; no approvals, rows or grants are changed.
create or replace function public.claim_sitefit_controlled_proof(p_owner uuid,p_stage text,p_case uuid,p_approved boolean,p_property uuid,p_nonce uuid,p_business text,p_report uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; r public.reports; a public.analyses;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof for update;
 if not found then if p_case is not null then raise exception 'proof_missing';end if;return null;end if;
 -- An issued but disabled proof also fences ordinary production execution: no public fall-through.
 if not p_approved or p_approved is null or p_case is distinct from c.id or not c.enabled or c.expires_at<=now() or
 c.owner_id<>p_owner or not c.tariff_verified or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null)
 or not exists(select 1 from public.properties where id=c.property_id and address_resolution_state='provider_verified' and provider_address_id is not null)
 or c.policy_digest<>encode(sha256(convert_to(c.policy_snapshot::text,'UTF8')),'hex')
 or not exists(select 1 from public.sale_policies where version=c.policy_version and (p_stage='snapshot' or approved) and snapshot=c.policy_snapshot)
 then raise exception 'proof_not_authorised' using errcode='42501';end if;
 if p_stage='snapshot' then
 if row(p_property,p_nonce,p_business) is distinct from row(c.property_id,c.nonce,c.business_type) then raise exception 'proof_case_mismatch' using errcode='42501';end if;
 if c.state in('snapshot_ready','full_running','complete') and c.free_report_id is not null then
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate,'reportId',c.free_report_id);end if;
 if c.state<>'issued' then raise exception 'proof_reconciliation_required';end if;
 update public.controlled_proof set state='snapshot_running',token=gen_random_uuid() where singleton returning * into c;
 elsif p_stage='full' then
 select * into r from public.reports where id=p_report and tier='full' and status<>'ready';
 select * into a from public.analyses where id=r.analysis_id;
 if c.state<>'snapshot_ready' or c.payment_id is null or a.owner_id is distinct from c.owner_id or a.property_id is distinct from c.property_id or
 a.business_type is distinct from c.business_type or not exists(select 1 from public.reports f where f.id=c.free_report_id and f.analysis_id=a.id)
 or not exists(select 1 from public.report_fulfilment j where j.payment_id=c.payment_id and j.report_id=p_report and j.state='running' and j.lease_until>now())
 then raise exception 'proof_full_binding_denied' using errcode='42501';end if;
 update public.controlled_proof set state='full_running',full_report_id=p_report,token=gen_random_uuid() where singleton returning * into c;
 else raise exception 'proof_stage_invalid';end if;
 return jsonb_build_object('id',c.id,'token',c.token,'inputRate',c.input_rate,'outputRate',c.output_rate);
end$$;

create or replace function public.reserve_sitefit_proof_dispatch(p_case uuid,p_token uuid,p_stage text,p_key text,p_kind text,p_digest text,p_micros bigint) returns uuid
language plpgsql security definer set search_path='' as $$declare c public.controlled_proof; n integer; cap integer; d uuid;begin
 select * into strict c from public.controlled_proof where id=p_case for update;
 perform public.assert_sitefit_processing_allowed(c.owner_id);
 if c.token is distinct from p_token or p_token is null or not c.enabled or c.expires_at<=now() or c.state<>p_stage||'_running' then raise exception 'proof_dispatch_denied' using errcode='42501';end if;
 if not exists(select 1 from public.sale_policies where version=c.policy_version and (p_stage='snapshot' or approved) and snapshot=c.policy_snapshot) then raise exception 'proof_policy_revoked' using errcode='42501';end if;
 if exists(select 1 from public.proof_dispatches where case_id=p_case and state='ambiguous') then raise exception 'proof_ambiguous';end if;
 if p_kind='ai' then
 cap:=case when p_stage='snapshot' then 5 else 3 end;
 if p_micros is null or p_micros<=0 or c.reserved_micros+p_micros>c.ai_limit_micros then raise exception 'proof_budget_exhausted';end if;
 -- Keep the Full envelope inside, rather than on top of, the aggregate allowance.
 if p_stage='snapshot' and c.reserved_micros+p_micros+(case when c.ai_limit_micros=1650000 then 1000000 else 300000 end)>c.ai_limit_micros then raise exception 'proof_full_envelope_unavailable';end if;
 if p_stage='full' and (select coalesce(sum(reserved_micros),0) from public.proof_dispatches where case_id=p_case and stage='full')+p_micros>(case when c.ai_limit_micros=1650000 then 1000000 else 300000 end) then raise exception 'proof_full_reservation_exhausted';end if;
 else
 if p_stage<>'snapshot' or p_micros is distinct from 0 then raise exception 'proof_source_denied';end if;
 cap:=case p_kind when 'api.propertydata.co.uk' then 4 when 'api.geoapify.com' then 2 when 'api.tfl.gov.uk' then 4 when 'api.ratings.food.gov.uk' then 2 when 'api.get-energy-performance-data.communities.gov.uk' then 2 else 0 end;
 end if;
 select count(*) into n from public.proof_dispatches where case_id=p_case and stage=p_stage and kind=p_kind;
 if n>=cap then raise exception 'proof_dispatch_cap';end if;
 if pg_database_size(current_database())+65536>450000000 then raise exception 'proof_capacity';end if;
 insert into public.proof_dispatches(case_id,stage,request_key,kind,request_digest,reserved_micros) values(p_case,p_stage,p_key,p_kind,p_digest,p_micros) returning id into d;
 update public.controlled_proof set reserved_micros=reserved_micros+p_micros where singleton;return d;
end$$;

-- Owner-only read of the already issued case. No dispatch, creation, mutation or policy approval.
create function public.read_sitefit_snapshot_proof(p_owner uuid,p_case uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare c public.controlled_proof;p public.properties;begin
 perform public.assert_sitefit_processing_allowed(p_owner);
 select * into c from public.controlled_proof where id=p_case and owner_id=p_owner and enabled and expires_at>now();
 if not found or not exists(select 1 from auth.users where id=p_owner and not is_anonymous and email_confirmed_at is not null) then raise exception 'proof_not_authorised' using errcode='42501';end if;
 select * into strict p from public.properties where id=c.property_id and address_resolution_state='provider_verified';
 return jsonb_build_object('business',c.business_type,'nonce',c.nonce,'property',jsonb_build_object(
 'id',p.id,'formattedAddress',p.formatted_address,'lines',p.address_components->'lines','postcode',p.postcode,'postTown',p.post_town,'country',p.country,
 'components',p.address_components-'lines','provider',p.address_provider,'providerAddressId',p.provider_address_id,'udprn',p.udprn,'uprn',null,
 'latitude',p.latitude,'longitude',p.longitude,'coordinatePrecision',p.coordinate_precision,'coordinateSource',p.coordinate_source,'resolution',p.address_resolution_state,'resolvedAt',p.resolved_at));
end$$;
revoke all on function public.read_sitefit_snapshot_proof(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_sitefit_snapshot_proof(uuid,uuid) to service_role;
