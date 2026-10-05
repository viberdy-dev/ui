"use client";

import { useState } from "react";

export function HoverStrokeDrawButton({
  label = "Install",
  speed = 600,
  radius = 10,
  doubleStroke = true,
}: {
  label?: string;
  speed?: number;
  radius?: number;
  /** Two strokes meeting at the far corners, or one lap of the whole path. */
  doubleStroke?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative isolate px-8 py-4 font-mono text-[12px] uppercase tracking-[0.18em] text-white"
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Resting track, so the button still has a shape before hover. */}
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth={1}
        />
        {/*
         * pathLength={1} normalises the geometry so dasharray/dashoffset are
         * plain 0-1 fractions. That is what makes this size-independent — no
         * getTotalLength(), no remeasure on resize, and the same two numbers
         * work whether the button is 100px or 400px wide.
         *
         * dasharray "0.5 0.5" + offset 0.5 -> two strokes meeting at the far
         * corners; "1 1" + offset 1 -> one stroke travelling the whole path.
         */}
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={radius}
          fill="none"
          stroke="#3d7bff"
          strokeWidth={1.5}
          pathLength={1}
          strokeDasharray={doubleStroke ? "0.5 0.5" : "1 1"}
          strokeDashoffset={hovered ? 0 : doubleStroke ? 0.5 : 1}
          style={{
            transition:
              "stroke-dashoffset " + speed + "ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </svg>
      {label}
    </button>
  );
}
