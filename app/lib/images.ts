/**
 * Shared helpers for resolving display images.
 *
 * Product/new-car rows may store either an absolute URL (required by the
 * legacy backend) or a local /-rooted asset path (our SVGs / seeded images).
 * We treat any non-empty string as renderable so local placeholders work too.
 */

/** True when a stored image field should be rendered (local path or URL). */
export function hasImage(src: string | null | undefined): boolean {
  return typeof src === "string" && src.trim().length > 0;
}

/** Normalise a stored image value into an `src` usable by <img>/next Image. */
export function imageSrc(src: string | null | undefined): string | undefined {
  return hasImage(src) ? (src as string).trim() : undefined;
}