-- =============================================================================
-- Competition overviews derived from member_season_results
-- =============================================================================
-- The SLZ "Výsledky" portal exposes per-archer rows but not a clean
-- competition list. We already store every per-archer row in
-- member_season_results, so the cheapest way to expose a competition
-- view is via materialized views over that table.
--
-- A stable competition "id" is derived from md5(name || held_on).
-- =============================================================================

create extension if not exists pg_trgm;

drop materialized view if exists public.competition_entries cascade;
drop materialized view if exists public.competition_overview cascade;

-- One row per archer per competition (joined with the member + club).
create materialized view public.competition_entries as
select
  md5(
    coalesce(msr.competition_name, '') || '|' || coalesce(msr.achieved_on::text, '')
  ) as competition_id,
  msr.id              as entry_id,
  msr.member_id,
  m.license_number,
  m.first_name,
  m.last_name,
  m.club_id,
  c.name              as club_name,
  c.slug              as club_slug,
  msr.competition_name,
  msr.achieved_on,
  msr.season,
  msr.score,
  msr.discipline,
  msr.setup,
  msr.category,
  msr.division,
  msr.is_season_max
from public.member_season_results msr
join public.members m on m.id = msr.member_id
left join public.clubs c on c.id = m.club_id
where msr.competition_name is not null and msr.competition_name <> '';

create unique index competition_entries_entry_id_idx
  on public.competition_entries(entry_id);
create index competition_entries_competition_idx
  on public.competition_entries(competition_id);
create index competition_entries_member_idx
  on public.competition_entries(member_id);
create index competition_entries_season_idx
  on public.competition_entries(season);

-- One row per competition with aggregates.
create materialized view public.competition_overview as
select
  competition_id                              as id,
  competition_name                            as name,
  achieved_on                                 as held_on,
  max(season)                                 as season,
  count(*)                                    as entries_count,
  count(distinct member_id)                   as athletes_count,
  count(distinct club_id) filter (where club_id is not null) as clubs_count,
  max(score)                                  as top_score,
  array_agg(distinct discipline) filter (where discipline is not null) as disciplines,
  array_agg(distinct division)   filter (where division   is not null) as divisions,
  array_agg(distinct category)   filter (where category   is not null) as categories
from public.competition_entries
group by competition_id, competition_name, achieved_on;

create unique index competition_overview_id_idx on public.competition_overview(id);
create index competition_overview_held_on_idx on public.competition_overview(held_on desc nulls last);
create index competition_overview_season_idx on public.competition_overview(season desc nulls last);
create index competition_overview_name_trgm_idx
  on public.competition_overview using gin (name gin_trgm_ops);

-- =============================================================================
-- Refresh function (callable from the admin scrape runner)
-- =============================================================================
create or replace function public.refresh_competition_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.competition_entries;
  refresh materialized view concurrently public.competition_overview;
end;
$$;

revoke all on function public.refresh_competition_views() from public;
grant execute on function public.refresh_competition_views() to service_role;

-- =============================================================================
-- Grants — materialized views ignore RLS but obey GRANTs
-- =============================================================================
grant select on public.competition_overview to anon, authenticated;
grant select on public.competition_entries  to anon, authenticated;
