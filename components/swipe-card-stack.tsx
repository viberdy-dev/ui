"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const CARDS = [
  { id: 1, label: "Design" },
  { id: 2, label: "Build" },
  { id: 3, label: "Ship" },
];

export function SwipeCardStack({
  threshold = 120,
  stackDepth = 3,
}: {
  threshold?: number;
  /** How many cards are rendered at once. The rest wait behind them. */
  stackDepth?: number;
}) {
  const [cards, setCards] = useState(CARDS);

  function handleDragEnd(id: number, offsetX: number) {
    if (Math.abs(offsetX) > threshold) {
      setCards((prev) => {
        const rest = prev.filter((c) => c.id !== id);
        const swiped = prev.find((c) => c.id === id)!;
        return [...rest, swiped];
      });
    }
  }

  // Only the top few cards are mounted: a long deck otherwise renders every
  // card behind an opaque stack nobody can see.
  const visible = cards.slice(0, Math.max(1, stackDepth));

  return (
    <div className="relative flex h-48 w-56 items-center justify-center">
      {visible
        .slice()
        .reverse()
        .map((card, i) => {
          const depth = visible.length - 1 - i;
          const isTop = depth === 0;
          return (
            <motion.div
              key={card.id}
              drag={isTop ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => handleDragEnd(card.id, info.offset.x)}
              animate={{ scale: 1 - depth * 0.05, y: depth * 10 }}
              whileDrag={{ rotate: 8, cursor: "grabbing" }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="absolute h-40 w-48 cursor-grab rounded-2xl border border-black/10 bg-white shadow-xl"
              style={{ zIndex: 10 - depth }}
            >
              <div className="flex h-full items-center justify-center">
                <span className="text-xl font-bold">{card.label}</span>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
