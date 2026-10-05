"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

export function HideOnScrollNavbar({ children }: { children?: React.ReactNode }) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [inert, setInert] = useState(false);
  const lastY = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const diff = y - lastY.current;
    if (Math.abs(diff) > 4) {
      const nextHidden = diff > 0 && y > 40;
      if (!nextHidden) setInert(false);
      setHidden(nextHidden);
      lastY.current = y;
    }
  });

  return (
    <motion.div
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.25, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={() => {
        if (hidden) setInert(true);
      }}
      inert={inert}
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-6 py-3 backdrop-blur-sm"
    >
      {children ?? <span className="font-bold">Brand</span>}
    </motion.div>
  );
}
