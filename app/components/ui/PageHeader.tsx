import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small label above the title, e.g. "Car insurance". */
  eyebrow?: string;
  /** The page's single <h1>. */
  title: string;
  description?: ReactNode;
  /** Optional links/buttons rendered under the description. */
  actions?: ReactNode;
  align?: "left" | "center";
  /** `lg` is for landing pages, `md` for task pages (forms, lists). */
  size?: "md" | "lg";
  id?: string;
}

/**
 * The one page header for public pages: navy band, gold hairline, gold eyebrow,
 * serif title. Replaces the ad-hoc heroes that differed in colour, spacing and
 * type size from page to page. Text colours are fixed for the navy surface
 * (white / slate-300 / amber-300 all clear 4.5:1 on ink-900).
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "left",
  size = "md",
  id,
}: PageHeaderProps) {
  const center = align === "center";
  return (
    <header className="relative overflow-hidden bg-ink-900 text-white">
      <div className="gold-rule absolute inset-x-0 bottom-0" aria-hidden="true" />
      <div
        className={`page-container ${size === "lg" ? "py-16 lg:py-20" : "py-12 lg:py-14"} ${
          center ? "text-center" : ""
        }`}
      >
        {eyebrow && (
          <span
            className={`inline-flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-amber-300 ${
              center ? "justify-center" : ""
            }`}
          >
            <span className="h-px w-8 bg-amber-500" aria-hidden="true" />
            {eyebrow}
          </span>
        )}
        <h1
          id={id}
          className={`mt-4 font-bold tracking-tight text-white ${
            size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
          } ${center ? "mx-auto max-w-3xl" : "max-w-3xl"}`}
        >
          {title}
        </h1>
        {description && (
          <p
            className={`mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base ${
              center ? "mx-auto" : ""
            }`}
          >
            {description}
          </p>
        )}
        {actions && (
          <div className={`mt-6 flex flex-wrap items-center gap-3 ${center ? "justify-center" : ""}`}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
