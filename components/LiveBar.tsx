"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/site";

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

type Stats = { now: number; views_today: number; impressions_today: number; views_30d: number };

function visitorId() {
  try {
    let id = localStorage.getItem("pk_vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("pk_vid", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return new Intl.NumberFormat("en-US").format(n);
}

/** Live audience strip under the menu: counts this page view and shows site-wide numbers for advertisers. */
export function LiveBar() {
  const path = usePathname();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Count after paint so ads on the page (placeholders and AdsKeeper widgets) are in the DOM.
    const t = setTimeout(() => {
      db.rpc("track_view", { p_path: path, p_visitor: visitorId(), p_ads: document.querySelectorAll('.ad, [data-type="_mgwidget"]').length }).then(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      db.rpc("traffic_stats").then(({ data, error }) => {
        if (alive && !error && data) setStats(data as Stats);
      });
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!stats) return null;

  return (
    <div className="livebar" aria-label="Statistikat e lexueshmërisë">
      <div className="wrap">
        <span className="live-dot"><i aria-hidden="true" />Live</span>
        <div className="live-stats">
          <div className="live-stat"><b>{fmt(Math.max(1, stats.now))}</b><span>lexues tani</span></div>
          <div className="live-stat"><b>{fmt(stats.views_today)}</b><span>shikime sot</span></div>
          <div className="live-stat"><b>{fmt(stats.impressions_today)}</b><span>impresione sot</span></div>
          <div className="live-stat"><b>{fmt(stats.views_30d)}</b><span>shikime / 30 ditë</span></div>
        </div>
        <a className="live-cta" href="mailto:reklama@politikakosovare.com">Reklamo te ne →</a>
      </div>
    </div>
  );
}
