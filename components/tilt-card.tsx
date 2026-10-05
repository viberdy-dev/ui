"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function TiltCard({
  title = "Editorial Card",
  body = "Tilts toward your cursor with a soft spring.",
  maxTilt = 12,
  glare = true,
}: {
  title?: string;
  body?: string;
  maxTilt?: number;
  /** Soft highlight across the upper-left face, as if lit from there. */
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 200,
    damping: 20,
  });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <div style={{ perspective: 800 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          x.set(0);
          y.set(0);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-64 rounded-2xl border border-black/10 bg-white p-6 shadow-xl"
      >
        {glare && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent" />
        )}
        <div className="mb-3 h-8 w-8 rounded-full bg-red-500" />
        <h3 className="mb-1 text-lg font-bold">{title}</h3>
        <p className="text-sm text-black/60">{body}</p>
      </motion.div>
    </div>
  );
}
