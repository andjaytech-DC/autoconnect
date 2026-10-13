import type { Metadata } from "next";
import { getMarketplace, type NestMarketplaceProduct } from "@/app/lib/nest-public";
import { ShoppingBag, Package, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Marketplace — Progressive AutoHub",
  description: "Accessories, tyres, batteries, car care, electronics and spare parts.",
};

const CATEGORIES = ["ALL", "ACCESSORIES", "TYRES", "BATTERIES", "CAR_CARE", "ELECTRONICS", "SPARE_PARTS"];

type ProductRow = {
  id: number;
  name: string;
  brand: string;
  category: string;
  priceMrp: number;
  priceSale: number | null;
  imageUrl: string | null;
  stock: number;
};

function toRows(raw: NestMarketplaceProduct[]): ProductRow[] {
  return raw
    .filter((p) => p.isActive !== false)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? "AutoHub",
      category: p.category ?? "ACCESSORIES",
      priceMrp: p.priceMrp ?? p.price ?? 0,
      priceSale: p.priceSale ?? null,
      imageUrl: p.imageUrl ?? (Array.isArray(p.images) ? p.images[0] ?? null : null),
      stock: p.stock ?? 10,
    }));
}

async function fetchProducts(category?: string): Promise<{ rows: ProductRow[]; error: boolean }> {
  try {
    const raw = await getMarketplace(category && category !== "ALL" ? { category } : {});
    const list = Array.isArray(raw) ? raw : (raw.products ?? []);
    return { rows: toRows(list), error: false };
  } catch {
    return { rows: [], error: true };
  }
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const { rows: products, error } = await fetchProducts(category);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slow" />
          <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
          <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-5">
            <ShoppingBag size={14} />
            Auto Products
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Automotive{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] to-yellow-300">Marketplace</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-400">
            Accessories, tyres, batteries, car care products, electronics and spare parts.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12">
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={c === "ALL" ? "/marketplace" : `/marketplace?category=${c}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                ((!category && c === "ALL") || category === c)
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-card text-content border border-line hover:border-emerald-300"
              }`}
            >
              {c.replace("_", " ")}
            </a>
          ))}
        </div>

        {error ? (
          <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">
            <ShoppingBag size={48} className="mx-auto text-content-faint" />
            <h2 className="mt-5 text-xl font-bold text-content">Unable to load products</h2>
            <p className="mt-2 text-sm text-content-muted max-w-md mx-auto">
              Please check your connection and retry.
            </p>
            <a
              href={category && category !== "ALL" ? `/marketplace?category=${category}` : "/marketplace"}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
            >
              Retry <ArrowRight size={16} />
            </a>
          </div>
        ) : products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="group overflow-hidden rounded-2xl border border-line bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {p.imageUrl ? (
                  <div className="relative h-48 overflow-hidden bg-[#141a21]">
                    <img
                      src={p.imageUrl ?? undefined}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                    <Package size={40} className="text-slate-300" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{p.brand}</p>
                  <p className="mt-1 font-bold text-content text-sm truncate">{p.name}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-lg font-extrabold text-emerald-400">
                      ₹{(p.priceSale ?? p.priceMrp).toLocaleString("en-IN")}
                    </p>
                    {p.priceSale && (
                      <p className="text-xs text-content-muted line-through">
                        ₹{p.priceMrp.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${p.stock > 0 ? "text-emerald-400" : "text-red-500"}`}>
                    {p.stock > 0 ? "● In stock" : "● Out of stock"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">
            <ShoppingBag size={48} className="mx-auto text-content-faint" />
            <h2 className="mt-5 text-xl font-bold text-content">No products found</h2>
            <p className="mt-2 text-sm text-content-muted max-w-md mx-auto">
              {category && category !== "ALL"
                ? `No products in the ${category.replace("_", " ").toLowerCase()} category.`
                : "Marketplace products will appear here once inventory is added."}
            </p>
            <a
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
            >
              View all categories <ArrowRight size={16} />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
