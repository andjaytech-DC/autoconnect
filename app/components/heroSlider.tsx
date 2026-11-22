"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: number;
  image: string;
  alt: string;
  vehicleName: string;
  vehicleTag: string;
}

/**
 * Real automotive photography.
 * Porsche / BMW / McLaren: Unsplash (free to use under the Unsplash License).
 * Mercedes-AMG GLE Coupé: Progressive AutoSports inventory photograph.
 */
const slides: HeroSlide[] = [
  {
    id: 1,
    image: "/cars/hero/porsche-panamera-hero.webp",
    alt: "Black Porsche Panamera on the highway at dusk",
    vehicleName: "Luxury Sedans",
    vehicleTag: "From ₹25 Lakh",
  },
  {
    id: 2,
    image: "/cars/hero/mercedes-gle-coupe-hero.webp",
    alt: "Black Mercedes-AMG GLE Coupé on a tree-lined road",
    vehicleName: "Luxury SUVs",
    vehicleTag: "From ₹30 Lakh",
  },
  {
    id: 3,
    image: "/cars/hero/bmw-m5-hero.webp",
    alt: "White BMW M5 driving through a sunlit street",
    vehicleName: "Performance Sedans",
    vehicleTag: "From ₹35 Lakh",
  },
  {
    id: 4,
    image: "/cars/hero/mclaren-720s-hero.webp",
    alt: "Silver McLaren 720S parked on a mountain road",
    vehicleName: "Supercars",
    vehicleTag: "₹1 Crore+",
  },
];

const AUTOPLAY_MS = 5500;

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setIsAutoPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  // Respect the OS-level motion preference: no autoplay, no cross-fade.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const reduce = mql.matches;
      setReducedMotion(reduce);
      if (reduce) setIsAutoPlaying(false);
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Autoplay only when allowed, not paused (hover/focus), and tab visible.
  useEffect(() => {
    if (!isAutoPlaying || reducedMotion || paused) return;
    if (document.hidden) return;
    const timer = setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [isAutoPlaying, reducedMotion, paused, goNext]);

  // Keyboard control when the carousel itself has focus.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
      setIsAutoPlaying(false);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
      setIsAutoPlaying(false);
    }
  };

  const announce = !isAutoPlaying || paused || reducedMotion;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured vehicles"
      aria-live={announce ? "polite" : "off"}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative h-full w-full overflow-hidden rounded-[0.5rem] bg-[#0C1533]"
    >
      {slides.map((slide, index) => {
        const isActive = index === current;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={!isActive}
            inert={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
              isActive ? "opacity-100 z-10" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              unoptimized
              priority={index === 0}
              loading={index === 0 ? "eager" : "lazy"}
              className="object-cover"
              sizes="(max-width: 1023px) 100vw, 45vw"
            />

            {/* Controlled bottom scrim keeps the caption readable on every photo. */}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0A1128]/95 via-[#0A1128]/55 to-transparent px-4 pb-4 pt-14 transition-opacity motion-reduce:transition-none sm:px-6 sm:pb-5 sm:pt-20 ${
                /* Captions swap in sequence (old out fast, new in after) so two
                   never overlap while the photographs cross-fade. */
                isActive ? "opacity-100 duration-300 delay-300" : "opacity-0 duration-150"
              }`}
              aria-hidden="true"
            >
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-ink-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300 sm:text-xs">
                    {slide.vehicleTag}
                  </span>
                  <h3 className="mt-1.5 truncate text-lg font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
                    {slide.vehicleName}
                  </h3>
                </div>

                {/* Pagination lives on the dark scrim, so it stays visible on bright photos. */}
                <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-ink-900/80 p-1.5 backdrop-blur-sm sm:gap-2 sm:p-2">
                  {slides.map((dot, dotIndex) => (
                    <button
                      key={dot.id}
                      type="button"
                      onClick={() => goTo(dotIndex)}
                      aria-label={`Go to slide ${dotIndex + 1}: ${dot.vehicleName}`}
                      aria-current={dotIndex === current ? "true" : undefined}
                      className="group flex h-6 min-w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128]"
                    >
                      <span
                        aria-hidden="true"
                        className={`block h-2 rounded-full transition-all duration-300 ${
                          dotIndex === current
                            ? "w-6 bg-amber-400 sm:w-8"
                            : "w-2 bg-white/55 group-hover:bg-white"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          goPrev();
          setIsAutoPlaying(false);
        }}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-[#0A1128] shadow-lg backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] sm:left-4 sm:h-11 sm:w-11"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => {
          goNext();
          setIsAutoPlaying(false);
        }}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-[#0A1128] shadow-lg backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] sm:right-4 sm:h-11 sm:w-11"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      {!isAutoPlaying && !reducedMotion && (
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4" aria-live="polite">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-ink-900/85 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm sm:text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
            Auto-play paused
          </span>
        </div>
      )}
    </div>
  );
}
