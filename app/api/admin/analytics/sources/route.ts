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
  if (stale) await collectAll().catch((e) => console.error("analytics collect failed:", e instanceof Error ? e.message : ""));

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
  return NextResponse.json({ sources: sources ?? [], latest }, { headers: { "Cache-Control": "no-store" } });
}
