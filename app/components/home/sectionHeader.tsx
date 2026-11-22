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
    <div className="mb-10 flex items-end justify-between">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="mt-3 text-3xl font-bold text-[hsl(var(--color-content))] lg:text-4xl">
          {title}
        </h2>
        <div
          className="mt-4 h-px w-28 bg-gradient-to-r from-[hsl(var(--color-primary))] to-transparent"
          aria-hidden="true"
        />
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="hidden min-h-6 items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-strong))] transition hover:gap-2 lg:inline-flex"
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
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-strong))]"
      >
        {label} <ArrowRight size={16} />
      </Link>
    </div>
  );
}
