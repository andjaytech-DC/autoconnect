import type { ReactNode } from "react";

import { jsonLdScriptProps } from "@/app/lib/json-ld";

const BASE_URL = "https://progressiveautohub.com";
const SITE_NAME = "Progressive AutoHub";

interface FeaturedCar {
  name: string;
  type: string;
  price: string;
  location: string;
  image: string;
  tag?: string;
}

/**
 * Parse a human-readable Indian price ("₹14.5 Lakh") into a number (1450000).
 * Falls back to undefined when the string contains no usable number.
 */
function parseLakhPrice(price: string): number | undefined {
  const match = price.match(/([\d.]+)/);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return undefined;
  if (/crore/i.test(price)) return Math.round(value * 10000000);
  if (/lakh/i.test(price)) return Math.round(value * 100000);
  return Math.round(value);
}

/**
 * Structured data for the Progressive AutoHub homepage.
 *
 * Emits three JSON-LD blocks that are especially valuable for a car marketplace:
 *   1. Organization (typed as AutoDealer) — the business identity.
 *   2. WebSite + Sitelinks SearchAction — powers Google's site search box.
 *   3. ItemList of Car products — the featured vehicles, each with an Offer.
 *
 * All three are rendered as <script type="application/ld+json"> so search
 * engines can consume them directly.
 */
export function HomepageStructuredData({ cars }: { cars: FeaturedCar[] }) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.svg`,
    description:
      "India's trusted platform for certified pre-owned cars. Buy, sell and finance quality used cars with transparent pricing, flexible finance options and doorstep delivery.",
    areaServed: "India",
    priceRange: "₹",
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/cars?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Featured Cars",
    itemListElement: cars.map((car, index) => {
      const price = parseLakhPrice(car.price);
      const item: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Car",
          name: car.name,
          description: `${car.type} available in ${car.location}.`,
          image: `${BASE_URL}${car.image}`,
          url: `${BASE_URL}/cars`,
          brand: car.name.split(" ")[0],
          vehicleConfiguration: car.type,
        },
      };

      if (price !== undefined) {
        (item.item as Record<string, unknown>).offers = {
          "@type": "Offer",
          priceCurrency: "INR",
          price: price.toString(),
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: SITE_NAME },
        };
      }

      return item;
    }),
  };

  const blocks = [organization, webSite, itemList];

  return (
    <>
      {blocks.map((block, index) => (
        <ScriptTag key={index} data={block} />
      ))}
    </>
  );
}

function ScriptTag({ data }: { data: Record<string, unknown> }): ReactNode {
  // `jsonLdScriptProps` escapes `<`, `>` and `&` so a car name containing
  // `</script>` cannot terminate the element and inject markup. The homepage
  // feeds this from the vehicle catalogue, which is user-authored.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLdScriptProps(data)}
    />
  );
}
