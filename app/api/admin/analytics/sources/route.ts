import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/supabase";
import { collectAll } from "@/lib/server/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_MS = 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;
const SUMMARY: Record<string, string[]> = { vercel: ["deployments", "usage", "web_analytics"], supabase: ["projects"] };

/**
 * Latest Vercel and Supabase snapshots. Vercel Hobby only allows a daily cron, so when the newest
 * snapshot is over an hour old (and nothing was tried in the last 10 minutes) this collects first.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "Vetëm për administratorët." }, { status: gate.status, headers: { "Cache-Control": "no-store" } });
  const db = gate.db;

  const { data: before } = await db.from("analytics_sources").select("*");
  const now = Date.now();
  const stale = Object.keys(SUMMARY).some((name) => {
    const s = before?.find((r) => r.source === name);
    const success = s?.last_success_at ? Date.parse(s.last_success_at) : 0;
    const attempt = s?.last_attempt_at ? Date.parse(s.last_attempt_at) : 0;
    return now - success > STALE_MS && now - attempt > RETRY_MS;
  });
  // Errors from this run go to the dashboard too, in case they could not be saved in analytics_sources.
  const errors: Record<string, string> = {};
  if (stale) {
    try {
      for (const r of await collectAll()) if (r.error) errors[r.source] = r.error;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Mbledhja dështoi.";
      console.error("analytics collect failed:", message);
      for (const name of Object.keys(SUMMARY)) errors[name] = message;
    }
  }

  const { data: sources } = await db.from("analytics_sources").select("*");
  const latest: Record<string, Record<string, unknown>> = {};
  for (const [source, metrics] of Object.entries(SUMMARY)) {
    latest[source] = {};
    for (const metric of metrics) {
      const { data } = await db.from("analytics_snapshots").select("value,details,captured_at")
        .eq("source", source).eq("metric", metric).order("captured_at", { ascending: false }).limit(1).maybeSingle();
      latest[source][metric] = data;
    }
  }
  return NextResponse.json({ sources: sources ?? [], latest, errors }, { headers: { "Cache-Control": "no-store" } });
}
