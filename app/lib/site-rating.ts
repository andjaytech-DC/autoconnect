export interface SiteRating {
  average: number | null;
  count: number;
}

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/api";

/**
 * Real customer rating, straight from the Review table.
 *
 * Returns null on any failure or when there are no reviews, so the UI renders
 * nothing rather than an invented score. Cached for 5 minutes because the root
 * layout runs on every page.
 */
export async function getSiteRating(): Promise<SiteRating | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/reviews/summary`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      success?: boolean;
      data?: { average: number | null; count: number };
    };
    const data = body?.data;
    if (!data || typeof data.count !== "number" || data.count === 0) return null;
    if (typeof data.average !== "number") return null;

    return { average: data.average, count: data.count };
  } catch {
    // Includes a backend that is down; no rating is the honest state.
    return null;
  }
}
