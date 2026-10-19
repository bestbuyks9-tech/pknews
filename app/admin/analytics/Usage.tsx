"use client";
import Donut from "./Donut";
import { bytes, dateTime, dec, num, SERIES } from "./format";

type Snapshot<T> = { value: number | null; details: T; captured_at: string } | null;
type SourceStatus = { source: string; last_attempt_at: string | null; last_success_at: string | null; last_error: string | null };
type Deployment = { id: string; state: string; target: string; created: number; url: string | null; message: string; branch: string | null };
type UsageItem = { service: string; label: string; qty: number; unit: string; cost: number; used: number | null; limit: number | null; limitUnit: string | null };
type Project = {
  ref: string; name: string; region: string; status: string; plan: string; errors: string[];
  db_bytes?: number | null; storage_bytes?: number | null; disk?: { used: number; size: number };
  requests_7d?: { rest: number; auth: number; storage: number; realtime: number };
  limits: { db: number; storage: number } | null;
};

export type UsageData = {
  sources: SourceStatus[];
  latest: {
    vercel: {
      deployments: Snapshot<Deployment[]>;
      usage: Snapshot<{ from?: string; to?: string; items?: UsageItem[]; error?: string }>;
      web_analytics: Snapshot<{ pageviews?: number; visitors?: number; error?: string; status?: number }>;
    };
    supabase: { projects: Snapshot<{ projects: Project[]; free_active: number; free_limit: number }> };
  };
};

const STATE_LABEL: Record<string, string> = {
  READY: "Gati", ERROR: "Gabim", BUILDING: "Në ndërtim", QUEUED: "Në radhë", INITIALIZING: "Po nis", CANCELED: "Anuluar", BLOCKED: "Bllokuar", DELETED: "Fshirë",
};
const PROJECT_STATUS: Record<string, string> = {
  ACTIVE_HEALTHY: "Aktiv", INACTIVE: "Pushuar", PAUSING: "Po pushon", RESTORING: "Po rikthehet", COMING_UP: "Po ndizet", UNKNOWN: "I panjohur",
};
const UNIT_LABEL: Record<string, string> = { GB: "GB", hours: "orë", "GB-hours": "GB-orë", count: "" };

export default function Usage({ data }: { data: UsageData }) {
  const v = data.latest.vercel;
  const projects = data.latest.supabase.projects?.details;
  const requests = (projects?.projects ?? []).reduce(
    (a, p) => ({ rest: a.rest + (p.requests_7d?.rest ?? 0), auth: a.auth + (p.requests_7d?.auth ?? 0), storage: a.storage + (p.requests_7d?.storage ?? 0), realtime: a.realtime + (p.requests_7d?.realtime ?? 0) }),
    { rest: 0, auth: 0, storage: 0, realtime: 0 },
  );
  const usageItems = v.usage?.details?.items ?? [];
  const withLimit = usageItems.filter((u) => u.limit !== null && u.used !== null);
  const withoutLimit = usageItems.filter((u) => u.limit === null || u.used === null);

  return (
    <>
      <section aria-labelledby="vercel-h">
        <SectionHead id="vercel-h" title="Vercel" status={data.sources.find((s) => s.source === "vercel")} />

        <div className="an-grid">
          <div className="an-panel">
            <h3>Përdorimi kundrejt planit Hobby <small>(30 ditët e fundit)</small></h3>
            {v.usage?.details?.error ? (
              <p className="an-warn">Vercel nuk e dha përdorimin: {v.usage.details.error}</p>
            ) : withLimit.length === 0 && withoutLimit.length === 0 ? (
              <p className="muted">Vercel nuk ktheu asnjë rresht përdorimi për këtë periudhë.</p>
            ) : (
              <>
                <div className="an-bars">
                  {withLimit.map((u) => (
                    <Bar key={u.service} label={u.label} used={u.used!} limit={u.limit!} format={(n) => `${dec(n)} ${UNIT_LABEL[u.limitUnit ?? "count"]}`.trim()} />
                  ))}
                </div>
                {withoutLimit.length > 0 && (
                  <details className="an-refs">
                    <summary>Të tjera pa kufi të njohur ({withoutLimit.length})</summary>
                    <ul>{withoutLimit.map((u) => <li key={u.service + u.unit}><span>{u.service}</span><b>{dec(u.qty)} {u.unit}</b></li>)}</ul>
                  </details>
                )}
                <p className="muted an-note small">Kufijtë janë sasitë e përfshira në planin Hobby sipas Vercel; API jep vetëm përdorimin.</p>
              </>
            )}
          </div>

          <div className="an-panel">
            <h3>Publikimet e fundit</h3>
            {(v.deployments?.details ?? []).length === 0 ? <p className="muted">Asnjë publikim.</p> : (
              <ul className="an-deploys">
                {v.deployments!.details.map((d) => (
                  <li key={d.id}>
                    <span className={`an-state s-${d.state?.toLowerCase()}`}>{STATE_LABEL[d.state] ?? d.state}</span>
                    <div>
                      <a href={d.url ?? "#"} target="_blank" rel="noreferrer">{d.message || "(pa mesazh)"}</a>
                      <small>{d.target === "production" ? "Live" : "Preview"}{d.branch && d.target !== "production" ? ` · ${d.branch}` : ""} · {dateTime(d.created)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="an-panel">
            <h3>Vercel Web Analytics <small>(30 ditë)</small></h3>
            {v.web_analytics?.details?.error ? (
              <p className="muted">Web Analytics nuk është aktivizuar për projektin, ose Vercel nuk dha të dhëna ({v.web_analytics.details.status || "gabim"}).</p>
            ) : (
              <div className="an-mini">
                <div><strong>{num(v.web_analytics?.details?.pageviews ?? 0)}</strong><span>shikime</span></div>
                <div><strong>{num(v.web_analytics?.details?.visitors ?? 0)}</strong><span>vizitorë</span></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="supabase-h">
        <SectionHead id="supabase-h" title="Supabase" status={data.sources.find((s) => s.source === "supabase")} />
        {projects && projects.free_limit > 0 && (
          <p className="muted an-note">Projekte falas aktive: <b>{projects.free_active} / {projects.free_limit}</b></p>
        )}
        <div className="an-grid">
          {(projects?.projects ?? []).map((p) => {
            const near = [
              p.limits && p.db_bytes != null ? p.db_bytes / p.limits.db : 0,
              p.limits && p.storage_bytes != null ? p.storage_bytes / p.limits.storage : 0,
              p.disk?.size ? p.disk.used / p.disk.size : 0,
            ].some((r) => r >= 0.75);
            const req = p.requests_7d;
            return (
              <div className="an-panel" key={p.ref}>
                <h3 className="an-proj">
                  <span>{p.name}</span>
                  <span className={`an-state ${p.status === "ACTIVE_HEALTHY" ? "s-ready" : "s-canceled"}`}>{PROJECT_STATUS[p.status] ?? p.status}</span>
                  {near && <span className="an-state s-warn">⚠ Afër kufirit</span>}
                </h3>
                <p className="muted an-note">Plani: {p.plan === "free" ? "Falas" : p.plan} · {p.region}</p>
                {p.status !== "ACTIVE_HEALTHY" ? <p className="muted">Projekti nuk është aktiv, prandaj nuk ka matje.</p> : (
                  <div className="an-bars">
                    {p.db_bytes != null && (p.limits
                      ? <Bar label="Databaza" used={p.db_bytes} limit={p.limits.db} format={bytes} />
                      : <p className="an-kv"><span>Databaza</span><b>{bytes(p.db_bytes)}</b></p>)}
                    {p.storage_bytes != null && (p.limits
                      ? <Bar label="Skedarët (Storage)" used={p.storage_bytes} limit={p.limits.storage} format={bytes} />
                      : <p className="an-kv"><span>Skedarët (Storage)</span><b>{bytes(p.storage_bytes)}</b></p>)}
                    {p.disk && p.disk.size > 0 && <Bar label="Disku" used={p.disk.used} limit={p.disk.size} format={bytes} />}
                    {req && (
                      <p className="an-kv"><span>Kërkesat API (7 ditë)</span><b>{num(req.rest + req.auth + req.storage + req.realtime)}</b></p>
                    )}
                  </div>
                )}
                {p.errors.length > 0 && <p className="an-warn small">{p.errors.join(" · ")}</p>}
              </div>
            );
          })}
          {requests.rest + requests.auth + requests.storage + requests.realtime > 0 && (
            <Donut
              title="Kërkesat API sipas llojit"
              note="Të gjitha projektet, 7 ditët e fundit"
              rows={[
                { name: "Databaza (REST)", views: requests.rest, color: SERIES[0] },
                { name: "Hyrjet (Auth)", views: requests.auth, color: SERIES[1] },
                { name: "Skedarët (Storage)", views: requests.storage, color: SERIES[2] },
                { name: "Realtime", views: requests.realtime, color: SERIES[6] },
              ].filter((r) => r.views > 0)}
            />
          )}
        </div>
        <p className="muted an-foot">Kufijtë e databazës dhe skedarëve janë sasitë e planit sipas Supabase (Falas: 500 MB / 1 GB). Trafiku dalës (egress) dhe përdoruesit aktivë mujorë nuk jepen nga API e Supabase.</p>
      </section>
    </>
  );
}

function SectionHead({ id, title, status }: { id: string; title: string; status?: SourceStatus }) {
  const failed = status?.last_error && status.last_attempt_at !== status.last_success_at;
  const partial = status?.last_error && !failed;
  return (
    <div className="an-sec">
      <h2 id={id} className="an-section">{title}</h2>
      <span className="muted">{status?.last_success_at ? `Përditësuar ${dateTime(status.last_success_at)}` : "Ende pa të dhëna"}</span>
      {failed && <span className="an-badge err" title={status!.last_error!}>⚠ Gabim: {status!.last_error}</span>}
      {partial && <span className="an-badge warn" title={status!.last_error!}>⚠ {status!.last_error}</span>}
    </div>
  );
}

function Bar({ label, used, limit, format }: { label: string; used: number; limit: number; format: (n: number) => string }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const level = pct >= 90 ? "red" : pct >= 75 ? "amber" : "ok";
  return (
    <div className="an-bar">
      <div className="an-bar-top">
        <span>{label}</span>
        <b className={`lvl-${level}`}>{pct < 1 && pct > 0 ? "<1" : Math.round(pct)}%{level === "red" ? " ⚠" : ""}</b>
      </div>
      <div className="an-bar-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <i className={`lvl-${level}`} style={{ width: `${Math.min(100, Math.max(pct, pct > 0 ? 1 : 0))}%` }} />
      </div>
      <small className="muted">{format(used)} nga {format(limit)}</small>
    </div>
  );
}
