-- Archer Atlas — member detail enrichment
-- Adds personal-bests and per-season-results tables, and a `member_details`
-- scrape source enum value.

-------------------------------------------------------------------------------
-- Enum extension
-------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'scrape_source' and e.enumlabel = 'member_details'
  ) then
    alter type public.scrape_source add value 'member_details';
  end if;
end$$;

-------------------------------------------------------------------------------
-- Members: track when the detail page was last enriched
-------------------------------------------------------------------------------

alter table public.members add column if not exists detail_scraped_at timestamptz;
alter table public.members add column if not exists detail_url text;
create index if not exists members_detail_scraped_idx on public.members(detail_scraped_at nulls first);

-------------------------------------------------------------------------------
-- Personal bests (all-time top scores per discipline, as published by SLZ)
-------------------------------------------------------------------------------

create table if not exists public.member_personal_bests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  score numeric,
  achieved_on date,
  competition_name text,
  discipline text,           -- e.g. "Terénna.IFAA", "Terčová", "Halová"
  setup text,                -- e.g. "2x50m,80cm,72šípov"
  category text,             -- e.g. "Muži"
  division text,             -- e.g. "Kladkový.luk"
  created_at timestamptz not null default now()
);
create index if not exists member_pb_member_idx on public.member_personal_bests(member_id);

-------------------------------------------------------------------------------
-- Per-season results (every row from "Výsledky v sezóne" for every available year)
-------------------------------------------------------------------------------

create table if not exists public.member_season_results (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  season integer not null,
  score numeric,
  achieved_on date,
  competition_name text,
  discipline text,
  setup text,
  category text,
  division text,
  is_season_max boolean not null default false,  -- true if also in "Sezónne maximá"
  created_at timestamptz not null default now()
);
create index if not exists member_season_results_member_idx
  on public.member_season_results(member_id);
create index if not exists member_season_results_season_idx
  on public.member_season_results(season);
create index if not exists member_season_results_member_season_idx
  on public.member_season_results(member_id, season);

-------------------------------------------------------------------------------
-- RLS — public read, service-role write
-------------------------------------------------------------------------------

alter table public.member_personal_bests enable row level security;
alter table public.member_season_results enable row level security;

drop policy if exists "member_personal_bests are public" on public.member_personal_bests;
create policy "member_personal_bests are public"
  on public.member_personal_bests for select using (true);

drop policy if exists "member_season_results are public" on public.member_season_results;
create policy "member_season_results are public"
  on public.member_season_results for select using (true);

-------------------------------------------------------------------------------
-- Grants (mirror 20260528_grants.sql for the new tables)
-------------------------------------------------------------------------------

grant select on public.member_personal_bests to anon, authenticated;
grant select on public.member_season_results to anon, authenticated;
grant all on public.member_personal_bests to service_role;
grant all on public.member_season_results to service_role;
