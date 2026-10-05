"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

type Card = { id: string; title: string };

export function ScrollCardDeal({
  cards,
  spread = 1,
  rotation = 8,
  scaleIn = true,
}: {
  cards: Card[];
  spread?: number;
  rotation?: number;
  /** Grow the cards as they deal, instead of dealing them at full size. */
  scaleIn?: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  // offset maps "section top hits viewport bottom" -> 0 and "section bottom
  // hits viewport top" -> 1, so the deal is driven by the section's own
  // passage through the viewport rather than by absolute page position.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  return (
    <div ref={sectionRef} className="relative h-[200vh]">
      <div className="sticky top-1/3 flex justify-center">
        <div className="relative h-40 w-56">
          {cards.map((card, i) => (
            <DealtCard
              key={card.id}
              progress={scrollYProgress}
              index={i}
              total={cards.length}
              spread={spread}
              rotation={rotation}
              scaleIn={scaleIn}
              card={card}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DealtCard({
  progress,
  index,
  total,
  spread,
  rotation,
  scaleIn,
  card,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  spread: number;
  rotation: number;
  scaleIn: boolean;
  card: Card;
}) {
  // Each card owns an OVERLAPPING slice of the scroll range, so the deal
  // reads as one continuous motion rather than N discrete steps.
  const start = (index / total) * 0.8;
  const end = start + 0.35;
  const offset = index - (total - 1) / 2;

  // Hooks must run at a component's top level — that is why a dealt card is
  // its own component rather than a callback inside .map().
  const x = useTransform(progress, [start, end], [0, offset * 46 * spread]);
  const y = useTransform(progress, [start, end], [index * 3, 0]);
  const rotate = useTransform(progress, [start, end], [0, offset * rotation]);
  const scale = useTransform(progress, [start, end], [scaleIn ? 0.9 : 1, 1]);
  const opacity = useTransform(progress, [start, start + 0.08], [0.35, 1]);

  return (
    <motion.div
      style={{ x, y, rotate, scale, opacity, zIndex: index }}
      className="absolute inset-0 flex flex-col justify-between rounded-lg border border-white/20 bg-[#151922] p-3 shadow-lg"
    >
      <span className="font-mono text-[9px] tracking-[0.16em] opacity-60">{card.id}</span>
      <span className="text-sm font-bold text-white">{card.title}</span>
    </motion.div>
  );
}
