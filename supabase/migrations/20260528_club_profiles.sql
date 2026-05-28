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
