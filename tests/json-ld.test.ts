import { test } from "node:test";
import assert from "node:assert/strict";

import { jsonLdScriptProps, safeJsonLd } from "../app/lib/json-ld";

/**
 * The site renders JSON-LD in an inline <script>. Anything that lets a listing
 * title escape the script tag is stored XSS: a vehicle named
 * `</script><script>alert(document.cookie)</script>` was executed on the
 * listing page. json-ld.ts is the single escaping seam and this locks it.
 */
test("safeJsonLd neutralises a script-tag breakout in user data", () => {
  const hostile = '</script><script>alert(document.cookie)</script>';
  const encoded = safeJsonLd({
    "@type": "Vehicle",
    name: hostile,
    description: hostile,
  });

  assert.ok(encoded.includes("\\u003c"), "< must be escaped");
  assert.ok(encoded.includes("\\u003e"), "> must be escaped");
  assert.ok(!encoded.includes("</"), "no literal tag may survive");
  assert.ok(!encoded.includes("<script"), "no raw script tag may survive");
  assert.ok(!encoded.includes("</script>"), "the payload must not close the tag");
  // The payload text is still present — it is inert, not removed: the script
  // element is never terminated, so the browser never hands it to the parser.
  assert.ok(encoded.includes("alert(document.cookie)"));
});

test("safeJsonLd escapes ampersands, U+2028 and U+2029", () => {
  const encoded = safeJsonLd({ text: '& "quoted" \u2028\u2029' });
  assert.ok(encoded.includes("\\u0026"), "& must be escaped");
  assert.ok(!encoded.includes("\u2028"), "U+2028 must be escaped");
  assert.ok(!encoded.includes("\u2029"), "U+2029 must be escaped");
});

test("safeJsonLd output is still valid JSON that round-trips", () => {
  const original = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: 'Honda "City" & <Accord>',
    offers: { "@type": "Offer", price: 850000, priceCurrency: "PKR" },
  };
  const parsed = JSON.parse(safeJsonLd(original));
  assert.deepEqual(parsed, original);
});

test("safeJsonLd survives a quote-delivered breakout", () => {
  // `"` closes the JSON string; on its own it is still safe because the browser
  // only terminates the script element on `</script`, but it must not corrupt
  // the document structure.
  const parsed = JSON.parse(safeJsonLd({ name: 'x", "evil": "1' }));
  assert.equal(parsed.name, 'x", "evil": "1');
});

test("jsonLdScriptProps returns the dangerouslySetInnerHTML payload React needs", () => {
  const props = jsonLdScriptProps({ "@type": "Vehicle", name: "Civic" });
  assert.ok(props.__html.includes("Civic"));
  assert.ok(!props.__html.includes("</script>"));
});

test("jsonLdScriptProps handles a fully hostile payload end to end", () => {
  const markup = jsonLdScriptProps({
    "@type": "Vehicle",
    name: '</script><img src=x onerror=fetch("/steal?c="+document.cookie)>',
  }).__html;
  assert.ok(!markup.includes("</script"), "script element must stay closed");
  assert.ok(!markup.includes("<img"), "no img element may be created");
  assert.ok(markup.includes("\\u003c"), "angle bracket escaped");
});
