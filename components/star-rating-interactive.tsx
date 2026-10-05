"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function StarRating({ max = 5, defaultRating = 0 }: { max?: number; defaultRating?: number }) {
  const [rating, setRating] = useState(defaultRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? rating;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < active;
        return (
          <motion.button
            key={i}
            type="button"
            aria-label={`Rate ${i + 1} out of ${max}`}
            onMouseEnter={() => setHovered(i + 1)}
            onClick={() => setRating(i + 1)}
            animate={{ scale: filled ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="text-red-500"
          >
            <Star size={28} fill={filled ? "currentColor" : "none"} strokeWidth={1.5} />
          </motion.button>
        );
      })}
    </div>
  );
}
