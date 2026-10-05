"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "framer-motion";

export function VelocityMarqueeRail({
  words,
  baseSpeed = 2,
  velocityBoost = 4,
  reverse = true,
}: {
  words: string[];
  baseSpeed?: number;
  velocityBoost?: number;
  /** Flip the rail's travel direction when the page scrolls up. */
  reverse?: boolean;
}) {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  // Raw scroll velocity is extremely spiky; the spring is what turns it into
  // something usable as an animation input.
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });

  // Map px/s into a small multiplier, CLAMPED — without the clamp a fast
  // flick sends the rail off at an unreadable speed.
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, velocityBoost], {
    clamp: true,
  });

  const baseX = useMotionValue(0);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    // delta-scaled, so speed is identical on 60Hz and 120Hz displays.
    let moveBy = direction.current * baseSpeed * (delta / 1000) * 60;

    // Scrolling up flips the rail. Advancing position manually in a frame
    // callback (rather than running a CSS animation) is the only way to
    // reverse mid-flight without a visible restart.
    if (reverse) {
      const v = velocityFactor.get();
      if (v < 0) direction.current = -1;
      else if (v > 0) direction.current = 1;
    }

    moveBy += direction.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  // The track repeats 4x, so one tile is 25%. Wrapping over [-25, 0] loops
  // seamlessly and keeps the offset bounded instead of growing forever.
  const x = useTransform(baseX, (v) => wrap(-25, 0, v / 12) + "%");

  return (
    <div className="overflow-hidden py-4">
      <motion.div style={{ x }} className="flex whitespace-nowrap will-change-transform">
        {Array.from({ length: 4 }).map((_, tile) => (
          <span key={tile} className="flex shrink-0 items-center" aria-hidden={tile > 0}>
            {words.map((w) => (
              <span key={w} className="flex items-center">
                <span className="px-3 text-3xl font-black tracking-tight">{w}</span>
                <span className="size-1.5 rounded-full bg-blue-500" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
