import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  viewAllHref,
  viewAllLabel = "View All",
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--color-primary-strong))]">
          {eyebrow}
        </span>
        <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--color-content))] lg:text-3xl">
          {title}
        </h2>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="hidden items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-strong))] transition hover:gap-2 lg:inline-flex"
        >
          {viewAllLabel} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

export function SectionHeaderMobileLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="mt-6 text-center lg:hidden">
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-strong))]"
      >
        {label} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
