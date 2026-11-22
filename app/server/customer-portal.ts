import { backendFetch } from "@/app/lib/backend";

/**
 * Customer-portal reads.
 *
 * Everything on the portal is the caller's own data and it is read from NestJS
 * with the caller's bearer token — the token is the only identity input, so
 * there is no id, email or filter here that a client could vary to see another
 * customer's records. (The portal used to query the whole `TestDrive` and
 * `FinanceApplication` tables with no `where`, so every customer saw site-wide
 * totals.) NestJS owns the scoping: `/test-drives/mine`, `/leads/mine`,
 * `/finance/applications/count`.
 *
 * Kept as a separate function so the contract can be asserted without
 * rendering a server component.
 */

export interface PortalSession {
  /** The NestJS bearer token from the signed session. */
  token?: string | null;
}

export interface CustomerPortalData {
  testDrives: Array<{
    id: number;
    vehicleId: number;
    preferredDate: string;
    preferredTime: string;
    vehicle: { id: number; title: string } | null;
  }>;
  financeApplicationCount: number;
  leads: Array<{
    id: number;
    vehicleId: number | null;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  /** True when any section could not be read, so the page can say so. */
  unavailable: boolean;
}

export async function loadCustomerPortalData(
  session: PortalSession,
): Promise<CustomerPortalData> {
  const empty: CustomerPortalData = {
    testDrives: [],
    financeApplicationCount: 0,
    leads: [],
    unavailable: false,
  };
  // Without a backend token there is nothing to scope on — show nothing, never
  // everything.
  if (!session.token) return { ...empty, unavailable: true };
  const token = session.token;

  const [drives, finance, leads] = await Promise.allSettled([
    backendFetch<CustomerPortalData["testDrives"]>("/test-drives/mine", { token }),
    backendFetch<{ count: number }>("/finance/applications/count", { token }),
    backendFetch<CustomerPortalData["leads"]>("/leads/mine", { token }),
  ]);

  return {
    testDrives: drives.status === "fulfilled" ? (drives.value ?? []) : [],
    financeApplicationCount:
      finance.status === "fulfilled" ? (finance.value?.count ?? 0) : 0,
    leads: leads.status === "fulfilled" ? (leads.value ?? []) : [],
    unavailable: [drives, finance, leads].some((r) => r.status === "rejected"),
  };
}
