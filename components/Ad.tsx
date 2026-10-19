import { AdsKeeper } from "./AdsKeeper";
import { SITE } from "@/lib/site";

/**
 * Ad space. When AdsKeeper is configured (lib/site.ts), rectangle and billboard spaces show the
 * AdsKeeper native widget and the other sizes are left out; otherwise a dashed placeholder
 * shows where an ad would go. Sizes are standard IAB units.
 */
const SIZES = {
  leaderboard: [728, 90],
  billboard: [970, 250],
  rectangle: [300, 250],
  halfpage: [300, 600],
  mobile: [320, 100],
} as const;

export type AdSize = keyof typeof SIZES;

/** Ad sizes the AdsKeeper native widget replaces; the rest are hidden while AdsKeeper is on. */
const ADSKEEPER_SIZES: AdSize[] = ["rectangle", "billboard"];

/** Screen width at which the side rails show and the in-article ad steps aside (see globals.css). */
const RAIL_MEDIA = "(min-width: 1680px)";

const adskeeperOn = () => Boolean(SITE.adskeeper.siteId && SITE.adskeeper.widget);

export function Ad({ size, label = true }: { size: AdSize; label?: boolean }) {
  if (adskeeperOn()) {
    return ADSKEEPER_SIZES.includes(size) ? <AdsKeeper widgetId={SITE.adskeeper.widget} /> : null;
  }
  const [w, h] = SIZES[size];
  return (
    <div className="ad-slot">
      {label && <span className="ad-label">Reklamë</span>}
      <div className="ad" style={{ width: w, height: h }} role="complementary" aria-label={`Hapësirë reklamimi ${w}×${h}`}>
        <b>Hapësirë reklamimi</b>
        <span>{w} × {h}</span>
      </div>
    </div>
  );
}

export function AdBand({ size }: { size: AdSize }) {
  if (adskeeperOn() && !ADSKEEPER_SIZES.includes(size)) return null;
  return (
    <div className="ad-wrap">
      <Ad size={size} />
    </div>
  );
}

/**
 * AdsKeeper widgets in the empty margins either side of the page on wide screens; they stick
 * below the menu while scrolling. On narrower screens (phones included) they are left out and
 * the in-article space shows the widget instead.
 */
export function SideRails() {
  if (!adskeeperOn()) return null;
  return (
    <>
      <div className="side-rail side-rail-left"><div><AdsKeeper widgetId={SITE.adskeeper.widget} media={RAIL_MEDIA} /></div></div>
      <div className="side-rail side-rail-right"><div><AdsKeeper widgetId={SITE.adskeeper.widget} media={RAIL_MEDIA} /></div></div>
    </>
  );
}

/** In-article ad space; on screens wide enough for the side rails it steps aside for them. */
export function InlineAd() {
  if (!adskeeperOn()) return <div className="ad-wrap"><Ad size="rectangle" /></div>;
  return <div className="ad-wrap ad-inline"><AdsKeeper widgetId={SITE.adskeeper.widget} media={`not all and ${RAIL_MEDIA}`} /></div>;
}
