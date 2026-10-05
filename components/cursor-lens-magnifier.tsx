"use client";

import { useRef, useState, type ReactNode } from "react";

export function CursorLensMagnifier({
  children,
  zoom = 2,
  size = 104,
  invert = false,
}: {
  children: ReactNode;
  zoom?: number;
  size?: number;
  /** Invert everything inside the glass, so the lens reads as a filter. */
  invert?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBox({ w: rect.width, h: rect.height });
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const lensTransform =
    "translate(" +
    (size / 2 - (pos?.x ?? 0) * zoom) +
    "px, " +
    (size / 2 - (pos?.y ?? 0) * zoom) +
    "px) scale(" +
    zoom +
    ")";

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      className="relative overflow-hidden"
      style={{ cursor: pos ? "none" : "default" }}
    >
      {children}

      {pos && (
        <div
          aria-hidden
          className="pointer-events-none absolute overflow-hidden rounded-full border border-white/30 shadow-lg"
          style={{
            width: size,
            height: size,
            left: pos.x - size / 2,
            top: pos.y - size / 2,
            filter: invert ? "invert(1)" : undefined,
          }}
        >
          {/*
           * A SECOND render of the same children, scaled about the pointer.
           * Offsetting by (size/2 - pointer * zoom) keeps the magnified point
           * pinned under the cursor, so the lens reads as glass over the
           * content rather than a separate floating panel.
           */}
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: box.w, height: box.h, transform: lensTransform }}
          >
            {children}
          </div>
          <div className="absolute inset-0 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset]" />
        </div>
      )}
    </div>
  );
}
