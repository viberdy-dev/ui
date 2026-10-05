"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const BAR_COUNT = 24;

function seededBars() {
  return Array.from({ length: BAR_COUNT }, (_, i) => ({
    base: 45 + ((i * 37) % 40),
    duration: 0.7,
    delay: (i % 6) * 0.06,
  }));
}

export function AudioWaveVisualizer({
  playing = true,
  color = "#ff2d2d",
}: {
  playing?: boolean;
  color?: string;
}) {
  const [bars, setBars] = useState(seededBars);

  useEffect(() => {
    setBars(
      Array.from({ length: BAR_COUNT }, () => ({
        base: 20 + Math.random() * 60,
        duration: 0.5 + Math.random() * 0.6,
        delay: Math.random() * 0.4,
      })),
    );
  }, []);

  return (
    <div className="flex h-24 items-center justify-center gap-[3px] rounded-2xl border border-neutral-200 px-4">
      {bars.map((bar, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: color }}
          animate={
            playing
              ? { height: [`${bar.base * 0.3}%`, `${bar.base}%`, `${bar.base * 0.5}%`, `${bar.base * 0.85}%`] }
              : { height: "10%" }
          }
          transition={
            playing
              ? { duration: bar.duration, delay: bar.delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
