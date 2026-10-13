/**
 * Active-route helpers shared by all navigation surfaces.
 */

/**
 * Whether `href` should be highlighted for the current `pathname`.
 *
 * Rules:
 *  - "/" matches exactly only (never highlights on other pages).
 *  - Any other href is active for itself AND its nested routes
 *    (segment-boundary prefix match):
 *      /dealers       → /dealers active
 *      /dealers/123   → /dealers active
 *      /dealership    → NOT active for /dealers
 *  - Query strings and hash fragments are ignored.
 */
export function isActivePath(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/, 1)[0] ?? pathname;
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Whether a primary nav item should be highlighted for the current path.
 * Considers the landing href, any explicit `match` paths, and every child
 * / mega-section destination so dropdown parents stay highlighted.
 */
export function isNavItemActive(
  pathname: string | null | undefined,
  href: string,
  match: string[] | undefined,
  children?: { href: string }[] | undefined,
  megaSections?: { items: { href: string }[]; title: string }[] | undefined
): boolean {
  if (!pathname) return false;
  const candidates = [href, ...(match ?? [])];
  for (const child of children ?? []) candidates.push(child.href);
  for (const section of megaSections ?? []) {
    for (const item of section.items) candidates.push(item.href);
  }
  return candidates.some((h) => isActivePath(pathname, h));
}
