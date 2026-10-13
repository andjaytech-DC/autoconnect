import { NEST_ORIGIN } from "./nest";

/**
 * Asset roots this Next.js app owns and serves itself from `public/`.
 *
 * A reference such as `/cars/suv-blue.png` maps to `public/cars/suv-blue.png`
 * and is fetched from the frontend origin. It must NOT be rewritten to the
 * NestJS origin: the API server does not host these files, so prefixing turned
 * every catalogue photo into `404 upstream image response failed`.
 *
 * `/uploads/*` is owned by this app as well: `/api/upload` writes to
 * `public/uploads`, `/api/upload/cleanup` deletes from it, and this app serves
 * it statically. The NestJS `uploads/` directory is empty and its
 * `vehicle-images` controller is not used by this frontend, so prefixing turned
 * every uploaded photo into `404 upstream image response failed` too.
 *
 * Each entry ends with `/` so the check is a *directory* boundary rather than a
 * raw string prefix: `/cars/…` matches, `/cars-of-2024/…` does not.
 */
const FRONTEND_ASSET_ROOTS = ["/cars/", "/products/", "/uploads/"] as const;

/**
 * Percent-decode for inspection, seeing through one extra level of encoding so
 * both `%2e%2e` and `%252e%252e` are recognised as `..`. Returns null when the
 * value is not valid percent-encoding — an untrustworthy path is never treated
 * as local.
 */
function decodeForInspection(value: string): string | null {
  let current = value;
  // Two passes cover single- and double-encoded traversal. More passes would
  // only start misfiring on ordinary percent signs.
  for (let pass = 0; pass < 2; pass++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * True only for a path that is provably inside a frontend-owned root and cannot
 * climb out of it. Everything else — malformed, ambiguous, or simply unknown —
 * falls through to the backend origin, which is the safe default.
 */
function isFrontendOwnedAsset(pathname: string): boolean {
  const decoded = decodeForInspection(pathname);
  if (decoded === null) return false;
  // Backslashes are path separators on some platforms and clients; a rooted URL
  // mixing them in is not something this app serves.
  if (decoded.includes("\\")) return false;
  // Control characters never belong in a URL path.
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return false;
  // Reject any traversal segment, encoded or not.
  if (decoded.split("/").some((segment) => segment === "." || segment === "..")) return false;
  // Directory-boundary match against the allowlist.
  return FRONTEND_ASSET_ROOTS.some((root) => decoded.startsWith(root));
}

/**
 * Normalise an image reference returned by the NestJS API into a URL the UI can
 * render.
 *
 * - `http(s)://…`, `data:`, `blob:` — returned untouched. Host allow-listing is
 *   still enforced by `next.config.js` (`images.remotePatterns`) and the Image
 *   Optimization API's own SSRF guard.
 * - `/cars/*`, `/products/*`, `/uploads/*` — frontend-owned; returned
 *   root-relative so the browser requests them from this app's `public/` folder.
 * - any other root-relative path — resolved against the NestJS origin, the safe
 *   default for anything this app does not recognise.
 */
export function resolveImage(src: string | null | undefined): string | null {
  if (typeof src !== "string") return null;
  const s = src.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("/")) {
    return isFrontendOwnedAsset(s) ? s : `${NEST_ORIGIN}${s}`;
  }
  return s;
}
