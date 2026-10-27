"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, X } from "lucide-react";

export function PhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  // The full-size photo the viewer has finished loading, so a spinner shows until then.
  const [loadedSrc, setLoadedSrc] = useState("");
  const go = (delta: number) => setIndex((current) => (current + delta + photos.length) % photos.length);

  // Full-screen viewer: arrow keys move between photos, Escape closes, and the
  // page behind doesn't scroll while it's open.
  useEffect(() => {
    if (!viewing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewing(false);
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % photos.length);
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + photos.length) % photos.length);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [viewing, photos.length]);

  const arrows = (size: string) => photos.length > 1 && (
    <>
      <button type="button" onClick={(event) => { event.stopPropagation(); go(-1); }} aria-label="Previous photo" className={`absolute left-3 top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white ${size}`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={(event) => { event.stopPropagation(); go(1); }} aria-label="Next photo" className={`absolute right-3 top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white ${size}`}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );

  return (
    // Fixed frame, whole photo: portrait (9:16) and landscape (16:9) photos are
    // both shown uncropped, over a blurred copy of themselves instead of bars.
    // Both layers use the same src and sizes, so the photo is downloaded once.
    <div className="relative h-80 overflow-hidden rounded-[1.5rem] bg-slate-900 sm:h-[26rem]">
      <Image src={photos[index]} alt="" aria-hidden fill className="scale-110 object-cover opacity-60 blur-2xl" sizes="(max-width: 1024px) 100vw, 800px" />
      <button type="button" onClick={() => setViewing(true)} aria-label="View photo full screen" className="absolute inset-0 cursor-zoom-in">
        <Image src={photos[index]} alt={`${title} photo ${index + 1}`} fill preload className="object-contain" sizes="(max-width: 1024px) 100vw, 800px" />
      </button>
      <span aria-hidden className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white"><Maximize2 className="h-4 w-4" /></span>
      {arrows("h-9 w-9")}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {photos.map((_, dot) => (
            <button key={dot} type="button" onClick={() => setIndex(dot)} aria-label={`Go to photo ${dot + 1}`} className={`h-2 w-2 rounded-full transition ${dot === index ? "bg-white" : "bg-white/50"}`} />
          ))}
        </div>
      )}

      {viewing && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} onClick={() => setViewing(false)} className="fixed inset-0 z-[70] bg-black">
          {loadedSrc !== photos[index] && <Loader2 aria-hidden className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/70" />}
          <Image key={photos[index]} src={photos[index]} alt={`${title} photo ${index + 1}`} fill onLoad={() => setLoadedSrc(photos[index])} className="object-contain p-4 sm:p-10" sizes="100vw" />
          <button type="button" onClick={() => setViewing(false)} aria-label="Close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>
          {photos.length > 1 && <p className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">{index + 1} / {photos.length}</p>}
          {arrows("h-11 w-11")}
        </div>
      )}
    </div>
  );
}
