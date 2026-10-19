"use client";
import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Donut from "./Donut";
import { Logo } from "@/components/Logo";
import { category } from "@/lib/site";
import Usage, { type UsageData } from "./Usage";
import { dateTime, dayLabel, num, SERIES } from "./format";

type Slice = { name: string; views: number };
type SiteStats = {
  days: number;
  tracked_since: string | null;
  details_since: string | null;
  cards: { today: number; today_prev: number; d7: number; d7_prev: number; d30: number; d30_prev: number; visitors_30: number; visitors_30_prev: number };
  daily: { day: string; views: number; visitors: number }[];
  top: { id: string; title: string; slug: string; category: string; views: number }[];
  sources: Slice[];
  referrers: { host: string; views: number }[];
  devices: Slice[];
};

const RANGES = [7, 30, 90] as const;
const SOURCE_COLOR: Record<string, string> = {
  Direkt: SERIES[0], Facebook: SERIES[1], Google: SERIES[2], Instagram: SERIES[4],
  "Kërkues të tjerë": SERIES[3], X: SERIES[6], TikTok: SERIES[7], YouTube: SERIES[5], "Faqe të tjera": "#8a8d91",
};
const DEVICE_LABEL: Record<string, string> = { mobile: "Celular", desktop: "Kompjuter", tablet: "Tablet" };
const DEVICE_COLOR: Record<string, string> = { mobile: SERIES[0], desktop: SERIES[1], tablet: SERIES[2] };

export default function Dashboard() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [site, setSite] = useState<SiteStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageError, setUsageError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshErrors, setRefreshErrors] = useState<Record<string, string>>({});

  const loadUsage = useCallback(async () => {
    setUsageError("");
    try {
      const res = await fetch("/api/admin/analytics/sources", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) { location.href = "/studio"; return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gabim");
      setUsage(body as UsageData);
    } catch (e) {
      setUsageError(e instanceof Error ? e.message : "Përdorimi nuk u ngarkua.");
    }
  }, []);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  async function refreshAll() {
    setRefreshing(true);
    const errors: Record<string, string> = {};
    try {
      const res = await fetch("/api/admin/analytics/refresh", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (body.error) { errors.vercel = errors.supabase = body.error; }
      for (const r of body.results ?? []) if (r.error) errors[r.source] = r.error;
    } catch {
      errors.vercel = errors.supabase = "Rifreskimi dështoi.";
    } finally {
      setRefreshErrors(errors);
      await Promise.all([load(days), loadUsage()]);
      setRefreshing(false);
    }
  }

  const load = useCallback(async (d: number) => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/analytics/site?days=${d}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) { location.href = "/studio"; return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gabim");
      setSite(body as SiteStats);
      setLoadedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Statistikat nuk u ngarkuan.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  return (
    <div className="an">
      <header className="an-top">
        <a href="/studio" className="an-logo" aria-label="Kthehu te Studio"><Logo /></a>
        <a href="/studio" className="an-back">← Studio</a>
      </header>

      <main className="an-page">
        <div className="an-head">
          <div>
            <h1>Analitika</h1>
            <p className="muted">{loadedAt ? `Përditësuar ${dateTime(loadedAt)}` : "Duke ngarkuar…"}</p>
          </div>
          <div className="an-actions">
            <div className="an-tabs" role="group" aria-label="Periudha">
              {RANGES.map((r) => (
                <button key={r} className={days === r ? "on" : ""} aria-pressed={days === r} onClick={() => setDays(r)}>{r} ditë</button>
              ))}
            </div>
            <button className="an-btn" onClick={refreshAll} disabled={busy || refreshing}>{refreshing ? "Duke rifreskuar…" : "↻ Rifresko tani"}</button>
          </div>
        </div>

        {error && <p className="an-error" role="alert">⚠ {error}</p>}

        {site && (
          <section aria-labelledby="site-h">
            <h2 id="site-h" className="an-section">Faqja</h2>
            <div className="an-cards">
              <Card label="Shikime sot" value={site.cards.today} prev={site.cards.today_prev} vs="dje deri në këtë orë" />
              <Card label="7 ditët e fundit" value={site.cards.d7} prev={site.cards.d7_prev} vs="7 ditët para" />
              <Card label="30 ditët e fundit" value={site.cards.d30} prev={site.cards.d30_prev} vs="30 ditët para" />
              <Card label="Lexues unikë (30 ditë)" value={site.cards.visitors_30} prev={site.cards.visitors_30_prev} vs="30 ditët para" />
            </div>

            <div className="an-panel">
              <h3>Shikime në ditë</h3>
              <div className="an-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={site.daily} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke="#ececea" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fontSize: 12, fill: "#6b6f75" }} tickLine={false} axisLine={{ stroke: "#cfcfcb" }} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b6f75" }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip labelFormatter={(l) => dayLabel(String(l))} formatter={(v, n) => [num(Number(v)), n]} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
                    <Line type="monotone" dataKey="views" name="Shikime" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="visitors" name="Lexues unikë" stroke={SERIES[1]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="an-grid site">
              <div className="an-panel">
                <h3>10 lajmet më të lexuara <small>({site.days} ditë)</small></h3>
                {site.top.length === 0 ? <p className="muted">Ende pa shikime në lajme.</p> : (
                  <ol className="an-top10">
                    {site.top.map((p) => (
                      <li key={p.id}>
                        <a href={`/lajm/${p.slug}`} target="_blank" rel="noreferrer">{p.title}</a>
                        <span className="an-cat" style={{ color: category(p.category).hue }}>{category(p.category).label}</span>
                        <b>{num(p.views)}</b>
                        <i style={{ width: `${(p.views / site.top[0].views) * 100}%` }} aria-hidden="true" />
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <Donut
                title="Burimet e trafikut"
                note="Nga erdhën lexuesit kur hynë në faqe"
                rows={site.sources.map((s) => ({ name: s.name, views: s.views, color: SOURCE_COLOR[s.name] ?? "#8a8d91" }))}
                extra={site.referrers.length > 0 && (
                  <details className="an-refs">
                    <summary>Faqet që sjellin lexues</summary>
                    <ul>{site.referrers.map((r) => <li key={r.host}><span>{r.host}</span><b>{num(r.views)}</b></li>)}</ul>
                  </details>
                )}
              />

              <Donut
                title="Celular apo kompjuter"
                rows={site.devices.map((d) => ({ name: DEVICE_LABEL[d.name] ?? d.name, views: d.views, color: DEVICE_COLOR[d.name] ?? "#8a8d91" }))}
              />
            </div>

            {site.details_since && (
              <p className="muted an-foot">
                Burimet e trafikut dhe pajisjet maten nga {dateTime(site.details_since)}. Robotët dhe stafi i kyçur në Studio nuk numërohen.
              </p>
            )}
          </section>
        )}

        {!site && !error && <div className="an-loading"><span className="an-spinner" /></div>}

        {usageError && <p className="an-error" role="alert">⚠ {usageError}</p>}
        {usage ? <Usage data={{ ...usage, errors: { ...usage.errors, ...refreshErrors } }} /> : !usageError && <div className="an-loading small"><span className="an-spinner" /></div>}
      </main>
    </div>
  );
}

function Card({ label, value, prev, vs }: { label: string; value: number; prev: number; vs: string }) {
  const change = prev > 0 ? Math.round(((value - prev) / prev) * 100) : null;
  return (
    <div className="an-card">
      <span className="an-card-label">{label}</span>
      <strong>{num(value)}</strong>
      {change === null ? (
        <span className="an-delta flat">— pa të dhëna për {vs}</span>
      ) : (
        <span className={`an-delta ${change > 0 ? "up" : change < 0 ? "down" : "flat"}`}>
          {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {Math.abs(change)}% <small>krahasuar me {vs}</small>
        </span>
      )}
    </div>
  );
}
