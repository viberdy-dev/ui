"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

export function PathFollowScroll({
  d,
  viewBox = "0 0 340 170",
  markerSize = 14,
  drawPath = true,
  autoRotate = true,
}: {
  /** Any SVG path string. The marker rides this exact curve. */
  d: string;
  viewBox?: string;
  markerSize?: number;
  /** Draw the trail in behind the marker as it travels. */
  drawPath?: boolean;
  /** Let the browser bank the marker to the curve's tangent. */
  autoRotate?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40 });

  const offsetDistance = useTransform(progress, (v) => v * 100 + "%");
  // Hoisted: feeding this inline into JSX that may be conditional would make
  // a hook run conditionally.
  const dashOffset = useTransform(progress, (v) => 1 - v);

  return (
    <div ref={sectionRef} className="relative h-[200vh]">
      <div className="sticky top-1/3">
        <div className="relative mx-auto w-full max-w-3xl">
          <svg aria-hidden viewBox={viewBox} className="w-full overflow-visible">
            <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={1.5} />
            {drawPath && (
              <motion.path
                d={d}
                fill="none"
                stroke="#3d7bff"
                strokeWidth={1.5}
                strokeLinecap="round"
              /*
               * pathLength={1} normalises the path so dasharray/dashoffset are
               * plain 0-1 fractions — no getTotalLength(), and it keeps working
               * at any rendered size.
               */
                pathLength={1}
                strokeDasharray="1 1"
                style={{ strokeDashoffset: dashOffset }}
              />
            )}
          </svg>

          {/*
           * The marker rides CSS offset-path / offset-distance rather than
           * interpolated x/y. The browser solves position AND tangent angle
           * along the curve, so offsetRotate:"auto" banks it through the bends
           * for free — doing that manually means sampling and differentiating
           * the path yourself.
           */}
          <motion.div
            aria-hidden
            className="absolute left-0 top-0 rounded-full bg-blue-500"
            style={{
              width: markerSize,
              height: markerSize,
              offsetPath: 'path("' + d + '")',
              offsetDistance,
              offsetRotate: autoRotate ? "auto" : "0deg",
            }}
          />
        </div>
      </div>
    </div>
  );
}
