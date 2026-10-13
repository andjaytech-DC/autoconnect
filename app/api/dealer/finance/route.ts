import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";
import { requireDealer } from "@/app/server/authz";
import { withErrorGuard } from "@/app/lib/route-guard";

/**
 * Dealers underwrite the loans on their own vehicles, so income and employer
 * stay visible to them. The PAN is a full tax number no underwriting decision
 * needs at screen level — it is masked to its last four characters so a leaked
 * or screenshotted dealer view does not replicate a full financial ID. The
 * physical verification step (where the PAN is actually read) happens offline.
 */
function maskPan(panNumber: string | null): string | null {
  if (!panNumber || panNumber.length < 5) return panNumber;
  return `XXXXXX${panNumber.slice(-4)}`;
}

/**
 * GET /api/dealer/finance — finance applications for the dealer's vehicles only.
 * Error handling is centralized in withErrorGuard so the route always returns
 * JSON (never an HTML error page).
 */
const handler: (request: Request) => Promise<NextResponse> = async (request) => {
  const auth = await requireDealer(request);
  if (auth instanceof NextResponse) return auth;
  const applications = await prisma.financeApplication.findMany({
    where: { vehicle: { dealerId: auth.dealer!.id } },
    include: { vehicle: { select: { id: true, title: true, price: true } } },
    orderBy: { createdAt: "desc" },
  });
  const masked = applications.map((application) => ({
    ...application,
    panNumber: maskPan(application.panNumber),
  }));
  return NextResponse.json({ applications: masked });
};

export const GET = withErrorGuard(handler, { route: "api/dealer/finance" });
