-- History Reels for the /histori swipe feed.
-- Videos and posters live in the public `reels` bucket; the daily pipeline writes
-- them through the `reels` edge function, so nothing here is writable by the public.

create table public.reels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  question text,
  caption text,
  video_url text not null,
  poster_url text,
  duration_s numeric,
  facebook_url text,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index reels_published_idx on public.reels (published_at desc);

alter table public.reels enable row level security;

create policy "Anyone can read live reels" on public.reels for select to anon, authenticated
  using (published and published_at <= now());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reels', 'reels', true, 52428800, array['video/mp4', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
