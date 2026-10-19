import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/site";

/**
 * Collectors for /admin/analytics. Each source fetches its API, saves rows to analytics_snapshots and
 * records success or the error in analytics_sources. One failing source never stops the others.
 * Tokens come from server-only env vars and are never logged or returned.
 */

type Row = { metric: string; value: number | null; details?: unknown };
type Result = { rows: Row[]; warning?: string };
type Source = { name: string; run: () => Promise<Result> };

const VERCEL_PROJECT = "pknews";
const TIMEOUT = 15_000;

/** Included usage on the Vercel Hobby plan (vercel.com/docs/plans/hobby, checked 19 Oct 2026). The API reports usage only. */
const VERCEL_HOBBY_LIMITS: { match: RegExp; label: string; limit: number; unit: "GB" | "hours" | "GB-hours" | "count" }[] = [
  { match: /fast data transfer/i, label: "Fast Data Transfer", limit: 100, unit: "GB" },
  { match: /fast origin transfer/i, label: "Fast Origin Transfer", limit: 10, unit: "GB" },
  { match: /(edge|cdn) requests/i, label: "Kërkesat CDN", limit: 1_000_000, unit: "count" },
  { match: /function invocations/i, label: "Thirrjet e funksioneve", limit: 1_000_000, unit: "count" },
  { match: /active cpu/i, label: "Active CPU", limit: 4, unit: "hours" },
  { match: /provisioned memory/i, label: "Provisioned Memory", limit: 360, unit: "GB-hours" },
  { match: /image transformations/i, label: "Transformimet e fotove", limit: 5_000, unit: "count" },
  { match: /image cache reads/i, label: "Leximet e cache të fotove", limit: 300_000, unit: "count" },
  { match: /image cache writes/i, label: "Shkrimet e cache të fotove", limit: 100_000, unit: "count" },
  { match: /web analytics events/i, label: "Ngjarjet e Web Analytics", limit: 50_000, unit: "count" },
];

/** Supabase plan quotas per project (supabase.com/docs/guides/platform/billing-on-supabase). */
const SUPABASE_LIMITS: Record<string, { db: number; storage: number }> = {
  free: { db: 500e6, storage: 1e9 },
  pro: { db: 8e9, storage: 100e9 },
  team: { db: 8e9, storage: 100e9 },
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Mungon variabla ${name} në Vercel.`);
  return v;
}

async function getJson(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text);
  return text ? JSON.parse(text) : null;
}

class HttpError extends Error {
  constructor(public status: number, body: string) {
    super(`HTTP ${status}: ${body.replace(/\s+/g, " ").slice(0, 180)}`);
  }
}

/** Converts a reported quantity into the unit of the plan limit, or null when the units don't line up. */
function toLimitUnit(qty: number, unit: string, target: (typeof VERCEL_HOBBY_LIMITS)[number]["unit"]) {
  const u = unit.toLowerCase().replace(/\s+/g, "");
  if (target === "GB") {
    if (/^(gb|gib|gigabytes?)$/.test(u)) return qty;
    if (/^(mb|mib|megabytes?)$/.test(u)) return qty / 1e3;
    if (/^(b|bytes?)$/.test(u)) return qty / 1e9;
    return null;
  }
  if (target === "hours") {
    if (/^(h|hr|hrs|hours?|cpu-?h(ou)?rs?)$/.test(u)) return qty;
    if (/^(s|sec|seconds?|cpu-?seconds?)$/.test(u)) return qty / 3600;
    if (/^(ms|milliseconds?)$/.test(u)) return qty / 3.6e6;
    return null;
  }
  if (target === "GB-hours") return /^gb-?h(ou)?rs?$/.test(u) ? qty : null;
  return qty; // plain counts (requests, invocations, events…)
}

const vercel: Source = {
  name: "vercel",
  async run() {
    const token = env("VERCEL_API_TOKEN");
    const team = process.env.VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
    const rows: Row[] = [];
    const notes: string[] = [];

    // Recent deployments.
    const dep = await getJson(`https://api.vercel.com/v7/deployments?projectId=${VERCEL_PROJECT}&limit=10${team}`, token);
    const deployments = (dep?.deployments ?? []).map((d: Record<string, unknown>) => ({
      id: d.uid,
      state: d.readyState ?? d.state,
      target: d.target ?? "preview",
      created: d.created,
      url: d.inspectorUrl,
      message: ((d.meta as Record<string, string> | undefined)?.githubCommitMessage ?? "").split("\n")[0].slice(0, 140),
      branch: (d.meta as Record<string, string> | undefined)?.githubCommitRef ?? null,
    }));
    rows.push({ metric: "deployments", value: deployments.length, details: deployments });

    // Usage over the last 30 days (Hobby has no billing cycle; limits reset on a rolling 30 days).
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 864e5);
    try {
      const res = await fetch(`https://api.vercel.com/v1/billing/charges?from=${from.toISOString()}&to=${to.toISOString()}${team}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT),
      });
      const text = await res.text();
      if (!res.ok) throw new HttpError(res.status, text);
      const totals = new Map<string, { qty: number; unit: string; cost: number }>();
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        const c = JSON.parse(line);
        if (c.ChargeCategory && c.ChargeCategory !== "Usage") continue;
        const key = `${c.ServiceName}|${c.ConsumedUnit ?? ""}`;
        const t = totals.get(key) ?? { qty: 0, unit: c.ConsumedUnit ?? "", cost: 0 };
        t.qty += Number(c.ConsumedQuantity ?? 0);
        t.cost += Number(c.BilledCost ?? 0);
        totals.set(key, t);
      }
      const usage = [...totals.entries()].map(([key, t]) => {
        const service = key.split("|")[0];
        const known = VERCEL_HOBBY_LIMITS.find((l) => l.match.test(service));
        const used = known ? toLimitUnit(t.qty, t.unit, known.unit) : null;
        return {
          service, label: known?.label ?? service, qty: t.qty, unit: t.unit, cost: t.cost,
          used, limit: used !== null && known ? known.limit : null, limitUnit: known?.unit ?? null,
        };
      }).sort((a, b) => (b.limit !== null ? (b.used ?? 0) / b.limit : -1) - (a.limit !== null ? (a.used ?? 0) / a.limit : -1));
      rows.push({ metric: "usage", value: usage.length, details: { from: from.toISOString(), to: to.toISOString(), items: usage } });
      for (const u of usage) if (u.limit !== null) rows.push({ metric: `usage:${u.service}`, value: u.used });
    } catch (e) {
      notes.push(`Përdorimi: ${e instanceof Error ? e.message : "gabim"}`);
      rows.push({ metric: "usage", value: null, details: { error: e instanceof Error ? e.message : "gabim" } });
    }

    // Web Analytics (empty unless enabled for the project).
    try {
      const wa = await getJson(
        `https://api.vercel.com/v1/query/web-analytics/visits/count?projectId=${VERCEL_PROJECT}&since=${from.getTime()}&until=${to.getTime()}${team}`, token);
      rows.push({ metric: "web_analytics", value: Number(wa?.data?.pageviews ?? 0), details: { pageviews: wa?.data?.pageviews ?? 0, visitors: wa?.data?.visitors ?? 0 } });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 0;
      rows.push({ metric: "web_analytics", value: null, details: { error: e instanceof Error ? e.message : "gabim", status } });
    }

    return { rows, warning: notes.length ? notes.join(" · ") : undefined };
  },
};

const supabase: Source = {
  name: "supabase",
  async run() {
    const token = env("SUPABASE_ACCESS_TOKEN");
    const api = "https://api.supabase.com/v1";
    const projects: Record<string, string>[] = await getJson(`${api}/projects`, token);

    const plans = new Map<string, string>();
    for (const slug of new Set(projects.map((p) => p.organization_slug).filter(Boolean))) {
      try { plans.set(slug, (await getJson(`${api}/organizations/${slug}`, token))?.plan ?? "unknown"); }
      catch { plans.set(slug, "unknown"); }
    }

    const rows: Row[] = [];
    const list = [];
    for (const p of projects) {
      const plan = plans.get(p.organization_slug) ?? "unknown";
      const item: Record<string, unknown> = { ref: p.ref, name: p.name, region: p.region, status: p.status, org: p.organization_slug, plan, errors: [] as string[] };
      const errors = item.errors as string[];
      if (p.status === "ACTIVE_HEALTHY") {
        try {
          const q = await getJson(`${api}/projects/${p.ref}/database/query/read-only`, token, {
            method: "POST",
            body: JSON.stringify({ query: "select pg_database_size(current_database())::bigint as db, (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects)::bigint as storage" }),
          });
          const r = Array.isArray(q) ? q[0] : q?.result?.[0];
          item.db_bytes = r ? Number(r.db) : null;
          item.storage_bytes = r ? Number(r.storage) : null;
        } catch (e) { errors.push(`Madhësia: ${e instanceof Error ? e.message : "gabim"}`); }
        try {
          const d = await getJson(`${api}/projects/${p.ref}/config/disk/util`, token);
          item.disk = { used: Number(d?.metrics?.fs_used_bytes ?? 0), size: Number(d?.metrics?.fs_size_bytes ?? 0) };
        } catch (e) { errors.push(`Disku: ${e instanceof Error ? e.message : "gabim"}`); }
        try {
          const u = await getJson(`${api}/projects/${p.ref}/analytics/endpoints/usage.api-counts?interval=7day`, token);
          const sum = (k: string) => (u?.result ?? []).reduce((a: number, r: Record<string, number>) => a + Number(r[k] ?? 0), 0);
          item.requests_7d = { rest: sum("total_rest_requests"), auth: sum("total_auth_requests"), storage: sum("total_storage_requests"), realtime: sum("total_realtime_requests") };
        } catch (e) { errors.push(`Kërkesat: ${e instanceof Error ? e.message : "gabim"}`); }
      }
      const limits = SUPABASE_LIMITS[plan];
      item.limits = limits ?? null;
      list.push(item);
      if (typeof item.db_bytes === "number") rows.push({ metric: `db_bytes:${p.ref}`, value: item.db_bytes });
      if (typeof item.storage_bytes === "number") rows.push({ metric: `storage_bytes:${p.ref}`, value: item.storage_bytes });
    }
    const freeActive = list.filter((p) => p.plan === "free" && p.status === "ACTIVE_HEALTHY").length;
    rows.push({ metric: "projects", value: list.length, details: { projects: list, free_active: freeActive, free_limit: 2 } });
    const failing = list.filter((p) => (p.errors as string[]).length).map((p) => p.name);
    return { rows, warning: failing.length ? `Disa të dhëna mungojnë për: ${failing.join(", ")}` : undefined };
  },
};

const SOURCES: Source[] = [vercel, supabase];

function serviceDb() {
  return createClient(SUPABASE_URL, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function collectAll() {
  const db = serviceDb();
  const results = await Promise.all(SOURCES.map(async (s) => {
    const attempt = new Date().toISOString();
    try {
      const { rows, warning } = await s.run();
      const { error } = await db.from("analytics_snapshots").insert(rows.map((r) => ({ source: s.name, metric: r.metric, value: r.value, details: r.details ?? null, captured_at: attempt })));
      if (error) throw new Error(`Ruajtja dështoi (${error.code})`);
      await db.from("analytics_sources").upsert({ source: s.name, last_attempt_at: attempt, last_success_at: attempt, last_error: warning ?? null });
      return { source: s.name, ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gabim i panjohur";
      console.error(`analytics collector ${s.name} failed`, e instanceof HttpError ? e.status : "");
      await db.from("analytics_sources").upsert({ source: s.name, last_attempt_at: attempt, last_error: message });
      return { source: s.name, ok: false };
    }
  }));
  // Keep about six months of snapshots.
  await db.from("analytics_snapshots").delete().lt("captured_at", new Date(Date.now() - 180 * 864e5).toISOString());
  return results;
}
