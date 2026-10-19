import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/supabase";
import { collectAll } from "@/lib/server/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Rifresko tani": runs the same collectors as the cron job, for admins only. */
export async function POST() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: "Vetëm për administratorët." }, { status: gate.status });
  try {
    return NextResponse.json({ results: await collectAll() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Rifreskimi dështoi." }, { status: 500 });
  }
}
