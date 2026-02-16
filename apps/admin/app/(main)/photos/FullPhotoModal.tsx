"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

type Props = {
  photoUrl: string;
  open: boolean;
  onClose: () => void;
};

export function FullPhotoModal({ photoUrl, open, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  const positionRef = useRef(position);

  scaleRef.current = scale;
  positionRef.current = position;

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(MIN_SCALE, s - SCALE_STEP);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const el = containerRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const s = scaleRef.current;
      const p = positionRef.current;
      const scaleNew =
        e.deltaY < 0
          ? Math.min(MAX_SCALE, s + SCALE_STEP)
          : Math.max(MIN_SCALE, s - SCALE_STEP);
      if (scaleNew === s) return;
      if (scaleNew <= 1) {
        setScale(scaleNew);
        setPosition({ x: 0, y: 0 });
        return;
      }
      const ratio = scaleNew / s;
      setScale(scaleNew);
      setPosition({
        x: mouseX - centerX - (mouseX - centerX - p.x) * ratio,
        y: mouseY - centerY - (mouseY - centerY - p.y) * ratio,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: dragStart.current.posX + (e.clientX - dragStart.current.x),
      y: dragStart.current.posY + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      aria-modal="true"
      role="dialog"
      aria-label="View full photo"
    >
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          className="flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Zoom out"
        >
          <span className="text-xl font-medium">−</span>
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          className="flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Zoom in"
        >
          <span className="text-xl font-medium">+</span>
        </button>
        {scale !== 1 && (
          <button
            type="button"
            onClick={resetZoom}
            className="rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-stone-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 cursor-grab items-center justify-center overflow-hidden p-4 pt-16"
        style={{ cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={photoUrl}
          alt="Full size photo"
          className="max-h-full max-w-full select-none object-contain"
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      <p className="pb-2 text-center text-xs text-white/60">
        Scroll to zoom · Drag to pan when zoomed
      </p>
    </div>
  );
}
