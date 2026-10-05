"use client";

import { useEffect, useRef, useState } from "react";

export function RangeSlider({ min = 0, max = 100, defaultValue = 40 }: {
  min?: number;
  max?: number;
  defaultValue?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [dragging, setDragging] = useState(false);
  const percent = ((value - min) / (max - min)) * 100;
  const step = 1;
  const bigStep = Math.max(step, Math.round((max - min) / 10));

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v));
  }

  function updateFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setValue(Math.round(min + ratio * (max - min)));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    let delta = 0;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        delta = e.shiftKey ? bigStep : step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        delta = -(e.shiftKey ? bigStep : step);
        break;
      case "PageUp":
        delta = bigStep;
        break;
      case "PageDown":
        delta = -bigStep;
        break;
      case "Home":
        e.preventDefault();
        setValue(min);
        return;
      case "End":
        e.preventDefault();
        setValue(max);
        return;
      default:
        return;
    }
    e.preventDefault();
    setValue((v) => clamp(v + delta));
  }

  useEffect(() => {
    if (!dragging) return;
    function handleMove(e: PointerEvent) { updateFromClientX(e.clientX); }
    function handleUp() { setDragging(false); }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging]);

  return (
    <div className="w-full max-w-xs px-2 py-6">
      <div
        ref={trackRef}
        className="relative h-1.5 w-full cursor-pointer rounded-full bg-neutral-200"
        onPointerDown={(e) => { updateFromClientX(e.clientX); setDragging(true); }}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-red-500" style={{ width: `${percent}%` }} />
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label="Value"
          onKeyDown={handleKeyDown}
          className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-red-500 bg-white shadow-md outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          style={{ left: `${percent}%` }}
        >
          {dragging && (
            <span className="absolute -top-9 rounded-md bg-neutral-900 px-2 py-1 font-mono text-xs font-bold text-white">
              {value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
