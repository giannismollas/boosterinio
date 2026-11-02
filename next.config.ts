import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Payment pages are hosted by the providers (redirect flow), so no third-party
// scripts run on our pages. form-action must allow the provider redirects.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://checkout.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://nowpayments.io",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The tab was renamed to match the market's naming.
      { source: "/league-of-legends/boosting/placement-matches", destination: "/league-of-legends/boosting/placements-boost", permanent: true },
    ];
  },
};

export default nextConfig;
