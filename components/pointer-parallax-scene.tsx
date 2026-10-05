"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

export function PointerParallaxScene({
  children,
  intensity = 1,
  stiffness = 140,
  tiltCard = true,
}: {
  children: ReactNode;
  /** Multiplies every layer's depth. 0 pins the whole scene flat. */
  intensity?: number;
  stiffness?: number;
  /** Bank the scene contents in 3D as well as offsetting them. */
  tiltCard?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  // ONE normalised -0.5..0.5 pointer source, shared by every layer. Parallax
  // is just this value times each layer's own depth factor.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness, damping: 22, mass: 0.6 });
  const sy = useSpring(py, { stiffness, damping: 22, mass: 0.6 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [6, -6]);

  return (
    <ParallaxContext.Provider value={{ sx, sy, intensity }}>
      <div
        ref={boxRef}
        onMouseMove={(e) => {
          const rect = boxRef.current?.getBoundingClientRect();
          if (!rect) return;
          px.set((e.clientX - rect.left) / rect.width - 0.5);
          py.set((e.clientY - rect.top) / rect.height - 0.5);
        }}
        onMouseLeave={() => {
          px.set(0);
          py.set(0);
        }}
        className="relative overflow-hidden"
        style={{ perspective: 800 }}
      >
        <motion.div
          style={tiltCard ? { rotateX, rotateY } : undefined}
          className="relative h-full w-full"
        >
          {children}
        </motion.div>
      </div>
    </ParallaxContext.Provider>
  );
}

const ParallaxContext = createContext<{
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  intensity: number;
} | null>(null);

export function ParallaxLayer({
  depth,
  className,
  children,
}: {
  /** Negative = behind, positive = in front. 0 is pinned to the screen plane. */
  depth: number;
  className?: string;
  children?: ReactNode;
}) {
  const ctx = useContext(ParallaxContext);
  if (!ctx) throw new Error("ParallaxLayer must be inside PointerParallaxScene");

  // useTransform has to run at a component's top level, which is why a layer
  // is its own component rather than a callback inside a .map().
  // The scene's intensity scales every layer from one place, so a single
  // control flattens or exaggerates the whole composition.
  const scaled = depth * ctx.intensity;
  const x = useTransform(ctx.sx, (v) => v * scaled * 2);
  const y = useTransform(ctx.sy, (v) => v * scaled * 2);

  return (
    <motion.div aria-hidden style={{ x, y }} className={"absolute " + className}>
      {children}
    </motion.div>
  );
}
