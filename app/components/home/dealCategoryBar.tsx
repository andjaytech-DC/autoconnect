import Link from "next/link";

const DEAL_CATEGORIES: { label: string; href: string }[] = [
  { label: "All Cars", href: "/cars" },
  { label: "SUVs", href: "/cars?type=SUV" },
  { label: "Sedans", href: "/cars?type=Sedan" },
  { label: "Electric", href: "/electric-cars" },
  { label: "Premium ₹15 Lakh+", href: "/cars?budget=15-" },
  { label: "Luxury ₹25 Lakh+", href: "/cars?budget=25-" },
  { label: "New Cars", href: "/new-cars" },
];

export function DealCategoryBar() {
  return (
    <section className="border-y border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))]" aria-label="Deal categories">
      <div className="container flex items-center gap-2 overflow-x-auto py-3">
        <span className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--color-primary-strong))]">
          Shop by category
        </span>
        {DEAL_CATEGORIES.map((cat) => (
          <Link
            key={cat.href + cat.label}
            href={cat.href}
            className="shrink-0 rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-4 py-2 text-xs font-semibold text-[hsl(var(--color-content-muted))] transition-all duration-200 hover:border-[hsl(var(--color-primary))] hover:text-[hsl(var(--color-primary-strong))] hover:shadow-[var(--shadow-subtle)]"
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </section>
  );
}