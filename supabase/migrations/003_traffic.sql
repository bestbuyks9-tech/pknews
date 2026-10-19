-- Live traffic counter for the advertiser bar under the menu.
-- Every public page view calls track_view(); the bar reads traffic_stats().
-- The table itself is closed to the public: both functions run as owner.

create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  visitor text not null,
  ads smallint not null default 0,
  created_at timestamptz not null default now()
);
create index page_views_created_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;

create or replace function public.track_view(p_path text, p_visitor text, p_ads int default 0)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_path is null or p_visitor is null or length(p_visitor) < 8 then
    return;
  end if;
  insert into public.page_views (path, visitor, ads)
  values (left(p_path, 300), left(p_visitor, 64), greatest(0, least(coalesce(p_ads, 0), 10)));
  -- keep roughly 35 days of rows
  if random() < 0.002 then
    delete from public.page_views where created_at < now() - interval '35 days';
  end if;
end;
$$;

create or replace function public.traffic_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with day as (
    select (date_trunc('day', now() at time zone 'Europe/Belgrade') at time zone 'Europe/Belgrade') as start
  )
  select json_build_object(
    'now', (select count(distinct visitor) from public.page_views where created_at > now() - interval '5 minutes'),
    'views_today', (select count(*) from public.page_views, day where created_at >= day.start),
    'impressions_today', (select coalesce(sum(ads), 0) from public.page_views, day where created_at >= day.start),
    'views_30d', (select count(*) from public.page_views where created_at > now() - interval '30 days')
  );
$$;

revoke all on function public.track_view(text, text, int) from public;
revoke all on function public.traffic_stats() from public;
grant execute on function public.track_view(text, text, int) to anon, authenticated;
grant execute on function public.traffic_stats() to anon, authenticated;
