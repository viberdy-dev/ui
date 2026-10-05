"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function RotatingWordSwap({
  prefix = "Make it",
  words = ["fast", "clean", "vibed", "shipped"],
  interval = 1800,
}: {
  prefix?: string;
  words?: string[];
  interval?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  const widest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <p className="flex items-center gap-2 text-3xl font-black">
      {prefix}
      <span className="relative inline-block h-[1.1em] overflow-hidden align-bottom">
        {/* Invisible widest word reserves the box width so the line doesn't reflow on every swap. */}
        <span aria-hidden className="invisible whitespace-nowrap">
          {widest}
        </span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={words[index]}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
            className="absolute left-0 top-0 inline-block whitespace-nowrap text-red-500"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
}
