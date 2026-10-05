"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function LiquidBlobCursor({
  size = 90,
  softness = 18,
}: {
  size?: number;
  softness?: number;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 16, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 120, damping: 16, mass: 0.6 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  return (
    <div
      ref={areaRef}
      onMouseMove={handleMove}
      className="relative h-64 w-full overflow-hidden rounded-2xl bg-neutral-100"
    >
      <motion.div
        className="pointer-events-none absolute rounded-full bg-red-500"
        style={{
          width: size,
          height: size,
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          filter: `blur(${softness}px)`,
          opacity: 0.75,
        }}
      />
    </div>
  );
}
