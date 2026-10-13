import Link from "next/link";
import Image from "next/image";
import { Camera } from "lucide-react";

/** Related vehicles grid on the detail page (server-rendered). */
export default function RelatedVehicles({
  vehicles,
}: {
  vehicles: { id: number; name: string; brand: string; year: number; price: number; image: string | null; images?: string[] }[];
}) {
  if (vehicles.length === 0) return null;
  return (
    <section className="mt-12" aria-label="Related vehicles">
      <h2 className="mb-4 text-lg font-bold text-[hsl(var(--color-content))]">You may also like</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {vehicles.map((v) => (
          <Link
            key={v.id}
            href={`/cars/${v.id}`}
            className="group overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--color-line-hover))] hover:shadow-[var(--shadow-elevated-hover)]"
          >
            <div className="relative aspect-[4/3] bg-[hsl(var(--color-surface-strong))]">
              {v.image ? (
                <Image
                  src={v.image}
                  alt={v.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
              {v.images && v.images.length > 1 && (
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[hsl(var(--color-ink-900)/0.75)] px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Camera size={10} aria-hidden="true" />
                  {v.images.length}
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="truncate text-sm font-bold text-[hsl(var(--color-content))]">{v.brand} {v.name}</p>
              <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">{v.year}</p>
              <p className="mt-1 text-sm font-extrabold text-[hsl(var(--color-primary-strong))]">
                ₹{v.price.toLocaleString("en-IN")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
