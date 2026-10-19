import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.status === 401 ? "Duhet të hysh." : "Vetëm për administratorët." }, { status: gate.status, headers: noStore });

  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("days"))) ? Number(req.nextUrl.searchParams.get("days")) : 30;
  const { data, error } = await gate.db.rpc("analytics_site", { p_days: days });
  if (error) {
    console.error("analytics_site failed:", error.code);
    return NextResponse.json({ error: "Statistikat nuk u ngarkuan." }, { status: 500, headers: noStore });
  }
  return NextResponse.json(data, { headers: noStore });
}
