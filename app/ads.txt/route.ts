/**
 * Serves /ads.txt from the ADS_TXT environment variable (one line per entry), so ad network
 * lines such as AdsKeeper's can be added in Vercel without a code change.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const body = (process.env.ADS_TXT || "").replace(/\\n/g, "\n").trim();
  return new Response(body ? `${body}\n` : "", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
