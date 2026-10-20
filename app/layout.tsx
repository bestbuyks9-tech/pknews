import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/inter";
import "./globals.css";
import { SITE } from "@/lib/site";
import { AdsKeeper } from "@/components/AdsKeeper";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, locale: "sq_AL", type: "website" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#c8102e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <head>
        {/* AdsKeeper loader: the dashboard asks for it in the <head> of every page. */}
        {SITE.adskeeper.siteId && <script src={`https://jsc.adskeeper.com/site/${SITE.adskeeper.siteId}.js`} async />}
      </head>
      <body>
        {children}
        {/* AdsKeeper sticky mobile widget, in addition to the in-page widget. */}
        {SITE.adskeeper.mobileWidget && <AdsKeeper widgetId={SITE.adskeeper.mobileWidget} />}
        {/* Metricool web analytics pixel */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://tracker.metricool.com/c3po.jpg?hash=cba95736f786e3ebd10b8e1ceab9936e" alt="" width={1} height={1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
        {SITE.gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}`} strategy="afterInteractive" />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${SITE.gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
