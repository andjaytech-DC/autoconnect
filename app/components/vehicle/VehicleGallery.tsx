'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Maximize2,
  Share2,
  Heart,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GalleryImage {
  url: string;
  alt?: string;
  category?: 'EXTERIOR' | 'INTERIOR' | 'FEATURES' | 'OTHER';
}

interface VehicleGalleryProps {
  images: GalleryImage[];
  title: string;
  price?: number;
  year?: number;
  fuel?: string;
  transmission?: string;
  mileage?: number;
  city?: string;
  dealer?: { name: string; city: string } | null;
  onContactDealer?: () => void;
  onBookTestDrive?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

/** Classify image by filename heuristics when no explicit category exists. */
function classifyImage(url: string, index: number): GalleryImage['category'] {
  const lower = url.toLowerCase();
  if (/interior|seat|dashboard|steering|cabin|dashboard|infotainment|console/.test(lower)) return 'INTERIOR';
  if (/wheel|tyre|alloy|rim/.test(lower)) return 'FEATURES';
  if (/engine|boot|trunk|sunroof|light|headlamp/.test(lower)) return 'FEATURES';
  if (index === 0) return 'EXTERIOR';
  return undefined;
}

/** Validate image URL — reject empty, data: blobs with no content, etc. */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('data:') && trimmed.length < 100) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Category tabs                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_ORDER = ['ALL', 'EXTERIOR', 'INTERIOR', 'FEATURES'] as const;
type CatTab = (typeof CATEGORY_ORDER)[number];

function computeCategories(images: GalleryImage[]): CatTab[] {
  const cats = new Set(images.map((i) => i.category).filter(Boolean));
  const tabs: CatTab[] = ['ALL'];
  if (cats.has('EXTERIOR')) tabs.push('EXTERIOR');
  if (cats.has('INTERIOR')) tabs.push('INTERIOR');
  if (cats.has('FEATURES')) tabs.push('FEATURES');
  return tabs;
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function VehicleGallery({
  images: rawImages,
  title,
  price,
  year,
  fuel,
  transmission,
  mileage,
  city,
  dealer,
  onContactDealer,
  onBookTestDrive,
}: VehicleGalleryProps) {
  /* --- Filter + classify valid images --- */
  const [validImages] = useState<GalleryImage[]>(() =>
    rawImages
      .filter((img) => isValidImageUrl(img.url))
      .map((img, i) => ({
        ...img,
        category: img.category || classifyImage(img.url, i),
      })),
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [activeCat, setActiveCat] = useState<CatTab>('ALL');
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [fav, setFav] = useState(false);

  const thumbRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  /* --- Filtered images by category --- */
  const filtered = validImages.filter(
    (img) => activeCat === 'ALL' || img.category === activeCat,
  );

  /* --- Categories available --- */
  const categories = computeCategories(validImages);

  /* --- Image error handler --- */
  const markError = useCallback((idx: number) => {
    setImgErrors((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  /* --- Visible images (excluding errored) --- */
  const visibleImages = filtered.filter((_, i) => !imgErrors.has(validImages.indexOf(filtered[i])));
  const visibleCount = visibleImages.length;

  /* --- Keep active index in bounds ---
     Adjusted during render (React's documented pattern for correcting state
     from a changed value) rather than in an effect, which would first render
     an out-of-range index. */
  const maxIdx = Math.max(0, visibleImages.length - 1);
  if (activeIdx > maxIdx) setActiveIdx(maxIdx);

  /* --- Scroll active thumbnail into view --- */
  useEffect(() => {
    if (thumbRef.current) {
      const btn = thumbRef.current.children[activeIdx] as HTMLElement | undefined;
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIdx]);

  /* --- Touch swipe on main image --- */
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeIdx < visibleImages.length - 1) setActiveIdx((i) => i + 1);
      if (dx > 0 && activeIdx > 0) setActiveIdx((i) => i - 1);
    }
  };

  /* --- Keyboard navigation for lightbox --- */
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i > 0 ? i - 1 : visibleImages.length - 1));
      if (e.key === 'ArrowRight') setLightboxIdx((i) => (i < visibleImages.length - 1 ? i + 1 : 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, visibleImages.length]);

  /* --- Lock body scroll when lightbox open --- */
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  /* --- Empty state --- */
  if (visibleCount === 0) {
    return (
      <div className="aspect-[4/3] bg-surface rounded-2xl border border-line flex items-center justify-center">
        <div className="text-center">
          <Camera size={48} className="mx-auto text-content-muted mb-3" />
          <p className="text-sm text-content-muted">No photos available for this vehicle</p>
        </div>
      </div>
    );
  }

  const current = visibleImages[activeIdx] || visibleImages[0];

  /* ================================================================= */
  /*  RENDER                                                            */
  /* ================================================================= */

  return (
    <>
      {/* ─── DESKTOP GALLERY (lg+) ─── */}
      <div className="hidden lg:block">
        {/* Main image */}
        <div
          ref={mainRef}
          className="relative aspect-[16/10] bg-surface rounded-2xl overflow-hidden border border-line group cursor-pointer"
          onClick={() => { setLightboxIdx(activeIdx); setLightbox(true); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt || `${title} photo ${activeIdx + 1}`}
            className="w-full h-full object-contain transition-opacity duration-300"
            onError={() => markError(validImages.indexOf(current))}
          />

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Top-right actions */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setFav(!fav); }}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${fav ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
              aria-label="Favorite"
            >
              <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigator.share?.({ title, url: window.location.href }).catch(() => {}); }}
              className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(activeIdx); setLightbox(true); }}
              className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
              aria-label="View fullscreen"
            >
              <Maximize2 size={18} />
            </button>
          </div>

          {/* Photo count badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
            <Camera size={14} />
            {visibleCount} Photo{visibleCount !== 1 ? 's' : ''}
          </div>

          {/* Prev/Next arrows */}
          {visibleImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i > 0 ? i - 1 : visibleImages.length - 1)); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Previous photo"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i < visibleImages.length - 1 ? i + 1 : 0)); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Next photo"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Category tabs */}
        {categories.length > 2 && (
          <div className="flex gap-2 mt-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCat(cat); setActiveIdx(0); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeCat === cat
                    ? 'bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]'
                    : 'bg-surface text-content-muted hover:text-content border border-line'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Thumbnail strip */}
        {visibleImages.length > 1 && (
          <div ref={thumbRef} className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
            {visibleImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeIdx
                    ? 'border-[hsl(var(--color-primary))] ring-1 ring-[hsl(var(--color-primary)/0.4)]'
                    : 'border-[hsl(var(--color-line))] opacity-60 hover:opacity-100 hover:border-content-muted'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`${title} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => markError(validImages.indexOf(img))}
                />
              </button>
            ))}
          </div>
        )}

        {/* View all photos link */}
        {visibleImages.length > 1 && (
          <button
            onClick={() => { setLightboxIdx(activeIdx); setLightbox(true); }}
            className="mt-2 text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline"
          >
            View all {visibleCount} photos
          </button>
        )}
      </div>

      {/* ─── MOBILE GALLERY ─── */}
      <div className="lg:hidden">
        {/* Swipeable main image */}
        <div
          className="relative aspect-[4/3] bg-surface rounded-2xl overflow-hidden border border-line"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => { setLightboxIdx(activeIdx); setLightbox(true); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt || `${title} photo ${activeIdx + 1}`}
            className="w-full h-full object-contain"
            onError={() => markError(validImages.indexOf(current))}
          />

          {/* Photo counter */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
            <Camera size={12} />
            {activeIdx + 1} / {visibleCount}
          </div>

          {/* Swipe arrows for mobile */}
          {visibleImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i > 0 ? i - 1 : visibleImages.length - 1)); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white/80"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i < visibleImages.length - 1 ? i + 1 : 0)); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white/80"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {visibleImages.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {visibleImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activeIdx ? 'bg-[hsl(var(--color-primary))] w-5' : 'bg-content-muted/40'
                }`}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* View all + favorite/share */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => { setLightboxIdx(activeIdx); setLightbox(true); }}
            className="text-xs font-semibold text-[hsl(var(--color-primary-strong))] flex items-center gap-1"
          >
            <Maximize2 size={12} />
            View all {visibleCount} photos
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setFav(!fav)}
              className={`p-2 rounded-full ${fav ? 'text-red-400' : 'text-content-muted'}`}
              aria-label="Favorite"
            >
              <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => navigator.share?.({ title, url: window.location.href }).catch(() => {})}
              className="p-2 rounded-full text-content-muted"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── FULLSCREEN LIGHTBOX ─── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="text-white text-sm font-semibold">
              {lightboxIdx + 1} / {visibleCount}
            </span>
            <span className="text-white/60 text-xs truncate max-w-[60%]">{title}</span>
            <button
              onClick={() => setLightbox(false)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close gallery"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main lightbox image */}
          <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
            {visibleImages.length > 1 && (
              <button
                onClick={() => setLightboxIdx((i) => (i > 0 ? i - 1 : visibleImages.length - 1))}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                aria-label="Previous photo"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={visibleImages[lightboxIdx]?.url}
              alt={visibleImages[lightboxIdx]?.alt || `${title} photo ${lightboxIdx + 1}`}
              className="max-h-full max-w-full object-contain select-none"
              draggable={false}
            />

            {visibleImages.length > 1 && (
              <button
                onClick={() => setLightboxIdx((i) => (i < visibleImages.length - 1 ? i + 1 : 0))}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
                aria-label="Next photo"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Lightbox thumbnail strip */}
          {visibleImages.length > 1 && (
            <div className="shrink-0 px-4 py-3 overflow-x-auto flex justify-center gap-2">
              {visibleImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`flex-shrink-0 w-14 h-11 rounded-md overflow-hidden border-2 transition-all ${
                    i === lightboxIdx
                      ? 'border-[hsl(var(--color-primary))] opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-80'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Keyboard hint */}
          <div className="shrink-0 text-center py-2 text-white/30 text-xs">
            ← → navigate · ESC close
          </div>
        </div>
      )}
    </>
  );
}
