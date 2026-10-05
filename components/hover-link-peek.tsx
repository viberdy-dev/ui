"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Row = { id: string; title: string; image: string; meta?: string };

export function HoverLinkPeek({
  rows,
  tilt = 18,
  cardSize = 104,
  showMeta = true,
}: {
  rows: Row[];
  tilt?: number;
  cardSize?: number;
  /** The right-hand meta column. Rows without a meta simply render blank. */
  showMeta?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 26, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 26, mass: 0.5 });

  // Velocity proxy: how far the raw pointer has outrun its own spring.
  // A fast sweep produces a large gap and leans the card; a slow one leaves
  // it level. No separate velocity tracking needed — the lag already exists.
  const lag = useTransform([x, sx], ([raw, smoothed]) => (raw as number) - (smoothed as number));
  const rotate = useTransform(lag, [-90, 90], [-tilt, tilt], { clamp: true });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setActive(null)}
      className="relative"
    >
      <ul className="relative z-10">
        {rows.map((row, i) => (
          <li key={row.id}>
            <a
              href={"#" + row.id}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group flex w-full items-baseline gap-3 border-b border-white/10 py-3"
            >
              <span className="font-mono text-[10px] tracking-[0.14em] opacity-60">
                {row.id}
              </span>
              <span className="text-xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-1.5">
                {row.title}
              </span>
              {showMeta && (
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] opacity-50">
                  {row.meta}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>

      <motion.div
        aria-hidden
        style={{ x: sx, y: sy, rotate }}
        className="pointer-events-none absolute left-0 top-0 z-20"
      >
        <motion.div
          initial={false}
          animate={{ opacity: active !== null ? 1 : 0, scale: active !== null ? 1 : 0.8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-white/20 shadow-lg"
          style={{ width: cardSize, height: cardSize * 0.72 }}
        >
          {active !== null && (
            <img
              src={rows[active].image}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
