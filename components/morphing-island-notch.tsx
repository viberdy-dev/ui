"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export function MorphingIslandNotch({
  icon,
  label,
  detail,
  stiffness = 420,
  dark = true,
}: {
  icon: ReactNode;
  /** When label is null the island collapses to its compact pill. */
  label?: string | null;
  detail?: string | null;
  stiffness?: number;
  /** Dark island on a light page, or the inverse. */
  dark?: boolean;
}) {
  const expanded = label != null;

  return (
    <motion.div
      /*
       * No width or height is ever specified. `layout` makes Framer measure
       * the element's own content and animate its box to match, so adding a
       * new state is just adding markup — no width tables, no measuring.
       */
      layout
      transition={{ type: "spring", stiffness, damping: 34, mass: 0.9 }}
      /*
       * borderRadius must be ANIMATED, not left as a static class: Framer's
       * layout projection scales the box, which skews a fixed corner radius
       * while the size is changing. Animating it keeps the corners true.
       */
      animate={{ borderRadius: expanded ? 20 : 999 }}
      className={
        "flex items-center overflow-hidden " +
        (dark ? "bg-[#0a0c10] text-white " : "bg-white text-[#0a0c10] ") +
        (expanded ? "gap-3 px-4 py-3" : "gap-0 px-3 py-3")
      }
    >
      <motion.span layout="position" className="shrink-0">
        {icon}
      </motion.span>

      <AnimatePresence initial={false} mode="popLayout">
        {expanded && (
          <motion.div
            key={label}
            layout="position"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.18 }}
            className="flex min-w-0 flex-col"
          >
            <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">
              {label}
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold">
              {detail}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
