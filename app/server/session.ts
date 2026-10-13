import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import type { SessionPayload } from "@/app/lib/auth";

/**
 * Read the signed-in session inside Server Components / Route Handlers.
 * Returns null when there is no valid session.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}
