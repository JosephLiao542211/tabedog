import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/seo";

const urbanist = Urbanist({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-urbanist", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["Tabelog English", "Tabelog in English", "Japan restaurant map", "best restaurants Japan", "best app for restaurants in Japan", "eat like a local Japan", "Tabelog rating meaning", "authentic Japanese restaurants", "Japanese food app"],
  icons: { icon: "/logo.svg" },
  openGraph: { type: "website", siteName: SITE.name, locale: "en_US", url: SITE.url, title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description },
  twitter: { card: "summary_large_image", title: `${SITE.name}: ${SITE.tagline}`, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>{children}</body>
    </html>
  );
}
