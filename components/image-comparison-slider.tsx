"use client";

import { useRef, useState } from "react";

export function ImageComparisonSlider({
  before,
  after,
  initial = 50,
  labelBefore = "Before",
  labelAfter = "After",
}: {
  before: string;
  after: string;
  initial?: number;
  labelBefore?: string;
  labelAfter?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initial);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        setPos((p) => Math.max(0, p - step));
        break;
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        setPos((p) => Math.min(100, p + step));
        break;
      case "Home":
        e.preventDefault();
        setPos(0);
        break;
      case "End":
        e.preventDefault();
        setPos(100);
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-64 w-full max-w-xl select-none overflow-hidden rounded-2xl"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        updateFromClientX(e.clientX);
      }}
    >
      <img src={after} alt={labelAfter} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white">
        {labelAfter}
      </span>

      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt={labelBefore}
          className="absolute inset-0 h-64 w-full max-w-xl object-cover"
          draggable={false}
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white">
          {labelBefore}
        </span>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-label="Comparison position"
        onKeyDown={handleKeyDown}
        className="group absolute inset-y-0 flex w-8 -translate-x-1/2 cursor-ew-resize items-center justify-center outline-none"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute inset-y-0 w-0.5 bg-white" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-red-500">
          ↔
        </div>
      </div>
    </div>
  );
}
