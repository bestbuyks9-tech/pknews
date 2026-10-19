"use client";

import { useEffect } from "react";
import { SITE } from "@/lib/site";

type MgQueue = unknown[][];
declare global {
  interface Window { _mgq?: MgQueue }
}

/**
 * AdsKeeper native widget: the dashboard's container code. The site loader is in the <head>
 * (app/layout.tsx); each widget asks it to fill its box on mount, so it also works after
 * client-side navigation. An unfilled box takes no space.
 */
export function AdsKeeper({ widgetId }: { widgetId: string }) {
  useEffect(() => {
    window._mgq = window._mgq || [];
    window._mgq.push(["_mgc.load"]);
  }, [widgetId]);

  if (!SITE.adskeeper.siteId || !widgetId) return null;
  return <div key={widgetId} className="ak-slot" data-type="_mgwidget" data-widget-id={widgetId} />;
}
