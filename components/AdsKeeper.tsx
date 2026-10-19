"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type MgQueue = unknown[][];
declare global {
  interface Window { _mgq?: MgQueue }
}

/**
 * AdsKeeper native widget: the dashboard's container code. The site loader is in the <head>
 * (app/layout.tsx); each widget asks it to fill its box on mount, so it also works after
 * client-side navigation. An unfilled box takes no space. On phones the mobile widget
 * (SITE.adskeeper.mobileWidget) takes the place of the desktop one.
 */
const PHONE = "(max-width: 760px)";

export function AdsKeeper({ widgetId }: { widgetId: string }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const mobile = SITE.adskeeper.mobileWidget;
    setId(mobile && window.matchMedia(PHONE).matches ? mobile : widgetId);
  }, [widgetId]);

  useEffect(() => {
    if (!id) return;
    window._mgq = window._mgq || [];
    window._mgq.push(["_mgc.load"]);
  }, [id]);

  if (!SITE.adskeeper.siteId || !id) return null;
  return <div key={id} className="ak-slot" data-type="_mgwidget" data-widget-id={id} />;
}
