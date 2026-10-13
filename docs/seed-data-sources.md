# Seed data sources and provenance

Last reviewed: **2026-10-13**

This document records where the development seed (`prisma/seed-all.ts`) gets its
facts, what is verified, what is deliberately synthetic, and the image
provenance. It exists so nobody mistakes development fixtures for real
inventory, verified listings or production customer data.

## 1. What this seed is

`prisma/seed-all.ts` is **illustrative development data** for the marketplace:
vehicles, dealers, products, bookings, service jobs and supporting rows. It is
idempotent (upserts on unique keys, find-then-skip otherwise) and additive — it
never resets or deletes tables.

It is **not** real dealer inventory. No record represents a real business, a real
person, a real transaction or a verified real-world listing.

## 2. Verified reference facts

These are manufacturer/identity facts, not inventory claims. They are used to
keep names, countries and engine families accurate.

| Fact | Value in seed | Source |
| --- | --- | --- |
| Maruti Suzuki country of origin | India | Maruti Suzuki India Ltd (marutisuzuki.com) |
| Hyundai | South Korea | Hyundai Motor Company (hyundai.com) |
| Tata Motors | India | Tata Motors (tatamotors.com) |
| Mahindra | India | Mahindra & Mahindra (mahindra.com) |
| Kia | South Korea | Kia India (kiaindia.com) |
| Toyota / Honda | Japan | toyota-global.com / honda.co.jp |
| MG | United Kingdom | MG Motor (mgmotor.co.uk); MG is a British-origin marque, now SAIC-owned |
| Volkswagen / BMW / Mercedes-Benz / Audi | Germany | Official manufacturer sites |
| Skoda | Czech Republic | skoda-auto.com |
| Jaguar | United Kingdom | jaguar.com |
| Volvo | Sweden | volvocars.com |
| Maruti Suzuki Brezza (2022, 2nd gen) engine | 1.5 L K15C DualJet petrol | Wikipedia, *Suzuki Brezza* — "Second generation (YH; 2022)": "Petrol: 1.5 L K15C Dualjet I4 (mild hybrid)" |

Engine families used in the seed (`K15C`, `U2 CRDi`, `Revotron`, `mHawk`,
`CRDi VGT`, `TwinPower Turbo`, `TDI`, `D5`) follow the manufacturers' own
marketing names for the engines in those models. Where a value was not
independently confirmed during this review it is listed below as illustrative.

> Verification note: in this environment the Maruti Suzuki Brezza K15C engine
> was confirmed against the source above. Remaining engine/variant strings are
> consistent with manufacturer naming but were not each re-fetched; treat them
> as unverified-but-plausible rather than proven.

## 3. Synthetic (illustrative) fields

For every vehicle and listing, these fields are invented for development and
must never be presented as verified:

- **Price** (used-vehicle asking price and new-car ex-showroom/on-road figures)
- **Mileage / odometer**
- **Ownership history** (where modelled)
- **Registration number, registration state/city**
- **Colour, cosmetic condition, inspection status**
- **Dealer contact details, owner names, addresses, phone numbers** — all use
  reserved/example domains (`@example.com`, `@autohub.example`) and fictional
  names. No real personal contact data is included.
- **Bookings, leads, test drives, finance applications, service jobs** — all
  synthetic and attached to fictitious people.

Where the schema allows `null`, an unverifiable value is omitted rather than
guessed. Where a field is required but not verifiable (e.g. price), the value is
synthetic and the record is covered by the banner at the top of `seed-all.ts`.

## 4. New cars and variants

`NewCar` rows use real model and variant names (e.g. "Fortuner Legender",
"Taigun GT Plus"). Ex-showroom and on-road prices are **indicative synthetic
values** for layout purposes, not quotations. Brand/model/variant names are
factual; prices are not.

The `Vehicle` model has no dedicated variant column, so a used car's trim (where
known) is carried in its title/description rather than in a structured field.
Adding a normalized `variant` field would require a schema migration (see §7).

## 5. Marketplace products

Product records name real brands and product lines. Stock figures, MRP and sale
prices are synthetic.

| Product | Category | Basis |
| --- | --- | --- |
| Michelin Energy XM2 195/65 R15 Tyre | TYRES | Michelin product line; 195/65 R15 is a standard fitment size |
| MRF ZLX 185/65 R15 Tubeless Tyre | TYRES | MRF product line |
| Exide EPIQ 35Ah Car Battery | BATTERIES | Exide EPIQ range |
| Amaron Flo 35Ah Car Battery | BATTERIES | Amaron Flo range |
| Wavex Ceramic Coating Kit | CAR_CARE | Wavex product |
| 3M Car Care Shampoo | CAR_CARE | 3M Car Care range |
| Blaupunkt Car Infotainment System | ELECTRONICS | Blaupunkt car audio brand |
| Dioxis Dash Cam 4K | ELECTRONICS | Pre-existing seed row; brand not verified — treated as illustrative |
| 3M Thinsulate Car Sunshades | EXTERIOR / ACCESSORIES | 3M material brand |
| Genuine 7D Floor Mats, Neck Pillow & Seat Cushion Set, Car Body Cover | INTERIOR / EXTERIOR | Generic accessory types, no brand-specific part number asserted |

**No manufacturer part numbers are asserted** unless the product line itself is
a verified model designation. Compatibility claims are intentionally omitted:
the `MarketplaceProduct` schema has no compatibility field, and a product is not
claimed to fit a specific vehicle merely because the category or brand matches.
Adding evidence-based fitment data would need a schema change (§7).

## 6. Images

- Vehicles and listings reference **local assets only**, under `public/cars/`
  (e.g. `/cars/maruti-suzuki-suv.png`, `/cars/hyundai-suv.png`). Every path
  referenced by the seed was checked to exist on disk.
- Marketplace products reference **local category artwork** under
  `public/products/` (`tyre.svg`, `battery.svg`, `car-care.svg`,
  `electronics.svg`, `accessories.svg`, `spare-parts.svg`).
- These are generic placeholders by body type / category, **not photographs of
  the specific vehicle or product**. Cards render them as representative
  imagery, and the public disclaimer already states that images may be
  representative.
- **No copyrighted images were downloaded or redistributed.** The seed never
  hotlinks an external image. Swapping in real photography requires a licensed
  source and an upload (the `/api/upload` route accepts jpg/png/webp for
  ADMIN/DEALER sessions).

## 7. Schema limitations (need a migration to change)

- `NewCar.imageUrl` and `Dealer.logo` are single-value columns. Multi-image
  galleries for new cars or dealers cannot be modelled without a schema change;
  the seed does not attempt it.
- `Vehicle` has no structured `variant` / `ownership` column. Ownership lives on
  `VehicleHistory.ownershipCount`; variant is currently title/description text.
- `MarketplaceProduct` has no brand, part-number or fitment columns.

These are intentionally left unchanged: this task must not alter the schema.

## 8. Idempotency and integrity

- Dealers are matched by business name and created only if absent; existing
  dealers and users are never overwritten.
- Brands are matched by unique `name`; `country` is only filled when absent or
  the legacy `"Unknown"` placeholder.
- Categories are upserted by unique `slug`.
- Vehicles are matched by `(title, dealerId)`; existing rows are skipped.
- Vehicle features/specs/images are created only for newly created vehicles.
- Marketplace products are matched by `name`; existing rows only get an image
  gallery backfilled when they had fewer than two.
- Seller listings, leads, test drives, finance applications, inspections,
  service jobs and bookings are all guarded by a count check so a second run
  does not duplicate them.
