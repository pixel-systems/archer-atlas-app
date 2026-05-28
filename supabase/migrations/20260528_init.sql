-- Archer Atlas — initial schema
-- Apply with: supabase db push  (or paste into the SQL editor)

create extension if not exists "pgcrypto";

-------------------------------------------------------------------------------
-- Core data (publicly readable, written by service-role scrapers only)
-------------------------------------------------------------------------------

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  slz_id integer,
  license_number text not null unique,
  first_name text not null,
  last_name text not null,
  birth_year integer,
  club_id uuid references public.clubs(id) on delete set null,
  category_target text,
  category_3d text,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists members_club_idx on public.members(club_id);
create index if not exists members_name_idx on public.members(last_name, first_name);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  held_on date,
  season integer,
  source_url text not null,
  kind text,
  created_at timestamptz not null default now(),
  unique(source_url)
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  division text,
  category text,
  score numeric,
  rank integer,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists results_member_idx on public.results(member_id);
create index if not exists results_competition_idx on public.results(competition_id);

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  award_type text not null,
  award_level text,
  year integer,
  source_url text,
  created_at timestamptz not null default now()
);
create index if not exists awards_member_idx on public.awards(member_id);

-------------------------------------------------------------------------------
-- User data
-------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  contact_email text,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.claim_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.member_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status public.claim_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id)
);
create index if not exists member_claims_profile_idx on public.member_claims(profile_id);
create index if not exists member_claims_status_idx on public.member_claims(status);

create type public.app_role as enum ('user', 'admin');

create table if not exists public.app_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- Scrape tracking
-------------------------------------------------------------------------------

create type public.scrape_source as enum ('members', 'awards', 'results_index', 'result_pdf', 'all');
create type public.scrape_status as enum ('running', 'success', 'failed', 'partial');

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source public.scrape_source not null,
  status public.scrape_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_processed integer not null default 0,
  items_failed integer not null default 0,
  errors jsonb,
  triggered_by uuid references auth.users(id)
);
create index if not exists scrape_runs_started_idx on public.scrape_runs(started_at desc);

-------------------------------------------------------------------------------
-- Auto-provision profile on signup
-------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, contact_email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- RLS
-------------------------------------------------------------------------------

alter table public.clubs enable row level security;
alter table public.members enable row level security;
alter table public.competitions enable row level security;
alter table public.results enable row level security;
alter table public.awards enable row level security;
alter table public.profiles enable row level security;
alter table public.member_claims enable row level security;
alter table public.app_roles enable row level security;
alter table public.scrape_runs enable row level security;

-- Public read for catalog tables
create policy "clubs are public" on public.clubs for select using (true);
create policy "members are public" on public.members for select using (true);
create policy "competitions are public" on public.competitions for select using (true);
create policy "results are public" on public.results for select using (true);
create policy "awards are public" on public.awards for select using (true);

-- Profiles: anyone can read public profile info, only owner can update
create policy "profiles are public read" on public.profiles for select using (true);
create policy "profile owner can update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profile owner can insert" on public.profiles for insert
  with check (auth.uid() = id);

-- Member claims: owner can read/insert own; admins can read all & update
create policy "claims owner can read" on public.member_claims for select
  using (auth.uid() = profile_id);
create policy "claims owner can insert" on public.member_claims for insert
  with check (auth.uid() = profile_id and status = 'pending');
create policy "claims admin read all" on public.member_claims for select
  using (exists (select 1 from public.app_roles r where r.user_id = auth.uid() and r.role = 'admin'));
create policy "claims admin update" on public.member_claims for update
  using (exists (select 1 from public.app_roles r where r.user_id = auth.uid() and r.role = 'admin'));

-- app_roles: only admins can read/write (bootstrap one admin via SQL)
create policy "roles admin read" on public.app_roles for select
  using (auth.uid() = user_id or exists (select 1 from public.app_roles r where r.user_id = auth.uid() and r.role = 'admin'));

-- scrape_runs: admins read; service role writes (bypasses RLS)
create policy "scrape runs admin read" on public.scrape_runs for select
  using (exists (select 1 from public.app_roles r where r.user_id = auth.uid() and r.role = 'admin'));
