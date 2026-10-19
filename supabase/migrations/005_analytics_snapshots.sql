-- Snapshots for /admin/analytics (Vercel and Supabase usage, later Metricool).
-- A collector (Vercel Cron, the "Rifresko tani" button, or opening a stale dashboard) saves one row per
-- metric, so the dashboard reads history from here instead of calling the external APIs on every load.
-- Admins can read; only the service role (server) writes, since there are no insert/update/delete policies.

create table if not exists public.analytics_snapshots (
  id bigint generated always as identity primary key,
  source text not null,
  metric text not null,
  value numeric,
  details jsonb,
  captured_at timestamptz not null default now()
);
create index if not exists analytics_snapshots_lookup_idx on public.analytics_snapshots (source, metric, captured_at desc);

create table if not exists public.analytics_sources (
  source text primary key,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text
);

alter table public.analytics_snapshots enable row level security;
alter table public.analytics_sources enable row level security;

create policy "Admins read analytics snapshots" on public.analytics_snapshots for select to authenticated
  using ((select private.has_cms_role(array['admin'])));
create policy "Admins read analytics sources" on public.analytics_sources for select to authenticated
  using ((select private.has_cms_role(array['admin'])));

revoke all on public.analytics_snapshots, public.analytics_sources from anon;
revoke insert, update, delete, truncate on public.analytics_snapshots, public.analytics_sources from authenticated;
