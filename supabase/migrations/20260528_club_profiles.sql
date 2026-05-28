-- Profile fields scraped from https://slz.sk/index.php/klub
alter table public.clubs
  add column if not exists code text,
  add column if not exists logo_url text,
  add column if not exists website_url text,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists profile_scraped_at timestamptz;

-- Help reverse lookup by 3-letter SLZ code (PET, ACG, ARB, ...).
create unique index if not exists clubs_code_unique on public.clubs (code) where code is not null;

-- Extend the scrape_source enum (idempotent: only added if missing).
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'scrape_source' and e.enumlabel = 'club_profiles'
  ) then
    alter type public.scrape_source add value 'club_profiles';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'scrape_source' and e.enumlabel = 'competitions'
  ) then
    alter type public.scrape_source add value 'competitions';
  end if;
end$$;

