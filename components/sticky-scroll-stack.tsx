"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

const CARDS = [
  { title: "Design", body: "Sketch the shape before you touch a component." },
  { title: "Build", body: "Wire it up with the real content, not lorem ipsum." },
  { title: "Ship", body: "Small, reversible, boring deploys beat big risky ones." },
];

function StackCard({
  card,
  index,
  progress,
  scaleStep,
}: {
  card: (typeof CARDS)[number];
  index: number;
  progress: MotionValue<number>;
  scaleStep: number;
}) {
  const start = index / CARDS.length;
  const end = (index + 1) / CARDS.length;
  const cardScale = useTransform(
    progress,
    [start, end, Math.min(end + 0.15, 1)],
    [1, 1, 1 - scaleStep * (CARDS.length - index)]
  );

  return (
    <motion.div
      style={{ scale: cardScale, top: 16 + index * 12 }}
      className="sticky flex h-48 w-full flex-col justify-center gap-2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg"
    >
      <span className="text-lg font-black text-red-500">0{index + 1}</span>
      <span className="text-xl font-bold">{card.title}</span>
      <p className="text-sm text-neutral-500">{card.body}</p>
    </motion.div>
  );
}

export function StickyScrollStack({ scaleStep = 0.06 }: { scaleStep?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // `container` (not `target`) tracks this element's OWN internal
  // overflow-y-auto scroll — `target` only tracks scroll of an ancestor
  // page moving this element through the viewport, which stays frozen at 0
  // when the element scrolls itself instead.
  const { scrollYProgress } = useScroll({ container: containerRef });

  return (
    <div ref={containerRef} className="relative h-[420px] w-72 overflow-y-auto rounded-2xl border border-neutral-200">
      <div style={{ height: `${CARDS.length * 260}px` }} className="relative">
        {CARDS.map((card, i) => (
          <StackCard key={card.title} card={card} index={i} progress={scrollYProgress} scaleStep={scaleStep} />
        ))}
      </div>
    </div>
  );
}
