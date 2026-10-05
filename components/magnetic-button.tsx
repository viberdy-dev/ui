"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

export function MagneticButton({
  label = "Copy this",
  strength = 24,
  rounded = true,
  variant = "red",
}: {
  label?: string;
  strength?: number;
  rounded?: boolean;
  variant?: "red" | "outline" | "dark";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * strength;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * strength;
    setPos({ x, y });
  }

  const variantClasses =
    variant === "red"
      ? "bg-red-500 text-white"
      : variant === "outline"
        ? "border border-neutral-900 bg-transparent text-neutral-900"
        : "bg-neutral-900 text-white";

  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      className={
        "relative px-8 py-4 font-semibold tracking-tight transition-colors " +
        variantClasses +
        (rounded ? " rounded-full" : " rounded-none")
      }
    >
      <motion.span
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.4 }}
        className="block"
      >
        {label}
      </motion.span>
    </button>
  );
}
