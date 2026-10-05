"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorSnapTarget({
  children,
  idleSize = 10,
  padding = 6,
  showIdleDot = true,
}: {
  children: React.ReactNode;
  idleSize?: number;
  padding?: number;
  /** Keep the dot visible in open space. Off, it only appears when snapped. */
  showIdleDot?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [snapped, setSnapped] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(idleSize);
  const h = useMotionValue(idleSize);

  const spring = { stiffness: 480, damping: 36, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const sw = useSpring(w, spring);
  const sh = useSpring(h, spring);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    // While snapped the cursor is pinned to the target's box, so free
    // tracking is suspended until the pointer leaves it.
    if (snapped) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left - idleSize / 2);
    y.set(e.clientY - rect.top - idleSize / 2);
    w.set(idleSize);
    h.set(idleSize);
  }

  // Delegated: any descendant marked data-cursor-snap becomes a target.
  function handleOver(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor-snap]");
    const host = boxRef.current?.getBoundingClientRect();
    if (!el || !host) {
      setSnapped(false);
      return;
    }
    const target = el.getBoundingClientRect();
    x.set(target.left - host.left - padding);
    y.set(target.top - host.top - padding);
    w.set(target.width + padding * 2);
    h.set(target.height + padding * 2);
    setSnapped(true);
  }

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseOver={handleOver}
      onMouseLeave={() => setSnapped(false)}
      className="relative cursor-none"
    >
      {children}

      <motion.div
        aria-hidden
        style={{ x: sx, y: sy, width: sw, height: sh }}
        animate={{
          borderRadius: snapped ? 8 : 999,
          opacity: snapped || showIdleDot ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute left-0 top-0 border border-blue-500 bg-blue-500/15"
      />
    </div>
  );
}
