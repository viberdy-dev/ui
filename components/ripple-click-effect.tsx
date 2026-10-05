"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

let rippleId = 0;

export function RippleButton({
  label = "Click me",
  color = "light",
}: {
  label?: string;
  color?: "light" | "dark";
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) * 2;
    const id = rippleId++;
    setRipples((prev) => [...prev, { id, x, y, size }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
  }

  return (
    <button
      onClick={handleClick}
      className="relative overflow-hidden rounded-xl bg-red-500 px-8 py-4 font-semibold text-white"
    >
      {label}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              marginLeft: -r.size / 2,
              marginTop: -r.size / 2,
              background: color === "light" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)",
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
}
