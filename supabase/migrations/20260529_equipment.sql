-- User equipment: independently-managed bow components and arrow sets
-- that can be combined into named "bow setups" and assigned to training sessions.

-- ---------- Risers (recurve / barebow) ----------
create table if not exists public.equipment_risers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  model text,
  length_inches numeric(4,1),       -- typical 23 / 25 / 27
  handedness text check (handedness in ('RH','LH')),
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_risers_user_idx on public.equipment_risers(user_id);

-- ---------- Limbs (recurve / barebow) ----------
create table if not exists public.equipment_limbs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  model text,
  length text check (length in ('short','medium','long')),
  draw_weight_lbs numeric(4,1),     -- marked weight on the limb
  fitting text,                     -- ILF / Formula / Bolt-down
  material text,                    -- wood/carbon/foam/laminate
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_limbs_user_idx on public.equipment_limbs(user_id);

-- ---------- Arrow sets (independent of any bow) ----------
create table if not exists public.equipment_arrows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,               -- e.g. "Outdoor 70m carbons"
  brand text,
  model text,                       -- e.g. X10, ACE, Linkboy 4mm
  shaft_type text,                  -- carbon / aluminium / aluminium-carbon / wood / fiberglass
  spine text,                       -- e.g. 600, 1000, 27/64
  length_inches numeric(5,2),       -- arrow length BOP -> throat
  point_grain numeric(5,1),         -- optional point weight
  pin text,                         -- optional, e.g. "Easton 3-49"
  nock text,                        -- nock type / model
  fletching_type text,              -- vanes / feathers / spin-wing
  fletching_length text,            -- e.g. 1.75", 4", 3" parabolic
  fletching_color text,             -- free text
  quantity integer,                 -- how many in the set
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_arrows_user_idx on public.equipment_arrows(user_id);

-- ---------- Bow setups: named combinations the archer shoots with ----------
-- Components are all optional so the user can describe anything from a single
-- compound bow to a fully-configured recurve with riser + limbs + arrows.
create table if not exists public.equipment_bow_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bow_type text not null check (bow_type in (
    'recurve','barebow','compound','longbow','traditional','horse_bow','crossbow','other'
  )),
  -- For monolithic bows (compound / longbow / traditional) store details inline.
  brand text,
  model text,
  draw_weight_lbs numeric(4,1),
  draw_length_inches numeric(4,2),
  -- For recurve / barebow: link to the riser & limbs components.
  riser_id uuid references public.equipment_risers(id) on delete set null,
  limbs_id uuid references public.equipment_limbs(id) on delete set null,
  -- Default arrow set (a session can still override, but most archers shoot one).
  arrows_id uuid references public.equipment_arrows(id) on delete set null,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_bow_setups_user_idx on public.equipment_bow_setups(user_id);

-- Only one default setup per user.
create unique index if not exists equipment_bow_setups_one_default
  on public.equipment_bow_setups(user_id) where is_default;

-- ---------- updated_at triggers ----------
create or replace function public.set_equipment_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_equipment_risers_updated_at on public.equipment_risers;
create trigger trg_equipment_risers_updated_at
  before update on public.equipment_risers
  for each row execute function public.set_equipment_updated_at();

drop trigger if exists trg_equipment_limbs_updated_at on public.equipment_limbs;
create trigger trg_equipment_limbs_updated_at
  before update on public.equipment_limbs
  for each row execute function public.set_equipment_updated_at();

drop trigger if exists trg_equipment_arrows_updated_at on public.equipment_arrows;
create trigger trg_equipment_arrows_updated_at
  before update on public.equipment_arrows
  for each row execute function public.set_equipment_updated_at();

drop trigger if exists trg_equipment_bow_setups_updated_at on public.equipment_bow_setups;
create trigger trg_equipment_bow_setups_updated_at
  before update on public.equipment_bow_setups
  for each row execute function public.set_equipment_updated_at();

-- ---------- RLS: own-rows-only for every equipment table ----------
alter table public.equipment_risers     enable row level security;
alter table public.equipment_limbs      enable row level security;
alter table public.equipment_arrows     enable row level security;
alter table public.equipment_bow_setups enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['equipment_risers','equipment_limbs','equipment_arrows','equipment_bow_setups']
  loop
    execute format('drop policy if exists "%1$s select own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s insert own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s update own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s delete own" on public.%1$s', t);

    execute format('create policy "%1$s select own" on public.%1$s for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s insert own" on public.%1$s for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s update own" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s delete own" on public.%1$s for delete using (user_id = auth.uid())', t);
  end loop;
end$$;

grant select, insert, update, delete on public.equipment_risers     to authenticated;
grant select, insert, update, delete on public.equipment_limbs      to authenticated;
grant select, insert, update, delete on public.equipment_arrows     to authenticated;
grant select, insert, update, delete on public.equipment_bow_setups to authenticated;

-- ---------- Link training sessions to a bow setup ----------
alter table public.training_sessions
  add column if not exists bow_setup_id uuid
  references public.equipment_bow_setups(id) on delete set null;

create index if not exists training_sessions_bow_setup_idx
  on public.training_sessions(bow_setup_id);
