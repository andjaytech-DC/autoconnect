import { prisma } from "@/app/server/prisma";

/**
 * Customer-portal reads.
 *
 * The portal used to query `testDrive` and `financeApplication` with no `where`
 * at all, so every signed-in customer saw the site-wide totals — and each page
 * load pulled every applicant's PAN, employer name and monthly income into
 * memory to compute a count. `TestDrive` additionally had no owner column, so
 * there was nothing to scope on even if the query had asked.
 *
 * Both resources are now filtered by the caller's verified user id, which is
 * the only scoping input. A guest row (`userId IS NULL`) belongs to nobody and
 * is therefore never returned here. Kept as a separate, pure function so the
 * scoping can be asserted directly in tests without rendering a server
 * component.
 */

export interface PortalSession {
  /** The signed session's `id` claim (a string, as stored in the JWT). */
  id: string;
  email: string;
}

export interface CustomerPortalData {
  testDrives: Array<{
    id: number;
    vehicleId: number;
    preferredDate: Date;
    preferredTime: string;
    vehicle: { id: number; title: string } | null;
  }>;
  financeApplicationCount: number;
  leads: Array<{
    id: number;
    vehicleId: number;
    status: string;
    message: string | null;
    createdAt: Date;
  }>;
}

export const PORTAL_ROW_LIMIT = 20;

/**
 * Load the portal payload for one customer. Returns empty collections (never a
 * global scan) when the id claim is not a usable integer.
 */
export async function loadCustomerPortalData(
  session: PortalSession,
): Promise<CustomerPortalData> {
  const userId = Number.parseInt(session.id, 10);
  if (!Number.isInteger(userId)) {
    return { testDrives: [], financeApplicationCount: 0, leads: [] };
  }

  const [testDrives, financeApplicationCount, leads] = await Promise.all([
    prisma.testDrive.findMany({
      where: { userId },
      select: {
        id: true,
        vehicleId: true,
        preferredDate: true,
        preferredTime: true,
        vehicle: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PORTAL_ROW_LIMIT,
    }),
    prisma.financeApplication.count({ where: { userId } }),
    prisma.lead.findMany({
      where: { customerEmail: session.email },
      select: {
        id: true,
        vehicleId: true,
        status: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: PORTAL_ROW_LIMIT,
    }),
  ]);

  return { testDrives, financeApplicationCount, leads };
}
