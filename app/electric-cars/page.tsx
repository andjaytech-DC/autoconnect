import type { Metadata } from "next";
import {
  ApiError,
  getElectricVehicles,
  type NestVehicle,
  type NestVehicleList,
} from "@/app/lib/nest-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Electric Cars in India — Progressive AutoHub",
  description: "Explore electric vehicles by range, battery, price and brand.",
};

type EvRow = {
  id: number;
  name: string;
  price: number;
  year: number;
  fuel: string;
  transmission: string;
  city: string;
};

function toRows(data: NestVehicle[] | NestVehicleList): EvRow[] {
  const items = Array.isArray(data) ? data : (data.items ?? []);
  return items.map((v: NestVehicle) => ({
    id: v.id,
    name: `${v.brand?.name ?? ""} ${v.title}`.trim() || v.title,
    price: v.price,
    year: v.year,
    fuel: v.fuel,
    transmission: v.transmission,
    city: v.city ?? "",
  }));
}

export default async function ElectricCarsPage() {
  let rows: EvRow[] = [];
  let error = false;
  try {
    rows = toRows(await getElectricVehicles());
  } catch (err) {
    // Backend unreachable → error state (never fabricate data).
    error = !(err instanceof ApiError && err.status === 404);
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      <section className="relative overflow-hidden border-b border-[hsl(var(--color-line))]">
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[hsl(var(--color-primary)/0.1)] blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[320px] w-[320px] rounded-full bg-amber-200/30 blur-[100px]"
          aria-hidden="true"
        />
        <div className="container relative py-10 lg:py-14">
          <span className="eyebrow inline-flex items-center rounded-full border border-[hsl(var(--color-primary)/0.4)] bg-[hsl(var(--color-primary)/0.12)] px-3 py-1.5">
            Electric Range
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Electric Cars
          </h1>
          <p className="mt-3 max-w-xl text-base text-[hsl(var(--color-content-muted))]">
            Range, battery and charging details for every EV.
          </p>
        </div>
      </section>

      <main className="container flex-1 py-10">
        {error ? (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-6 py-20 text-center">
            <h2 className="text-xl font-bold text-[hsl(var(--color-content))]">Unable to load electric cars</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
              Please check your connection and retry.
            </p>
          </div>
        ) : rows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <article key={c.id} className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 shadow-[var(--shadow-subtle)]">
                <h2 className="font-bold text-[hsl(var(--color-content))]">{c.name}</h2>
                <p className="mt-1 text-sm font-extrabold text-[hsl(var(--color-primary-strong))]">
                  ₹{c.price.toLocaleString("en-IN")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Year", c.year],
                    ["Fuel", c.fuel],
                    ["Transmission", c.transmission],
                    ["City", c.city || "—"],
                  ].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg bg-[hsl(var(--color-surface-strong))] p-2">
                      <p className="text-[hsl(var(--color-content-muted))]">{l as string}</p>
                      <p className="font-medium text-[hsl(var(--color-content))]">{v as string}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-6 py-20 text-center">
            <h2 className="text-xl font-bold text-[hsl(var(--color-content))]">No electric cars available</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--color-content-muted))]">
              Electric car listings will appear here once the catalogue has been updated.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
