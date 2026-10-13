import "server-only";

import { backendFetch } from "@/app/lib/backend";
import { inr, putCarRef } from "@/app/lib/account";

/**
 * Server-side vehicle resolver.
 *
 * Server components cannot use the client loader in `account.ts` (it calls the
 * Next API route over HTTP). This reads the backend directly and feeds the same
 * shared cache, so `getCarRef` works in both environments.
 *
 * Never fabricates: an unresolvable id simply stays uncached and renders as a
 * neutral placeholder.
 */
export async function loadCarRefsServer(
  ids: number[],
): Promise<{ resolved: number; unresolved: number }> {
  const wanted = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  if (wanted.length === 0) return { resolved: 0, unresolved: 0 };

  let resolved = 0;

  await Promise.all(
    wanted.map(async (id) => {
      try {
        const v = await backendFetch<{
          title?: string;
          year?: number;
          price?: number;
          bodyType?: string | null;
          brand?: { name?: string | null } | null;
        }>(`/vehicles/${id}`);

        if (!v?.title) return;

        putCarRef({
          id,
          name: v.title,
          brand: v.brand?.name ?? "—",
          year: typeof v.year === "number" ? v.year : 0,
          price: typeof v.price === "number" ? inr(v.price) : "—",
          type: v.bodyType ?? "—",
        });
        resolved += 1;
      } catch {
        // 404 for a deleted vehicle, or the backend is down. Either way the
        // caller gets a neutral label rather than an invented car.
      }
    }),
  );

  return { resolved, unresolved: wanted.length - resolved };
}
