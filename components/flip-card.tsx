"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function FlipCard({
  frontLabel = "Hover to flip",
  backLabel = "Here's the back",
  trigger = "hover",
}: {
  frontLabel?: string;
  backLabel?: string;
  trigger?: "hover" | "click";
}) {
  const [clicked, setClicked] = useState(false);
  const flipped = trigger === "hover" ? undefined : clicked;

  return (
    <div
      className="[perspective:1000px]"
      onClick={() => trigger === "click" && setClicked((v) => !v)}
    >
      <motion.div
        tabIndex={0}
        role={trigger === "click" ? "button" : undefined}
        aria-pressed={trigger === "click" ? flipped : undefined}
        onKeyDown={(e) => {
          if (trigger === "click" && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setClicked((v) => !v);
          }
        }}
        className="relative h-40 w-64 cursor-pointer outline-none [transform-style:preserve-3d] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        animate={trigger === "click" ? { rotateY: flipped ? 180 : 0 } : undefined}
        whileHover={trigger === "hover" ? { rotateY: 180 } : undefined}
        whileFocus={trigger === "hover" ? { rotateY: 180 } : undefined}
        transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-6 [backface-visibility:hidden]">
          <span className="text-center text-lg font-bold">{frontLabel}</span>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-red-500 p-6 [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <span className="text-center text-lg font-bold text-white">{backLabel}</span>
        </div>
      </motion.div>
    </div>
  );
}
