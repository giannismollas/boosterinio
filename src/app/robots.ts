import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const production = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";
  return {
    rules: production
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/api/", "/dashboard", "/seller", "/checkout", "/orders", "/login", "/register", "/forgot-password", "/reset-password", "/uploads/tickets/"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
