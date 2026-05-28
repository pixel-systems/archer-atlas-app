-- Fix infinite recursion in app_roles RLS policies.
-- Root cause: SELECT policy on app_roles referenced app_roles inside its
-- USING clause, triggering recursive policy evaluation.
-- Fix: extract the admin check into a SECURITY DEFINER function that
-- runs with owner privileges and therefore bypasses RLS on app_roles.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.app_roles where user_id = uid and role = 'admin');
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

-- Recreate app_roles policies WITHOUT self-reference
drop policy if exists "roles admin read" on public.app_roles;

create policy "roles self read"
  on public.app_roles for select
  using (auth.uid() = user_id);

create policy "roles admin read all"
  on public.app_roles for select
  using (public.is_admin(auth.uid()));

create policy "roles admin insert"
  on public.app_roles for insert
  with check (public.is_admin(auth.uid()));

create policy "roles admin update"
  on public.app_roles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "roles admin delete"
  on public.app_roles for delete
  using (public.is_admin(auth.uid()));

-- Update other policies that previously inlined the admin subquery
drop policy if exists "claims admin read all" on public.member_claims;
create policy "claims admin read all"
  on public.member_claims for select
  using (public.is_admin(auth.uid()));

drop policy if exists "claims admin update" on public.member_claims;
create policy "claims admin update"
  on public.member_claims for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "scrape runs admin read" on public.scrape_runs;
create policy "scrape runs admin read"
  on public.scrape_runs for select
  using (public.is_admin(auth.uid()));
