import type { MetadataRoute } from "next";

const BASE_URL = "https://progressiveautohub.com";

/**
 * sitemap.xml — lists every public URL for search engines.
 *
 * Static routes are declared explicitly.
 *
 * Dealer detail URLs are fetched from the live backend rather than the static
 * `data/dealers` file. That file is fixture data with invented business names,
 * ratings and inventory counts, so listing those URLs would advertise
 * dealerships that do not exist. If the backend is unreachable the dealer URLs
 * are simply omitted.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/cars`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/dealers`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/electric`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/finance`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/sell`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/sitemap`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/careers`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Omitted: /brands has no page (only /brands/[slug] exists), so listing it
    // produced a 404 for crawlers. Re-add once a /brands index exists.
  ];

  const dealerRoutes = await dealerSitemapEntries();

  return [...staticRoutes, ...dealerRoutes];
}

async function dealerSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const apiUrl =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000/api";

  try {
    const res = await fetch(`${apiUrl}/dealers`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const body = (await res.json()) as {
      data?: { id: number; isActive?: boolean }[];
    };
    const now = new Date();

    return (body?.data ?? [])
      .filter((d) => typeof d?.id === "number" && d.isActive !== false)
      .map((d) => ({
        url: `${BASE_URL}/dealers/${d.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    // Backend unavailable: omit dealer URLs rather than invent them.
    return [];
  }
}
