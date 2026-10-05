"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CardCarousel3D({ cards = ["Design", "Build", "Ship", "Iterate"] }: { cards?: string[] }) {
  const [active, setActive] = useState(0);
  const radius = 130;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-48 w-64" style={{ perspective: 900 }}>
        <div className="relative h-full w-full [transform-style:preserve-3d]">
          {cards.map((card, i) => {
            const offset = i - active;
            const angle = offset * (360 / cards.length);
            return (
              <motion.div
                key={card}
                role={offset === 0 ? undefined : "button"}
                tabIndex={offset === 0 ? undefined : 0}
                aria-label={offset === 0 ? undefined : `Show card: ${card}`}
                onClick={offset === 0 ? undefined : () => setActive(i)}
                onKeyDown={
                  offset === 0
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActive(i);
                        }
                      }
                }
                className={`absolute left-1/2 top-1/2 flex h-28 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-neutral-200 bg-white font-bold shadow-lg [backface-visibility:hidden] ${offset === 0 ? "" : "cursor-pointer"}`}
                animate={{
                  rotateY: angle,
                  z: offset === 0 ? radius : radius * 0.4,
                  opacity: Math.abs(offset) > 1 ? 0 : 1,
                }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {card}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          aria-label="Previous card"
          onClick={() => setActive((a) => (a - 1 + cards.length) % cards.length)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          aria-label="Next card"
          onClick={() => setActive((a) => (a + 1) % cards.length)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:text-neutral-900"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
