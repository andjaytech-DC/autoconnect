/**
 * Safe JSON-LD serialization for `<script type="application/ld+json">`.
 *
 * `JSON.stringify` escapes quotes and backslashes but leaves `<`, `>` and `&`
 * untouched, so a value containing `</script><img src=x onerror=...>` would
 * terminate the script element early and execute. Vehicle titles, descriptions,
 * engine strings and dealer names are all user-authored, so they cannot be
 * trusted to be script-safe.
 *
 * Replacing the three HTML-significant characters (and the two JS line
 * separators) with their `\uXXXX` escapes produces byte-for-byte identical JSON
 * for any consumer — `JSON.parse` decodes `\u003c` back to `<` — while making
 * breakout impossible.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * React `dangerouslySetInnerHTML` payload for a JSON-LD block. Kept as a helper
 * so every call site gets the escaping and none has to remember to escape.
 */
export function jsonLdScriptProps(data: unknown): { __html: string } {
  return { __html: safeJsonLd(data) };
}
