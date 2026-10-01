"use client";

import { PointerEvent, useState } from "react";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";

const frame = 256;
const outputSize = 512;

type Offset = { x: number; y: number };

// Lets the user drag, zoom and rotate a photo inside a square frame (shown as
// a circle, like the avatar), then exports exactly what's inside the frame as
// a 512×512 JPEG data URL ready for /api/upload.
export function PhotoAdjuster({ image, onCancel, onSave }: { image: HTMLImageElement; onCancel: () => void; onSave: (dataUrl: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ pointerX: number; pointerY: number; start: Offset } | null>(null);

  const sideways = rotation % 180 !== 0;
  const width = sideways ? image.naturalHeight : image.naturalWidth;
  const height = sideways ? image.naturalWidth : image.naturalHeight;
  // Smallest scale at which the (rotated) photo still fills the whole frame.
  const scale = (frame / Math.min(width, height)) * zoom;

  function clamp(next: Offset, nextScale = scale, nextWidth = width, nextHeight = height): Offset {
    const maxX = Math.max(0, (nextWidth * nextScale - frame) / 2);
    const maxY = Math.max(0, (nextHeight * nextScale - frame) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }

  function changeZoom(next: number) {
    const value = Math.min(4, Math.max(1, next));
    setZoom(value);
    setOffset((current) => clamp(current, (frame / Math.min(width, height)) * value));
  }

  function rotate() {
    const next = (rotation + 90) % 360;
    const nextWidth = next % 180 !== 0 ? image.naturalHeight : image.naturalWidth;
    const nextHeight = next % 180 !== 0 ? image.naturalWidth : image.naturalHeight;
    setRotation(next);
    setOffset((current) => clamp(current, (frame / Math.min(nextWidth, nextHeight)) * zoom, nextWidth, nextHeight));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ pointerX: event.clientX, pointerY: event.clientY, start: offset });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setOffset(clamp({ x: drag.start.x + event.clientX - drag.pointerX, y: drag.start.y + event.clientY - drag.pointerY }));
  }

  function save() {
    const canvas = document.createElement("canvas");
    canvas.width = outputSize; canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = outputSize / frame;
    ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black as JPEG
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.translate(outputSize / 2 + offset.x * ratio, outputSize / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Adjust profile photo">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-slate-900">Adjust your photo</h2>
        <p className="mt-1 text-xs text-slate-500">Drag to move, use the slider to zoom.</p>
        <div
          className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-white active:cursor-grabbing"
          style={{ width: frame, height: frame }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          onWheel={(event) => changeZoom(zoom - event.deltaY * 0.002)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview, not a page image */}
          <img
            src={image.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{ width: image.naturalWidth, height: image.naturalHeight, transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})` }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] ring-2 ring-white/80" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => changeZoom(zoom - 0.2)} aria-label="Zoom out" className="text-slate-500 hover:text-blue-600"><ZoomOut className="h-4 w-4" /></button>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} aria-label="Zoom" className="w-full accent-blue-600" />
          <button type="button" onClick={() => changeZoom(zoom + 0.2)} aria-label="Zoom in" className="text-slate-500 hover:text-blue-600"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={rotate} aria-label="Rotate" className="ml-1 rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-blue-200 hover:text-blue-600"><RotateCw className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={save} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Save photo</button>
        </div>
      </div>
    </div>
  );
}
