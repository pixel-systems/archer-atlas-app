-- Pull avatar_url (and other profile fields) from OIDC metadata on first sign-in,
-- and backfill existing profiles that are missing an avatar.
--
-- Most OAuth providers expose the profile picture under raw_user_meta_data:
--   Google   → "avatar_url" or "picture"
--   Facebook → "picture"   (and a nested {data:{url}} we don't try to parse here)
--   Apple    → no picture (private)
--   GitHub   → "avatar_url"

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text;
  v_avatar text;
begin
  v_name := nullif(coalesce(meta ->> 'full_name', meta ->> 'name'), '');
  v_avatar := nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), '');

  insert into public.profiles (id, display_name, contact_email, avatar_url)
  values (new.id, v_name, new.email, v_avatar)
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url   = coalesce(public.profiles.avatar_url,   excluded.avatar_url);

  return new;
end;
$$;

-- Backfill avatars for existing users that don't have one yet.
update public.profiles p
   set avatar_url = nullif(
         coalesce(
           u.raw_user_meta_data ->> 'avatar_url',
           u.raw_user_meta_data ->> 'picture'
         ),
         ''
       )
  from auth.users u
 where u.id = p.id
   and p.avatar_url is null
   and (
        (u.raw_user_meta_data ->> 'avatar_url') is not null
     or (u.raw_user_meta_data ->> 'picture')    is not null
   );
