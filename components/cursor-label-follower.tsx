"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorLabelFollower({
  children,
  stiffness = 420,
  showDot = true,
}: {
  children: React.ReactNode;
  stiffness?: number;
  /** The small leading dot inside the chip. */
  showDot?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  // Motion values, not state: pointer movement writes a transform directly
  // and never re-renders this component.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness, damping: 30, mass: 0.35 });
  const sy = useSpring(y, { stiffness, damping: 30, mass: 0.35 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  // Any descendant with data-cursor-label="Something" sets the chip text.
  function handleOver(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("[data-cursor-label]");
    setLabel(target?.getAttribute("data-cursor-label") ?? null);
  }

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseOver={handleOver}
      onMouseLeave={() => setLabel(null)}
      className="relative"
    >
      {children}

      <motion.div
        aria-hidden
        style={{ x: sx, y: sy }}
        className="pointer-events-none absolute left-0 top-0 z-50"
      >
        <motion.div
          initial={false}
          animate={{ opacity: label ? 1 : 0, scale: label ? 1 : 0.7 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1.5 font-mono text-[10px] uppercase leading-none tracking-[0.12em] text-white"
        >
          {showDot && <span className="size-1 rounded-full bg-white/70" />}
          {label ?? ""}
        </motion.div>
      </motion.div>
    </div>
  );
}
