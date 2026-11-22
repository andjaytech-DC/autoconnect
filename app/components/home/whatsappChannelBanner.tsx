import { MessageCircle } from "lucide-react";

/** Public WhatsApp channel of Progressive Auto Sports Exclusive. */
const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb93fHcFcowETwRGCJ0j";

/**
 * Compact invitation to the Exclusive WhatsApp channel. It only links out: no
 * posts are copied and no follower count is shown (a typed-in number goes stale).
 */
export function WhatsAppChannelBanner() {
  return (
    <section aria-labelledby="wa-channel-heading" className="py-8 sm:py-12">
      <div className="container">
        <div className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 shadow-[var(--shadow-subtle)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[hsl(var(--color-primary-strong))]">
              Progressive Auto Sports Exclusive
            </p>
            <h2 id="wa-channel-heading" className="mt-1 text-xl font-bold text-[hsl(var(--color-content))]">
              New arrivals first, on WhatsApp
            </h2>
            <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">
              Follow our channel for priority access to pre-owned luxury cars and new arrivals.
            </p>
          </div>
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success shrink-0 gap-2"
          >
            Join our WhatsApp channel
            <MessageCircle size={16} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
