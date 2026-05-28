-- Training journal: WA + IFAA formats and per-user training sessions.

create table if not exists public.training_formats (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  organisation text not null check (organisation in ('WA','IFAA','OTHER')),
  name text not null,
  discipline text not null,           -- outdoor_target | indoor | field | 3d | custom
  scoring_type text not null,         -- wa_10_zone | wa_field_6_zone | ifaa_field_5_4_3 | ifaa_indoor_5 | ifaa_3d_5_4_3 | ifaa_animal | wa_3d | custom
  max_score integer,
  default_distances jsonb not null default '[]'::jsonb,
  -- shape: [{ label: text, ends: int, arrows_per_end: int, max_per_arrow: int }]
  sort_order integer not null default 100,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id uuid not null references public.training_formats(id),
  session_date date not null default current_date,
  division text,
  age_category text,
  bow_style text,
  location text,
  weather text,
  notes text,
  total_score integer,
  total_arrows integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_sessions_user_date_idx
  on public.training_sessions(user_id, session_date desc);

create table if not exists public.training_session_ends (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  sort_order integer not null,
  distance_label text,
  end_number integer not null,
  arrows jsonb not null default '[]'::jsonb,    -- e.g. ["X","10","9","M","9","8"]
  end_total integer,
  created_at timestamptz not null default now()
);
create index if not exists training_session_ends_session_idx
  on public.training_session_ends(session_id, sort_order);

-- updated_at trigger
create or replace function public.set_training_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_training_sessions_updated_at on public.training_sessions;
create trigger trg_training_sessions_updated_at
  before update on public.training_sessions
  for each row execute function public.set_training_updated_at();

-- RLS
alter table public.training_formats enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_ends enable row level security;

drop policy if exists "training_formats select" on public.training_formats;
create policy "training_formats select" on public.training_formats for select using (true);

drop policy if exists "training_sessions select own" on public.training_sessions;
create policy "training_sessions select own" on public.training_sessions
  for select using (user_id = auth.uid());

drop policy if exists "training_sessions insert own" on public.training_sessions;
create policy "training_sessions insert own" on public.training_sessions
  for insert with check (user_id = auth.uid());

drop policy if exists "training_sessions update own" on public.training_sessions;
create policy "training_sessions update own" on public.training_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "training_sessions delete own" on public.training_sessions;
create policy "training_sessions delete own" on public.training_sessions
  for delete using (user_id = auth.uid());

drop policy if exists "training_ends select own" on public.training_session_ends;
create policy "training_ends select own" on public.training_session_ends for select using (
  exists (select 1 from public.training_sessions s where s.id = session_id and s.user_id = auth.uid())
);

drop policy if exists "training_ends insert own" on public.training_session_ends;
create policy "training_ends insert own" on public.training_session_ends for insert with check (
  exists (select 1 from public.training_sessions s where s.id = session_id and s.user_id = auth.uid())
);

drop policy if exists "training_ends update own" on public.training_session_ends;
create policy "training_ends update own" on public.training_session_ends for update using (
  exists (select 1 from public.training_sessions s where s.id = session_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.training_sessions s where s.id = session_id and s.user_id = auth.uid())
);

drop policy if exists "training_ends delete own" on public.training_session_ends;
create policy "training_ends delete own" on public.training_session_ends for delete using (
  exists (select 1 from public.training_sessions s where s.id = session_id and s.user_id = auth.uid())
);

grant select on public.training_formats to anon, authenticated;
grant select, insert, update, delete on public.training_sessions to authenticated;
grant select, insert, update, delete on public.training_session_ends to authenticated;

-- Seed: WA + IFAA standard formats.
insert into public.training_formats
  (code, organisation, name, discipline, scoring_type, max_score, default_distances, sort_order)
values
  ('wa_720_70m', 'WA', 'WA 720 (70 m)', 'outdoor_target', 'wa_10_zone', 720,
    '[{"label":"70 m","ends":12,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 10),
  ('wa_720_60m', 'WA', 'WA 720 (60 m)', 'outdoor_target', 'wa_10_zone', 720,
    '[{"label":"60 m","ends":12,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 11),
  ('wa_720_50m_compound', 'WA', 'WA 720 (50 m, compound)', 'outdoor_target', 'wa_10_zone', 720,
    '[{"label":"50 m","ends":12,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 12),
  ('wa_720_50m_recurve', 'WA', 'WA 720 (50 m, recurve)', 'outdoor_target', 'wa_10_zone', 720,
    '[{"label":"50 m","ends":12,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 13),
  ('wa_720_30m', 'WA', 'WA 720 (30 m)', 'outdoor_target', 'wa_10_zone', 720,
    '[{"label":"30 m","ends":12,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 14),

  ('wa_1440_gents', 'WA', 'WA 1440 — Gents (90/70/50/30 m)', 'outdoor_target', 'wa_10_zone', 1440,
    '[{"label":"90 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"70 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"50 m","ends":12,"arrows_per_end":3,"max_per_arrow":10},
      {"label":"30 m","ends":12,"arrows_per_end":3,"max_per_arrow":10}]'::jsonb, 20),
  ('wa_1440_ladies', 'WA', 'WA 1440 — Ladies (70/60/50/30 m)', 'outdoor_target', 'wa_10_zone', 1440,
    '[{"label":"70 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"60 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"50 m","ends":12,"arrows_per_end":3,"max_per_arrow":10},
      {"label":"30 m","ends":12,"arrows_per_end":3,"max_per_arrow":10}]'::jsonb, 21),
  ('wa_1440_cadet_gents', 'WA', 'WA 1440 — Cadet Gents (70/60/50/30 m)', 'outdoor_target', 'wa_10_zone', 1440,
    '[{"label":"70 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"60 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"50 m","ends":12,"arrows_per_end":3,"max_per_arrow":10},
      {"label":"30 m","ends":12,"arrows_per_end":3,"max_per_arrow":10}]'::jsonb, 22),
  ('wa_1440_cadet_ladies', 'WA', 'WA 1440 — Cadet Ladies (60/50/40/30 m)', 'outdoor_target', 'wa_10_zone', 1440,
    '[{"label":"60 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"50 m","ends":6,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"40 m","ends":12,"arrows_per_end":3,"max_per_arrow":10},
      {"label":"30 m","ends":12,"arrows_per_end":3,"max_per_arrow":10}]'::jsonb, 23),

  ('wa_18m', 'WA', 'WA Indoor 18 m (60 šípov)', 'indoor', 'wa_10_zone', 600,
    '[{"label":"18 m","ends":10,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 30),
  ('wa_25m', 'WA', 'WA Indoor 25 m (60 šípov)', 'indoor', 'wa_10_zone', 600,
    '[{"label":"25 m","ends":10,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 31),
  ('wa_combined_indoor', 'WA', 'WA Combined Indoor (25 m + 18 m)', 'indoor', 'wa_10_zone', 1200,
    '[{"label":"25 m","ends":10,"arrows_per_end":6,"max_per_arrow":10},
      {"label":"18 m","ends":10,"arrows_per_end":6,"max_per_arrow":10}]'::jsonb, 32),

  ('wa_field_24_marked', 'WA', 'WA Field — 24 terčov (Marked)', 'field', 'wa_field_6_zone', 432,
    '[{"label":"24 terčov","ends":24,"arrows_per_end":3,"max_per_arrow":6}]'::jsonb, 40),
  ('wa_field_24_unmarked', 'WA', 'WA Field — 24 terčov (Unmarked)', 'field', 'wa_field_6_zone', 432,
    '[{"label":"24 terčov","ends":24,"arrows_per_end":3,"max_per_arrow":6}]'::jsonb, 41),
  ('wa_field_12', 'WA', 'WA Field — 12 terčov', 'field', 'wa_field_6_zone', 216,
    '[{"label":"12 terčov","ends":12,"arrows_per_end":3,"max_per_arrow":6}]'::jsonb, 42),

  ('wa_3d_24', 'WA', 'WA 3D — 24 terčov', '3d', 'wa_3d', null,
    '[{"label":"24 terčov","ends":24,"arrows_per_end":2,"max_per_arrow":11}]'::jsonb, 50),

  ('ifaa_field_28', 'IFAA', 'IFAA Field Round (28 terčov)', 'field', 'ifaa_field_5_4_3', 560,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":4,"max_per_arrow":5}]'::jsonb, 100),
  ('ifaa_hunter_28', 'IFAA', 'IFAA Hunter Round (28 terčov)', 'field', 'ifaa_field_5_4_3', 560,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":4,"max_per_arrow":5}]'::jsonb, 101),
  ('ifaa_expert_field_28', 'IFAA', 'IFAA Expert Field Round (28 terčov)', 'field', 'ifaa_field_5_4_3', 560,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":4,"max_per_arrow":5}]'::jsonb, 102),
  ('ifaa_international_28', 'IFAA', 'IFAA International Round (28 terčov)', 'field', 'ifaa_field_5_4_3', 560,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":4,"max_per_arrow":5}]'::jsonb, 103),
  ('ifaa_animal_28', 'IFAA', 'IFAA Animal Round (28 terčov)', 'field', 'ifaa_animal', null,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":3,"max_per_arrow":21}]'::jsonb, 104),

  ('ifaa_indoor_20yd', 'IFAA', 'IFAA Indoor (20 yd)', 'indoor', 'ifaa_indoor_5', 300,
    '[{"label":"20 yd","ends":12,"arrows_per_end":5,"max_per_arrow":5}]'::jsonb, 110),
  ('ifaa_indoor_25m', 'IFAA', 'IFAA Indoor (25 m)', 'indoor', 'ifaa_indoor_5', 300,
    '[{"label":"25 m","ends":12,"arrows_per_end":5,"max_per_arrow":5}]'::jsonb, 111),
  ('ifaa_flint_5x5', 'IFAA', 'IFAA Flint (5 ends × 5 arrows)', 'indoor', 'ifaa_indoor_5', 125,
    '[{"label":"varies","ends":5,"arrows_per_end":5,"max_per_arrow":5}]'::jsonb, 112),

  ('ifaa_3d_standard_28', 'IFAA', 'IFAA 3D Standard Round (28 terčov)', '3d', 'ifaa_3d_5_4_3', 280,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":2,"max_per_arrow":5}]'::jsonb, 120),
  ('ifaa_3d_hunter_28', 'IFAA', 'IFAA 3D Hunter Round (28 terčov)', '3d', 'ifaa_3d_5_4_3', 280,
    '[{"label":"28 terčov","ends":28,"arrows_per_end":2,"max_per_arrow":5}]'::jsonb, 121),

  ('custom_freeform', 'OTHER', 'Voľný tréning', 'custom', 'custom', null, '[]'::jsonb, 999)
on conflict (code) do nothing;
