import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import { getSiteRating } from "@/app/lib/site-rating";

/* Self-hosted Geist (no external request to Google at runtime, no layout
   shift). Exposed as --font-geist-sans and wired into --font-sans in
   globals.css so the token stays the single source of truth. */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

/* Classic high-contrast serif for headings and display numerals. Variable font,
   so no weight list is needed. Body and UI text stay on Geist. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A1128",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Progressive AutoHub",
  description: "India's progressive platform for buying, selling, and servicing cars",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Real rating, or null when there are no reviews yet. Never a fallback score.
  const rating = await getSiteRating();

  return (
    <html
      lang="en"
      className={`${geist.variable} ${playfair.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[hsl(var(--color-bg))] text-[hsl(var(--color-content))] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[hsl(var(--color-content))] focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
          <Footer rating={rating} />
        </div>
      </body>
    </html>
  );
}
