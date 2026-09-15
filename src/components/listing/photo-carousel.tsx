"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const go = (delta: number) => setIndex((current) => (current + delta + photos.length) % photos.length);

  return (
    <div className="relative h-80 overflow-hidden sm:h-96">
      <Image src={photos[index]} alt={`${title} photo ${index + 1}`} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 1000px" />
      {photos.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, dot) => (
              <button key={dot} type="button" onClick={() => setIndex(dot)} aria-label={`Go to photo ${dot + 1}`} className={`h-2 w-2 rounded-full transition ${dot === index ? "bg-white" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
