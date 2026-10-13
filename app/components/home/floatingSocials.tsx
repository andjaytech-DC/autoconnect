"use client";

import { MessageCircle } from "lucide-react";

import { SUPPORT_WHATSAPP } from "@/app/data/navigation";

/**
 * Persistent contact shortcut. WhatsApp only — Telegram is deliberately absent
 * until the official channel handle is confirmed.
 */
export function FloatingSocials() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--color-whatsapp))] text-[hsl(var(--color-whatsapp-foreground))] shadow-lg transition hover:scale-110 hover:bg-[hsl(var(--color-whatsapp-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] focus-visible:ring-offset-2"
        aria-label="Chat with Progressive Auto Sports on WhatsApp"
      >
        <MessageCircle size={22} aria-hidden="true" />
      </a>
    </div>
  );
}
