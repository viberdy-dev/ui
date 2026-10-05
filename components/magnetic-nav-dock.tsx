"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

function DockIcon({
  icon,
  mouseX,
  baseSize,
  maxSize,
}: {
  icon: string;
  mouseX: MotionValue<number>;
  baseSize: number;
  maxSize: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (x) => {
    const el = ref.current;
    if (!el) return Infinity;
    const rect = el.getBoundingClientRect();
    return x - (rect.left + rect.width / 2);
  });

  const sizeRaw = useTransform(distance, [-120, 0, 120], [baseSize, maxSize, baseSize]);
  const size = useSpring(sizeRaw, { mass: 0.2, stiffness: 250, damping: 18 });

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-2xl bg-white text-2xl shadow-md"
    >
      {icon}
    </motion.div>
  );
}

export function MagneticNavDock({
  icons = ["🏠", "🔍", "💬", "📁", "⚙️"],
  baseSize = 44,
  maxSize = 72,
}: {
  icons?: string[];
  baseSize?: number;
  maxSize?: number;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-end gap-3 rounded-3xl border border-neutral-800 bg-neutral-900/60 px-4 py-3"
    >
      {icons.map((icon, i) => (
        <DockIcon key={i} icon={icon} mouseX={mouseX} baseSize={baseSize} maxSize={maxSize} />
      ))}
    </div>
  );
}
