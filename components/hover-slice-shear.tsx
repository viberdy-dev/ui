"use client";

import { useState } from "react";

export function HoverSliceShear({
  text = "VIBERDY",
  slices = 6,
  shear = 16,
  accentEdges = true,
}: {
  text?: string;
  slices?: number;
  shear?: number;
  /** Tint the top and bottom bands while sheared, so the fan reads. */
  accentEdges?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative inline-block cursor-pointer select-none"
    >
      {/* The one accessible copy of the string. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden className="relative block text-6xl font-black leading-none tracking-tight">
        {/* Invisible copy establishes the box for the absolute slices. */}
        <span className="invisible block">{text}</span>

        {Array.from({ length: slices }).map((_, i) => {
          const top = (i / slices) * 100;
          const bottom = 100 - ((i + 1) / slices) * 100;
          const direction = i % 2 === 0 ? 1 : -1;
          // Ease the offset toward the vertical centre so the bands fan out
          // instead of shearing like a uniform comb.
          const falloff = 1 - Math.abs(i - (slices - 1) / 2) / slices;
          const offset = hovered ? direction * shear * falloff : 0;

          return (
            <span
              key={i}
              className="absolute inset-0 block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                clipPath: "inset(" + top + "% 0% " + bottom + "% 0%)",
                transform: "translateX(" + offset + "px)",
                transitionDelay: i * 18 + "ms",
                color:
                  accentEdges && hovered && (i === 0 || i === slices - 1)
                    ? "#3d7bff"
                    : undefined,
              }}
            >
              {text}
            </span>
          );
        })}
      </span>
    </span>
  );
}
