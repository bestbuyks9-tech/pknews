import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/supabase";
import Dashboard from "./Dashboard";
import "./analytics.css";

export const metadata: Metadata = { title: "Analitika", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect("/studio");
  return <Dashboard />;
}
