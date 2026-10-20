-- Optional extra media inside an article, separate from the cover photo.
-- `media` is a list of at most 2 items, at most one of them a video:
--   [{ "type": "image" | "video", "url": "https://…", "mode": "portrait" | "landscape", "caption": "…" }]
-- Existing posts get an empty list and render exactly as before.

create or replace function private.valid_post_media(m jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(m) = 'array'
    and jsonb_array_length(m) <= 2
    and (select count(*) from jsonb_array_elements(m) e where e->>'type' = 'video') <= 1
    and not exists (
      select 1 from jsonb_array_elements(m) e
      where jsonb_typeof(e) <> 'object'
         or coalesce(e->>'type', '') not in ('image', 'video')
         or coalesce(e->>'mode', '') not in ('portrait', 'landscape')
         or coalesce(e->>'url', '') !~ '^https://'
    );
$$;

alter table public.posts
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.posts drop constraint if exists posts_media_valid;
alter table public.posts add constraint posts_media_valid check (private.valid_post_media(media));

-- Videos go in the same public bucket as photos.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime']
where id = 'media';
