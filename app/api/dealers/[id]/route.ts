/**
 * GET /api/dealers/[id]
 *
 * Returns a single dealer by numeric id. Backed by the NestJS API when
 * reachable, falling back to mock data otherwise. The response shape is
 * kept stable so the frontends never have to change.
 *
 * The `id` is validated as a positive integer before use, which matters more
 * than it looks: `backendFetch` interpolates it straight into the backend URL
 * and Next.js URL-decodes route params, so a value like `../admin` turned
 * `/dealers/../admin` into a request for an entirely different backend
 * endpoint — an unauthenticated read primitive for whatever path was supplied.
 * Every other dynamic route in this app validates its id; this one did not.
 *
 * Contact details (phone, and the account email behind `user.email`) are
 * released only to a signed-in session — see the note in ./route.ts. The
 * local fallback dataset carries invented contact details, so it is gated on
 * the same rule rather than being treated as a loophole.
 */

import { NextResponse } from "next/server";
import { dealers as mockDealers } from "@/app/data/dealers";
import {
  backendFetch,
  isBackendUnreachable,
  BackendError,
} from "@/app/lib/backend";
import { requireUser } from "@/app/server/authz";
import { mapBackendDealer } from "../route";

interface DealerRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: DealerRouteParams,
) {
  const { id } = await params;

  // Only a bare positive integer is a valid dealer id. Anything else — a
  // traversal sequence, a non-numeric string, a negative number — is refused
  // before it can reach the backend URL.
  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) {
    return NextResponse.json(
      { error: "Invalid dealer id", code: "INVALID_ID" },
      { status: 400 },
    );
  }
  const dealerId = Number.parseInt(id, 10);

  // Any valid session unlocks the contact fields; role is irrelevant.
  const canSeeContact = !((await requireUser(request)) instanceof NextResponse);

  const redactContacts = (dealer: (typeof mockDealers)[number]) => ({
    ...dealer,
    phone: canSeeContact ? dealer.phone : null,
    email: canSeeContact ? dealer.email : null,
  });

  // 1) NestJS backend (authoritative)
  try {
    const dealer = await backendFetch<Parameters<typeof mapBackendDealer>[0]>(
      `/dealers/${dealerId}`,
    );
    return NextResponse.json({
      dealer: mapBackendDealer(dealer, canSeeContact),
      contactAvailable: canSeeContact,
      source: "backend",
    });
  } catch (err) {
    if (!isBackendUnreachable(err) && err instanceof BackendError) {
      if (err.status === 404) {
        return NextResponse.json(
          { error: "Dealer not found", code: "NOT_FOUND" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
  }

  // 2) Local fallback (mock data)
  const dealer = mockDealers.find((d) => String(d.id) === id);

  if (!dealer) {
    return NextResponse.json(
      { error: "Dealer not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    dealer: redactContacts(dealer),
    contactAvailable: canSeeContact,
    source: "local",
  });
}