import { redirect } from "next/navigation";

import { getSession } from "@/app/server/session";

/** Gate for admin Server Component pages: sign-in, then ADMIN. */
export async function requireAdminPage(returnTo: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (session.role !== "ADMIN") redirect("/dashboard");
}
