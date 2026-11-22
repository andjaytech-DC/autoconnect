/**
 * Builds the backend query string for the admin insurance list/export from
 * whitelisted, validated filters only. Anything else in the URL is dropped, never
 * forwarded. Lives here (not in a route file) because Next.js route modules may
 * only export HTTP handlers.
 */
const LIST_STATUSES = new Set([
  "SUBMITTED", "UNDER_REVIEW", "PARTNER_ASSIGNED", "QUOTE_RECEIVED",
  "CUSTOMER_CONTACTED", "ACCEPTED", "DECLINED", "CLOSED",
]);
const COVERS = new Set(["NEW", "RENEWAL", "COMPREHENSIVE", "THIRD_PARTY", "ADD_ON"]);

export function adminListQuery(sp: URLSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  const status = sp.get("status");
  if (status && LIST_STATUSES.has(status)) q.set("status", status);
  const cover = sp.get("coverType");
  if (cover && COVERS.has(cover)) q.set("coverType", cover);
  const partnerId = sp.get("partnerId");
  if (partnerId && /^\d+$/.test(partnerId)) q.set("partnerId", partnerId);
  if (sp.get("followUp") === "true") q.set("followUp", "true");
  const search = sp.get("q")?.trim().slice(0, 80);
  if (search) q.set("q", search);
  const page = sp.get("page");
  if (page && /^\d+$/.test(page)) q.set("page", page);
  const limit = sp.get("limit");
  if (limit && /^\d+$/.test(limit)) q.set("limit", String(Math.min(Number(limit), 100)));
  return q;
}
