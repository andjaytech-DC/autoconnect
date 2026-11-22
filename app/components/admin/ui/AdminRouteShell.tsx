import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";

interface AdminRouteShellProps {
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  children: ReactNode;
  /** Constrain long-form screens; the default keeps tables roomy. */
  width?: "5xl" | "6xl" | "7xl";
}

const WIDTH: Record<NonNullable<AdminRouteShellProps["width"]>, string> = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

/**
 * Frame for standalone admin routes (/admin/vehicles, /admin/finance, …).
 * The main /portal/admin workspace has its own grouped sidebar; these routes
 * get the same brand, typography, surface and breadcrumb treatment.
 */
export default function AdminRouteShell({
  title,
  description,
  breadcrumb = [],
  actions,
  children,
  width = "6xl",
}: AdminRouteShellProps) {
  return (
    <div data-admin-shell className="admin-shell min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface)/0.94)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/portal/admin#dashboard"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--color-primary))] text-sm font-black text-[hsl(var(--color-primary-foreground))]">
              P
            </span>
            <span>
              <span className="block text-sm font-bold tracking-tight text-[hsl(var(--color-content))]">
                Progressive AutoSports
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--color-content-faint))]">
                Admin console
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/portal/admin#dashboard"
              className="admin-btn admin-btn-secondary hidden sm:inline-flex"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/" className="admin-btn admin-btn-ghost text-xs">
              Storefront <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className={`mx-auto w-full ${WIDTH[width]} px-4 py-6 sm:px-6 lg:px-8 lg:py-8`}>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[hsl(var(--color-content-faint))]">
          <Link href="/portal/admin#dashboard" className="inline-flex min-h-8 items-center hover:text-[hsl(var(--color-content))]">
            Admin
          </Link>
          {breadcrumb.map((crumb) => (
            <span key={crumb} className="flex items-center gap-1.5">
              <ChevronRight size={12} aria-hidden="true" />
              <span>{crumb}</span>
            </span>
          ))}
          <ChevronRight size={12} aria-hidden="true" />
          <span className="text-[hsl(var(--color-content-muted))]" aria-current="page">
            {title}
          </span>
        </nav>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--color-content))] sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--color-content-muted))]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
