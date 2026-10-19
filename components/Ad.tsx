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
