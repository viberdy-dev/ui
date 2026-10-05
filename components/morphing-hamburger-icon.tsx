"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function MorphingMenuButton({
  size = 28,
  menuId = "morphing-menu-panel",
  color = "ink",
}: {
  size?: number;
  menuId?: string;
  color?: "ink" | "red";
}) {
  const [open, setOpen] = useState(false);
  const bar = color === "red" ? "bg-red-500" : "bg-neutral-900";

  return (
    <button
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => setOpen((v) => !v)}
      className="relative flex items-center justify-center rounded-full border border-neutral-200 p-3"
      style={{ width: size + 24, height: size + 24 }}
    >
      <span className="relative block" style={{ width: size, height: size * 0.6 }}>
        <motion.span
          className={"absolute left-0 top-0 h-[2.5px] w-full rounded-full " + bar}
          animate={open ? { rotate: 45, y: size * 0.3 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.span
          className={
            "absolute left-0 top-1/2 h-[2.5px] w-full -translate-y-1/2 rounded-full " + bar
          }
          animate={open ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          className={"absolute bottom-0 left-0 h-[2.5px] w-full rounded-full " + bar}
          animate={open ? { rotate: -45, y: -size * 0.3 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
        />
      </span>
    </button>
  );
}
