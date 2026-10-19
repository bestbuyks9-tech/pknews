-- PROPOSED — item 1 applied, items 2-3 NOT APPLIED. Review before running in the Supabase SQL editor.
-- This Supabase project's auth is shared with other apps, so each change below
-- is scoped to the newsroom tables/bucket only and leaves other apps alone.

-- 1) Stop turning every new auth account into a newsroom journalist.
--    Today the on_auth_user_created_cms trigger inserts a profiles row for ANY
--    new auth user, and profiles.role defaults to 'editor'. Anyone who signs up
--    through the public API (or any user of another app on this project) can
--    then write drafts, upload to the public media bucket and read staff emails.
--    The Studio's "Shto anëtar" button already creates the profile with the
--    chosen role through the team edge function, so the trigger is not needed.
--    APPLIED 2026-10-19 as migration "disable_auto_cms_profile": the trigger
--    function was replaced with a no-op (a DROP timed out in the connector).
--    To remove it fully later:
--      drop trigger if exists on_auth_user_created_cms on auth.users;
--      drop function if exists public.handle_new_cms_user();
create or replace function public.handle_new_cms_user()
returns trigger language plpgsql security definer set search_path to 'pg_catalog' as $$
begin
  return new;
end;
$$;

-- 2) Only admins need to see the whole team list (emails). Journalists and
--    editors-in-chief keep reading their own profile via the existing
--    "Users can read own profile; admins can read all" policy.
drop policy if exists "Staff can read team profiles" on public.profiles;

-- 3) Journalists can only overwrite photos they uploaded themselves;
--    editors-in-chief and admins can still replace any newsroom photo.
drop policy if exists "Staff update media" on storage.objects;
create policy "Staff update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (
    (select private.has_cms_role(array['admin','manager']))
    or ((select private.has_cms_role(array['editor'])) and owner_id = (select auth.uid())::text)))
  with check (bucket_id = 'media' and (select private.has_cms_role(array['admin','manager','editor'])));
