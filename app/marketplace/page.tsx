import type { Metadata } from "next";
import { getMarketplace, type NestMarketplaceProduct } from "@/app/lib/nest-public";
import { ShoppingBag, Package, ArrowRight, Search } from "lucide-react";
import { SafeImage } from "@/app/components/ui/SafeImage";
import EmptyState from "@/app/components/ui/EmptyState";
import PageHeader from "@/app/components/ui/PageHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Marketplace — Progressive AutoHub",
  description: "Accessories, tyres, batteries, car care, electronics and spare parts.",
};

// EXTERIOR and INTERIOR exist in the catalogue but had no filter chip, so those products were unreachable except under ALL.
const CATEGORIES = ["ALL", "ACCESSORIES", "EXTERIOR", "INTERIOR", "TYRES", "BATTERIES", "CAR_CARE", "ELECTRONICS", "SPARE_PARTS"];

function marketplaceHref(category?: string, q?: string) {
  const p = new URLSearchParams();
  if (category && category !== "ALL") p.set("category", category);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/marketplace?${qs}` : "/marketplace";
}

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

async function fetchProducts(category?: string, q?: string): Promise<{ rows: ProductRow[]; error: boolean }> {
  try {
    const raw = await getMarketplace(category && category !== "ALL" ? { category } : {});
    const list = Array.isArray(raw) ? raw : (raw.products ?? []);
    let rows = toRows(list);
    // The API only filters by category, so the (small) catalogue is matched by name, brand and category here.
    const needle = q?.trim().toLowerCase();
    if (needle) {
      rows = rows.filter((r) => `${r.name} ${r.brand} ${r.category.replace("_", " ")}`.toLowerCase().includes(needle));
    }
    return { rows, error: false };
  } catch {
    return { rows: [], error: true };
  }
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { category, q: rawQ } = await searchParams;
  const q = rawQ?.trim().slice(0, 80) || undefined;
  const { rows: products, error } = await fetchProducts(category, q);

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))] flex flex-col font-sans text-[hsl(var(--color-content))]">

      {/* Header + product search */}
      <PageHeader
        eyebrow="Auto products"
        title="Automotive Marketplace"
        description="Accessories, tyres, batteries, car care products, electronics and spare parts."
        actions={
          <form action="/marketplace" method="get" role="search" className="flex w-full max-w-xl gap-2">
            {category && category !== "ALL" && <input type="hidden" name="category" value={category} />}
            <label htmlFor="mk-q" className="sr-only">Search products</label>
            <input
              id="mk-q"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={80}
              placeholder="Search products or brands"
              className="min-h-11 min-w-0 flex-1 rounded-control border border-white/20 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            />
            <button type="submit" className="btn btn-primary shrink-0 gap-2">
              <Search size={16} aria-hidden="true" /> Search
            </button>
          </form>
        }
      />

      <div className="page-container flex-1 py-10">
        {q && !error && (
          <p className="mb-4 text-sm text-content-muted" role="status">
            {products.length} {products.length === 1 ? "result" : "results"} for <strong className="text-content">“{q}”</strong>
            {" · "}
            <a href={marketplaceHref(category)} className="font-semibold text-primary-strong hover:underline">Clear search</a>
          </p>
        )}
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={marketplaceHref(c, q)}
              aria-current={(!category && c === "ALL") || category === c ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                ((!category && c === "ALL") || category === c)
                  ? "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] shadow-lg shadow-[hsl(var(--color-primary)/0.25)]"
                  : "bg-card text-content border border-line hover:border-emerald-300"
              }`}
            >
              {c.replace("_", " ")}
            </a>
          ))}
        </div>

        {error ? (
          <EmptyState
            tone="error"
            icon={ShoppingBag}
            title="Unable to load products"
            description="Please check your connection and retry."
            action={
              <a
                href={marketplaceHref(category, q)}
                className="btn btn-primary gap-2"
              >
                Retry <ArrowRight size={16} aria-hidden="true" />
              </a>
            }
          />
        ) : products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, index) => (
              <div
                key={p.id}
                className="group overflow-hidden rounded-2xl border border-line bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {p.imageUrl ? (
                  <div className="relative h-48 overflow-hidden bg-[hsl(var(--color-surface-strong))]">
                    <SafeImage
                      src={p.imageUrl}
                      alt={p.name}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      priority={index < 4}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                    <Package size={40} className="text-slate-300" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{p.brand}</p>
                  <p className="mt-1 font-bold text-content text-sm truncate">{p.name}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-lg font-extrabold text-content">
                      ₹{(p.priceSale ?? p.priceMrp).toLocaleString("en-IN")}
                    </p>
                    {p.priceSale && (
                      <p className="text-xs text-content-muted line-through">
                        ₹{p.priceMrp.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${p.stock > 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {p.stock > 0 ? "● In stock" : "● Out of stock"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="No products found"
            description={
              q
                ? `Nothing matched “${q}”${category && category !== "ALL" ? ` in ${category.replace("_", " ").toLowerCase()}` : ""}. Try a different word or clear the search.`
                : category && category !== "ALL"
                  ? `No products in the ${category.replace("_", " ").toLowerCase()} category.`
                  : "Marketplace products will appear here once inventory is added."
            }
            action={
              <a href="/marketplace" className="btn btn-primary gap-2">
                View all products <ArrowRight size={16} aria-hidden="true" />
              </a>
            }
          />
        )}
      </div>
    </div>
  );
}
