export interface RealReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** Initials only - a reviewer's full name is never published. */
  initials: string | null;
  vehicleTitle: string | null;
}

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/api";

interface BackendReview {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

interface BackendVehicle {
  title?: string | null;
  reviews?: BackendReview[] | null;
}

function toInitials(u?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!u) return null;
  const first = (u.firstName ?? "").trim();
  const last = (u.lastName ?? "").trim();
  if (!first && !last) return null;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/**
 * Recent real reviews, for the storefront.
 *
 * Read from the public vehicle detail payload so there is a single source of
 * truth. Only reviews with a comment are returned - a bare star score is not
 * quotable, and an empty comment would render as a blank card.
 *
 * Returns [] when there is nothing real to show. Callers must render an honest
 * empty state rather than substitute invented quotes.
 */
export async function getRecentReviews(
  vehicleIds: number[],
  limit = 6,
): Promise<RealReview[]> {
  const ids = vehicleIds.filter((n) => Number.isInteger(n) && n > 0).slice(0, 12);
  if (ids.length === 0) return [];

  try {
    const results = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`${BACKEND_URL}/vehicles/${id}`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 300 },
        });
        if (!res.ok) return [] as RealReview[];
        const body = (await res.json()) as { data?: BackendVehicle };
        const vehicle = body?.data;
        return (vehicle?.reviews ?? [])
          .filter((r) => typeof r.rating === "number" && (r.comment ?? "").trim())
          .map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment ?? null,
            createdAt: r.createdAt,
            initials: toInitials(r.user),
            vehicleTitle: vehicle?.title ?? null,
          }));
      }),
    );

    return results
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}
