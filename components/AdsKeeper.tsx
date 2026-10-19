"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type MgQueue = unknown[][];
declare global {
  interface Window { _mgq?: MgQueue }
}

/** Whether a media query matches, kept up to date; null until known in the browser. */
function useMedia(query?: string) {
  const [matches, setMatches] = useState<boolean | null>(query ? null : true);
  useEffect(() => {
    if (!query) return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * AdsKeeper native widget: the dashboard's container code. The site loader is in the <head>
 * (app/layout.tsx); each widget asks it to fill its box on mount, so it also works after
 * client-side navigation. With `media`, the widget only exists while that media query matches,
 * so hidden spaces don't load ads. An unfilled box takes no space.
 */
export function AdsKeeper({ widgetId, media }: { widgetId: string; media?: string }) {
  const show = useMedia(media) === true;
  useEffect(() => {
    if (!show) return;
    window._mgq = window._mgq || [];
    window._mgq.push(["_mgc.load"]);
  }, [widgetId, show]);

  if (!SITE.adskeeper.siteId || !widgetId || !show) return null;
  return <div key={widgetId} className="ak-slot" data-type="_mgwidget" data-widget-id={widgetId} />;
}
