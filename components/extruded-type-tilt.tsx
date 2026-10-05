"use client";

import { useRef, useState } from "react";

export function ExtrudedTypeTilt({
  text,
  layers = 10,
  depth = 2.2,
  accentFace = true,
}: {
  text: string;
  layers?: number;
  depth?: number;
  /** Bright front face. Off, the face sits closer to the extrusion tone. */
  accentFace?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Extrusion direction. Defaults to down-right — the conventional light
  // position — so the solid reads correctly before any pointer input.
  const [dir, setDir] = useState({ x: 0.7, y: 0.7 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    // Inverted, so the extrusion trails AWAY from the cursor like a shadow
    // cast by it rather than leaning toward it.
    setDir({ x: -nx * 2, y: -ny * 2 });
  }

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setDir({ x: 0.7, y: 0.7 })}
      className="flex cursor-default select-none items-center justify-center"
    >
      <span className="relative block text-6xl font-black leading-none tracking-tight">
        <span className="sr-only">{text}</span>

        <span aria-hidden>
          {/*
           * The depth is N stacked copies, each offset one step further along
           * the light direction and darkened. Because only the OFFSET
           * direction changes, the solid appears to rotate without any real
           * 3D — no perspective, no preserve-3d, and so no GPU rasterisation
           * blurring the glyph edges at fractional transforms.
           * Furthest layer paints first so nearer ones cover it.
           */}
          {Array.from({ length: layers }).map((_, i) => {
            const step = layers - i;
            return (
              <span
                key={i}
                className="absolute inset-0 block transition-transform duration-200 ease-out"
                style={{
                  transform:
                    "translate(" +
                    dir.x * depth * step +
                    "px, " +
                    dir.y * depth * step +
                    "px)",
                  color: "rgba(61,123,255," + (0.06 + (i / layers) * 0.3) + ")",
                }}
              >
                {text}
              </span>
            );
          })}

          {/* Front face, drawn last and unoffset. */}
          <span
            className="relative block"
            style={{ color: accentFace ? "#e8eaee" : "#9aa3b2" }}
          >
            {text}
          </span>
        </span>
      </span>
    </div>
  );
}
