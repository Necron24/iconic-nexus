"use client";

import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type GalleryImage = {
  image_url: string;
  sort_order?: number;
};

export function ScreenshotGallery({ images, projectName }: { images: GalleryImage[]; projectName: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  const close = useCallback(() => setActiveIndex(null), []);
  const previous = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length);
  }, [images.length]);
  const next = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, close, next, previous]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={`${image.image_url}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left transition hover:-translate-y-0.5 hover:border-cyan/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan"
            aria-label={`Open ${projectName} screenshot ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.image_url} alt={`${projectName} screenshot ${index + 1}`} className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/35" />
            <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg bg-black/65 opacity-0 transition group-hover:opacity-100">
              <Maximize2 size={17} />
            </span>
          </button>
        ))}
      </div>

      {activeImage && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${projectName} screenshot viewer`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <div className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center">
            <button onClick={close} type="button" className="absolute right-0 top-0 z-10 grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/70 hover:bg-white/10" aria-label="Close screenshot">
              <X size={24} />
            </button>

            {images.length > 1 && (
              <button onClick={previous} type="button" className="absolute left-0 z-10 grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-black/70 hover:bg-white/10" aria-label="Previous screenshot">
                <ChevronLeft size={28} />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeImage.image_url} alt={`${projectName} screenshot ${activeIndex + 1}`} className="max-h-[82vh] max-w-[calc(100%-5rem)] rounded-2xl object-contain shadow-2xl" />

            {images.length > 1 && (
              <button onClick={next} type="button" className="absolute right-0 z-10 grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-black/70 hover:bg-white/10" aria-label="Next screenshot">
                <ChevronRight size={28} />
              </button>
            )}

            <div className="mt-4 rounded-full border border-white/10 bg-black/65 px-4 py-2 text-sm text-white/80">
              {activeIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
