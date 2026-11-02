import type { Metadata, Viewport } from "next";
import { Jersey_10, Rubik, Silkscreen } from "next/font/google";
import { Toaster } from "sonner";
import { site } from "@/lib/site";
import "./globals.css";

const jersey = Jersey_10({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-jersey", display: "swap" });
const silkscreen = Silkscreen({ weight: ["400", "700"], subsets: ["latin", "latin-ext"], variable: "--font-silkscreen", display: "swap" });
const rubik = Rubik({ subsets: ["latin", "latin-ext"], variable: "--font-rubik", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: LoL Boosting & Gaming Marketplace`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_US" },
  twitter: { card: "summary_large_image", ...(site.twitterHandle ? { site: site.twitterHandle } : {}) },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#100f0e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jersey.variable} ${silkscreen.variable} ${rubik.variable}`}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#181716",
              border: "1px solid #2f2d2a",
              color: "#f5f3ef",
              fontFamily: "var(--font-rubik)",
            },
          }}
        />
      </body>
    </html>
  );
}
