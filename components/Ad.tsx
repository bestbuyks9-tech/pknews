/**
 * Ad placeholder. Replace the inner box with your ad network code
 * (e.g. Google AdSense <ins> tag) when you have one — sizes are standard IAB units.
 */
const SIZES = {
  leaderboard: [728, 90],
  billboard: [970, 250],
  rectangle: [300, 250],
  halfpage: [300, 600],
  mobile: [320, 100],
} as const;

export type AdSize = keyof typeof SIZES;

export function Ad({ size, label = true }: { size: AdSize; label?: boolean }) {
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
  return (
    <div className="ad-wrap">
      <Ad size={size} />
    </div>
  );
}
