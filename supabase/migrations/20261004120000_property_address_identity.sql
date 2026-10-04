-- Phase 4 only: selected postal identity. No anonymous grants, analyses or provider payloads.
begin;
alter table public.properties
  add column address_provider text check (char_length(address_provider) between 1 and 80),
  add column provider_address_id text check (char_length(provider_address_id) between 1 and 120),
  add column udprn text check (udprn ~ '^[1-9][0-9]{0,11}$'),
  add column uprn text check (uprn ~ '^[0-9]{1,12}$'),
  add column post_town text check (char_length(post_town) between 1 and 100),
  add column country text check (country in ('England','Scotland','Wales','Northern Ireland')),
  add column address_components jsonb not null default '{}'::jsonb check (jsonb_typeof(address_components) = 'object'),
  add column coordinate_precision text not null default 'unknown' check (coordinate_precision in ('unknown','postcode_centroid','building_centroid','rooftop')),
  add column coordinate_source text check (char_length(coordinate_source) between 1 and 80),
  add column address_resolution_state text not null default 'unresolved' check (address_resolution_state in ('unresolved','manual_unverified','provider_verified')),
  add column resolved_at timestamptz,
  add constraint properties_provider_identity_pair check ((address_provider is null) = (provider_address_id is null)),
  add constraint properties_provider_identity_unique unique(address_provider, provider_address_id),
  add constraint properties_postio_identity check (address_provider is distinct from 'postio' or (udprn is not null and udprn = provider_address_id)),
  add constraint properties_coordinate_provenance check ((latitude is null and coordinate_precision = 'unknown' and coordinate_source is null) or (latitude is not null and coordinate_precision <> 'unknown' and coordinate_source is not null)),
  add constraint properties_postio_precision check (coordinate_source is distinct from 'postio' or coordinate_precision = 'postcode_centroid'),
  add constraint properties_resolution_integrity check (
    address_resolution_state = 'unresolved' or
    (resolved_at is not null and postcode is not null and post_town is not null and
      ((address_resolution_state = 'provider_verified' and address_provider is not null) or
       (address_resolution_state = 'manual_unverified' and address_provider is null and udprn is null and latitude is null)))
  );

-- Existing known-coordinate rows predate explicit precision. Do not invent their precision.
-- No such rows currently exist in development; fail review rather than classify them silently.

create function public.resolve_sitefit_property(address jsonb)
returns public.properties
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.properties;
  state text := address->>'resolution';
begin
  if jsonb_typeof(address) is distinct from 'object'
     or state not in ('manual_unverified','provider_verified')
     or state is null
     or jsonb_typeof(address->'components') is distinct from 'object'
     or jsonb_typeof(address->'lines') is distinct from 'array'
     or address->>'postcode' is null or address->>'postTown' is null then
    raise exception 'Invalid selected property' using errcode = '22023';
  end if;
  insert into public.properties (
    formatted_address, postcode, post_town, country, address_provider, provider_address_id,
    udprn, address_components, latitude, longitude, coordinate_precision, coordinate_source,
    address_resolution_state, resolution_status, resolved_at
  ) values (
    address->>'formattedAddress', address->>'postcode', address->>'postTown', address->>'country',
    address->>'provider', address->>'providerAddressId', address->>'udprn',
    (address->'components') || jsonb_build_object('lines', address->'lines'),
    (address->>'latitude')::numeric, (address->>'longitude')::numeric,
    address->>'coordinatePrecision', address->>'coordinateSource', state,
    case when state = 'provider_verified' then 'known'::public.knowledge_status else 'unknown'::public.knowledge_status end,
    now()
  )
  on conflict on constraint properties_provider_identity_unique do update set
    formatted_address = excluded.formatted_address, postcode = excluded.postcode,
    post_town = excluded.post_town, country = excluded.country, udprn = excluded.udprn,
    address_components = excluded.address_components, latitude = excluded.latitude, longitude = excluded.longitude,
    coordinate_precision = excluded.coordinate_precision, coordinate_source = excluded.coordinate_source,
    address_resolution_state = excluded.address_resolution_state, resolution_status = excluded.resolution_status,
    resolved_at = excluded.resolved_at
  returning * into result;
  -- Existing id, created_at and independently enriched uprn are preserved by the update.
  return result;
end;
$$;
revoke all on function public.resolve_sitefit_property(jsonb) from public, anon, authenticated;
grant execute on function public.resolve_sitefit_property(jsonb) to service_role;
comment on column public.properties.udprn is 'Royal Mail delivery-point identifier. Never a UPRN.';
comment on column public.properties.uprn is 'Reserved for independently verified UPRN enrichment; Phase 4 leaves null.';
comment on column public.properties.coordinate_precision is 'Postio coordinates are postcode centroids; absent coordinates are unknown.';
commit;
