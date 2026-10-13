"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: number;
  image: string;
  alt: string;
}

const slides: HeroSlide[] = [
  { id: 1, image: "/cars/suv.png", alt: "Premium SUV Collection" },
  { id: 2, image: "/cars/sedanB.png", alt: "Luxury Sedan Collection" },
  { id: 3, image: "/cars/ev-blue.svg", alt: "Electric Vehicle Collection" },
  { id: 4, image: "/cars/suv-emerald.svg", alt: "Premium Car Collection" },
];

const AUTOPLAY_MS = 4000;

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
      className="relative h-full w-full overflow-hidden rounded-[2rem] border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-bg))]"
    >
      {/* Slides */}
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
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={index === 0}
              // Two of the slides are SVG. Next serves known `.svg` sources
              // as-is by default (the optimizer refuses them when
              // `dangerouslyAllowSVG` is off), but say so explicitly so the
              // intent survives a loader/config change. Most of the optimised
              // PNG slides keep `unoptimized` false.
              unoptimized={slide.image.endsWith(".svg")}
              // All four slides are loaded up-front: the carousel advances every
              // few seconds, so lazy-loading the inactive slides leaves them
              // blank the first time they appear.
              loading="eager"
              className="object-contain p-8"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        );
      })}

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={() => {
          goPrev();
          setIsAutoPlaying(false);
        }}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] text-[hsl(var(--color-content))] shadow-sm transition hover:bg-[hsl(var(--color-surface-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
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
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] text-[hsl(var(--color-content))] shadow-sm transition hover:bg-[hsl(var(--color-surface-strong))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === current ? "true" : undefined}
            className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-card))] ${
              index === current
                ? "w-6 bg-[hsl(var(--color-primary-strong))]"
                : "w-2 bg-[hsl(var(--color-line))] hover:bg-[hsl(var(--color-line-hover))]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
