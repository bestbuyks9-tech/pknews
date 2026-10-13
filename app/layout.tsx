import type { Metadata, Viewport } from "next";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/inter";
import "./globals.css";
import { SITE } from "@/lib/site";

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
      <body>
        {children}
      </body>
    </html>
  );
}
