-- Grant required table privileges to Supabase roles.
-- On newer Supabase projects (and projects using the new sb_publishable_/
-- sb_secret_ keys), custom-created tables do NOT inherit default privileges,
-- so SELECT/INSERT/etc. fail with "permission denied" *before* RLS is checked.
-- These grants make the tables usable; RLS policies still gate row access.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.clubs       to anon, authenticated;
grant select on public.members     to anon, authenticated;
grant select on public.competitions to anon, authenticated;
grant select on public.results     to anon, authenticated;
grant select on public.awards      to anon, authenticated;

grant select, insert, update, delete on public.profiles      to authenticated;
grant select                         on public.profiles      to anon;

grant select, insert on public.member_claims to authenticated;
grant select, update on public.member_claims to authenticated;

grant select on public.app_roles   to authenticated;
grant select on public.scrape_runs to authenticated;

-- Service role bypasses RLS but still needs SQL privileges.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Ensure any future tables created in public also get the right grants.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
