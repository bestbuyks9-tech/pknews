-- Site analytics for /admin/analytics (phase 1).
-- page_views gains the article, the referring site (host only) and the device type.
-- log_view() replaces track_view() for new page loads. Device and bot checks use the request's User-Agent header on the server; no IP is stored.
-- analytics_site() serves the dashboard and only answers admins.

alter table public.page_views
  add column if not exists post_id uuid references public.posts(id) on delete set null,
  add column if not exists entry boolean,
  add column if not exists referrer_host text,
  add column if not exists device text check (device in ('mobile', 'tablet', 'desktop'));

create index if not exists page_views_post_idx on public.page_views (post_id, created_at desc) where post_id is not null;

-- Link existing article views to their posts.
update public.page_views v
set post_id = p.id
from public.posts p
where v.post_id is null and v.path = '/lajm/' || p.slug;

-- New tracker under its own name: an overload of track_view() would make 3-argument calls ambiguous.
create or replace function public.log_view(
  p_path text,
  p_visitor text,
  p_ads int default 0,
  p_entry boolean default null,
  p_referrer text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ua text := lower(coalesce(current_setting('request.headers', true)::json ->> 'user-agent', ''));
  v_device text;
  v_post uuid;
  v_ref text;
begin
  if p_path is null or p_visitor is null or length(p_visitor) < 8 then
    return;
  end if;
  -- Skip crawlers, link previews and headless browsers.
  if ua ~ '(bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|curl|wget|python|java/|go-http|axios|node-fetch|phantom|selenium|puppeteer|playwright)' then
    return;
  end if;

  v_device := case
    when ua = '' then null
    when ua ~ '(ipad|tablet|kindle|silk)' or (ua ~ 'android' and ua !~ 'mobi') then 'tablet'
    when ua ~ '(mobi|iphone|ipod|android|windows phone)' then 'mobile'
    else 'desktop'
  end;

  if p_path like '/lajm/%' then
    select id into v_post from public.posts where slug = substr(p_path, 7) limit 1;
  end if;

  -- Host only, lower-case, without "www."; never the full referring URL.
  v_ref := nullif(regexp_replace(lower(left(coalesce(p_referrer, ''), 255)), '^www\.', ''), '');

  insert into public.page_views (path, visitor, ads, post_id, entry, referrer_host, device)
  values (left(p_path, 300), left(p_visitor, 64), greatest(0, least(coalesce(p_ads, 0), 10)),
          v_post, p_entry, case when p_entry then v_ref end, v_device);

  -- keep roughly 13 months of rows
  if random() < 0.002 then
    delete from public.page_views where created_at < now() - interval '400 days';
  end if;
end;
$$;

revoke all on function public.log_view(text, text, int, boolean, text) from public;
grant execute on function public.log_view(text, text, int, boolean, text) to anon, authenticated;

-- Pages cached before this change still call track_view(); route them through the new tracker.
create or replace function public.track_view(p_path text, p_visitor text, p_ads int default 0)
returns void
language sql
security definer
set search_path = ''
as $$ select public.log_view(p_path, p_visitor, p_ads); $$;

create or replace function public.analytics_site(p_days int default 30)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tz constant text := 'Europe/Belgrade';
  today_start timestamptz := date_trunc('day', now() at time zone tz) at time zone tz;
  since timestamptz;
  result json;
begin
  if not (select private.has_cms_role(array['admin'])) then
    raise exception 'admins only' using errcode = '42501';
  end if;
  p_days := least(greatest(coalesce(p_days, 30), 1), 366);
  since := today_start - make_interval(days => p_days - 1);

  with v as (
    select * from public.page_views where created_at >= today_start - interval '60 days'
  ),
  range_v as (
    select * from public.page_views where created_at >= since
  ),
  sourced as (
    select case
      when referrer_host is null then 'Direkt'
      when referrer_host ~ '(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$' then 'Facebook'
      when referrer_host ~ '(^|\.)instagram\.com$' then 'Instagram'
      when referrer_host ~ '(^|\.)google\.[a-z.]+$' then 'Google'
      when referrer_host ~ '(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org)$' then 'Kërkues të tjerë'
      when referrer_host ~ '(^|\.)(t\.co|twitter\.com|x\.com)$' then 'X'
      when referrer_host ~ '(^|\.)tiktok\.com$' then 'TikTok'
      when referrer_host ~ '(^|\.)youtube\.com$' then 'YouTube'
      else 'Faqe të tjera'
    end as source
    from range_v where entry
  )
  select json_build_object(
    'days', p_days,
    'tracked_since', (select min(created_at) from public.page_views),
    'details_since', (select min(created_at) from public.page_views where device is not null),
    'cards', json_build_object(
      'today', (select count(*) from v where created_at >= today_start),
      'today_prev', (select count(*) from v where created_at >= today_start - interval '1 day' and created_at < now() - interval '1 day'),
      'd7', (select count(*) from v where created_at >= today_start - interval '6 days'),
      'd7_prev', (select count(*) from v where created_at >= today_start - interval '13 days' and created_at < today_start - interval '6 days'),
      'd30', (select count(*) from v where created_at >= today_start - interval '29 days'),
      'd30_prev', (select count(*) from v where created_at >= today_start - interval '59 days' and created_at < today_start - interval '29 days'),
      'visitors_30', (select count(distinct visitor) from v where created_at >= today_start - interval '29 days'),
      'visitors_30_prev', (select count(distinct visitor) from v where created_at >= today_start - interval '59 days' and created_at < today_start - interval '29 days')
    ),
    'daily', (
      select json_agg(json_build_object('day', d.day, 'views', coalesce(c.views, 0), 'visitors', coalesce(c.visitors, 0)) order by d.day)
      from (select g::date as day from generate_series((since at time zone tz)::date, (now() at time zone tz)::date, interval '1 day') g) d
      left join (
        select (created_at at time zone tz)::date as day, count(*) as views, count(distinct visitor) as visitors
        from public.page_views where created_at >= since group by 1
      ) c on c.day = d.day
    ),
    'top', (
      select coalesce(json_agg(t order by t.views desc), '[]'::json) from (
        select p.id, p.title, p.slug, p.category, count(*) as views
        from public.page_views pv join public.posts p on p.id = pv.post_id
        where pv.created_at >= since
        group by p.id order by count(*) desc limit 10
      ) t
    ),
    'sources', (
      select coalesce(json_agg(s order by s.views desc), '[]'::json) from (
        select source as name, count(*) as views from sourced group by source
      ) s
    ),
    'referrers', (
      select coalesce(json_agg(r order by r.views desc), '[]'::json) from (
        select referrer_host as host, count(*) as views from range_v
        where entry and referrer_host is not null group by referrer_host order by count(*) desc limit 10
      ) r
    ),
    'devices', (
      select coalesce(json_agg(d order by d.views desc), '[]'::json) from (
        select device as name, count(*) as views from range_v where device is not null group by device
      ) d
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.analytics_site(int) from public;
revoke execute on function public.analytics_site(int) from anon;
grant execute on function public.analytics_site(int) to authenticated;
