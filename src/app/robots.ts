import type { MetadataRoute } from "next";

import { siteUrl } from "./_seo/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    host: base,
    sitemap: `${base}/sitemap.xml`,
  };
}
