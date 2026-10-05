"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Slide = { id: string; label: string };

export function DragInertiaCarousel({
  slides,
  slideWidth = 132,
  power = 0.22,
  stiffness = 260,
  showDots = true,
}: {
  slides: Slide[];
  /** Card width + gap, in px. */
  slideWidth?: number;
  /** How far velocity carries the throw. Higher = flickier. */
  power?: number;
  stiffness?: number;
  /** The pager dots under the rail, which also jump to a slide. */
  showDots?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const maxIndex = slides.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden">
        <motion.div
          drag="x"
          dragConstraints={{ left: -slideWidth * maxIndex, right: 0 }}
          dragElastic={0.12}
          /*
           * Framer's own momentum is OFF. We resolve the throw ourselves in
           * onDragEnd; leaving both enabled makes the rail coast past the
           * chosen slide and then spring back — the classic "fighting the
           * carousel" feel.
           */
          dragMomentum={false}
          onDragEnd={(_, info) => {
            /*
             * Project where the throw WOULD land using the gesture's velocity,
             * then round to the nearest slide. Snapping from the release
             * OFFSET alone ignores how hard it was thrown, so a hard flick and
             * a gentle nudge of the same distance behave identically — which
             * is exactly what feels wrong in most drag carousels.
             */
            const projected = info.offset.x + info.velocity.x * power;
            const next = Math.round(index - projected / slideWidth);
            setIndex(Math.max(0, Math.min(maxIndex, next)));
          }}
          animate={{ x: -index * slideWidth }}
          transition={{ type: "spring", stiffness, damping: 32, mass: 0.8 }}
          className="flex cursor-grab gap-3 active:cursor-grabbing"
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex h-28 w-[120px] shrink-0 select-none flex-col justify-between rounded-md bg-neutral-800 p-3"
            >
              <span className="font-mono text-[9px] tracking-[0.16em] opacity-60">
                {slide.id}
              </span>
              <span className="text-sm font-bold text-white">{slide.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {showDots && (
        <div className="flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={"Go to " + s.label}
              aria-current={i === index}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === index ? "w-5 bg-blue-500" : "w-1.5 bg-white/25")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
