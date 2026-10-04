-- Development-only structural/security fixture. Entire transaction rolls back.
begin;
set local role service_role;
do $$
declare
  address jsonb := '{"formattedAddress":"Synthetic Unit A, Test Town, ZZ1 1ZZ","lines":["Synthetic Unit A"],"postcode":"ZZ1 1ZZ","postTown":"Test Town","country":null,"provider":"synthetic-phase4","providerAddressId":"fixture-a","udprn":null,"uprn":null,"components":{},"latitude":null,"longitude":null,"coordinatePrecision":"unknown","coordinateSource":null,"resolution":"provider_verified"}';
  first_property public.properties;
  second_property public.properties;
  manual public.properties;
begin
  first_property := public.resolve_sitefit_property(address);
  second_property := public.resolve_sitefit_property(address || '{"formattedAddress":"Synthetic Unit A updated, Test Town, ZZ1 1ZZ"}');
  if first_property.id <> second_property.id or first_property.created_at <> second_property.created_at then raise exception 'Unstable property identity'; end if;
  if (select count(*) from public.properties where address_provider = 'synthetic-phase4' and provider_address_id = 'fixture-a') <> 1 then raise exception 'Duplicate provider identity'; end if;
  -- Future independent enrichment must survive a current-address refresh.
  update public.properties set uprn = '999999999999' where id = first_property.id;
  second_property := public.resolve_sitefit_property(address);
  if second_property.uprn <> '999999999999' then raise exception 'UPRN enrichment lost'; end if;
  second_property := public.resolve_sitefit_property(address || '{"providerAddressId":"fixture-b","formattedAddress":"Synthetic Unit B, Test Town, ZZ1 1ZZ"}');
  if first_property.id = second_property.id then raise exception 'Separate units merged'; end if;
  manual := public.resolve_sitefit_property(address || '{"provider":null,"providerAddressId":null,"resolution":"manual_unverified"}');
  if manual.address_resolution_state <> 'manual_unverified' or manual.address_provider is not null or manual.udprn is not null or manual.latitude is not null or manual.uprn is not null then raise exception 'Manual verification fabricated'; end if;
  second_property := public.resolve_sitefit_property(address || '{"provider":"postio","providerAddressId":"99999999","udprn":"99999999","latitude":51.5,"longitude":-0.1,"coordinatePrecision":"postcode_centroid","coordinateSource":"postio"}');
  if second_property.udprn <> '99999999' or second_property.uprn is not null or second_property.coordinate_precision <> 'postcode_centroid' then raise exception 'Delivery-point/coordinate provenance lost'; end if;
  begin
    perform public.resolve_sitefit_property(address || '{"provider":"postio","providerAddressId":"99999998","udprn":"99999999"}');
    raise exception 'Mismatched Postio identifier accepted';
  exception when check_violation then null; end;
  begin
    perform public.resolve_sitefit_property(address || '{"provider":"postio","providerAddressId":"99999997","udprn":"99999997","latitude":51.5,"longitude":-0.1,"coordinatePrecision":"rooftop","coordinateSource":"postio"}');
    raise exception 'Postcode coordinates represented as rooftop';
  exception when check_violation then null; end;
  begin
    perform public.resolve_sitefit_property(address || '{"provider":null,"providerAddressId":null,"resolution":"manual_unverified","latitude":51.5,"longitude":-0.1,"coordinatePrecision":"postcode_centroid","coordinateSource":"postio"}');
    raise exception 'Manual verified coordinates accepted';
  exception when check_violation then null; end;
end;
$$;
reset role;
set local role anon;
do $$ begin
  if (select count(*) from public.blog_posts) <> 0 then raise exception 'Unexpected fixture blog'; end if;
  begin perform public.resolve_sitefit_property('{}'); raise exception 'Anonymous RPC permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.properties(formatted_address) values('Forbidden client property'); raise exception 'Anonymous property write permitted'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role authenticated;
do $$ begin
  if (select count(*) from public.properties) <> 0 then raise exception 'Unlinked property leaked'; end if;
  begin perform public.resolve_sitefit_property('{}'); raise exception 'Authenticated RPC permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.properties(formatted_address) values('Forbidden client property'); raise exception 'Authenticated property write permitted'; exception when insufficient_privilege then null; end;
end; $$;
rollback;
