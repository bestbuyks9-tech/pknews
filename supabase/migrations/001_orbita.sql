-- Politika Kosovare: replaces the old PK Online `articles` table with `posts`,
-- adds a public `media` bucket for photo uploads, and staff permissions.
-- Keeps: public.profiles, private.has_cms_role(), the new-user trigger.

drop table if exists public.articles cascade;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  slug text not null unique,
  excerpt text not null default '',
  body text not null default '',
  category text not null default 'kosova' check (category in ('kosova','politike','ekonomi','bota','sport','teknologji','kulture')),
  cover_url text,
  cover_alt text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','review','published')),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_published_idx on public.posts (status, published_at desc);
create index posts_category_idx on public.posts (category, published_at desc);
create index posts_author_idx on public.posts (author_id);
create trigger posts_touch_updated_at before update on public.posts for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;

create policy "Anyone reads published posts" on public.posts for select to anon, authenticated
  using (status = 'published');
create policy "Staff read own or all posts" on public.posts for select to authenticated
  using ((select private.has_cms_role(array['admin','manager'])) or author_id = (select auth.uid()));
create policy "Staff create posts" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (
    (select private.has_cms_role(array['admin','manager']))
    or ((select private.has_cms_role(array['editor'])) and status in ('draft','review'))));
create policy "Staff update posts" on public.posts for update to authenticated
  using ((select private.has_cms_role(array['admin','manager']))
    or (author_id = (select auth.uid()) and status in ('draft','review') and (select private.has_cms_role(array['editor']))))
  with check ((select private.has_cms_role(array['admin','manager']))
    or (author_id = (select auth.uid()) and status in ('draft','review') and (select private.has_cms_role(array['editor']))));
create policy "Staff delete posts" on public.posts for delete to authenticated
  using ((select private.has_cms_role(array['admin','manager'])) or (author_id = (select auth.uid()) and status <> 'published'));

create policy "Staff can read team profiles" on public.profiles for select to authenticated
  using ((select private.has_cms_role(array['admin','manager','editor'])));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media','media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do nothing;

create policy "Staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select private.has_cms_role(array['admin','manager','editor'])));
create policy "Staff update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select private.has_cms_role(array['admin','manager','editor'])));
create policy "Managers delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select private.has_cms_role(array['admin','manager'])));
