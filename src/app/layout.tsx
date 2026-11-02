import type { Metadata, Viewport } from "next";
import { Rubik, Saira } from "next/font/google";
import { Toaster } from "sonner";
import { site } from "@/lib/site";
import "./globals.css";

// Saira is variable in weight and width: display type runs wide (wdth ~118) and heavy italic.
const saira = Saira({ style: ["normal", "italic"], axes: ["wdth"], subsets: ["latin", "latin-ext"], variable: "--font-saira", display: "swap" });
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
  themeColor: "#0b0b16",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${saira.variable} ${rubik.variable}`}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#121222",
              border: "1px solid #28273f",
              color: "#ffffff",
              fontFamily: "var(--font-rubik)",
            },
          }}
        />
      </body>
    </html>
  );
}
