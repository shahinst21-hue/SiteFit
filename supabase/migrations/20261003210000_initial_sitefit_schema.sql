-- Phase 3 foundation only: no analysis, provider, payment or publishing execution.
begin;

create type public.analysis_status as enum (
  'draft', 'collecting_free_data', 'free_ready', 'awaiting_payment', 'paid',
  'collecting_full_data', 'calculating', 'generating_report', 'ready', 'failed'
);
create type public.business_category as enum ('coffee-shop', 'restaurant', 'hair-beauty-salon');
create type public.evidence_classification as enum (
  'measured_data', 'official_public_data', 'commercial_data', 'modelled_estimate',
  'ai_inference', 'user_supplied_information'
);
create type public.knowledge_status as enum ('known', 'estimated', 'unknown');
create type public.blog_status as enum ('draft', 'scheduled', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  formatted_address text not null check (char_length(formatted_address) between 1 and 500),
  postcode text,
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  external_place_id text unique,
  resolution_status public.knowledge_status not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid references public.properties(id) on delete restrict,
  business_type text not null check (business_type in ('coffee-shop', 'restaurant', 'hair-salon', 'beauty-salon')),
  business_category public.business_category not null,
  status public.analysis_status not null default 'draft',
  schema_version integer not null default 1 check (schema_version > 0),
  failure_code text check (char_length(failure_code) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((business_type = 'coffee-shop' and business_category = 'coffee-shop') or
         (business_type = 'restaurant' and business_category = 'restaurant') or
         (business_type in ('hair-salon','beauty-salon') and business_category = 'hair-beauty-salon'))
);
create index analyses_owner_created_idx on public.analyses(owner_id, created_at desc);
create index analyses_status_idx on public.analyses(status);
create index analyses_property_idx on public.analyses(property_id);

create table public.analysis_inputs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  version integer not null check (version > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  user_supplied jsonb not null check (jsonb_typeof(user_supplied) = 'object'),
  created_at timestamptz not null default now(),
  unique(analysis_id, version), unique(analysis_id, id)
);

create table public.data_snapshots (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  source text not null,
  dataset_version text,
  retrieved_at timestamptz not null,
  observed_at timestamptz,
  availability text not null check (availability in ('available','partial','unavailable','unknown')),
  normalised_data jsonb check (jsonb_typeof(normalised_data) = 'object'),
  provider_metadata jsonb not null default '{}' check (jsonb_typeof(provider_metadata) = 'object'),
  cost_metadata jsonb check (jsonb_typeof(cost_metadata) = 'object'),
  permitted_raw_reference text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(analysis_id, id)
);
create index data_snapshots_analysis_idx on public.data_snapshots(analysis_id, retrieved_at desc);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  snapshot_id uuid,
  input_id uuid,
  classification public.evidence_classification not null,
  knowledge public.knowledge_status not null default 'unknown',
  claim text not null,
  value jsonb,
  units text,
  geographic_scope jsonb check (jsonb_typeof(geographic_scope) = 'object'),
  source_reference text,
  observed_at timestamptz,
  limitations text,
  derivation jsonb check (jsonb_typeof(derivation) = 'object'),
  created_at timestamptz not null default now(),
  unique(analysis_id, id),
  foreign key(analysis_id, snapshot_id) references public.data_snapshots(analysis_id, id) on delete restrict,
  foreign key(analysis_id, input_id) references public.analysis_inputs(analysis_id, id) on delete restrict
);
create index evidence_items_analysis_idx on public.evidence_items(analysis_id);
create index evidence_items_snapshot_idx on public.evidence_items(analysis_id, snapshot_id);
create index evidence_items_input_idx on public.evidence_items(analysis_id, input_id);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  evidence_id uuid,
  business_name text not null,
  category text,
  address text,
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  observed_at timestamptz,
  limitations text,
  created_at timestamptz not null default now(),
  foreign key(analysis_id, evidence_id) references public.evidence_items(analysis_id, id) on delete restrict,
  check ((latitude is null) = (longitude is null))
);
create index competitors_analysis_idx on public.competitors(analysis_id);

create table public.premises_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  property_id uuid references public.properties(id) on delete restrict,
  evidence_id uuid,
  business_name text,
  business_category text,
  estimated_start date,
  estimated_end date,
  vacancy_signal text,
  source text,
  evidence_quality jsonb check (jsonb_typeof(evidence_quality) = 'object'),
  confidence numeric check (confidence between 0 and 1),
  knowledge public.knowledge_status not null default 'unknown',
  created_at timestamptz not null default now(),
  foreign key(analysis_id, evidence_id) references public.evidence_items(analysis_id, id) on delete restrict,
  check (estimated_end is null or estimated_start is null or estimated_end >= estimated_start)
);
create index premises_events_analysis_idx on public.premises_events(analysis_id);
create index premises_events_property_idx on public.premises_events(property_id);

create table public.economic_models (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  input_id uuid not null,
  model_version text not null,
  inputs jsonb not null check (jsonb_typeof(inputs) = 'object'),
  outputs jsonb check (jsonb_typeof(outputs) = 'object'),
  scenario_assumptions jsonb not null default '{}' check (jsonb_typeof(scenario_assumptions) = 'object'),
  missing_inputs text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(analysis_id, id),
  foreign key(analysis_id, input_id) references public.analysis_inputs(analysis_id, id) on delete restrict
);
create index economic_models_analysis_idx on public.economic_models(analysis_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  input_id uuid not null,
  economic_model_id uuid,
  version integer not null check (version > 0),
  schema_version integer not null check (schema_version > 0),
  tier text not null check (tier in ('free','full')),
  status text not null default 'draft' check (status in ('draft','ready','failed')),
  provenance jsonb not null default '{}' check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(analysis_id, version), unique(analysis_id, id),
  foreign key(analysis_id, input_id) references public.analysis_inputs(analysis_id, id) on delete restrict,
  foreign key(analysis_id, economic_model_id) references public.economic_models(analysis_id, id) on delete restrict
);
create index reports_analysis_idx on public.reports(analysis_id);

create table public.report_sections (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null,
  report_id uuid not null,
  section_key text not null check (section_key in (
    'location-snapshot','customer-catchment','demand-signals','competition',
    'complementary-businesses','accessibility','mobility-signals','premises-history',
    'local-business-signals','economics','scenario-analysis','evidence-supporting',
    'evidence-against','unknowns','in-person-checks','landlord-questions')),
  position smallint not null check (position between 1 and 16),
  structured_content jsonb not null check (jsonb_typeof(structured_content) = 'object'),
  claim_evidence jsonb not null default '[]' check (jsonb_typeof(claim_evidence) = 'array'),
  created_at timestamptz not null default now(),
  unique(report_id, section_key), unique(report_id, position),
  foreign key(analysis_id, report_id) references public.reports(analysis_id, id) on delete restrict
);
create index report_sections_analysis_idx on public.report_sections(analysis_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  provider text not null,
  idempotency_key text not null unique,
  checkout_reference text unique,
  payment_reference text unique,
  price_reference text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','succeeded','failed','cancelled','refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(analysis_id, id)
);
create index payments_analysis_idx on public.payments(analysis_id);

create table public.pdf_exports (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null,
  report_id uuid not null,
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  private_storage_path text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(analysis_id, report_id) references public.reports(analysis_id, id) on delete restrict
);
create index pdf_exports_analysis_idx on public.pdf_exports(analysis_id);

create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.analyses(id) on delete restrict,
  payment_id uuid,
  report_id uuid,
  event_type text not null check (char_length(event_type) between 1 and 120),
  correlation_id uuid,
  outcome text,
  safe_metadata jsonb not null default '{}' check (jsonb_typeof(safe_metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  foreign key(analysis_id, payment_id) references public.payments(analysis_id, id) on delete restrict,
  foreign key(analysis_id, report_id) references public.reports(analysis_id, id) on delete restrict,
  check ((payment_id is null and report_id is null) or analysis_id is not null)
);
create index system_events_analysis_time_idx on public.system_events(analysis_id, occurred_at desc);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 180),
  title text not null check (char_length(title) between 1 and 200),
  excerpt text not null check (char_length(excerpt) between 1 and 1000),
  content jsonb not null check (jsonb_typeof(content) = 'array'),
  featured_image jsonb check (jsonb_typeof(featured_image) = 'object'),
  featured_image_alt text not null default '',
  author jsonb not null check (jsonb_typeof(author) = 'object'),
  status public.blog_status not null default 'draft',
  category text not null,
  tags text[] not null default '{}',
  featured boolean not null default false,
  seo_title text not null check (char_length(seo_title) between 1 and 200),
  seo_description text not null check (char_length(seo_description) between 1 and 500),
  canonical_url text,
  og_title text not null,
  og_description text not null,
  og_image jsonb check (jsonb_typeof(og_image) = 'object'),
  cta jsonb check (jsonb_typeof(cta) = 'object'),
  date_published timestamptz,
  date_modified timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or date_published is not null),
  check (status <> 'scheduled' or scheduled_for is not null),
  check (date_modified is null or date_published is null or date_modified >= date_published),
  check (featured_image is null or char_length(featured_image_alt) > 0)
);
create index blog_posts_publication_idx on public.blog_posts(status, date_published desc);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create function public.create_profile_for_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values(new.id); return new; end;
$$;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
create trigger sitefit_auth_profile after insert on auth.users
for each row execute function public.create_profile_for_auth_user();
-- Idempotent backfill for any users created before this migration.
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','properties','analyses','reports','payments','pdf_exports','blog_posts'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',table_name);
  end loop;
  foreach table_name in array array['profiles','properties','analyses','analysis_inputs','data_snapshots','evidence_items','competitors','premises_events','economic_models','reports','report_sections','payments','pdf_exports','system_events','blog_posts'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated',table_name);
    execute format('grant all on table public.%I to service_role',table_name);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.properties, public.analyses, public.analysis_inputs,
  public.data_snapshots, public.evidence_items, public.competitors, public.premises_events,
  public.economic_models, public.reports, public.report_sections, public.payments, public.pdf_exports to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert(owner_id, business_type, business_category) on public.analyses to authenticated;
grant update(business_type, business_category) on public.analyses to authenticated;
grant insert(analysis_id, version, schema_version, user_supplied) on public.analysis_inputs to authenticated;
grant select on public.blog_posts to anon, authenticated;

create policy profiles_owner_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_owner_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy analyses_owner_read on public.analyses for select to authenticated using (owner_id = (select auth.uid()));
create policy analyses_owner_draft_insert on public.analyses for insert to authenticated with check (owner_id = (select auth.uid()) and status = 'draft' and property_id is null);
create policy analyses_owner_draft_update on public.analyses for update to authenticated using (owner_id = (select auth.uid()) and status = 'draft') with check (owner_id = (select auth.uid()) and status = 'draft');
create policy properties_linked_owner_read on public.properties for select to authenticated using (
  exists(select 1 from public.analyses a where a.property_id = properties.id and a.owner_id = (select auth.uid()))
);
create policy inputs_owner_draft_insert on public.analysis_inputs for insert to authenticated with check (
  exists(select 1 from public.analyses a where a.id = analysis_inputs.analysis_id and a.owner_id = (select auth.uid()) and a.status = 'draft')
);

do $$
declare table_name text;
begin
  foreach table_name in array array['analysis_inputs','data_snapshots','evidence_items','competitors','premises_events','economic_models','reports','report_sections','payments','pdf_exports'] loop
    execute format('create policy analysis_owner_read on public.%I for select to authenticated using (exists(select 1 from public.analyses a where a.id = %I.analysis_id and a.owner_id = (select auth.uid())))',table_name,table_name);
  end loop;
end $$;

-- Operational events and all derived writes are inaccessible to client roles.
-- No admin/editor role is invented. Future authorised writers need a controlled service.
create policy published_blog_read on public.blog_posts for select to anon, authenticated
using (status = 'published' and date_published <= now());

commit;
