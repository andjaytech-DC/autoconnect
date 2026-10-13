"use client";

import { Send } from "lucide-react";

import { SUPPORT_EMAIL } from "@/app/data/navigation";

/**
 * Newsletter sign-up.
 *
 * There is no subscription endpoint anywhere in this stack (no route, no
 * Prisma model, no backend service), so instead of pretending to subscribe the
 * visitor the form hands a pre-addressed message to their mail client, where
 * they explicitly send it. Client component because it needs an onSubmit
 * handler to build the mailto from the live input value.
 */
function newsletterMailto(email: string): string {
  const subject = "Newsletter subscription";
  const body = `Please add ${email} to the Progressive AutoHub weekly newsletter.`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function NewsletterCard() {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 transition-all duration-300 hover:border-[hsl(var(--color-primary)/0.5)] hover:shadow-[var(--shadow-subtle)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--color-primary))]/0.15">
          <Send size={13} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--color-primary-strong))]">
          Newsletter
        </span>
      </div>
      <h2 className="text-base font-extrabold text-[hsl(var(--color-content))]">
        Weekly deals &amp;{" "}
        <span className="bg-gradient-to-r from-[hsl(var(--color-primary-strong))] to-[hsl(var(--color-info))] bg-clip-text text-transparent">
          market insights
        </span>
      </h2>
      <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
        New-car deals and exclusive offers — delivered weekly.
      </p>
      <form
        action={newsletterMailto("")}
        method="get"
        encType="text/plain"
        className="mt-auto pt-4"
        onSubmit={(e) => {
          const input = e.currentTarget.elements.namedItem("email") as HTMLInputElement | null;
          const value = input?.value.trim() ?? "";
          if (!value) {
            e.preventDefault();
            input?.focus();
            return;
          }
          // Re-target the mailto with the live address before the browser
          // hands off to the user's mail client.
          e.preventDefault();
          window.location.href = newsletterMailto(value);
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="min-h-10 flex-1 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-3 py-2 text-sm text-[hsl(var(--color-content))] transition-all outline-none placeholder:text-[hsl(var(--color-content-muted))] focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-focus)/0.2)]"
          />
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 px-4 py-2 text-sm font-bold text-[hsl(var(--color-primary-foreground))] shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Subscribe
            <Send size={13} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[hsl(var(--color-content-muted))]">
          Opens a pre-addressed email — send it to confirm. No spam, unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}
