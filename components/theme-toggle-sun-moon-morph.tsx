"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function ThemeToggleSunMoonMorph({
  onChange,
}: {
  onChange?: (dark: boolean) => void;
}) {
  const [dark, setDark] = useState(false);

  function toggle() {
    const next = !dark;
    setDark(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      className={`relative flex h-9 w-16 items-center rounded-full transition-colors ${dark ? "bg-neutral-900" : "bg-neutral-200"}`}
    >
      <motion.div
        className="absolute top-1 left-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md"
        animate={{ x: dark ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <circle cx="12" cy="12" r="6" fill={dark ? "#161616" : "#ff9d2d"} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <motion.line
              key={deg}
              x1="12"
              y1="2"
              x2="12"
              y2="4.5"
              stroke="#ff9d2d"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transformOrigin: "12px 12px", rotate: deg }}
              animate={{ opacity: dark ? 0 : 1, scale: dark ? 0 : 1 }}
              transition={{ duration: 0.25 }}
            />
          ))}
          <motion.circle
            cy="8"
            r="7"
            fill="#ffffff"
            initial={{ cx: 22 }}
            animate={{ opacity: dark ? 1 : 0, cx: dark ? 16 : 22 }}
            transition={{ duration: 0.3 }}
          />
        </svg>
      </motion.div>
    </button>
  );
}
