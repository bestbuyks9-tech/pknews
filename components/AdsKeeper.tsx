"use client";

import { useEffect } from "react";
import { SITE } from "@/lib/site";

type MgQueue = unknown[][];
declare global {
  interface Window { _mgq?: MgQueue }
}

/**
 * AdsKeeper native widget. The site script is loaded once in app/layout.tsx; each widget
 * asks it to fill its box on mount, so it also works after client-side navigation.
 */
export function AdsKeeper({ widgetId }: { widgetId: string }) {
  useEffect(() => {
    window._mgq = window._mgq || [];
    window._mgq.push(["_mgc.load"]);
  }, [widgetId]);

  if (!SITE.adskeeper.siteId || !widgetId) return null;
  return (
    <div className="ad-slot ak-slot">
      <span className="ad-label">Reklamë</span>
      <div key={widgetId} data-type="_mgwidget" data-widget-id={widgetId} />
    </div>
  );
}
