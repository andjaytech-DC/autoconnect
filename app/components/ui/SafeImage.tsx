"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera } from "lucide-react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * next/image that fills its (relatively positioned) parent and degrades
 * gracefully.
 *
 * - Root-relative sources (/cars/*, /products/*, /uploads/*) go through the
 *   Next.js image optimizer (resized, WebP/AVIF, lazy-loaded).
 * - Absolute remote URLs are rendered unoptimized, so a host that is not in
 *   `images.remotePatterns` cannot crash the page.
 * - If the image fails to load (for example the API that serves /uploads is
 *   down), a neutral placeholder is shown instead of a broken-image icon.
 */
export function SafeImage({ src, alt, className, sizes, priority }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image unavailable)`}
        className="flex h-full w-full items-center justify-center bg-[hsl(var(--color-surface-strong))]"
      >
        <Camera
          size={32}
          className="text-[hsl(var(--color-content-faint))]"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
      priority={priority}
      unoptimized={!src.startsWith("/")}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
