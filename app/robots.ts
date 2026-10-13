import type { MetadataRoute } from "next";

const BASE_URL = "https://progressiveautohub.com";

/**
 * robots.txt — tells crawlers which parts of the site they may access.
 * Auth, admin and API routes are blocked; everything else is open.
 * The sitemap index is declared so engines discover every public URL.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/private/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/private/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
