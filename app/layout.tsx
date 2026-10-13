import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF9F6",
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
      className={geist.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[hsl(var(--color-bg))] text-[hsl(var(--color-content))] antialiased">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer rating={rating} />
        </div>
      </body>
    </html>
  );
}
