"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function AnimatedCheckbox({
  label = "Send me the changelog",
  defaultChecked = false,
}: {
  label?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label className="flex cursor-pointer items-center gap-3 select-none">
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => setChecked((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setChecked((v) => !v);
          }
        }}
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-neutral-300 transition-colors"
        style={{ borderColor: checked ? "#ef4444" : undefined, backgroundColor: checked ? "#ef4444" : "transparent" }}
      >
        <motion.svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
          />
        </motion.svg>
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
